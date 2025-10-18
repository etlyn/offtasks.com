import React, { useState, useRef, useContext, useEffect, useCallback } from "react";
import { Layout, Modal, Section } from "@/components";
import { AppStateContext } from "@/providers/app-state";
import type { Task, TaskGroup } from "@/types";

const Home = () => {
  const { appState } = useContext(AppStateContext);
  const initialRef = useRef<HTMLTextAreaElement | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [targetGroup, setTargetGroup] = useState<TaskGroup>("today");

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const openModal = useCallback((clickedTodo: Task | null, group: TaskGroup = "today") => {
    setTask(clickedTodo);
    setShowModal(true);
    setTargetGroup(group);
  }, []);

  const handleKeyboardEvent = useCallback((event: KeyboardEvent) => {
    if (event.key === "+") {
      event.preventDefault();
      openModal(null);
    }

    if (event.key === "Escape") {
      closeModal();
    }
  }, [closeModal, openModal]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeyboardEvent(event);

    if (typeof document !== "undefined") {
      document.addEventListener("keydown", listener);
    }

    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("keydown", listener);
      }
    };
  }, [handleKeyboardEvent]);

  return (
    <>
      {showModal ? (
        <Modal
          selectedGroup={targetGroup}
          closeModal={closeModal}
          initialRef={initialRef}
          task={task}
        />
      ) : null}
      <div className="min-h-screen w-full bg-zinc-50 transition dark:bg-zinc-900">
        <Layout title="Tasks">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 md:flex-row md:px-20">
            <Section
              headline="Today"
              data={appState?.todayTasks}
              openModal={(selectedTask) => openModal(selectedTask, "today")}
              showCounter
              allowAdd
              emptyMessage="No tasks for today yet. Add one to get started."
              targetGroup="today"
            />

            <Section
              headline="Tomorrow"
              data={appState?.tomorrowTasks}
              openModal={(selectedTask) => openModal(selectedTask, "tomorrow")}
              showCounter
              allowAdd
              emptyMessage="You're all set for tomorrow."
              targetGroup="tomorrow"
            />

            <Section
              headline="Upcoming"
              data={appState?.upcomingTasks}
              openModal={(selectedTask) => openModal(selectedTask, "upcoming")}
              showCounter={false}
              allowAdd
              emptyMessage="Plan ahead by adding upcoming work."
              targetGroup="upcoming"
            />
          </div>
        </Layout>
      </div>
    </>
  );
};

export default Home;
