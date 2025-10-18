import React, { useState, useRef, useContext, useEffect } from "react";
import { Modal, Section, Layout } from "../components";
import { AppState } from "../localState";
import { useTheme } from "next-themes";

const Home = () => {
  const { appState } = useContext(AppState);
  const initialRef = useRef();
  const [task, setTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [targetGroup, setTargetGroup] = useState("today");
  const { theme } = useTheme();

  const closeModal = () => {
    setShowModal(false);
  };

  const openModal = (clickedTodo, group = "today") => {
    setTask(clickedTodo);
    setShowModal(true);
    setTargetGroup(group);
  };

  const openModalForTomorrow = (clickedTodo) => openModal(clickedTodo, "tomorrow");
  const openModalForUpcoming = (clickedTodo) => openModal(clickedTodo, "upcoming");
  const openModalForCompleted = (clickedTodo) => openModal(clickedTodo, "today");

  const handleKeyboardEvent = (event) => {
    if (event.key === "+") {
      event.preventDefault();
      openModal(null);
    }

    if (event.key === "Escape") {
      closeModal();
    }

    return event;
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.addEventListener("keydown", handleKeyboardEvent);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {showModal && (
        <Modal
          selectedGroup={targetGroup}
          closeModal={closeModal}
          initialRef={initialRef}
          task={task}
        />
      )}
      <div
        className={`min-h-screen w-full transition ${
          theme === "dark" ? "bg-zinc-900" : "bg-zinc-50"
        }`}
      >
        <Layout title="Tasks">
          <div className="mx-auto flex w-full max-w-7xl gap-8 px-20 py-8">
            <Section
              headline="Today"
              data={appState?.todayTasks}
              openModal={openModal}
              showCounter={true}
              droppableId="today"
              emptyMessage="No tasks for today yet. Add one to get started."
            />

            <Section
              headline="Tomorrow"
              data={appState?.tomorrowTasks}
              openModal={openModalForTomorrow}
              showCounter={true}
              droppableId="tomorrow"
              emptyMessage="You're all set for tomorrow."
            />

            <Section
              headline="Upcoming"
              data={appState?.upcomingTasks}
              openModal={openModalForUpcoming}
              showCounter={false}
              droppableId="upcoming"
              emptyMessage="Plan ahead by adding upcoming work."
            />
          </div>
        </Layout>
      </div>
    </>
  );
};

export default Home;
