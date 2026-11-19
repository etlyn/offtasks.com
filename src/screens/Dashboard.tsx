import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { Menu, Plus, Search, X } from "lucide-react";
import { GoalsWorkbench } from "@/components/GoalsWorkbench";
import type { FeatureGoal } from "@/lib/goalWorkbench";
import { clearLocalOfftasksState } from "@/lib/offtasksLocalState";
import { usePageTitle } from "@/lib/pageTitle";
import { deleteAccount, fetchUserPreferences, supabaseClient, upsertUserPreferences } from "@/lib/supabase";
import { getTheme, setTheme, type ThemeMode } from "@/lib/theme";
import { AccountPanel } from "@/planner/AccountPanel";
import { NotesPage, type NoteRequest } from "@/planner/NotesPage";
import { BoardPage } from "@/planner/BoardPage";
import { CalendarPage } from "@/planner/PlanPages";
import { RemindersProvider, useReminders } from "@/planner/ReminderProvider";
import { SearchOverlay } from "@/planner/SearchOverlay";
import { StatisticsPage } from "@/planner/StatisticsPage";
import { TaskComposer, type ComposerRequest } from "@/planner/TaskComposer";
import { today } from "@/planner/dates";
import { goalKey, scheduledDay, type PlannerTask } from "@/planner/model";
import { dismissNotice, notify, useNotices } from "@/planner/notices";
import type { SearchResult } from "@/planner/search";
import { PlannerProvider, usePlanner } from "@/planner/store";
import { NavIcon } from "@/planner/ui";
import { useAuth } from "@/providers/auth";
import "@/styles/planner.css";

type View = "board" | "calendar" | "notes" | "goals" | "statistics";

const destinations = [
  { view: "board", label: "Board" },
  { view: "calendar", label: "Calendar" },
  { view: "notes", label: "Notes" },
  { view: "goals", label: "Goals" },
] as const;

const NARROW = "(max-width: 56.1875em)";

