import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as cloud from "./cloud";
import { today } from "./dates";
import {
  composeNote,
  goalSummaries,
  groupForDate,
  isNoteTaskId,
  isPastAndOpen,
  noteTaskId,
  tasksInNotes,
  type GoalSummary,
  type Note,
  type NoteDraft,
  type NoteTask,
  type NoteTone,
  type PlannerTask,
  type TaskChanges,
} from "./model";
import { errorText, notify } from "./notices";

const laterKey = (owner: string) => `offtasks-move-past-tasks-to-later:${owner}`;

type SaveTiming = "optimistic" | "after-save";
type PendingMove = { id: string; date: string | null; target_group: ReturnType<typeof groupForDate> };

interface PlannerValue {
  owner: string;
  /** Tasks from the task list together with tasks written inside notes. */
  tasks: PlannerTask[];
  notes: Note[];
  /** Saved goal names. Goals that exist only as a task's label are in `summaries`. */
  goals: string[];
  summaries: GoalSummary[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  syncedAt: number | null;
  /** Changes at midnight so date-dependent views redraw. */
  day: string;
  refresh: () => Promise<void>;
  addTask: (values: { content: string; date: string | null; priority: number; label: string | null }) => Promise<void>;
  changeTask: (task: PlannerTask, changes: TaskChanges) => Promise<void>;
  moveTask: (task: PlannerTask, date: string | null) => Promise<boolean>;
  movingTaskId: string | null;
  toggleTask: (task: PlannerTask) => Promise<void>;
  removeTask: (task: PlannerTask) => Promise<void>;
  saveNote: (draft: NoteDraft, id?: string) => Promise<Note>;
  patchNote: (id: string, patch: { pinned?: boolean; tone?: NoteTone }) => Promise<void>;
  removeNote: (id: string) => Promise<void>;
  removeGoal: (name: string) => Promise<void>;
  movePastToLater: boolean;
  setMovePastToLater: (enabled: boolean) => void;
}

const PlannerContext = createContext<PlannerValue | null>(null);

export function PlannerProvider({ owner, children }: { owner: string; children: ReactNode }) {
  const [cloudTasks, setCloudTasks] = useState<PlannerTask[]>([]);
  const [notes, setNoteState] = useState<Note[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [day, setDay] = useState(today());
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const moveInFlight = useRef(false);
  const [movePastToLater, setMovePast] = useState(() => {
    try {
      return window.localStorage.getItem(laterKey(owner)) === "true";
    } catch {
      return false;
    }
  });

  const alive = useRef(true);
  const sequence = useRef(0);
  const notesRef = useRef<Note[]>([]);
  const noteWrites = useRef(new Map<string, Promise<unknown>>());
  const movePastRef = useRef(movePastToLater);
  movePastRef.current = movePastToLater;

  const setNotes = useCallback((update: (current: Note[]) => Note[]) => {
    const next = update(notesRef.current);
    notesRef.current = next;
    setNoteState(next);
  }, []);

  // Notes are saved as whole records. Build each change after the last write to that note.
  const queueNote = useCallback(async <Result,>(id: string, write: () => Promise<Result>): Promise<Result> => {
    const previous = noteWrites.current.get(id);
    const pending = previous ? previous.then(write, write) : write();
    noteWrites.current.set(id, pending);
    try {
      return await pending;
    } finally {
      if (noteWrites.current.get(id) === pending) noteWrites.current.delete(id);
    }
  }, []);

  const refresh = useCallback(async () => {
    const id = ++sequence.current;
    setLoading(true);
    try {
      let [nextTasks, nextNotes, nextGoals] = await Promise.all([
        cloud.fetchTasks(owner),
        cloud.fetchNotes(owner),
        cloud.fetchGoalNames(owner),
      ]);
      if (!alive.current || id !== sequence.current) return;
      // Only someone who turned "Return to Later" on has past dates cleared.
      if (movePastRef.current) {
        const pastTasks = nextTasks.filter(isPastAndOpen);
        const pastNotes = nextNotes.filter((note) => !noteWrites.current.has(note.id) && note.tasks?.some(isPastAndOpen));
        if (pastTasks.length || pastNotes.length) {
          const now = new Date().toISOString();
          await Promise.all([
            ...pastTasks.map((task) => cloud.updateTask(owner, task.id, { target_group: "upcoming", date: null })),
            ...pastNotes.map((note) => queueNote(note.id, async () => {
              const updated: Note = {
                ...note,
                updatedAt: now,
                tasks: note.tasks?.map((task) => isPastAndOpen(task) ? { ...task, target_group: "upcoming", date: null } : task),
              };
              await cloud.saveNote(owner, updated);
              setNotes((current) => current.map((item) => item.id === note.id ? updated : item));
            })),
          ]);
          if (!alive.current || id !== sequence.current) return;
          [nextTasks, nextNotes, nextGoals] = await Promise.all([
            cloud.fetchTasks(owner),
            cloud.fetchNotes(owner),
            cloud.fetchGoalNames(owner),
          ]);
          if (!alive.current || id !== sequence.current) return;
        }
      }
      setCloudTasks(nextTasks);
      setNotes(() => nextNotes);
      setGoals(nextGoals);
      setLoaded(true);
      setError(null);
      setSyncedAt(Date.now());
    } catch (caught) {
      if (alive.current && id === sequence.current) setError(errorText(caught, "Your planner could not be loaded. Check your connection and try again."));
    } finally {
      if (alive.current && id === sequence.current) setLoading(false);
    }
  }, [owner, queueNote, setNotes]);

  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => {
      alive.current = false;
      sequence.current += 1;
    };
  }, [refresh]);

