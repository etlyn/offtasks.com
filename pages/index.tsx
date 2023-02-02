import React, { useState, useRef, useContext, useEffect } from "react";
import { Modal, Section, Layout } from "../components";
import { useDate } from "../hooks";
import { Initialization } from "../initialization";
import { AppContext } from "../context";
import { useTheme } from "next-themes";

const Home = () => {
  const initialRef = useRef();
  const [task, setTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [date, setDate] = useState(null);
  const { theme } = useTheme();

  const { today, tomorrow, upcoming } = useDate();
  const { context } = useContext(AppContext);

  const closeModal = () => {
    setShowModal(false);
  };

  const openModal = (clickedTodo) => {
    setTask(clickedTodo);
    setShowModal(true);
    setDate(today);
  };

  const openModalForTomorrow = (clickedTodo) => {
    setTask(clickedTodo);
    setShowModal(true);
    setDate(tomorrow);
  };

  const openModalForUpcoming = (clickedTodo) => {
    setTask(clickedTodo);
    setShowModal(true);
    setDate(upcoming);
  };

  const handleKeyboardEvent = (event) => {
    if (event.key === "+") {
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
  }, []);

  return (
    <Initialization>
      {showModal && (
        <Modal
          selectedDate={date}
          closeModal={closeModal}
          initialRef={initialRef}
          task={task}
        />
      )}
      <div
        className={`w-screen h-screen 
        ${showModal && "contrast-50 blur-sm"}
        ${theme === "light" ? "bg-zinc-50 " : "bg-zinc-900 "}`}
      >
        <Layout title="Tasks">
          <div className={`flex flex-col md:flex-row container `}>
            <Section
              headline="Today"
              data={context.todayTasks}
              currentDate={today}
              openModal={openModal}
              showCounter={true}
            />

            <Section
              headline="Tomorrow"
              data={context.tomorrowTasks}
              currentDate={tomorrow}
              openModal={openModalForTomorrow}
              showCounter={false}
            />

            <Section
              headline="Upcoming"
              data={context.upcomingTasks}
              openModal={openModalForUpcoming}
            />
          </div>
        </Layout>
      </div>
    </Initialization>
  );
};

export default Home;
