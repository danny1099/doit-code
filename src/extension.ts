import * as vscode from "vscode";
import { PendingTodoProvider, CompletedTodoProvider } from "./provider-state";
import { CONFIG_NAME } from "./types";
import { TodoItem } from "./item";

export function activate(context: vscode.ExtensionContext) {
  /* create the todo providers */
  const pendingProvider = new PendingTodoProvider(context);
  const completedProvider = new CompletedTodoProvider(context);

  const treeViewPending = vscode.window.createTreeView("doit-code-pending", {
    treeDataProvider: pendingProvider,
    showCollapseAll: true,
  });

  const treeViewCompleted = vscode.window.createTreeView("doit-code-completed", {
    treeDataProvider: completedProvider,
    showCollapseAll: true,
  });

  const addTaskCommand = vscode.commands.registerCommand("doit.addTask", async () => {
    const taskText = await vscode.window.showInputBox({
      prompt: "Enter the title of the task",
      placeHolder: "What needs to be done?",
    });

    if (taskText && taskText.trim()) {
      pendingProvider.addTask(taskText.trim());
      completedProvider.refresh();
      vscode.window.showInformationMessage(`New task ${taskText} is added`);
    }
  });

  const editTaskCommand = vscode.commands.registerCommand("doit.editTask", async (item: TodoItem) => {
    const newText = await vscode.window.showInputBox({
      prompt: "Edit task",
      value: item.task.text,
    });

    if (newText && newText.trim()) {
      const provider = item.task.completed ? completedProvider : pendingProvider;
      provider.editTask(item.task.id, newText.trim());
      vscode.window.showInformationMessage(`Task task ${item.task.text} was updated`);
    }
  });

  const deleteTaskCommand = vscode.commands.registerCommand("doit.deleteTask", async (item: TodoItem) => {
    const provider = item.task.completed ? completedProvider : pendingProvider;
    provider.deleteTask(item.task.id);
    pendingProvider.refresh();
    completedProvider.refresh();

    /* show notification generally in the status bar */
    vscode.window.showInformationMessage(`The task ${item.task.text} was deleted`);
  });

  const openFileCommand = vscode.commands.registerCommand("doit.openTaskFile", async (item: TodoItem) => {
    const provider = item.task.completed ? completedProvider : pendingProvider;
    if (item.task.sourceFile) {
      await provider.openTaskInFile(item.task.id);
    } else {
      vscode.window.showInformationMessage("This task was not created from a file.");
    }
  });

  const pendingTaskCommand = vscode.commands.registerCommand("doit.pendingTask", (item: TodoItem) => {
    pendingProvider.toggleTask(item.task.id);
    const status = item.task.completed ? "incomplete" : "complete";
    vscode.window.showInformationMessage(`Task is now marked as ${status}`);
  });

  const completeTaskCommand = vscode.commands.registerCommand("doit.completeTask", (item: TodoItem) => {
    if (item.task.sourceFile) {
      if (item.task.sourceFile.status === "on-removed") {
        vscode.window.showInformationMessage(
          "This task was deleted from the file. It cannot be marked as pending."
        );
        return;
      }
    }

    completedProvider.toggleTask(item.task.id);
    const status = item.task.completed ? "incomplete" : "complete";
    vscode.window.showInformationMessage(`Task is now marked as ${status}`);
  });

  const refreshCommand = vscode.commands.registerCommand("doit.refresh", () => {
    pendingProvider.refresh();
    completedProvider.refresh();
    vscode.window.showInformationMessage("Now you have all the tasks updated");
  });

  const resetCommand = vscode.commands.registerCommand("doit.reset", () => {
    pendingProvider.resetTasks();
    completedProvider.resetTasks();
    vscode.window.showInformationMessage("All tasks have been reset");
  });

  const rescanCommand = vscode.commands.registerCommand("doit.rescanWorkspace", () => {
    pendingProvider.rescanWorkspace();
    completedProvider.rescanWorkspace();
    vscode.window.showInformationMessage("Re-scanning workspace for tasks...");
  });

  const configureExclusionsCommand = vscode.commands.registerCommand("doit.configureExclusions", async () => {
    const config = vscode.workspace.getConfiguration(CONFIG_NAME);
    const currentExclusions = config.get<string[]>("excludePatterns", []);

    const result = await vscode.window.showInputBox({
      prompt: "Enter exclusion patterns (comma separated)",
      value: currentExclusions.join(", "),
      placeHolder: "**/my-folder/**, **/*.generated.js, **/temp/**",
    });

    if (result !== undefined) {
      const newPatterns = result
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      await config.update("excludePatterns", newPatterns, vscode.ConfigurationTarget.Workspace);
      vscode.window.showInformationMessage("Exclusion patterns updated. Re-scanning...");
      pendingProvider.rescanWorkspace();
      completedProvider.rescanWorkspace();
    }
  });

  context.subscriptions.push(
    treeViewPending,
    treeViewCompleted,
    addTaskCommand,
    deleteTaskCommand,
    pendingTaskCommand,
    completeTaskCommand,
    editTaskCommand,
    openFileCommand,
    refreshCommand,
    resetCommand,
    rescanCommand,
    configureExclusionsCommand
  );

  /* clear tasks when the extension is deactivated */
  context.subscriptions.push({
    dispose: () => {
      pendingProvider.dispose();
      completedProvider.dispose();
    },
  });
}

export function deactivate() {}
