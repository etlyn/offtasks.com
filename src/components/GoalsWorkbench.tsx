import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowUpDown, Check, Flag, MoreHorizontal, Pencil, RefreshCw, Shuffle, Sparkles, Tag, X } from "lucide-react";
import { goalIntegration } from "@/lib/goalIntegration";
import { goalLogoSource, listGoalLogos, prepareGoalLogo, setGoalLogo, type GoalLogo } from "@/lib/goalLogos";
import {
  goalRoute,
  integrationError,
  integrationRequestKey,
  type FeatureGoal,
} from "@/lib/goalWorkbench";
import { ChatGPTHandoffSheet } from "@/planner/ChatGPTHandoffSheet";
import { PlannerStatus } from "@/planner/PlanPages";
import { TagFilter, TagLabels, TagPicker } from "@/planner/TagControls";
import { TaskList } from "@/planner/TaskList";
import type { ChatGPTRequest } from "@/planner/chatgptHandoff";
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
import { errorText, notify } from "@/planner/notices";
import { usePlanner } from "@/planner/store";
import { goalTagKey } from "@/planner/tags";
import { Confirm, Empty, Sheet } from "@/planner/ui";

interface GoalDraft {
  title: string;
  outcome: string;
  revision: string;
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
  const [goalTagFilter, setGoalTagFilter] = useState("");
  const drafts = useRef(new Map<string, GoalDraft>());
  const listVersion = useRef(0);
  const active = useRef(true);
  const callbacks = useRef({ onChanged, onGoalsLoaded, onEditTask, onGoalOpen });
  callbacks.current = { onChanged, onGoalsLoaded, onEditTask, onGoalOpen };

