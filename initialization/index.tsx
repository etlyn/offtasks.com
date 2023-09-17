import React, { useEffect, useContext } from "react";
import { useRouter } from "next/router";
import { supabaseClient, fetchTasks } from "../backend";
import { AppState } from "../localState";
import { useDate } from "../hooks/useDate";

export const Initialization = ({ children }) => {
  const router = useRouter();
  const user = supabaseClient.auth.user();
  const { setAppState } = useContext(AppState);
  const { today, yesterday } = useDate();

  // Fetch tasks
  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
    fetchTasks()
      .then((tasks) => sortData(tasks))
      .then((res) => setAppState(res));
  }, [user, router]);

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
          fetchTasks()
            .then((tasks) => sortData(tasks))
            .then((res) => setAppState(res));
        }
      })
      .subscribe();

    return () => {
      listener.unsubscribe();
    };
  }, []);

  const sortData = (data) => {
    if (data != null) {
      // Today tasks
      const todayTasks = data
        .filter(
          (task) =>
            (task.date === today &&
              task.target_group === "today" &&
              task.target_group != "tomorrow") ||
            task.date === yesterday
        )
        .sort((a, b) => a.priority - b.priority);

      // Tomorrow tasks
      const tomorrowTasks = data
        .filter((task) => task.target_group === "tomorrow")
        .sort((a, b) => a.priority - b.priority);

      // Upcoming tasks
      const upcomingTasks = data
        .filter(
          (task) =>
            (task.date != today && task.isComplete === false) ||
            task.target_group === "upcoming"
        )
        .sort((a, b) => a.priority - b.priority);

      // Status counter
      const totalTasks = data.length;
      const completedTasks = data.filter(
        (task) => task.isComplete === true
      ).length;

      return {
        todayTasks,
        tomorrowTasks,
        upcomingTasks,
        totalTasks,
        completedTasks,
      };
    }
  };

  return children;
};
