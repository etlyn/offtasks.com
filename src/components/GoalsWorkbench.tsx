import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Flag, Plus, RefreshCw } from "lucide-react";
import { goalIntegration } from "@/lib/goalIntegration";
import {
  goalRoute,
  integrationError,
  integrationRequestKey,
  planIsStale,
  splitCriteria,
  taskStageLabel,
  type FeatureGoal,
  type GoalContext,
  type TaskContext,
} from "@/lib/goalWorkbench";
import "./GoalsWorkbench.css";

interface GoalDraft {
  title: string;
  outcome: string;
  markdown: string;
  criteria: string;
}
function useRequestKey() {
  const previous = useRef<{ payload: string; key: string } | null>(null);
  return (payload: unknown) => {
    const serialized = JSON.stringify(payload);
    if (previous.current?.payload !== serialized)
      previous.current = { payload: serialized, key: integrationRequestKey() };
    return previous.current.key;
  };
}

export function GoalsWorkbench({
  ownerId,
  onChanged,
  onGoalsLoaded,
}: {
  ownerId: string;
  onChanged: () => void;
  onGoalsLoaded: (goals: FeatureGoal[]) => void;
}) {
  const [params, setParams] = useSearchParams();
  const goalId = params.get("goal");
  const taskId = params.get("task");
  const [goals, setGoals] = useState<FeatureGoal[]>([]);
  const goalsRef = useRef<FeatureGoal[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newOutcome, setNewOutcome] = useState("");
  const [contextVersion, setContextVersion] = useState(0);
  const drafts = useRef(new Map<string, GoalDraft>());
  const listVersion = useRef(0);
  const active = useRef(true);
  const lock = useRef(false);
  const callbacks = useRef({ onChanged, onGoalsLoaded });
  callbacks.current = { onChanged, onGoalsLoaded };
  const requestKey = useRequestKey();

  const refresh = useCallback(
    async (offset = 0) => {
      const version = ++listVersion.current;
      setLoading(true);
      setError("");
      try {
        const result = await goalIntegration.listGoals(offset);
        if (!active.current || version !== listVersion.current) return;
        const next = offset
          ? [
              ...goalsRef.current.filter(
                (goal) => !result.goals.some((item) => item.id === goal.id),
              ),
              ...result.goals,
            ]
          : result.goals;
        goalsRef.current = next;
        setGoals(next);
        callbacks.current.onGoalsLoaded(next);
        setNextOffset(result.next_offset);
      } catch (caught) {
        if (active.current && version === listVersion.current)
          setError(integrationError(caught));
      } finally {
        if (active.current && version === listVersion.current)
          setLoading(false);
      }
    },
    [ownerId],
  );
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
      if (document.visibilityState === "visible" && !lock.current) {
        void refresh();
        setContextVersion((value) => value + 1);
      }
    };
    document.addEventListener("visibilitychange", visible);
    return () => document.removeEventListener("visibilitychange", visible);
  }, [refresh]);
  const changed = (updatedGoal?: FeatureGoal) => {
    if (updatedGoal) {
      const next = [
        ...goalsRef.current.filter((goal) => goal.id !== updatedGoal.id),
        updatedGoal,
      ];
      goalsRef.current = next;
      setGoals(next);
      callbacks.current.onGoalsLoaded(next);
    }
    callbacks.current.onChanged();
    void refresh();
  };
  const createGoal = async (event: FormEvent) => {
    event.preventDefault();
    if (!newTitle.trim() || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const values = { title: newTitle.trim(), outcome: newOutcome.trim() };
    try {
      const result = await goalIntegration.saveGoal(
        values,
        requestKey(["create", values]),
      );
      if (!active.current) return;
      setCreating(false);
      setNewTitle("");
      setNewOutcome("");
      setParams({ view: "goals", goal: result.goal.id });
      changed(result.goal);
    } catch (caught) {
      if (active.current) setError(integrationError(caught));
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  };

  return (
    <section className="goal-workbench" aria-label="Goals workspace">
      {taskId ? (
        <TaskDetail
          key={`${ownerId}:${taskId}`}
          taskId={taskId}
          onChanged={changed}
        />
      ) : goalId ? (
        <GoalDetail
          key={`${ownerId}:${goalId}`}
          goalId={goalId}
          version={contextVersion}
          initialDraft={drafts.current.get(goalId)}
          onDraft={(draft) => drafts.current.set(goalId, draft)}
          onChanged={changed}
        />
      ) : (
        <>
          <div className="goal-workbench-heading">
            <h1>Goals</h1>
            <div className="goal-actions">
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading || busy}
                aria-label="Refresh goals"
              >
                <RefreshCw size={16} />
              </button>
              <button
                type="button"
                className="goal-primary"
                onClick={() => setCreating((value) => !value)}
                disabled={busy}
              >
                <Plus size={16} /> New goal
              </button>
            </div>
          </div>
          {error ? (
            <p role="alert" className="goal-notice">
              {error}
              {goals.length ? " Showing the last loaded goals." : ""}
            </p>
          ) : null}
          {creating ? (
            <form
              className="goal-form"
              onSubmit={(event) => void createGoal(event)}
            >
              <label>
                Goal name
                <input
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  maxLength={200}
                  required
                  disabled={busy}
                  autoFocus
                />
              </label>
              <label>
                Outcome <span className="goal-muted">optional</span>
                <textarea
                  value={newOutcome}
                  onChange={(event) => setNewOutcome(event.target.value)}
                  maxLength={16000}
                  disabled={busy}
                  rows={3}
                />
              </label>
              <div className="goal-actions">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  className="goal-primary"
                  type="submit"
                  disabled={busy || !newTitle.trim()}
                >
                  {busy ? "Saving…" : "Create goal"}
                </button>
              </div>
            </form>
          ) : null}
          {loading ? (
            <p role="status" className="goal-muted">
              Refreshing goals…
            </p>
          ) : null}
          {!loading && !error && goals.length === 0 ? (
            <p className="goal-empty">
              <Flag size={22} /> No goals yet.
            </p>
          ) : null}
          <ul className="goal-list">
            {goals.map((goal) => (
              <li key={goal.id}>
                <Link to={goalRoute(goal.id)} className="goal-list-item">
                  <span className="goal-mark">
                    <Flag size={18} />
                  </span>
                  <span>
                    <strong>{goal.title}</strong>
                    {goal.outcome ? (
                      <span className="goal-muted goal-outcome">
                        {goal.outcome}
                      </span>
                    ) : null}
                  </span>
                  <span className="goal-meta">{goal.status}</span>
                </Link>
              </li>
            ))}
          </ul>
          {nextOffset !== null ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => void refresh(nextOffset)}
            >
              Load more
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}

function GoalDetail({
  goalId,
  version,
  initialDraft,
  onDraft,
  onChanged,
}: {
  goalId: string;
  version: number;
  initialDraft?: GoalDraft;
  onDraft: (draft: GoalDraft) => void;
  onChanged: (goal?: FeatureGoal) => void;
}) {
  const [context, setContext] = useState<GoalContext | null>(null);
  const [draft, setDraft] = useState<GoalDraft | null>(initialDraft ?? null);
  const [section, setSection] = useState<"tasks" | "brief" | "plan">("tasks");
  const [codexOnly, setCodexOnly] = useState(false);
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
  const callbacks = useRef({ onDraft, onChanged });
  callbacks.current = { onDraft, onChanged };
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
      } else if (draftRef.current?.markdown !== (result.prd?.markdown ?? ""))
        setCompare(true);
    } catch (caught) {
      if (active.current && current === generation.current)
        setError(integrationError(caught));
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
      let savedGoal: FeatureGoal;
      if (kind === "goal") {
        const values = {
          goal_id: goalId,
          expected_revision: context.goal.revision,
          title: draft.title.trim(),
          outcome: draft.outcome.trim(),
        };
        const result = await goalIntegration.saveGoal(
          values,
          requestKey([kind, values]),
        );
        if (!active.current) return;
        setContext((previous) =>
          previous ? { ...previous, goal: result.goal } : previous,
        );
        setEditingGoal(false);
        savedGoal = result.goal;
      } else {
        const criteria = splitCriteria(draft.criteria);
        const result = await goalIntegration.savePrd(
          context,
          draft.markdown,
          criteria,
          requestKey([
            kind,
            goalId,
            context.goal.revision,
            context.prd?.revision,
            draft.markdown,
            criteria,
          ]),
        );
        if (!active.current) return;
        setContext((previous) =>
          previous
            ? { ...previous, goal: result.goal, prd: result.prd }
            : previous,
        );
        setCompare(false);
        savedGoal = result.goal;
      }
      setNotice(kind === "goal" ? "Goal saved." : "Brief saved.");
      callbacks.current.onChanged(savedGoal);
    } catch (caught) {
      if (active.current) setError(integrationError(caught));
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  };
  return (
    <>
      <Link className="goal-back" to={goalRoute()}>
        <ArrowLeft size={16} /> Goals
      </Link>
      <div className="goal-workbench-heading">
        <h1>{context?.goal.title ?? "Goal"}</h1>
        <button
          type="button"
          disabled={busy || loading}
          onClick={() => void refresh()}
          aria-label="Refresh goal"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      {error ? (
        <p role="alert" className="goal-notice">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="goal-muted">
          {notice}
        </p>
      ) : null}
      {loading ? (
        <p role="status" className="goal-muted">
          Refreshing goal…
        </p>
      ) : null}
      {context && draft ? (
        <>
          {context.goal.outcome ? (
            <p className="goal-muted">{context.goal.outcome}</p>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => setEditingGoal((value) => !value)}
            aria-expanded={editingGoal}
          >
            Edit goal
          </button>
          {editingGoal ? (
            <form
              className="goal-form"
              onSubmit={(event) => void save("goal", event)}
            >
              <label>
                Goal name
                <input
                  value={draft.title}
                  maxLength={200}
                  required
                  disabled={busy}
                  onChange={(event) => change({ title: event.target.value })}
                />
              </label>
              <label>
                Outcome
                <textarea
                  value={draft.outcome}
                  maxLength={16000}
                  rows={3}
                  disabled={busy}
                  onChange={(event) => change({ outcome: event.target.value })}
                />
              </label>
              <button
                type="submit"
                className="goal-primary"
                disabled={busy || loading || !draft.title.trim()}
              >
                {busy ? "Saving…" : "Save goal"}
              </button>
            </form>
          ) : null}
          <nav aria-label="Goal sections" className="goal-section-nav">
            {(["tasks", "brief", "plan"] as const).map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={section === value}
                disabled={busy}
                onClick={() => setSection(value)}
              >
                {value === "tasks"
                  ? "Tasks"
                  : value === "brief"
                  ? "Brief"
                  : "Plan"}
              </button>
            ))}
          </nav>
          <div className="goal-section-body" key={section}>
            {section === "tasks" ? (
              <>
                <div className="goal-task-tools">
                  <span className="goal-muted">
                    {context.tasks.length} tasks
                  </span>
                  <label className="goal-checkbox">
                    <input
                      type="checkbox"
                      checked={codexOnly}
                      onChange={(event) => setCodexOnly(event.target.checked)}
                    />{" "}
                    For Codex
                  </label>
                </div>
                <ul className="goal-list">
                  {context.tasks
                    .filter(
                      (task) => !codexOnly || task.execution_target === "codex",
                    )
                    .map((task) => (
                      <li key={task.id}>
                        <Link
                          to={goalRoute(goalId, task.id)}
                          className="goal-list-item"
                        >
                          <span
                            className={`goal-task-check${
                              task.isComplete ? " is-complete" : ""
                            }`}
                            aria-label={task.isComplete ? "Completed" : "Open"}
                          >
                            {task.isComplete ? "✓" : ""}
                          </span>
                          <span>
                            <strong>{task.content}</strong>
                            <span className="goal-meta">
                              {taskStageLabel(task)}
                              {task.execution_target === "codex"
                                ? " · Codex"
                                : ""}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                </ul>
                {!context.tasks.some(
                  (task) => !codexOnly || task.execution_target === "codex",
                ) ? (
                  <p className="goal-muted">
                    {codexOnly
                      ? "No tasks marked for Codex."
                      : "No tasks yet. Use Add New Task to add one to this goal."}
                  </p>
                ) : null}
              </>
            ) : section === "brief" ? (
              <form
                className="goal-form"
                onSubmit={(event) => void save("prd", event)}
              >
                <span className="goal-meta">
                  Brief {context.prd?.revision ?? "not written"}
                </span>
                {compare ? (
                  <details>
                    <summary>
                      Current saved brief — your draft is kept below
                    </summary>
                    <pre className="goal-prose">
                      {context.prd?.markdown || "No saved brief."}
                    </pre>
                  </details>
                ) : null}
                <label>
                  Requirements
                  <textarea
                    value={draft.markdown}
                    onChange={(event) =>
                      change({ markdown: event.target.value })
                    }
                    rows={10}
                    maxLength={200000}
                    required
                    disabled={busy}
                  />
                </label>
                <label>
                  Acceptance criteria
                  <textarea
                    value={draft.criteria}
                    onChange={(event) =>
                      change({ criteria: event.target.value })
                    }
                    rows={4}
                    placeholder="One clear criterion per line"
                    disabled={busy}
                  />
                </label>
                <button
                  type="submit"
                  className="goal-primary"
                  disabled={busy || loading || !draft.markdown.trim()}
                >
                  {busy ? "Saving…" : "Save brief"}
                </button>
              </form>
            ) : context.plan ? (
              <>
                {planIsStale(context) ? (
                  <p role="alert" className="goal-notice">
                    Requirements changed. Reconcile this plan before starting
                    work.
                  </p>
                ) : null}
                <p className="goal-meta">
                  Plan {context.plan.revision} · Brief{" "}
                  {context.plan.source_prd_revision}
                </p>
                <p className="goal-prose">{context.plan.summary}</p>
                <ol className="goal-plan">
                  {context.plan.items.map((item) => (
                    <li key={item.id}>
                      <strong>{item.title}</strong>
                      {item.description ? (
                        <p className="goal-prose goal-muted">
                          {item.description}
                        </p>
                      ) : null}
                      {context.tasks
                        .filter(
                          (task) =>
                            task.source_plan_id === context.plan?.id &&
                            task.source_plan_item_id === item.id,
                        )
                        .map((task) => (
                          <Link key={task.id} to={goalRoute(goalId, task.id)}>
                            {task.content} · {taskStageLabel(task)}
                          </Link>
                        ))}
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p className="goal-muted">No saved plan yet.</p>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}

function TaskDetail({
  taskId,
  onChanged,
}: {
  taskId: string;
  onChanged: () => void;
}) {
  const [context, setContext] = useState<TaskContext | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const active = useRef(true);
  const lock = useRef(false);
  const generation = useRef(0);
  const changed = useRef(onChanged);
  changed.current = onChanged;
  const requestKey = useRequestKey();
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const result = await goalIntegration.getTask(taskId);
      if (active.current && current === generation.current) setContext(result);
    } catch (caught) {
      if (active.current && current === generation.current)
        setError(integrationError(caught));
    } finally {
      if (active.current && current === generation.current) setLoading(false);
    }
  }, [taskId]);
  useEffect(() => {
    active.current = true;
    void refresh();
    return () => {
      active.current = false;
      generation.current += 1;
    };
  }, [refresh]);
  const toggleTarget = async () => {
    if (!context || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const target = context.task.execution_target === "codex" ? null : "codex";
    try {
      const result = await goalIntegration.setTarget(
        context.task,
        target,
        requestKey([taskId, context.task.revision, target]),
      );
      if (!active.current) return;
      setContext((previous) =>
        previous ? { ...previous, task: result.task } : previous,
      );
      changed.current();
    } catch (caught) {
      if (active.current) setError(integrationError(caught));
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  };
  return (
    <>
      <Link className="goal-back" to={goalRoute(context?.goal?.id)}>
        <ArrowLeft size={16} /> {context?.goal?.title ?? "Goals"}
      </Link>
      <div className="goal-workbench-heading">
        <h1>{context?.task.content ?? "Task"}</h1>
        <button
          type="button"
          aria-label="Refresh task context"
          disabled={busy || loading}
          onClick={() => void refresh()}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      {error ? (
        <p role="alert" className="goal-notice">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p role="status" className="goal-muted">
          Refreshing task…
        </p>
      ) : null}
      {context ? (
        <>
          <p className="goal-meta">
            {taskStageLabel(context.task)} · Revision {context.task.revision}
          </p>
          <label className="goal-checkbox goal-target">
            <input
              type="checkbox"
              checked={context.task.execution_target === "codex"}
              disabled={busy || loading}
              onChange={() => void toggleTarget()}
            />{" "}
            For Codex
          </label>
          <p className="goal-muted">
            Available when you request work in a connected session. This does
            not start a run.
          </p>
          {context.task.acceptance_criteria.length ? (
            <>
              <h2>Acceptance criteria</h2>
              <ul className="goal-criteria">
                {context.task.acceptance_criteria.map((criterion, index) => (
                  <li key={index}>{criterion}</li>
                ))}
              </ul>
            </>
          ) : null}
          <h2>Progress & results</h2>
          {!context.recent_updates.length ? (
            <p className="goal-muted">No work updates yet.</p>
          ) : null}
          <ol className="goal-updates">
            {context.recent_updates.map((update) => (
              <li key={update.id}>
                <p className="goal-prose">{update.summary}</p>
                <time className="goal-meta" dateTime={update.created_at}>
                  {new Date(update.created_at).toLocaleString()}
                </time>
                {update.blockers.length ? (
                  <p className="goal-prose goal-muted">
                    Blocked: {update.blockers.join("; ")}
                  </p>
                ) : null}
                {update.validation.length ? (
                  <p className="goal-prose goal-muted">
                    Validation: {update.validation.join("; ")}
                  </p>
                ) : null}
                {update.links
                  .filter((link) => /^https:\/\//i.test(link.url))
                  .map((link, index) => (
                    <a
                      key={`${link.url}-${index}`}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.label || link.url}
                    </a>
                  ))}
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </>
  );
}