function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches);
  useEffect(() => {
    const query = window.matchMedia(NARROW);
    const update = () => setNarrow(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return narrow;
}

const initials = (name?: string, email?: string) => {
  const source = name?.trim() || email?.split("@")[0]?.replace(/[._-]+/g, " ") || "";
  const parts = source.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase() || "•";
};

export const DashboardScreen = () => {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <PlannerProvider key={user.id} owner={user.id}>
      <RemindersProvider owner={user.id}>
        <Planner user={user} />
      </RemindersProvider>
    </PlannerProvider>
  );
};

function Planner({ user }: { user: User }) {
  const planner = usePlanner();
  const { disconnect: disconnectReminders } = useReminders();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const narrow = useNarrow();
  const goalsView =
    searchParams.get("view") === "goals" || searchParams.has("goal") || searchParams.has("task");
  const requested = searchParams.get("view");
  const view: View = goalsView
    ? "goals"
    : requested === "calendar" || requested === "notes" || requested === "statistics"
      ? requested
      : "board";
  const startInLater = view === "board" && requested === "later";

  const [goalsVisited, setGoalsVisited] = useState(goalsView);
  useEffect(() => {
    if (goalsView) setGoalsVisited(true);
  }, [goalsView]);
  const [featureGoals, setFeatureGoals] = useState<FeatureGoal[]>([]);
  const noteGoals = useCallback((goals: FeatureGoal[]) => setFeatureGoals(goals), []);
  const [openGoal, setOpenGoal] = useState<string | null>(null);
  usePageTitle(view === "goals" && openGoal ? openGoal : view[0].toUpperCase() + view.slice(1));
  const [goalCreateRequest, setGoalCreateRequest] = useState(0);
  const [goalOpenRequest, setGoalOpenRequest] = useState<{ name: string; requestId: number } | null>(null);

  const [day, setDay] = useState(today());
  const [composer, setComposer] = useState<ComposerRequest | null>(null);
  const [noteRequest, setNoteRequest] = useState<NoteRequest | null>(null);
  const clearNoteRequest = useCallback(() => setNoteRequest(null), []);
  const [searching, setSearching] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const go = useCallback(
    (next: View | "later") => setSearchParams(next === "board" ? {} : { view: next }),
    [setSearchParams],
  );
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  // The account's saved appearance wins over this browser's when they differ.
  useEffect(() => {
    let active = true;
    void fetchUserPreferences(user.id).then((preferences) => {
      if (!active) return;
      const saved = preferences?.theme_mode;
      if ((saved === "Dark" || saved === "Light") && saved !== getTheme()) setTheme(saved);
    });
    return () => {
      active = false;
    };
  }, [user.id]);
  const saveTheme = (mode: ThemeMode) => {
    upsertUserPreferences({
      user_id: user.id,
      theme_mode: mode,
      hide_completed: false,
      advanced_mode: false,
      auto_arrange: false,
    }).catch(() => notify("Couldn’t save preference", "Your choice is kept on this device."));
  };

  const add = useCallback(() => {
    if (view === "notes") setNoteRequest({ id: "new", requestId: Date.now() });
    else if (view === "goals" && !openGoal) setGoalCreateRequest((value) => value + 1);
    else if (view === "goals") setComposer({ date: null, goal: openGoal });
    else setComposer({ date: startInLater ? null : view === "calendar" ? day : today() });
  }, [view, openGoal, day, startInLater]);
  const addToDate = useCallback((date: string | null) => setComposer({ date }), []);
  const addLabel =
    view === "notes" ? "Add note" : view === "goals" && !openGoal ? "Add goal" : "Add task";

  const editTask = useCallback((task: PlannerTask, goal: string | null = null) => setComposer({ task, goal }), []);

  const showGoal = useCallback(
    (name?: string) => {
      if (!name) return setSearchParams({ view: "goals" });
      const goal = featureGoals.find((item) => goalKey(item.title) === goalKey(name));
      if (goal) return setSearchParams({ view: "goals", goal: goal.id });
      // The Goals page finds the goal once its list has loaded.
      setGoalOpenRequest({ name, requestId: Date.now() });
      setSearchParams({ view: "goals" });
    },
    [featureGoals, setSearchParams],
  );

  const openResult = (result: SearchResult) => {
    if (result.kind === "note") {
      go("notes");
      setNoteRequest({ id: result.note.id, requestId: Date.now() });
    } else if (result.kind === "goal") showGoal(result.goal);
    else {
      const when = scheduledDay(result.task);
      if (when) {
        setDay(when);
        go("calendar");
      } else go("later");
      setComposer({ task: result.task });
    }
  };

  // Quick add with ⌘+ / Ctrl+, search with "/" or ⌘K.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      const layered = !!document.querySelector('[role="dialog"],[role="alertdialog"]');
      const command = event.metaKey || event.ctrlKey;
      if (command && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!layered || searching) setSearching((value) => !value);
        return;
      }
      if (typing || layered) return;
      if (command && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        add();
      } else if (event.key === "/" && !command && !event.altKey) {
        event.preventDefault();
        setSearching(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [add, searching]);

  const signOut = async () => {
    await disconnectReminders();
    const { error } = await supabaseClient.auth.signOut({ scope: "local" });
    if (error) throw error;
    navigate("/login");
  };
  const deleteData = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteAccount();
      await disconnectReminders();
      const { error } = await supabaseClient.auth.signOut({ scope: "local" });
      if (error) console.warn("Offtasks data was deleted, but signing out on this device reported an error", error);
      clearLocalOfftasksState();
      navigate("/login", { replace: true, state: { accountDeleted: true } });
    } catch (caught) {
      notify(
        "Couldn’t delete Offtasks data",
        caught instanceof Error ? caught.message : "Unable to delete Offtasks data right now. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const name = (user.user_metadata as { full_name?: string } | null)?.full_name;

  return (
    <div className="pl" data-view={view}>
      <div className="ot-backdrop" aria-hidden="true" />
      <a className="pl-skip" href="#planner-main">
        Skip to content
      </a>
      <header className="pl-top">
        <button type="button" className="ot-round pl-menu" aria-label="Open account menu" onClick={() => setPanelOpen(true)}>
          <Menu size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <Link to="/app" className="ot-wordmark pl-wordmark" aria-label="Offtasks, go to Board">
          offtasks<i>.</i>
        </Link>
        <div className="pl-tools">
          <button type="button" className="ot-round" aria-label="Search" data-tip="Search ( / )" data-tip-align="end" onClick={() => setSearching(true)}>
            <Search size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <button type="button" className="pl-account" aria-label="Open account menu" data-tip="Account" data-tip-align="end" onClick={() => setPanelOpen(true)}>
            {initials(name, user.email)}
          </button>
        </div>
      </header>

      <main id="planner-main" className="pl-main" tabIndex={-1}>
        {goalsVisited ? (
          <div hidden={!goalsView} className="pl-view">
            <GoalsWorkbench
              key={user.id}
              ownerId={user.id}
              onChanged={() => void planner.refresh()}
              onGoalsLoaded={noteGoals}
              onEditTask={editTask}
              onGoalOpen={setOpenGoal}
              createRequest={goalCreateRequest}
              openRequest={goalOpenRequest}
            />
          </div>
        ) : null}
        <div className="pl-view" hidden={view !== "calendar"}>
          <CalendarPage day={day} onDay={setDay} onEdit={editTask} narrow={narrow} />
        </div>
        {view === "board" ? (
          <div className="pl-view" key="board">
            <BoardPage onAdd={addToDate} onEdit={editTask} startInLater={startInLater} />
          </div>
        ) : view === "notes" ? (
          <div className="pl-view" key="notes">
            <NotesPage request={noteRequest} onRequestHandled={clearNoteRequest} />
          </div>
        ) : view === "statistics" ? (
          <div className="pl-view" key="statistics">
            <StatisticsPage onEdit={editTask} onGoal={showGoal} />
          </div>
        ) : null}
      </main>

      <div className="pl-dockbar">
        <Dock view={view} onChange={go} />
        <button
          type="button"
          className="pl-plus"
          aria-label={addLabel}
          data-tip={`${addLabel} (${/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"}+)`}
          data-tip-side="top"
          data-tip-align="end"
          onClick={add}
        >
          <Plus size={22} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>

      <TaskComposer request={composer} onClose={() => setComposer(null)} />
      <SearchOverlay open={searching} onClose={() => setSearching(false)} onPick={openResult} />
      <AccountPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        name={name}
        email={user.email ?? undefined}
        onStatistics={() => go("statistics")}
        onThemeChange={saveTheme}
        onSignOut={signOut}
        onDeleteData={deleteData}
        deleting={deleting}
      />
      <Notices />
    </div>
  );
}

/** The four destinations in a glass capsule; a lens slides to the one on screen. */
function Dock({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const host = useRef<HTMLElement>(null);
  const [lens, setLens] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const active = host.current?.querySelector<HTMLElement>('[aria-current="page"]');
      setLens(active ? { left: active.offsetLeft, width: active.offsetWidth } : null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, [view]);
  return (
    <nav ref={host} className="pl-dock ot-glass" aria-label="Planner sections">
      <span
        className="pl-lens"
        aria-hidden="true"
        style={lens ? { width: lens.width, translate: `${lens.left}px 0`, opacity: 1 } : { opacity: 0 }}
      />
      {destinations.map((item) => (
        <button
          key={item.view}
          type="button"
          aria-current={view === item.view ? "page" : undefined}
          onClick={() => onChange(item.view)}
        >
          <NavIcon name={item.view} selected={view === item.view} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function Notices() {
  const notices = useNotices();
  return (
    <div className="pl-notices" role="status" aria-live="polite">
      {notices.map((notice) => (
        <div key={notice.id} className="pl-notice">
          <p>
            <strong>{notice.title}</strong>
            {notice.detail ? <span>{notice.detail}</span> : null}
          </p>
          <button type="button" className="ot-round ot-round--plain" aria-label="Dismiss" onClick={() => dismissNotice(notice.id)}>
            <X size={15} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
