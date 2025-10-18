import React, { useEffect, useContext, useCallback } from "react";
import { useRouter } from "next/router";
import {
  fetchClosedTasks,
  fetchTodaysTasks,
  fetchTomorrowsTasks,
  fetchUpcomingTasks,
  supabaseClient,
  updateTask,
} from "@/lib/supabase";
import { AppStateContext } from "@/providers/app-state";
import { useDate } from "@/hooks/useDate";
import type { Task } from "@/types";

export const TaskInitializer = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const user = supabaseClient.auth.user();
  const { setAppState } = useContext(AppStateContext);
  const { today, yesterday } = useDate();

  const handleAutoGrouping = useCallback(
    async (todayTasks: Task[], tomorrowTasks: Task[], upcomingTasks: Task[]) => {
      const updates: Promise<void>[] = [];

      todayTasks?.forEach((task) => {
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

      tomorrowTasks?.forEach((task) => {
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

      upcomingTasks?.forEach((task) => {
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

  const fetchTasks = useCallback(async (): Promise<void> => {
    if (!user) {
      return;
    }

    const [todayTasks, tomorrowTasks, upcomingTasks, closedTasks] = await Promise.all([
      fetchTodaysTasks(),
      fetchTomorrowsTasks(),
      fetchUpcomingTasks(),
      fetchClosedTasks(),
    ]);

    const didUpdate = await handleAutoGrouping(todayTasks, tomorrowTasks, upcomingTasks);

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
      completedTasks + todayTasks.length + tomorrowTasks.length + upcomingTasks.length;

    setAppState({
      todayTasks,
      tomorrowTasks,
      upcomingTasks,
      closedTasks,
      totalTasks,
      completedTasks,
      refreshTasks: fetchTasks,
    });
  }, [user, handleAutoGrouping, setAppState]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else {
      fetchTasks();
    }
  }, [user, router, fetchTasks]);

  useEffect(() => {
    const listener = supabaseClient
      .from<Task>("tasks")
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

  return <>{children}</>;
};
