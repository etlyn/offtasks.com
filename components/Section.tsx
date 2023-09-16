import React, { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { List } from "./List";
import { SectionHeader } from "./SectionHeader";
import { DragIcon } from "../icons";

export const Section = ({
  headline,
  data = [],
  openModal,
  statusHandler,
  currentDate,
  showCounter,
}: any) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(data);
  }, [data]);

  const completedTasks = items.filter(
    (task) => task.isComplete === true
  ).length;
  const allTasks = items.length;

  const onDragEnd = (result) => {
    if (!result.destination) {
      return;
    }
    const reorderedItems = reorder(
      items,
      result.source.index,
      result.destination.index
    );
    setItems(reorderedItems);
  };

  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

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

      <div className="container -ml-8 px-6 h-96 md:h-[500px] overflow-y-scroll scrollbar">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="droppable">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {items.map((task, index) => (
                  <Draggable
                    key={task.id}
                    draggableId={task.id.toString()}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="flex flex-row justify-center items-start"
                      >
                        <DragIcon className="opacity-0 hover:opacity-100 transition duration-150" />
                        <List
                          task={task}
                          openHandler={openModal}
                          statusHandler={statusHandler}
                          date={currentDate}
                        />
                        
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
};
