import React, { useState, useRef, useContext, useEffect } from "react";
import { Modal, Section, Layout } from "../components";
import { AppState } from "../localState";
import { useTheme } from "next-themes";
import { updateTask } from "../backend";

const Home = () => {
  const initialRef = useRef();
  const [task, setTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [targetGroup, setTargetGroup] = useState("today");
  const { theme } = useTheme();

  const { appState } = useContext(AppState);

  useEffect(()=>{
    appState?.upcomingTasks.map(((task: any) =>{
      if(task.isComplete) {
        updateTask(task.id, task.content, task.isComplete, task.priority, "close", task.date)
      }
  }))
  },[appState])

  const closeModal = () => {
    setShowModal(false);
  };

  const openModal = (clickedTodo) => {
    setTask(clickedTodo);
    setShowModal(true);
    setTargetGroup("today");
  };

  const openModalForTomorrow = (clickedTodo) => {
    setTask(clickedTodo);
    setShowModal(true);
    setTargetGroup("tomorrow");
  };

  const openModalForUpcoming = (clickedTodo) => {
    setTask(clickedTodo);
    setShowModal(true);
    setTargetGroup("upcoming");
  };

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
        className={`w-screen h-screen 
        ${showModal && "contrast-50 blur-sm"}
        ${theme === "dark" ? "bg-zinc-900 " : "bg-zinc-50 "}`}
      >
        <Layout title="Tasks">
          <div className={`flex flex-col md:flex-row container `}>
            <Section
              headline="Today"
              data={appState?.todayTasks}
              openModal={openModal}
              showCounter={true}
            />

            <Section
              headline="Tomorrow"
              data={appState?.tomorrowTasks}
              openModal={openModalForTomorrow}
              showCounter={false}
            />

            <Section
              headline="Upcoming"
              data={appState?.upcomingTasks}
              openModal={openModalForUpcoming}
            />
          </div>
        </Layout>
      </div>
    </>
  );
};

export default Home;
