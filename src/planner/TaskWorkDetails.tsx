import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { goalIntegration } from "@/lib/goalIntegration";
import { integrationError, taskStageLabel, type TaskContext } from "@/lib/goalWorkbench";

/** View acceptance criteria and results recorded against a goal task. */
export function TaskWorkDetails({ taskId, startOpen = false }: { taskId: string; startOpen?: boolean }) {
  const [context, setContext] = useState<TaskContext | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(startOpen);
  const active = useRef(true);
  const generation = useRef(0);

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
