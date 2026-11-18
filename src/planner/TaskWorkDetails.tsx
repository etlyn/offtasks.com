import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { goalIntegration } from "@/lib/goalIntegration";
import { integrationError, integrationRequestKey, taskStageLabel, type TaskContext } from "@/lib/goalWorkbench";
import { Switch } from "./ui";

/**
 * For a task inside a goal: whether it is offered to a connected Codex session,
 * its acceptance criteria, and the progress notes recorded against it.
 * Marking a task "For Codex" never starts any work by itself.
 */
export function TaskWorkDetails({ taskId, startOpen = false }: { taskId: string; startOpen?: boolean }) {
  const [context, setContext] = useState<TaskContext | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(startOpen);
  const active = useRef(true);
  const lock = useRef(false);
  const generation = useRef(0);
  const retry = useRef<{ payload: string; key: string } | null>(null);

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setError("");
    try {
      const result = await goalIntegration.getTask(taskId);
      if (active.current && current === generation.current) setContext(result);
    } catch (caught) {
      if (active.current && current === generation.current) setError(integrationError(caught));
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
    // A repeated attempt at the same change reuses its key, so it is applied once.
    const payload = JSON.stringify([taskId, context.task.revision, target]);
    if (retry.current?.payload !== payload) retry.current = { payload, key: integrationRequestKey() };
    try {
      const result = await goalIntegration.setTarget(context.task, target, retry.current.key);
      if (!active.current) return;
      setContext((previous) => (previous ? { ...previous, task: result.task } : previous));
    } catch (caught) {
      if (active.current) setError(integrationError(caught));
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  };

  if (!context && !error) return null;
  return (
    <section className="work" aria-label="Work details">
      {error ? (
        <p role="alert" className="ot-notice ot-notice--error">
          {error}
        </p>
      ) : null}
      {context ? (
        <>
          <div className="work-target">
            <div>
              <p>For Codex</p>
              <span>Available when you request work in a connected session.</span>
            </div>
            <Switch
              checked={context.task.execution_target === "codex"}
              label="For Codex"
              disabled={busy}
              onChange={() => void toggleTarget()}
            />
          </div>
          <button type="button" className="work-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            <span>Progress &amp; results</span>
            <em>{taskStageLabel(context.task)}</em>
            <ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>
          {open ? (
            <div className="work-body">
              {context.task.acceptance_criteria.length ? (
                <>
                  <h3>Acceptance criteria</h3>
                  <ul className="work-criteria">
                    {context.task.acceptance_criteria.map((criterion, index) => (
                      <li key={index}>{criterion}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              {!context.recent_updates.length ? <p className="work-empty">No work updates yet.</p> : null}
              <ol className="work-updates">
                {context.recent_updates.map((update) => (
                  <li key={update.id}>
                    <p>{update.summary}</p>
                    <time dateTime={update.created_at}>{new Date(update.created_at).toLocaleString()}</time>
                    {update.blockers.length ? <p className="work-note">Blocked: {update.blockers.join("; ")}</p> : null}
                    {update.validation.length ? <p className="work-note">Validation: {update.validation.join("; ")}</p> : null}
                    {update.links
                      .filter((link) => /^https:\/\//i.test(link.url))
                      .map((link, index) => (
                        <a key={`${link.url}-${index}`} className="ot-link" href={link.url} target="_blank" rel="noopener noreferrer">
                          {link.label || link.url}
                        </a>
                      ))}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
