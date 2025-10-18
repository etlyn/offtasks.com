import React, { useEffect, useContext, useCallback } from "react";
import { useRouter } from "next/router";
import {
  fetchClosedTasks,
  fetchTodaysTasks,
  fetchTomorrowsTasks,
  fetchUpcomingTasks,
  supabaseClient,
  updateTask,
} from "../backend";
import { AppState } from "../localState";
import { useDate } from "../hooks/useDate";

export const Initialization = ({ children }) => {
  const router = useRouter();
  const user = supabaseClient.auth.user();
  const { setAppState } = useContext(AppState);
  const { today, yesterday } = useDate();

  const handleAutoGrouping = useCallback(
    async (todayTasks, tomorrowTasks, upcomingTasks) => {
      const updates: Promise<any>[] = [];

      todayTasks?.forEach((task: any) => {
        if (task.isComplete && task.date !== today) {
          updates.push(
            updateTask(
              task.id,
              task.content,
              task.isComplete,
              task.priority,
              "close",
              task.date
            )
          );
        }
      });

      tomorrowTasks?.forEach((task: any) => {
        if (task.date === yesterday || task.isComplete) {
          updates.push(
            updateTask(
              task.id,
              task.content,
              task.isComplete,
              task.priority,
              "today",
              task.date
            )
          );
        }
      });

      upcomingTasks?.forEach((task: any) => {
        if (task.isComplete) {
          updates.push(
            updateTask(
              task.id,
              task.content,
              task.isComplete,
              task.priority,
              "close",
              task.date
            )
          );
        }
      });

      if (updates.length) {
        await Promise.all(updates);
        return true;
      }

      return false;
    },
    [today, yesterday]
  );

  const fetchTasks = useCallback(async () => {
    if (!user) {
      return;
    }

    const [todayTasks, tomorrowTasks, upcomingTasks, closedTasks] =
      await Promise.all([
        fetchTodaysTasks(),
        fetchTomorrowsTasks(),
        fetchUpcomingTasks(),
        fetchClosedTasks(),
      ]);

    const didUpdate = await handleAutoGrouping(
      todayTasks,
      tomorrowTasks,
      upcomingTasks
    );

    if (didUpdate) {
      const [refreshedToday, refreshedTomorrow, refreshedUpcoming, refreshedClosed] =
        await Promise.all([
          fetchTodaysTasks(),
          fetchTomorrowsTasks(),
          fetchUpcomingTasks(),
          fetchClosedTasks(),
        ]);

      const completedTasks = refreshedClosed.length;
      const totalTasks =
        completedTasks +
        refreshedToday.length +
        refreshedTomorrow.length +
        refreshedUpcoming.length;

      setAppState({
        todayTasks: refreshedToday,
        tomorrowTasks: refreshedTomorrow,
        upcomingTasks: refreshedUpcoming,
        closedTasks: refreshedClosed,
        totalTasks,
        completedTasks,
        refreshTasks: fetchTasks,
      });
      return;
    }

    const completedTasks = closedTasks.length;
    const totalTasks =
      completedTasks +
      todayTasks.length +
      tomorrowTasks.length +
      upcomingTasks.length;

    setAppState({
      todayTasks,
      tomorrowTasks,
      upcomingTasks,
      closedTasks,
      totalTasks,
      completedTasks,
      refreshTasks: fetchTasks,
    });
  }, [
    user,
    handleAutoGrouping,
    setAppState,
  ]);

  // Fetch tasks
  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else {
      fetchTasks();
    }
  }, [user, router, fetchTasks]);

  // Supabase Realtime Listener
  useEffect(() => {
    const listener = supabaseClient
      .from("tasks")
      .on("*", (payload) => {
        if (
          payload.eventType === "DELETE" ||
          payload.eventType === "UPDATE" ||
          payload.eventType === "INSERT"
        ) {
          fetchTasks();
        }
      })
      .subscribe();

    return () => {
      listener.unsubscribe();
    };
  }, [fetchTasks]);

  return children;
};
