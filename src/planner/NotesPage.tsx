import { useEffect, useRef, useState } from "react";
import { Bookmark, Check, FileText, ListPlus, MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import { dayOf, shortDate, today } from "./dates";
import { filterNotes, newLocalId, noteText, noteTone, noteTones, type Note, type NoteDraft, type NoteTone } from "./model";
import { errorText, notify } from "./notices";
import { PlannerStatus } from "./PlanPages";
import { usePlanner } from "./store";
import { AutoTextarea, Checkbox, Confirm, Empty, Segmented, Sheet } from "./ui";

const toneStyle = (id?: string) => {
  const tone = noteTone(id);
  return { "--tone-light": tone.light, "--tone-dark": tone.dark, "--tone-accent": tone.accent } as React.CSSProperties;
};

interface Draft extends NoteDraft {
  id?: string;
}

const editNote = (note: Note): Draft => ({ id: note.id, text: noteText(note), tasks: note.tasks });

export interface NoteRequest {
  /** An existing note to open, or "new" for an empty one. */
  id: string;
  requestId: number;
}

export function NotesPage({ request, onRequestHandled }: { request: NoteRequest | null; onRequestHandled: () => void }) {
  const planner = usePlanner();
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [appearance, setAppearance] = useState<Note | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const handled = useRef(0);

  // The plus button and search results ask for a note through `request`.
  useEffect(() => {
    if (!request || !planner.loaded || handled.current === request.requestId) return;
    handled.current = request.requestId;
    // A request is answered once; coming back to Notes later must not replay it.
    onRequestHandled();
    if (request.id === "new") return setDraft({ text: "" });
    const note = planner.notes.find((item) => item.id === request.id);
    if (note) setDraft(editNote(note));
    else notify("Note unavailable", "This note may have been removed.");
  }, [request, planner.loaded, planner.notes, onRequestHandled]);

  const notes = filterNotes(planner.notes, pinnedOnly);
  return (
    <div className="page page--notes">
      <div className="notes-bar">
        <Segmented
          label="Notes shown"
          options={[
            { value: "all", label: "All" },
            { value: "pinned", label: "Pinned" },
          ]}
          value={pinnedOnly ? "pinned" : "all"}
          onChange={(value) => setPinnedOnly(value === "pinned")}
        />
      </div>

      {!planner.loaded ? (
        <PlannerStatus />
      ) : notes.length ? (
        <ul className="notes">
          {notes.map((note) => (
            <li key={note.id} className="note" style={toneStyle(note.tone)}>
              <button
                type="button"
                className="note-open"
                aria-label={`Open note: ${note.title}`}
                onClick={() => setDraft(editNote(note))}
              >
                <h2>{note.title}</h2>
                {note.body ? <p>{note.body}</p> : null}
                {note.tasks?.length ? (
                  <span className="note-tasks">
                    {note.tasks.filter((task) => task.isComplete).length}/{note.tasks.length} tasks
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                className="ot-round ot-round--plain note-pin"
                aria-pressed={note.pinned}
                aria-label={note.pinned ? `Unpin note: ${note.title}` : `Pin note: ${note.title}`}
                onClick={() => void planner.patchNote(note.id, { pinned: !note.pinned }).catch(() => undefined)}
              >
                <Bookmark size={17} strokeWidth={1.8} fill={note.pinned ? "currentColor" : "none"} aria-hidden="true" />
              </button>
              <footer>
                <FileText size={13} strokeWidth={1.8} aria-hidden="true" />
                <time dateTime={note.updatedAt}>{shortDate(dayOf(note.updatedAt))}</time>
                <button
                  type="button"
                  className="ot-round ot-round--plain"
                  aria-label={`Paper color for note: ${note.title}`}
                  onClick={() => setAppearance(note)}
                >
                  <MoreHorizontal size={18} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </footer>
            </li>
          ))}
        </ul>
      ) : pinnedOnly ? (
        <Empty icon={FileText}>No pinned notes</Empty>
      ) : (
        <div className="notes-empty">
          <i aria-hidden="true">
            <FileText size={23} strokeWidth={1.3} />
          </i>
          <h2>No notes yet</h2>
          <p>A little space for your thoughts.</p>
        </div>
      )}

      <NoteEditor
        draft={draft}
        onChange={setDraft}
        onClose={() => setDraft(null)}
        onRemove={(id) => setRemoving(id)}
      />
      <NoteAppearance note={appearance} onClose={() => setAppearance(null)} />
      <Confirm
        open={!!removing}
        title="Delete note?"
        message="This note and its tasks will be removed from your account."
        confirmLabel="Delete"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          const id = removing;
          setRemoving(null);
          if (!id) return;
          setDraft(null);
          void planner.removeNote(id).catch(() => undefined);
        }}
      />
    </div>
  );
}

function NoteEditor({
  draft,
  onChange,
  onClose,
  onRemove,
}: {
  draft: Draft | null;
  onChange: (draft: Draft) => void;
  onClose: () => void;
  onRemove: (id: string) => void;
}) {
  const planner = usePlanner();
  const [shown, setShown] = useState<Draft | null>(draft);
  useEffect(() => {
    if (draft) setShown(draft);
  }, [draft]);
  const [taskDraft, setTaskDraft] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [saving, setSaving] = useState(false);
  const body = useRef<HTMLTextAreaElement>(null);
  const taskField = useRef<HTMLInputElement>(null);
  const value = draft ?? shown;
  const noteTasks = value?.tasks ?? [];
  const hasContent = !!(value?.text.trim() || noteTasks.length || taskDraft.trim());

  useEffect(() => {
    if (!draft) {
      setTaskDraft("");
      setAddingTask(false);
    }
  }, [draft]);

  useEffect(() => {
    if (addingTask) taskField.current?.focus();
  }, [addingTask]);

  const addTask = () => {
    const content = taskDraft.trim();
    if (!content || !value) return;
    onChange({
      ...value,
      tasks: [
        ...noteTasks,
        { id: newLocalId(), content, isComplete: false, priority: 0, target_group: "today", date: today() },
      ],
    });
    setTaskDraft("");
    setAddingTask(false);
    body.current?.focus({ preventScroll: true });
  };
  const save = async () => {
    if (!draft || saving || !hasContent) return;
    // A task still being typed is kept rather than lost on Save.
    const pending = taskDraft.trim();
    const tasks = pending
      ? [...noteTasks, { id: newLocalId(), content: pending, isComplete: false, priority: 0, target_group: "today" as const, date: today() }]
      : draft.tasks;
    setSaving(true);
    try {
      await planner.saveNote({ text: draft.text, tasks }, draft.id);
      onClose();
    } catch (caught) {
      if (caught instanceof Error && /Write a note|no longer exists/.test(caught.message))
        notify("Could not save note", errorText(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={!!draft}
      onClose={onClose}
      title={value?.id ? "Edit note" : "New note"}
      size="wide"
      className="note-sheet"
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        body.current?.focus({ preventScroll: true });
      }}
    >
      {value ? (
        <form
          className="note-editor"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void save();
            }
          }}
        >
          <header className="sheet-head">
            <button type="button" className="ot-round ot-round--plain" aria-label="Close" disabled={saving} onClick={onClose}>
              <X size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <span className="sheet-head-spacer" />
            {value.id ? (
              <button
                type="button"
                className="ot-round ot-round--plain"
                aria-label="Delete note"
                data-tip="Delete"
                disabled={saving}
                onClick={() => onRemove(value.id!)}
              >
                <Trash2 size={17} strokeWidth={1.8} aria-hidden="true" />
              </button>
            ) : null}
            <button type="submit" className="ot-button ot-button--small" disabled={saving || !hasContent} aria-label={saving ? "Saving" : undefined}>
              {saving ? <i className="composer-saving" aria-hidden="true" /> : "Save"}
            </button>
          </header>
          <div className="note-scroll">
            <AutoTextarea
              ref={body}
              className="note-body"
              placeholder="Start writing…"
              aria-label="Note"
              value={value.text}
              disabled={saving}
              onChange={(event) => onChange({ ...value, text: event.target.value })}
            />
            {noteTasks.length ? (
              <ul className="note-task-list">
                {noteTasks.map((task) => (
                  <li key={task.id} data-done={task.isComplete || undefined}>
                    <Checkbox
                      checked={task.isComplete}
                      label={`${task.isComplete ? "Reopen" : "Complete"}: ${task.content}`}
                      disabled={saving}
                      onChange={() =>
                        onChange({
                          ...value,
                          tasks: noteTasks.map((item) =>
                            item.id === task.id
                              ? { ...item, isComplete: !item.isComplete, completed_at: item.isComplete ? null : today() }
                              : item,
                          ),
                        })
                      }
                    />
                    <span>
                      {task.content}
                      {task.date ? <small>{task.date === today() ? "Today" : shortDate(task.date)}</small> : <small>Later</small>}
                    </span>
                    <button
                      type="button"
                      className="ot-round ot-round--plain"
                      aria-label={`Remove task: ${task.content}`}
                      disabled={saving}
                      onClick={() => onChange({ ...value, tasks: noteTasks.filter((item) => item.id !== task.id) })}
                    >
                      <X size={15} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {addingTask ? (
              <div className="note-add-task" id="note-add-task">
                <i aria-hidden="true" />
                <input
                  ref={taskField}
                  placeholder="Add a task"
                  aria-label="Add a task"
                  maxLength={2000}
                  value={taskDraft}
                  disabled={saving}
                  onChange={(event) => setTaskDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.metaKey && !event.ctrlKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      addTask();
                    }
                  }}
                />
                <button
                  type="button"
                  className="ot-round ot-round--plain"
                  aria-label="Add note task"
                  disabled={saving || !taskDraft.trim()}
                  onClick={addTask}
                >
                  <Plus size={18} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
          <footer className="note-editor-tools">
            <button
              type="button"
              className="ot-round ot-round--plain"
              aria-label="Add a task"
              aria-expanded={addingTask}
              aria-controls={addingTask ? "note-add-task" : undefined}
              data-tip="Add a task"
              data-tip-align="start"
              data-tip-side="top"
              disabled={saving}
              onClick={() => {
                if (addingTask) taskField.current?.focus();
                else setAddingTask(true);
              }}
            >
              <ListPlus size={19} strokeWidth={1.7} aria-hidden="true" />
            </button>
          </footer>
        </form>
      ) : null}
    </Sheet>
  );
}

/** Six quiet paper tones. The choice is staged until Done. */
function NoteAppearance({ note, onClose }: { note: Note | null; onClose: () => void }) {
  // The last note stays on screen while the sheet eases out.
  const [last, setLast] = useState<Note | null>(note);
  useEffect(() => {
    if (note) setLast(note);
  }, [note]);
  const shown = note ?? last;
  return (
    <Sheet open={!!note} onClose={onClose} title="Paper color" size="small">
      {shown ? <NoteAppearanceBody key={shown.id} note={shown} onClose={onClose} /> : null}
    </Sheet>
  );
}

function NoteAppearanceBody({ note, onClose }: { note: Note; onClose: () => void }) {
  const planner = usePlanner();
  const [tone, setTone] = useState<NoteTone>(noteTone(note.tone).id);
  const [saving, setSaving] = useState(false);
  const done = async () => {
    if (saving) return;
    if (tone === noteTone(note.tone).id) return onClose();
    setSaving(true);
    try {
      await planner.patchNote(note.id, { tone });
      onClose();
    } catch {
      // The choice stays selected so it can be tried again.
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="appearance">
      <header className="sheet-head">
        <button type="button" className="ot-round ot-round--plain" aria-label="Close" disabled={saving} onClick={onClose}>
          <X size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <span className="sheet-head-spacer" />
        <button type="button" className="ot-button ot-button--small" disabled={saving} onClick={() => void done()}>
          Done
        </button>
      </header>
      <div className="note note--preview" style={toneStyle(tone)} aria-hidden="true">
        <div className="note-open">
          <h2>{note.title}</h2>
          {note.body ? <p>{note.body}</p> : null}
        </div>
      </div>
      <p className="appearance-label">
        Paper color <span>{noteTone(tone).name}</span>
      </p>
      <div className="appearance-swatches" role="group" aria-label="Paper color">
        {noteTones.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={tone === option.id}
            aria-label={option.name}
            style={toneStyle(option.id)}
            onClick={() => setTone(option.id)}
          >
            {tone === option.id ? <Check size={15} strokeWidth={2} aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
