import React, { useEffect, useContext } from "react";
import { useRouter } from "next/router";
import { supabaseClient, fetchTasks } from "../backend";
import { AppContext } from "../context";
import { useDate } from "../hooks";

export const Initialization = ({ children }) => {
  const router = useRouter();
  const user = supabaseClient.auth.user();
  const { setContext } = useContext(AppContext);
  const { today, yesterday, tomorrow, outdated, upcoming } = useDate();

  // Fetch tasks from Supabase
  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
    fetchTasks().then((tasks) => handleData(tasks));
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
          fetchTasks().then((tasks) => handleData(tasks));
        }
      })
      .subscribe();

    return () => {
      listener.unsubscribe();
    };
  }, []);

  // Manage data and store it in AppContext
  const handleData = (data) => {
    if (data != null) {
      // Today tasks
      const todayTasks = data
        .filter(
          (task) =>
            task.date === today ||
            (task.date !== tomorrow && task.isComplete != true) ||
            (task.date !== upcoming && task.isComplete != true)
        )
        .sort((a, b) => b.priority - a.priority);

      // Tomorrow tasks
      const tomorrowTasks = data
        .filter((task) => task.date === tomorrow)
        .sort((a, b) => b.priority - a.priority);

      // Upcoming tasks
      const upcomingTasks = data
        .filter(
          (task) =>
            task.isComplete != true &&
            task.date != today &&
            task.date != tomorrow &&
            task.date != outdated &&
            task.date != yesterday
        )
        .sort((a, b) => b.priority - a.priority);

      // Status counter
      const totalTasks = data.length;
      const completedTasks = data.filter(
        (task) => task.isComplete === true
      ).length;

      setContext({
        todayTasks,
        tomorrowTasks,
        upcomingTasks,
        totalTasks,
        completedTasks,
      });
    }
  };

  return children;
};
