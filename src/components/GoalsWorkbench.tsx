import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowUpDown, Check, Flag, MoreHorizontal, RefreshCw, Shuffle, X } from "lucide-react";
import { goalIntegration } from "@/lib/goalIntegration";
import { goalLogoSource, listGoalLogos, prepareGoalLogo, setGoalLogo, type GoalLogo } from "@/lib/goalLogos";
import {
  goalRoute,
  integrationError,
  integrationRequestKey,
  planIsStale,
  splitCriteria,
  taskStageLabel,
  type FeatureGoal,
  type GoalContext,
} from "@/lib/goalWorkbench";
import { PlannerStatus } from "@/planner/PlanPages";
import { TaskList } from "@/planner/TaskList";
import {
  defaultGoalAppearance,
  goalColors,
  goalEmoji,
  goalInitials,
  readGoalAppearances,
  surpriseGoalAppearance,
  writeGoalAppearance,
  type GoalAppearance,
  type GoalAppearances,
} from "@/planner/goalAppearance";
import { goalKey, openFirst, tasksForGoal, type GoalSummary, type PlannerTask } from "@/planner/model";
import { notify } from "@/planner/notices";
import { usePlanner } from "@/planner/store";
import { Confirm, Empty, Segmented, Sheet } from "@/planner/ui";

interface GoalDraft {
  title: string;
  outcome: string;
  markdown: string;
  criteria: string;
}

/** A goal's tile: its logo, emoji or initials on its own soft colour. */
export function GoalAvatar({
  name,
  appearance,
  logo,
  size = 48,
}: {
  name: string;
  appearance: GoalAppearance;
  logo?: GoalLogo | null;
  size?: number;
}) {
  const color = goalColors[appearance.color] ?? goalColors[0];
  const [failed, setFailed] = useState<string | null>(null);
  const source = logo ? goalLogoSource(logo) : null;
  const showLogo = !!source && failed !== source;
  return (
    <span
      className="goal-avatar"
      aria-hidden="true"
      data-emoji={!showLogo && appearance.emoji ? "" : undefined}
      style={
        {
          "--size": `${size / 16}rem`,
          "--goal-light": color.light,
          "--goal-dark": color.dark,
          "--goal-ink": color.ink,
        } as React.CSSProperties
      }
    >
      {showLogo ? <img alt="" src={source} onError={() => setFailed(source)} /> : (appearance.emoji ?? goalInitials(name))}
    </span>
  );
}

function useRequestKey() {
  const previous = useRef<{ payload: string; key: string } | null>(null);
  return (payload: unknown) => {
    const serialized = JSON.stringify(payload);
    if (previous.current?.payload !== serialized) previous.current = { payload: serialized, key: integrationRequestKey() };
    return previous.current.key;
  };
}

