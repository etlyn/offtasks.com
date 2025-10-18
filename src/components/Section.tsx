import React from "react";
import { List } from "@/components/List";
import { SectionHeader } from "@/components/SectionHeader";
import type { Task, TaskGroup } from "@/types";

interface SectionProps {
  headline: string;
  data?: Task[];
  openModal: (task: Task | null, group?: TaskGroup) => void;
  showCounter: boolean;
  allowAdd?: boolean;
  emptyMessage?: string;
  targetGroup?: TaskGroup;
}

export const Section = ({
  headline,
  data = [],
  openModal,
  showCounter,
  allowAdd = true,
  emptyMessage = "You're all caught up.",
  targetGroup,
}: SectionProps) => {
  const completedTasks = data.filter((task) => task.isComplete).length;
  const allTasks = data.length;

  return (
    <section className="flex flex-1 flex-col">
      <div className="mb-6">
        <SectionHeader
          headline={headline}
          onClickAdd={(task) => openModal(task, targetGroup)}
          progressData={{ completedTasks, allTasks }}
          showCounter={showCounter}
          showAddButton={allowAdd}
        />
      </div>

      <div className="flex flex-col gap-4">
        {data.length ? (
          data.map((task) => (
            <div key={task.id} className="flex flex-row items-start gap-3">
              <List task={task} openHandler={openModal} />
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
};