  const refresh = useCallback(async () => {
    const version = ++listVersion.current;
    setError("");
    try {
      // The goal id remains stable when its name or description changes.
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
  const tagFilter = planner.tagging.tags.some((tag) => tag.id === goalTagFilter) ? goalTagFilter : "";
  const visibleGoals = tagFilter ? planner.summaries.filter((summary) => {
    const goal = featureByKey.get(goalKey(summary.name));
    return goal && planner.tagging.forTarget(goalTagKey(goal.id)).some((tag) => tag.id === tagFilter);
  }) : planner.summaries;

  return (
    <section className="page page--goals" aria-label="Goals">
      {goalId ? (
        <GoalDetail
          key={`${ownerId}:${goalId}`}
          goalId={goalId}
          goal={openGoal}
          loading={!goalsLoaded && !error}
          loadError={error}
          initialDraft={drafts.current.get(goalId)}
          logo={logos[goalId]}
          appearanceFor={appearanceFor}
          onDraft={(draft) => {
            if (draft) drafts.current.set(goalId, draft);
            else drafts.current.delete(goalId);
          }}
          onStyle={(name) => setStyling(name)}
          onSaved={(previous, updated) => {
            setGoals((current) => current.map((goal) => goal.id === updated.id ? updated : goal));
            // A goal's colour and emoji follow it to its new name.
            const kept = appearances[goalKey(previous)];
            if (kept && goalKey(previous) !== goalKey(updated.title)) {
              try {
                writeGoalAppearance(ownerId, previous, null);
                setAppearances(writeGoalAppearance(ownerId, updated.title, kept));
              } catch {
                // The default colour for the new name is used instead.
              }
            }
            changed();
          }}
          onEditTask={(task, goal) => callbacks.current.onEditTask(task, goal)}
          onRefresh={changed}
        />
      ) : (
        <>
          <header className="board-head">
            <h1 className="board-title">Goals</h1>
            <TagFilter tags={planner.tagging.tags} value={tagFilter} onChange={setGoalTagFilter} label="Filter goals by tag" allLabel="All goals" />
          </header>
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
          ) : visibleGoals.length ? (
            <ul className="goals">
              {visibleGoals.map((goal) => {
                const feature = featureByKey.get(goalKey(goal.name));
                const appearance = appearanceFor(goal.name);
                const tags = feature ? planner.tagging.forTarget(goalTagKey(feature.id)) : [];
                const ink = goalColors[appearance.color]?.ink;
                const body = (
                  <>
                    <GoalAvatar name={goal.name} appearance={appearance} logo={feature ? logos[feature.id] : null} />
                    <span className="goal-text">
                      <strong>{goal.name}</strong>
                      <span>{goal.total ? `${goal.completed}/${goal.total} done` : "Ready for a first step"}</span>
                      {tags.length ? (
                        <span className="task-labels"><TagLabels tags={tags} /></span>
                      ) : null}
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
          ) : tagFilter ? (
            <Empty icon={Tag}>No goals with this tag</Empty>
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
      if (feature) planner.tagging.forget([goalTagKey(feature.id)]);
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
  goalId, goal, loading, loadError, initialDraft, logo, appearanceFor, onDraft,
  onStyle, onSaved, onEditTask, onRefresh,
}: {
  goalId: string;
  goal?: FeatureGoal;
  loading: boolean;
  loadError: string;
  initialDraft?: GoalDraft;
  logo?: GoalLogo;
  appearanceFor: (name: string) => GoalAppearance;
  onDraft: (draft?: GoalDraft) => void;
  onStyle: (name: string) => void;
  onSaved: (previous: string, goal: FeatureGoal) => void;
  onEditTask: (task: PlannerTask, goal: string) => void;
  onRefresh: () => void;
}) {
  const planner = usePlanner();
  const [section, setSection] = useState<"tasks" | "description">(initialDraft ? "description" : "tasks");
  const [draft, setDraft] = useState<GoalDraft | null>(initialDraft ?? null);
  const [editing, setEditing] = useState(!!initialDraft);
  const [sort, setSort] = useState<keyof typeof sortLabels>("none");
  const [request, setRequest] = useState<ChatGPTRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestKey = useRequestKey();
  const saveLock = useRef(false);
  const aiTrigger = useRef<HTMLButtonElement | null>(null);

  const title = goal?.title ?? "Goal";
  const goalTasks = useMemo(() => tasksForGoal(planner.tasks, title), [planner.tasks, title]);
  const done = goalTasks.filter((task) => task.isComplete).length;
  const appearance = appearanceFor(title);
  const visibleTasks = sort === "none" ? openFirst(goalTasks) :
    [...goalTasks].sort((left, right) => sort === "desc" ? right.priority - left.priority : left.priority - right.priority);
  const staleDraft = !!goal && !!draft && goal.revision !== draft.revision;

  const updateDraft = (value: GoalDraft) => {
    setDraft(value);
    onDraft(value);
    setNotice("");
    setError("");
  };
  const startEditing = () => {
    if (!goal) return;
    if (!draft) updateDraft({ title: goal.title, outcome: goal.outcome, revision: goal.revision });
    setEditing(true);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!goal || !draft || !draft.title.trim() || staleDraft || saveLock.current) return;
    saveLock.current = true;
    setBusy(true);
    setError("");
    try {
      const values = { goal_id: goalId, expected_revision: draft.revision, title: draft.title.trim(), outcome: draft.outcome.trim() };
      const result = await goalIntegration.saveGoal(values, requestKey(values));
      onSaved(goal.title, result.goal);
      setDraft(null);
      onDraft();
      setEditing(false);
      setNotice("Goal saved.");
    } catch (caught) {
      setError(integrationError(caught));
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  };

  const openChatGPT = (kind: ChatGPTRequest["kind"], id: string, trigger: HTMLButtonElement) => {
    aiTrigger.current = trigger;
    setRequest(planner.chatGPT.prepare(kind, id));
  };

  return (
    <div className="goal-detail">
      <header className="goal-head">
        <Link className="ot-round" to={goalRoute()} aria-label="Back to goals">
          <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
        </Link>
        <button type="button" className="goal-head-avatar" aria-label={`Appearance for goal: ${title}`} disabled={!goal} onClick={() => onStyle(title)}>
          <GoalAvatar name={title} appearance={appearance} logo={logo} size={40} />
        </button>
        <h1>{title}</h1>
        <button type="button" className="ot-round ot-round--plain" aria-label="Refresh goal" data-tip="Refresh" data-tip-align="end" disabled={busy || loading} onClick={onRefresh}>
          <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </header>

      {goal ? (
        <div className="goal-toolbar">
          <nav aria-label="Goal sections" className="goal-tabs">
            {(["tasks", "description"] as const).map((value) => (
              <button type="button" key={value} aria-pressed={section === value} disabled={busy} onClick={() => setSection(value)}>
                {value === "tasks" ? "Tasks" : "Description"}
              </button>
            ))}
          </nav>
          {goal.status === "active" ? (
            <button
              type="button"
              className="ot-chip goal-ai-button"
              disabled={busy}
              onClick={(event) => {
                if (goal.outcome.trim()) openChatGPT("goal", goalId, event.currentTarget);
                else {
                  setSection("description");
                  startEditing();
                  setNotice("Add a description to start with AI.");
                }
              }}
            >
              <Sparkles size={15} strokeWidth={1.8} aria-hidden="true" />
              Start with AI
            </button>
          ) : null}
        </div>
      ) : null}

      {error || loadError ? <p role="alert" className="ot-notice ot-notice--error">{error || loadError}</p> : null}
      {notice ? <p role="status" className="ot-notice">{notice}</p> : null}

      {!goal ? (
        loading ? <p role="status" className="goal-muted">Loading goal…</p> :
          !loadError ? <Empty icon={Flag}>Goal unavailable</Empty> : null
      ) : (
        <div className="goal-section" key={section}>
          {section === "tasks" ? (
            <section className="plan" aria-label="Tasks">
              <header className="plan-head">
                <h2>Tasks</h2>
                {goalTasks.length ? <span aria-label={`${done} of ${goalTasks.length} tasks completed`}>{done}/{goalTasks.length}</span> : null}
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
              {!planner.loaded ? <PlannerStatus /> : visibleTasks.length ? (
                <TaskList
                  tasks={visibleTasks}
                  detail="goal"
                  keepOrder
                  onEdit={(task) => onEditTask(task, title)}
                  onChatGPT={goal.status === "active" ? (task, trigger) => openChatGPT("task", task.id, trigger) : undefined}
                  meta={(task) => {
                    const phase = planner.chatGPT.phase(task);
                    if (phase === "waiting") return "Waiting for ChatGPT";
                    if (phase === "working") return "ChatGPT working";
                    if (phase === "review") return "Ready to review";
                    if (phase === "blocked") return "Needs input";
                    return !task.isComplete && task.work_stage && task.work_stage !== "not_started" ? task.work_stage.replace(/_/g, " ") : undefined;
                  }}
                />
              ) : <Empty icon={Flag}>No tasks planned</Empty>}
            </section>
          ) : (
            <section className="goal-description" aria-label="Goal description">
              {editing && draft ? (
                <form className="goal-form" onSubmit={(event) => void save(event)}>
                  {staleDraft ? (
                    <div className="ot-notice" role="status">
                      The saved goal changed while you were editing.
                      <button type="button" className="ot-link" onClick={() => updateDraft({ title: goal.title, outcome: goal.outcome, revision: goal.revision })}>
                        Load saved version
                      </button>
                    </div>
                  ) : null}
                  <label className="ot-field">
                    <span>Goal name</span>
                    <input className="ot-input" value={draft.title} maxLength={200} required disabled={busy} onChange={(event) => updateDraft({ ...draft, title: event.target.value })} />
                  </label>
                  <label className="ot-field">
                    <span>Description</span>
                    <textarea className="ot-input" value={draft.outcome} maxLength={16000} rows={4} autoFocus disabled={busy} onChange={(event) => updateDraft({ ...draft, outcome: event.target.value })} />
                  </label>
                  <div className="goal-description-actions">
                    <button type="button" className="ot-button ot-button--soft ot-button--small" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
                    <button type="submit" className="ot-button ot-button--small" disabled={busy || staleDraft || !draft.title.trim()}>{busy ? "Saving…" : "Save goal"}</button>
                  </div>
                </form>
              ) : (
                <div className="goal-description-read">
                  <p className="goal-prose">{goal.outcome || "No description yet"}</p>
                  <button type="button" className="ot-round ot-round--plain" aria-label="Edit description" data-tip="Edit description" data-tip-align="end" onClick={startEditing}>
                    <Pencil size={16} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </div>
              )}
              <GoalTags id={goalId} />
            </section>
          )}
        </div>
      )}

      <ChatGPTHandoffSheet
        request={request}
        onClose={() => setRequest(null)}
        onTrack={planner.chatGPT.track}
        returnFocus={aiTrigger}
      />
    </div>
  );
}

function GoalTags({ id }: { id: string }) {
  const { tagging } = usePlanner();
  const [open, setOpen] = useState(false);
  const picker = useId();
  const key = goalTagKey(id);
  const tags = tagging.forTarget(key);
  const selected = tags.map((tag) => tag.id);
  const toggle = (tag: string) => {
    const removing = selected.includes(tag);
    try {
      tagging.assign(key, removing ? [] : [tag], removing ? [tag] : []);
    } catch (caught) {
      notify("Could not save tags", errorText(caught));
    }
  };
  return (
    <div className="goal-tags">
      <div className="goal-tags-row">
        {tags.length ? <span className="task-labels"><TagLabels tags={tags} /></span> : null}
        <button type="button" className="ot-chip" aria-expanded={open} aria-controls={picker} onClick={() => setOpen(!open)}>
          <Tag size={14} strokeWidth={1.8} aria-hidden="true" />
          {tags.length ? "Edit tags" : "Add tags"}
        </button>
      </div>
      <TagPicker id={picker} open={open} disabled={false} tags={tagging.tags} selected={selected} onToggle={toggle} onCreate={tagging.create} label="Goal tags" />
    </div>
  );
}