export function GoalsWorkbench({
  ownerId,
  onChanged,
  onGoalsLoaded,
  onEditTask,
  onGoalOpen,
  createRequest,
  openRequest,
}: {
  ownerId: string;
  onChanged: () => void;
  onGoalsLoaded: (goals: FeatureGoal[]) => void;
  /** Opens the task composer; `goal` keeps the task inside that goal. */
  onEditTask: (task: PlannerTask, goal: string | null) => void;
  /** Tells the planner which goal is on screen, so the plus button adds to it. */
  onGoalOpen: (name: string | null) => void;
  /** Changes each time the plus button asks for a new goal. */
  createRequest: number;
  /** Asks for a goal by name, from search or Statistics. */
  openRequest: { name: string; requestId: number } | null;
}) {
  const planner = usePlanner();
  const [params, setParams] = useSearchParams();
  const goalId = params.get("goal");
  const taskId = params.get("task");
  const [goals, setGoals] = useState<FeatureGoal[]>([]);
  const [goalsLoaded, setGoalsLoaded] = useState(false);
  const [logos, setLogos] = useState<Record<string, GoalLogo>>({});
  const [appearances, setAppearances] = useState<GoalAppearances>(() => readGoalAppearances(ownerId));
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [styling, setStyling] = useState<string | null>(null);
  const [contextVersion, setContextVersion] = useState(0);
  const drafts = useRef(new Map<string, GoalDraft>());
  const listVersion = useRef(0);
  const active = useRef(true);
  const callbacks = useRef({ onChanged, onGoalsLoaded, onEditTask, onGoalOpen });
  callbacks.current = { onChanged, onGoalsLoaded, onEditTask, onGoalOpen };

  const refresh = useCallback(async () => {
    const version = ++listVersion.current;
    setError("");
    try {
      // Goal records carry the ids that logos, briefs and plans hang on.
      const all: FeatureGoal[] = [];
      for (let offset: number | null = 0, page = 0; offset !== null && page < 20; page += 1) {
        const result = await goalIntegration.listGoals(offset);
        if (!active.current || version !== listVersion.current) return;
        all.push(...result.goals);
        offset = result.next_offset;
      }
      setGoals(all);
      setGoalsLoaded(true);
      callbacks.current.onGoalsLoaded(all);
      void listGoalLogos(all.filter((goal) => goal.status === "active").map((goal) => goal.id))
        .catch(() => ({}))
        .then((loaded) => {
          if (active.current && version === listVersion.current) setLogos(loaded);
        });
    } catch (caught) {
      if (active.current && version === listVersion.current) setError(integrationError(caught));
    }
  }, [ownerId]);
  useEffect(() => {
    active.current = true;
    void refresh();
    return () => {
      active.current = false;
      listVersion.current += 1;
    };
  }, [refresh]);
  useEffect(() => {
    const visible = () => {
      if (document.visibilityState !== "visible") return;
      void refresh();
      setContextVersion((value) => value + 1);
    };
    document.addEventListener("visibilitychange", visible);
    return () => document.removeEventListener("visibilitychange", visible);
  }, [refresh]);

  const changed = useCallback(() => {
    callbacks.current.onChanged();
    void refresh();
  }, [refresh]);

  const featureByKey = useMemo(() => new Map(goals.map((goal) => [goalKey(goal.title), goal])), [goals]);
  const openGoal = goalId ? goals.find((goal) => goal.id === goalId) : undefined;
  const appearanceFor = (name: string) => appearances[goalKey(name)] ?? defaultGoalAppearance(name);

  useEffect(() => {
    callbacks.current.onGoalOpen(goalId ? (openGoal?.title ?? null) : null);
  }, [goalId, openGoal?.title]);
  useEffect(() => () => callbacks.current.onGoalOpen(null), []);

  // The plus button on the Goals page asks for a new goal.
  const seenRequest = useRef(createRequest);
  useEffect(() => {
    if (createRequest === seenRequest.current) return;
    seenRequest.current = createRequest;
    setCreating(true);
  }, [createRequest]);

  // Search and Statistics know a goal by its name; its page is addressed by id.
  const handledOpen = useRef(0);
  useEffect(() => {
    if (!openRequest || handledOpen.current === openRequest.requestId || !(goalsLoaded || error)) return;
    handledOpen.current = openRequest.requestId;
    const goal = featureByKey.get(goalKey(openRequest.name));
    if (goal) setParams({ view: "goals", goal: goal.id });
    else notify("Goal unavailable", "This goal may have been removed.");
  }, [openRequest, goalsLoaded, error, featureByKey, setParams]);

  // A link straight to a task opens its goal with the task ready to edit.
  const handledTask = useRef<string | null>(null);
  useEffect(() => {
    if (!taskId) handledTask.current = null;
    if (!taskId || !planner.loaded || !(goalsLoaded || error) || handledTask.current === taskId) return;
    handledTask.current = taskId;
    const task = planner.tasks.find((item) => item.id === taskId);
    const goal = task?.label ? featureByKey.get(goalKey(task.label)) : undefined;
    const target = goal?.id ?? goalId;
    setParams(target ? { view: "goals", goal: target } : { view: "goals" }, { replace: true });
    if (task) callbacks.current.onEditTask(task, task.label ?? null);
    else notify("Task unavailable", "This task may have been removed.");
  }, [taskId, planner.loaded, planner.tasks, goalsLoaded, error, featureByKey, goalId, setParams]);

  const saveAppearance = (name: string, appearance: GoalAppearance | null) => {
    try {
      setAppearances(writeGoalAppearance(ownerId, name, appearance));
    } catch {
      notify("Could not save appearance", "Your choices are still here. Please try again.");
      throw new Error("appearance");
    }
  };

  const stylingSummary = styling ? planner.summaries.find((goal) => goalKey(goal.name) === goalKey(styling)) : undefined;
  const stylingFeature = styling ? featureByKey.get(goalKey(styling)) : undefined;

  return (
    <section className="page page--goals" aria-label="Goals">
      {goalId ? (
        <GoalDetail
          key={`${ownerId}:${goalId}`}
          goalId={goalId}
          knownTitle={openGoal?.title}
          version={contextVersion}
          initialDraft={drafts.current.get(goalId)}
          logo={logos[goalId]}
          appearanceFor={appearanceFor}
          onDraft={(draft) => drafts.current.set(goalId, draft)}
          onStyle={(name) => setStyling(name)}
          onRenamed={(previous, next) => {
            // A goal's colour and emoji follow it to its new name.
            const kept = appearances[goalKey(previous)];
            if (kept && goalKey(previous) !== goalKey(next)) {
              try {
                writeGoalAppearance(ownerId, previous, null);
                setAppearances(writeGoalAppearance(ownerId, next, kept));
              } catch {
                // The default colour for the new name is used instead.
              }
            }
          }}
          onEditTask={(task, goal) => callbacks.current.onEditTask(task, goal)}
          onChanged={changed}
        />
      ) : (
        <>
          {error ? (
            <p role="alert" className="ot-notice ot-notice--error goals-notice">
              {error}
              <button type="button" className="ot-link" onClick={() => void refresh()}>
                Retry
              </button>
            </p>
          ) : null}
          {!planner.loaded ? (
            <PlannerStatus />
          ) : planner.summaries.length ? (
            <ul className="goals">
              {planner.summaries.map((goal) => {
                const feature = featureByKey.get(goalKey(goal.name));
                const appearance = appearanceFor(goal.name);
                const ink = goalColors[appearance.color]?.ink;
                const body = (
                  <>
                    <GoalAvatar name={goal.name} appearance={appearance} logo={feature ? logos[feature.id] : null} />
                    <span className="goal-text">
                      <strong>{goal.name}</strong>
                      <span>{goal.total ? `${goal.completed}/${goal.total} done` : "Ready for a first step"}</span>
                      {goal.total ? (
                        <span
                          className="ot-progress"
                          role="progressbar"
                          aria-label="Goal progress"
                          aria-valuemin={0}
                          aria-valuemax={goal.total}
                          aria-valuenow={goal.completed}
                          style={{ "--goal-ink": ink } as React.CSSProperties}
                        >
                          <i style={{ width: `${(goal.completed / goal.total) * 100}%` }} />
                        </span>
                      ) : null}
                    </span>
                  </>
                );
                return (
                  <li key={goalKey(goal.name)} className="goal">
                    {feature ? (
                      <Link to={goalRoute(feature.id)} className="goal-open">
                        {body}
                      </Link>
                    ) : (
                      <button type="button" className="goal-open" onClick={() => void refresh()}>
                        {body}
                      </button>
                    )}
                    <button
                      type="button"
                      className="ot-round ot-round--plain"
                      aria-label={`Appearance for goal: ${goal.name}`}
                      onClick={() => setStyling(goal.name)}
                    >
                      <MoreHorizontal size={18} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="goals-empty">
              <div aria-hidden="true">
                <GoalAvatar name="Explore" appearance={{ color: 5, emoji: "🌎" }} size={44} />
                <GoalAvatar name="Grow" appearance={{ color: 0, emoji: "🌱" }} size={56} />
                <GoalAvatar name="Make" appearance={{ color: 2, emoji: "🎨" }} size={44} />
              </div>
              <h2>Something worth working toward</h2>
              <p>Give your first goal a little personality.</p>
              <button type="button" className="ot-link" onClick={() => setCreating(true)}>
                Create a goal
              </button>
            </div>
          )}
        </>
      )}

      <NewGoalSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(goal) => {
          setCreating(false);
          setGoals((current) => [...current.filter((item) => item.id !== goal.id), goal]);
          setParams({ view: "goals", goal: goal.id });
          changed();
        }}
      />
      <GoalAppearanceSheet
        name={styling}
        summary={stylingSummary}
        feature={stylingFeature}
        logo={stylingFeature ? logos[stylingFeature.id] : undefined}
        appearance={styling ? appearanceFor(styling) : null}
        onClose={() => setStyling(null)}
        onSave={(appearance) => styling && saveAppearance(styling, appearance)}
        onLogo={(logo) => {
          if (!stylingFeature) return;
          setLogos(({ [stylingFeature.id]: _previous, ...other }) => (logo ? { ...other, [stylingFeature.id]: logo } : other));
        }}
        onRemoved={() => {
          if (styling) {
            try {
              setAppearances(writeGoalAppearance(ownerId, styling, null));
            } catch {
              // Nothing else depends on the stored appearance.
            }
          }
          setStyling(null);
          if (goalId) setParams({ view: "goals" });
          changed();
        }}
      />
    </section>
  );
}

function NewGoalSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (goal: FeatureGoal) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestKey = useRequestKey();
  useEffect(() => {
    if (open) {
      setName("");
      setError("");
    }
  }, [open]);
  const create = async (event: FormEvent) => {
    event.preventDefault();
    const title = name.trim();
    if (!title || busy) return;
    setBusy(true);
    setError("");
    const values = { title, outcome: "" };
    try {
      const result = await goalIntegration.saveGoal(values, requestKey(["create", values]));
      onCreated(result.goal);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setError(/already exists|revision_conflict/.test(message) ? "Goal already exists" : "Could not save goal");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="New goal" size="small">
      <form className="composer" onSubmit={(event) => void create(event)}>
        <header className="sheet-head">
          <button type="button" className="ot-round ot-round--plain" aria-label="Close" disabled={busy} onClick={onClose}>
            <X size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <span className="sheet-head-spacer" />
          <button type="submit" className="ot-button ot-button--small" disabled={busy || !name.trim()}>
            {busy ? <i className="composer-saving" aria-hidden="true" /> : "Add"}
          </button>
        </header>
        <input
          className="composer-line"
          placeholder="Goal name"
          aria-label="Goal name"
          maxLength={80}
          value={name}
          disabled={busy}
          autoFocus
          onChange={(event) => setName(event.target.value)}
        />
        {error ? (
          <p role="alert" className="ot-notice ot-notice--error">
            {error}
          </p>
        ) : null}
      </form>
    </Sheet>
  );
}

/** "Make it yours": logo, initials or an emoji, and one of six colours. */
function GoalAppearanceSheet(props: {
  name: string | null;
  summary?: GoalSummary;
  feature?: FeatureGoal;
  logo?: GoalLogo;
  appearance: GoalAppearance | null;
  onClose: () => void;
  onSave: (appearance: GoalAppearance) => void;
  onLogo: (logo: GoalLogo | null) => void;
  onRemoved: () => void;
}) {
  // The last goal stays on screen while the sheet eases out.
  const [last, setLast] = useState<{ name: string; appearance: GoalAppearance } | null>(null);
  useEffect(() => {
    if (props.name && props.appearance) setLast({ name: props.name, appearance: props.appearance });
  }, [props.name, props.appearance]);
  const shown = props.name && props.appearance ? { name: props.name, appearance: props.appearance } : last;
  return (
    <Sheet open={!!props.name} onClose={props.onClose} title={shown ? `Appearance for ${shown.name}` : "Goal appearance"} size="regular">
      {shown ? <GoalAppearanceBody key={shown.name} {...props} shown={shown.name} appearance={shown.appearance} /> : null}
    </Sheet>
  );
}

function GoalAppearanceBody({
  shown,
  summary,
  feature,
  logo,
  appearance,
  onClose,
  onSave,
  onLogo,
  onRemoved,
}: {
  shown: string;
  summary?: GoalSummary;
  feature?: FeatureGoal;
  logo?: GoalLogo;
  appearance: GoalAppearance;
  onClose: () => void;
  onSave: (appearance: GoalAppearance) => void;
  onLogo: (logo: GoalLogo | null) => void;
  onRemoved: () => void;
}) {
  const planner = usePlanner();
  const [draft, setDraft] = useState<GoalAppearance>(appearance);
  const [busy, setBusy] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [removing, setRemoving] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  const canHaveLogo = feature?.status === "active";
  const saveLogo = async (file: File | null) => {
    if (!feature || busy) return;
    setBusy(true);
    setLogoError("");
    let prepared = false;
    try {
      const next = file ? await prepareGoalLogo(file) : null;
      prepared = true;
      await setGoalLogo(feature.id, next);
      onLogo(next);
    } catch (caught) {
      setLogoError(
        prepared
          ? "Could not save the logo. Try again."
          : caught instanceof Error
            ? caught.message
            : "The image could not be opened.",
      );
    } finally {
      setBusy(false);
    }
  };
  const done = () => {
    try {
      onSave(draft);
      onClose();
    } catch {
      // The draft stays on screen so it can be saved again.
    }
  };
  const remove = async () => {
    setRemoving(false);
    setBusy(true);
    try {
      await planner.removeGoal(shown);
      onRemoved();
    } catch {
      // The failure has already been reported.
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="appearance">
        <header className="sheet-head">
          <button type="button" className="ot-round ot-round--plain" aria-label="Close" disabled={busy} onClick={onClose}>
            <X size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <span className="sheet-head-spacer" />
          <button type="button" className="ot-button ot-button--small" disabled={busy} onClick={done}>
            Done
          </button>
        </header>
        <div className="appearance-goal">
          <GoalAvatar name={shown} appearance={draft} logo={logo} size={64} />
          <div>
            <strong>{shown}</strong>
            <span>Make it yours</span>
          </div>
          <button
            type="button"
            className="ot-round ot-round--plain"
            aria-label="Surprise me"
            data-tip="Surprise me"
            data-tip-align="end"
            onClick={() => setDraft(surpriseGoalAppearance(draft))}
          >
            <Shuffle size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>

        {canHaveLogo ? (
          <div className="appearance-logo">
            <input
              ref={picker}
              type="file"
              accept="image/png,image/jpeg"
              aria-label="Goal logo"
              hidden
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) void saveLogo(file);
              }}
            />
            <button type="button" className="ot-chip" disabled={busy} onClick={() => picker.current?.click()}>
              {logo ? "Replace logo" : "Add logo"}
            </button>
            {logo ? (
              <button type="button" className="ot-chip" disabled={busy} onClick={() => void saveLogo(null)}>
                Remove logo
              </button>
            ) : null}
            {busy ? <span role="status">Saving…</span> : null}
          </div>
        ) : null}
        {logoError ? (
          <p role="alert" className="ot-notice ot-notice--error">
            {logoError}
          </p>
        ) : null}

        <p className="appearance-label">Icon</p>
        <div className="appearance-icons" role="group" aria-label="Icon">
          <button
            type="button"
            aria-pressed={draft.emoji === null}
            className="appearance-initials"
            onClick={() => setDraft({ ...draft, emoji: null })}
          >
            Initials
          </button>
          {goalEmoji.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-pressed={draft.emoji === emoji}
              aria-label={emoji}
              onClick={() => setDraft({ ...draft, emoji })}
            >
              {emoji}
            </button>
          ))}
        </div>

        <p className="appearance-label">Color</p>
        <div className="appearance-swatches" role="group" aria-label="Color">
          {goalColors.map((color, index) => (
            <button
              key={color.name}
              type="button"
              aria-pressed={draft.color === index}
              aria-label={color.name}
              style={{ "--tone-light": color.light, "--tone-dark": color.dark, "--tone-accent": color.ink } as React.CSSProperties}
              onClick={() => setDraft({ ...draft, color: index })}
            >
              {draft.color === index ? <Check size={15} strokeWidth={2} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>

        <p className="appearance-note">Logos sync to your account. Colors and emoji stay on this device.</p>
        {summary && !summary.total ? (
          <button type="button" className="ot-button ot-button--danger ot-button--small appearance-remove" disabled={busy} onClick={() => setRemoving(true)}>
            Remove empty goal
          </button>
        ) : (
          <p className="appearance-note">To remove this goal, move its tasks out of it first.</p>
        )}
      </div>
      <Confirm
        open={removing}
        title="Remove empty goal?"
        message="Tasks will not be deleted."
        confirmLabel="Remove"
        onCancel={() => setRemoving(false)}
        onConfirm={() => void remove()}
      />
    </>
  );
}

const sortLabels = { none: "Default order", desc: "Highest first", asc: "Lowest first" } as const;

function GoalDetail({
  goalId,
  knownTitle,
  version,
  initialDraft,
  logo,
  appearanceFor,
  onDraft,
  onStyle,
  onRenamed,
  onEditTask,
  onChanged,
}: {
  goalId: string;
  knownTitle?: string;
  version: number;
  initialDraft?: GoalDraft;
  logo?: GoalLogo;
  appearanceFor: (name: string) => GoalAppearance;
  onDraft: (draft: GoalDraft) => void;
  onStyle: (name: string) => void;
  onRenamed: (previous: string, next: string) => void;
  onEditTask: (task: PlannerTask, goal: string) => void;
  onChanged: () => void;
}) {
  const planner = usePlanner();
  const [context, setContext] = useState<GoalContext | null>(null);
  const [draft, setDraft] = useState<GoalDraft | null>(initialDraft ?? null);
  const [section, setSection] = useState<"tasks" | "brief" | "plan">("tasks");
  const [codexOnly, setCodexOnly] = useState(false);
  const [sort, setSort] = useState<keyof typeof sortLabels>("none");
  const [editingGoal, setEditingGoal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [compare, setCompare] = useState(false);
  const active = useRef(true);
  const generation = useRef(0);
  const lock = useRef(false);
  const hydrated = useRef(!!initialDraft);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const callbacks = useRef({ onDraft, onChanged, onRenamed });
  callbacks.current = { onDraft, onChanged, onRenamed };
  const requestKey = useRequestKey();

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const result = await goalIntegration.getGoal(goalId);
      if (!active.current || current !== generation.current) return;
      setContext(result);
      if (!hydrated.current) {
        const next = {
          title: result.goal.title,
          outcome: result.goal.outcome,
          markdown: result.prd?.markdown ?? "",
          criteria: result.prd?.acceptance_criteria.join("\n") ?? "",
        };
        hydrated.current = true;
        draftRef.current = next;
        setDraft(next);
        callbacks.current.onDraft(next);
      } else if (draftRef.current?.markdown !== (result.prd?.markdown ?? "")) setCompare(true);
    } catch (caught) {
      if (active.current && current === generation.current) setError(integrationError(caught));
    } finally {
      if (active.current && current === generation.current) setLoading(false);
    }
  }, [goalId]);
  useEffect(() => {
    active.current = true;
    void refresh();
    return () => {
      active.current = false;
      generation.current += 1;
    };
  }, [refresh, version]);

  const change = (patch: Partial<GoalDraft>) => {
    if (!draft) return;
    const next = { ...draft, ...patch };
    setDraft(next);
    callbacks.current.onDraft(next);
    setNotice("");
  };
  const save = async (kind: "goal" | "prd", event: FormEvent) => {
    event.preventDefault();
    if (!context || !draft || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (kind === "goal") {
        const values = {
          goal_id: goalId,
          expected_revision: context.goal.revision,
          title: draft.title.trim(),
          outcome: draft.outcome.trim(),
        };
        const previous = context.goal.title;
        const result = await goalIntegration.saveGoal(values, requestKey([kind, values]));
        if (!active.current) return;
        setContext((current) => (current ? { ...current, goal: result.goal } : current));
        setEditingGoal(false);
        callbacks.current.onRenamed(previous, result.goal.title);
      } else {
        const criteria = splitCriteria(draft.criteria);
        const result = await goalIntegration.savePrd(
          context,
          draft.markdown,
          criteria,
          requestKey([kind, goalId, context.goal.revision, context.prd?.revision, draft.markdown, criteria]),
        );
        if (!active.current) return;
        setContext((current) => (current ? { ...current, goal: result.goal, prd: result.prd } : current));
        setCompare(false);
      }
      setNotice(kind === "goal" ? "Goal saved." : "Brief saved.");
      callbacks.current.onChanged();
    } catch (caught) {
      if (active.current) setError(integrationError(caught));
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  };

  const title = context?.goal.title ?? knownTitle ?? "Goal";
  const goalTasks = useMemo(() => tasksForGoal(planner.tasks, title), [planner.tasks, title]);
  const visibleTasks = useMemo(() => {
    const filtered = codexOnly ? goalTasks.filter((task) => task.execution_target === "codex") : goalTasks;
    if (sort === "none") return openFirst(filtered);
    return [...filtered].sort((a, b) => (sort === "desc" ? b.priority - a.priority : a.priority - b.priority));
  }, [goalTasks, codexOnly, sort]);
  const done = goalTasks.filter((task) => task.isComplete).length;
  const appearance = appearanceFor(title);

  return (
    <div className="goal-detail">
      <header className="goal-head">
        <Link className="ot-round" to={goalRoute()} aria-label="Back to goals">
          <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
        </Link>
        <button type="button" className="goal-head-avatar" aria-label={`Appearance for goal: ${title}`} onClick={() => onStyle(title)}>
          <GoalAvatar name={title} appearance={appearance} logo={logo} size={40} />
        </button>
        <h1>{title}</h1>
        <button
          type="button"
          className="ot-round ot-round--plain"
          aria-label="Refresh goal"
          data-tip="Refresh"
          data-tip-align="end"
          disabled={busy || loading}
          onClick={() => {
            void refresh();
            void planner.refresh();
          }}
        >
          <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </header>

      <nav aria-label="Goal sections" className="goal-tabs">
        {(["tasks", "brief", "plan"] as const).map((value) => (
          <button type="button" key={value} aria-pressed={section === value} disabled={busy} onClick={() => setSection(value)}>
            {value === "tasks" ? "Tasks" : value === "brief" ? "Brief" : "Plan"}
          </button>
        ))}
        {section === "tasks" ? (
          <Segmented
            label="Tasks shown"
            options={[
              { value: "all", label: "All tasks" },
              { value: "codex", label: "Codex" },
            ]}
            value={codexOnly ? "codex" : "all"}
            onChange={(value) => setCodexOnly(value === "codex")}
          />
        ) : null}
      </nav>

      {error ? (
        <p role="alert" className="ot-notice ot-notice--error">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="ot-notice">
          {notice}
        </p>
      ) : null}

      <div className="goal-section" key={section}>
        {section === "tasks" ? (
          <section className="plan" aria-label="Tasks">
            <header className="plan-head">
              <h2>Tasks</h2>
              {goalTasks.length ? (
                <span aria-label={`${done} of ${goalTasks.length} tasks completed`}>
                  {done}/{goalTasks.length}
                </span>
              ) : null}
              <div className="plan-head-tools">
                {goalTasks.length > 1 ? (
                  <button
                    type="button"
                    className="ot-round ot-round--plain"
                    aria-label={`Sort by priority: ${sortLabels[sort]}`}
                    data-tip={sortLabels[sort]}
                    data-tip-align="end"
                    data-active={sort !== "none" || undefined}
                    onClick={() => setSort(sort === "none" ? "desc" : sort === "desc" ? "asc" : "none")}
                  >
                    <ArrowUpDown size={16} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </header>
            {goalTasks.length ? (
              <div className="ot-progress goal-progress" style={{ "--goal-ink": goalColors[appearance.color]?.ink } as React.CSSProperties}>
                <i style={{ width: `${(done / goalTasks.length) * 100}%` }} />
              </div>
            ) : null}
            {!planner.loaded ? (
              <PlannerStatus />
            ) : visibleTasks.length ? (
              <TaskList
                tasks={visibleTasks}
                detail="goal"
                keepOrder
                onEdit={(task) => onEditTask(task, title)}
                meta={(task) =>
                  [
                    task.work_stage && task.work_stage !== "not_started" && !task.isComplete ? task.work_stage.replace(/_/g, " ") : "",
                    task.execution_target === "codex" ? "Codex" : "",
                  ]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
              />
            ) : (
              <Empty icon={Flag}>{codexOnly ? "No tasks marked for Codex." : "No tasks planned"}</Empty>
            )}
          </section>
        ) : !context || !draft ? (
          loading ? (
            <p role="status" className="goal-muted">
              Refreshing goal…
            </p>
          ) : null
        ) : section === "brief" ? (
          <div className="goal-brief">
            <div className="goal-brief-head">
              <span className="goal-meta">Brief {context.prd?.revision ?? "not written"}</span>
              <button type="button" className="ot-link" disabled={busy} aria-expanded={editingGoal} onClick={() => setEditingGoal((value) => !value)}>
                Edit goal
              </button>
            </div>
            {context.goal.outcome && !editingGoal ? <p className="goal-outcome">{context.goal.outcome}</p> : null}
            {editingGoal ? (
              <form className="goal-form" onSubmit={(event) => void save("goal", event)}>
                <label className="ot-field">
                  <span>Goal name</span>
                  <input className="ot-input" value={draft.title} maxLength={200} required disabled={busy} onChange={(event) => change({ title: event.target.value })} />
                </label>
                <label className="ot-field">
                  <span>Outcome</span>
                  <textarea className="ot-input" value={draft.outcome} maxLength={16000} rows={3} disabled={busy} onChange={(event) => change({ outcome: event.target.value })} />
                </label>
                <button type="submit" className="ot-button ot-button--small" disabled={busy || loading || !draft.title.trim()}>
                  {busy ? "Saving…" : "Save goal"}
                </button>
              </form>
            ) : null}
            <form className="goal-form" onSubmit={(event) => void save("prd", event)}>
              {compare ? (
                <details>
                  <summary>Current saved brief — your draft is kept below</summary>
                  <pre className="goal-prose">{context.prd?.markdown || "No saved brief."}</pre>
                </details>
              ) : null}
              <label className="ot-field">
                <span>Requirements</span>
                <textarea
                  className="ot-input"
                  value={draft.markdown}
                  onChange={(event) => change({ markdown: event.target.value })}
                  rows={10}
                  maxLength={200000}
                  placeholder="What should this goal achieve?"
                  required
                  disabled={busy}
                />
              </label>
              <label className="ot-field">
                <span>Acceptance criteria</span>
                <textarea
                  className="ot-input"
                  value={draft.criteria}
                  onChange={(event) => change({ criteria: event.target.value })}
                  rows={4}
                  placeholder="One clear criterion per line"
                  disabled={busy}
                />
              </label>
              <button type="submit" className="ot-button ot-button--small" disabled={busy || loading || !draft.markdown.trim()}>
                {busy ? "Saving…" : "Save brief"}
              </button>
            </form>
          </div>
        ) : context.plan ? (
          <div className="goal-plan-view">
            {planIsStale(context) ? (
              <p role="alert" className="ot-notice ot-notice--error">
                Requirements changed. Reconcile this plan before starting work.
              </p>
            ) : null}
            <p className="goal-meta">
              Plan {context.plan.revision} · Brief {context.plan.source_prd_revision}
            </p>
            {context.plan.summary ? <p className="goal-prose">{context.plan.summary}</p> : null}
            <ol className="goal-plan">
              {context.plan.items.map((item) => (
                <li key={item.id}>
                  <strong>{item.title}</strong>
                  {item.description ? <p className="goal-prose goal-muted">{item.description}</p> : null}
                  {context.tasks
                    .filter((task) => task.source_plan_id === context.plan?.id && task.source_plan_item_id === item.id)
                    .map((task) => (
                      <Link key={task.id} className="ot-link" to={goalRoute(goalId, task.id)}>
                        {task.content} · {taskStageLabel(task)}
                      </Link>
                    ))}
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="goal-muted">No saved plan yet.</p>
        )}
      </div>
    </div>
  );
}