  // Pick up changes made on another device when the tab is looked at again, and at midnight.
  useEffect(() => {
    let last = Date.now();
    const visible = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 30_000) return;
      last = Date.now();
      void refresh();
    };
    let shownDay = today();
    const tick = window.setInterval(() => {
      const current = today();
      if (current === shownDay) return;
      shownDay = current;
      setDay(current);
      void refresh();
    }, 60_000);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    return () => {
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", visible);
    };
  }, [refresh]);

  /** Show the change at once, send it, and fall back to the saved state if it fails. */
  const commit = useCallback(
    async (apply: () => void, action: () => Promise<unknown>, failure: string, timing: SaveTiming = "optimistic") => {
      sequence.current += 1;
      if (timing === "optimistic") apply();
      try {
        await action();
      } catch (caught) {
        notify(failure, errorText(caught));
        if (timing === "optimistic") await refresh();
        else void refresh();
        throw caught;
      }
      if (timing === "after-save") apply();
      void refresh();
    },
    [refresh],
  );

  const writeNote = useCallback(
    (note: Note, failure: string, timing?: SaveTiming) =>
      commit(
        () => setNotes((current) => (current.some((item) => item.id === note.id) ? current.map((item) => (item.id === note.id ? note : item)) : [note, ...current])),
        () => cloud.saveNote(owner, note),
        failure,
        timing,
      ),
    [commit, owner, setNotes],
  );

  const changeNoteTask = useCallback(
    (task: PlannerTask, change: ((item: NoteTask) => NoteTask) | null, failure: string, timing?: SaveTiming) =>
      queueNote(task.noteId ?? "", async () => {
        const note = notesRef.current.find((item) => item.id === task.noteId);
        if (!note?.tasks?.some((item) => noteTaskId(note.id, item.id) === task.id)) {
          const message = "This note task no longer exists.";
          notify(failure, message);
          throw new Error(message);
        }
        const tasks = change
          ? note.tasks.map((item) => (noteTaskId(note.id, item.id) === task.id ? change(item) : item))
          : note.tasks.filter((item) => noteTaskId(note.id, item.id) !== task.id);
        return writeNote({ ...note, updatedAt: new Date().toISOString(), tasks }, failure, timing);
      }),
    [queueNote, writeNote],
  );

  const changeTask = useCallback(
    (task: PlannerTask, changes: TaskChanges, timing?: SaveTiming) =>
      isNoteTaskId(task.id)
        ? changeNoteTask(task, (item) => ({ ...item, ...changes, id: item.id }), "Could not update task", timing)
        : commit(
            () => setCloudTasks((current) => current.map((item) => (item.id === task.id ? { ...item, ...changes } : item))),
            () => cloud.updateTask(owner, task.id, changes),
            "Could not update task",
            timing,
          ),
    [changeNoteTask, commit, owner],
  );

  const moveTask = useCallback(async (task: PlannerTask, date: string | null) => {
    if (moveInFlight.current) return false;
    moveInFlight.current = true;
    const changes = { date, target_group: groupForDate(date) };
    // Display the move immediately. On failure, removing this overlay restores the saved schedule.
    setPendingMove({ id: task.id, ...changes });
    try {
      await changeTask(task, changes, "after-save");
      return true;
    } catch {
      return false;
    } finally {
      moveInFlight.current = false;
      setPendingMove(null);
    }
  }, [changeTask]);

  const value = useMemo<PlannerValue>(() => {
    const savedTasks = [...cloudTasks, ...tasksInNotes(notes)];
    const tasks = pendingMove
      ? savedTasks.map((task) => task.id === pendingMove.id
        ? { ...task, date: pendingMove.date, target_group: pendingMove.target_group }
        : task)
      : savedTasks;
    return {
      owner,
      tasks,
      notes,
      goals,
      summaries: goalSummaries(tasks, goals),
      loading,
      loaded,
      error,
      syncedAt,
      day,
      refresh,
      addTask: async ({ content, date, priority, label }) => {
        sequence.current += 1;
        try {
          await cloud.createTask(owner, { content, date, priority, label, target_group: groupForDate(date) });
        } finally {
          // The list is read again either way, so a half-finished save never lingers on screen.
          void refresh();
        }
      },
      changeTask,
      moveTask,
      movingTaskId: pendingMove?.id ?? null,
      toggleTask: (task) => {
        const changes = { isComplete: !task.isComplete, completed_at: task.isComplete ? null : today() };
        return (
          isNoteTaskId(task.id)
            ? changeNoteTask(task, (item) => ({ ...item, ...changes }), "Update failed")
            : commit(
                () => setCloudTasks((current) => current.map((item) => (item.id === task.id ? { ...item, ...changes } : item))),
                () => cloud.updateTask(owner, task.id, changes),
                "Update failed",
              )
        ).catch(() => undefined);
      },
      removeTask: (task) =>
        isNoteTaskId(task.id)
          ? changeNoteTask(task, null, "Delete failed")
          : commit(
              () => setCloudTasks((current) => current.filter((item) => item.id !== task.id)),
              () => cloud.deleteTask(owner, task.id),
              "Delete failed",
            ),
      saveNote: (draft, id) => {
        const save = async () => {
          const previous = id ? notesRef.current.find((item) => item.id === id) : undefined;
          if (id && !previous) throw new Error("This note no longer exists.");
          const note = composeNote(draft, previous);
          // The note editor can complete tasks. Scheduling may have changed since it opened.
          const savedTasks = new Map(previous?.tasks?.map((task) => [task.id, task]));
          note.tasks = note.tasks?.map((task) => {
            const saved = savedTasks.get(task.id);
            return saved ? { ...task, date: saved.date, target_group: saved.target_group } : task;
          });
          await writeNote(note, "Could not save note");
          return note;
        };
        return id ? queueNote(id, save) : save();
      },
      patchNote: (id, patch) => queueNote(id, async () => {
        const note = notesRef.current.find((item) => item.id === id);
        if (!note) return;
        await writeNote({ ...note, ...patch }, patch.tone ? "Could not save appearance" : "Could not save notes");
      }),
      removeNote: (id) => queueNote(id, async () => {
        const note = notesRef.current.find((item) => item.id === id);
        if (!note) return;
        await commit(
          () => setNotes((current) => current.filter((item) => item.id !== id)),
          () => cloud.removeNote(owner, note),
          "Could not delete note",
        );
      }),
      removeGoal: (name) =>
        commit(
          () => setGoals((current) => current.filter((item) => item.trim().toLocaleLowerCase() !== name.trim().toLocaleLowerCase())),
          () => cloud.removeGoal(owner, name),
          "Could not remove goal",
        ),
      movePastToLater,
      setMovePastToLater: (enabled) => {
        setMovePast(enabled);
        movePastRef.current = enabled;
        try {
          window.localStorage.setItem(laterKey(owner), String(enabled));
        } catch {
          // The choice still applies for this visit.
        }
        if (enabled) void refresh();
      },
    };
  }, [owner, cloudTasks, notes, goals, loading, loaded, error, syncedAt, day, refresh, commit, changeTask, changeNoteTask, writeNote, movePastToLater, pendingMove, moveTask, queueNote, setNotes]);

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const value = useContext(PlannerContext);
  if (!value) throw new Error("usePlanner must be used inside the planner.");
  return value;
}
