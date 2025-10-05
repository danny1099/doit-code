import { TodoProviderBase } from "./provider";
import type { TodoTask } from "./types";

export class PendingTodoProvider extends TodoProviderBase {
  filterTasks(tasks: TodoTask[]): TodoTask[] {
    const weHaveWorkspace = this.getWorkspaceName()?.name;
    return tasks.filter((task) => {
      if (weHaveWorkspace) {
        return !task.completed && task.project === weHaveWorkspace;
      } else {
        return !task.completed;
      }
    });
  }
}

export class CompletedTodoProvider extends TodoProviderBase {
  filterTasks(tasks: TodoTask[]): TodoTask[] {
    const weHaveWorkspace = this.getWorkspaceName()?.name;
    return tasks.filter((task) => {
      if (weHaveWorkspace) {
        return task.completed && task.project === weHaveWorkspace;
      } else {
        return task.completed;
      }
    });
  }
}
