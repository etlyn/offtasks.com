import React, { useContext } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { List } from "./List";
import { SectionHeader } from "./SectionHeader";
import { DragIcon } from "../icons";
import { updateTask } from "../backend";
import { AppState } from "../localState";

export const Section = ({
  headline,
  data,
  openModal,
  statusHandler,
  showCounter,
  allowAdd = true,
  droppableId,
  emptyMessage = "You're all caught up."
}: any) => {
  const { appState } = useContext(AppState);
  const completedTasks = data?.filter(
    (task) => task.isComplete === true
  ).length;
  const allTasks = data?.length;

  const onDragEnd = (result) => {
    if (!result.destination) {
      return;
    }
    const reorderedItems = reorder(
      data,
      result.source.index,
      result.destination.index
    );

    reorderedItems.forEach((task: any, index) => {
      const currentTargetGroup = task.target_group ?? "today";

      updateTask(
        task.id,
        task.content,
        task.isComplete,
        index,
        currentTargetGroup,
        task.date
      );
    });

    appState?.refreshTasks?.();
  };

  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-6">
        <SectionHeader
          headline={headline}
          onClickAdd={openModal}
          progressData={{ completedTasks, allTasks }}
          showCounter={showCounter}
          showAddButton={allowAdd}
        />
      </div>

      <div className="flex flex-col gap-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId={droppableId ?? headline}>
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex flex-col gap-4"
              >
                {data?.length ? (
                  data.map((task, index) => (
                    <Draggable
                      key={task.id}
                      draggableId={task.id.toString()}
                      index={index}
                    >
                      {(providedDrag) => (
                        <div
                          ref={providedDrag.innerRef}
                          {...providedDrag.draggableProps}
                          {...providedDrag.dragHandleProps}
                          className="flex flex-row items-start gap-3"
                        >
                          <List
                            task={task}
                            openHandler={openModal}
                            statusHandler={statusHandler}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))
                ) : (
                  <p className="text-sm text-zinc-400 dark:text-zinc-500">
                    {emptyMessage}
                  </p>
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
};
