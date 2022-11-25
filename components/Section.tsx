import React from "react";
import { List } from "./List";
import { SectionHeader } from "./SectionHeader";

export const Section = ({
  headline,
  data = [],
  openModal,
  statusHandler,
  currentDate,
  showCounter,
}: any) => {
  const completedTasks = data.filter((task) => task.isComplete === true).length;
  const allTasks = data.length;

  return (
    <div className="flex flex-col mt-12 md:mt-8 container md:w-1/2">
      <div className="container px-6">
        <SectionHeader
          headline={headline}
          onClickAdd={openModal}
          progressData={{ completedTasks, allTasks }}
          showCounter={showCounter}
        />
      </div>

      <div className="container px-6 h-96 overflow-y-scroll scrollbar">
        {data.map((task) => (
          <List
            task={task}
            key={task.id}
            openHandler={openModal}
            statusHandler={statusHandler}
            date={currentDate}
          />
        ))}
      </div>
    </div>
  );
};
