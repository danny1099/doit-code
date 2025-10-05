import * as vscode from "vscode";
import type { TodoTask } from "./types";

export class TodoItem extends vscode.TreeItem {
  constructor(
    public readonly task: TodoTask,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
  ) {
    super(task.text, collapsibleState);

    /* set tooltip and description */
    this.tooltip = this.buildTooltip();
    this.description = this.buildDescription();
    this.contextValue = task.sourceFile ? "todoItemWithFile" : "todoItem";

    if (!task.completed) {
      this.iconPath = new vscode.ThemeIcon("clock", new vscode.ThemeColor("list.warningForeground"));
    }

    if (task.completed && task.sourceFile?.status === "on-removed") {
      this.iconPath = new vscode.ThemeIcon(
        "activate-breakpoints",
        new vscode.ThemeColor("list.deemphasizedForeground")
      );
    }

    if (task.completed && task.sourceFile?.status !== "on-removed") {
      this.iconPath = new vscode.ThemeIcon("check-all", new vscode.ThemeColor("terminal.ansiGreen"));
    }
  }

  private buildTooltip(): string {
    let tooltip = `${this.task.text}\nCreated: ${this.task.createdAt.toLocaleString()}`;
    tooltip += `\nProject: ${this.task.project}`;
    tooltip += `\nTime lapsed: ${this.formatTimeLapsed(this.task.createdAt)}`;

    if (this.task.sourceFile) {
      tooltip += `\nType: ${this.task.sourceFile.type}`;
      tooltip += `\nFound in: ${this.task.sourceFile.filePath}`;
      tooltip += `\nLine: ${this.task.sourceFile.lineNumber}`;
      tooltip += `\nStatus: ${this.task.sourceFile.status}`;
      tooltip += `\nOriginal text: ${this.task.sourceFile.originalText}`;
    }

    return tooltip;
  }

  private buildDescription(): string {
    let desc = "";

    if (this.task.sourceFile) {
      const fileName = this.task.sourceFile.filePath.split(/[/\\]/).pop();
      desc += `◈ ${this.task.sourceFile.type} | ${fileName}`;
    }

    return desc;
  }

  private formatTimeLapsed(date: Date): string {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 86400; // 60 * 60 * 24
    if (interval > 1) {
      const days = Math.floor(interval);
      return `${days} day${days > 1 ? "s" : ""}`;
    }

    interval = seconds / 3600; // 60 * 60
    if (interval > 1) {
      const hours = Math.floor(interval);
      return `${hours} hour${hours > 1 ? "s" : ""}`;
    }

    interval = seconds / 60;
    if (interval > 1) {
      const minutes = Math.floor(interval);
      return `${minutes} minute${minutes > 1 ? "s" : ""}`;
    }

    return `${Math.floor(seconds)} second${seconds !== 1 ? "s" : ""}`;
  }
}
