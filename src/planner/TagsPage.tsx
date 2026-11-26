import { useId, useRef, useState } from "react";
import { List, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { PlannerStatus } from "./PlanPages";
import { TaskList } from "./TaskList";
import { errorText } from "./notices";
import type { PlannerTask } from "./model";
import { usePlanner } from "./store";
import { filterByTag, tagName, tagNameLimit, taskTagIds, type TaskTag } from "./tags";
import { Confirm, Empty, Sheet } from "./ui";

export function TagsPage({ selected, onSelect, onEdit }: {
  selected?: TaskTag;
  onSelect: (id: string) => void;
  onEdit: (task: PlannerTask) => void;
}) {
  const planner = usePlanner();
  const { tagging } = planner;
  const [editor, setEditor] = useState<{ open: boolean; tag?: TaskTag; request: number }>({ open: false, request: 0 });
  const trigger = useRef<HTMLButtonElement | null>(null);
  const newTag = useRef<HTMLButtonElement>(null);
  const openEditor = (button: HTMLButtonElement, tag?: TaskTag) => {
    trigger.current = button;
    setEditor((current) => ({ open: true, tag, request: current.request + 1 }));
  };
  const closeEditor = () => setEditor((current) => ({ ...current, open: false }));
  const active = selected?.id ?? "";
  const tasks = filterByTag(planner.tasks, tagging, active);
  const counts = new Map<string, number>();
  for (const task of planner.tasks) {
    for (const id of taskTagIds(tagging, task.id)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return (
    <div className="page page--tags">
      <header className="tags-head">
        <h1 className="board-title">Tags</h1>
        <button ref={newTag} type="button" className="ot-chip tags-new" onClick={(event) => openEditor(event.currentTarget)}>
          <Plus size={15} strokeWidth={1.8} aria-hidden="true" />
          New tag
        </button>
      </header>

      {!planner.loaded ? <PlannerStatus /> : !tagging.tags.length ? (
        <Empty icon={Tag}>No tags yet</Empty>
      ) : (
        <div className="tags-layout">
          <div className="tags-index" role="group" aria-label="Choose a tag">
            {[{ id: "", name: "All tasks" }, ...tagging.tags].map(({ id, name }) => {
              const Icon = id ? Tag : List;
              return (
                <button key={id} type="button" aria-pressed={id === active} onClick={() => onSelect(id)}>
                  <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                  <span>{name}</span>
                  <small aria-hidden="true">{id ? counts.get(id) ?? 0 : planner.tasks.length}</small>
                </button>
              );
            })}
          </div>
          <section className="tags-results" aria-labelledby="tags-results-title">
            <header className="tags-results-head">
              <h2 id="tags-results-title">{selected?.name ?? "All tasks"}</h2>
              {selected ? (
                <button
                  type="button"
                  className="ot-round ot-round--plain"
                  aria-label={`Edit tag: ${selected.name}`}
                  data-tip="Edit tag"
                  data-tip-align="end"
                  onClick={(event) => openEditor(event.currentTarget, selected)}
                >
                  <Pencil size={16} strokeWidth={1.8} aria-hidden="true" />
                </button>
              ) : null}
            </header>
            {tasks.length ? <TaskList tasks={tasks} detail="context" onEdit={onEdit} /> : (
              <Empty icon={Tag}>{selected ? "No tasks with this tag" : "No tasks yet"}</Empty>
            )}
          </section>
        </div>
      )}
      <Sheet
        open={editor.open}
        onClose={closeEditor}
        title={editor.tag ? "Edit tag" : "New tag"}
        size="small"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          const input = (event.currentTarget as HTMLElement).querySelector("input");
          input?.focus({ preventScroll: true });
          input?.select();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          (trigger.current?.isConnected ? trigger.current : newTag.current)?.focus({ preventScroll: true });
        }}
      >
        <TagEditor key={editor.request} tag={editor.tag} onClose={closeEditor} onSelect={onSelect} />
      </Sheet>
    </div>
  );
}

function TagEditor({ tag, onClose, onSelect }: { tag?: TaskTag; onClose: () => void; onSelect: (id: string) => void }) {
  const { tagging } = usePlanner();
  const [name, setName] = useState(tag?.name ?? "");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const errorId = useId();

  return (
    <form
      className="composer tag-editor"
      onSubmit={(event) => {
        event.preventDefault();
        try {
          if (tag) tagging.rename(tag.id, name);
          else onSelect(tagging.create(name));
          onClose();
        } catch (caught) {
          setError(errorText(caught));
        }
      }}
    >
      <header className="sheet-head">
        <button type="button" className="ot-round ot-round--plain" aria-label="Close" onClick={onClose}>
          <X size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <h2>{tag ? "Edit tag" : "New tag"}</h2>
        <button type="submit" className="ot-button ot-button--small" disabled={!tagName(name)}>{tag ? "Save" : "Add"}</button>
      </header>
      <input
        type="text"
        className="composer-line"
        aria-label="Tag name"
        aria-invalid={!!error || undefined}
        aria-describedby={error ? errorId : undefined}
        placeholder="Tag name"
        value={name}
        maxLength={tagNameLimit}
        onChange={(event) => { setName(event.target.value); setError(""); }}
      />
      {error ? <p id={errorId} className="tag-field-error" role="alert">{error}</p> : null}
      {tag ? (
        <button type="button" className="tag-remove" onClick={() => setConfirming(true)}>
          <Trash2 size={15} strokeWidth={1.8} aria-hidden="true" />
          Remove tag
        </button>
      ) : null}
      <Confirm
        open={confirming}
        title="Remove tag"
        message="This removes the tag from every task. The tasks stay in your planner."
        confirmLabel="Remove tag"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          if (!tag) return;
          setConfirming(false);
          try {
            tagging.remove(tag.id);
            onSelect("");
            onClose();
          } catch (caught) {
            setError(errorText(caught));
          }
        }}
      />
    </form>
  );
}
