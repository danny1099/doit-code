import * as vscode from "vscode";
import { CONFIG_NAME, type TodoTask } from "./types";
import { TodoManager } from "./manager";
import { TodoItem } from "./item";

export abstract class TodoProviderBase implements vscode.TreeDataProvider<TodoItem> {
  private static onDidTaskStateChange: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  private _onDidChangeTreeData: vscode.EventEmitter<TodoItem | undefined | null | void> = new vscode.EventEmitter<
    TodoItem | undefined | null | void
  >();

  readonly onDidChangeTreeData: vscode.Event<TodoItem | undefined | null | void> = this._onDidChangeTreeData.event;

  protected tasks: TodoTask[] = [];
  protected fileTodoManager: TodoManager;
  protected context: vscode.ExtensionContext;
  private validationInterval: NodeJS.Timeout | undefined;
  private isValidating: boolean = false;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadTasks();
    this.fileTodoManager = new TodoManager();

    this.fileTodoManager.onDidFindNewTodos((newTodos) => {
      this.addTasksFromFiles(newTodos);
    });

    this.fileTodoManager.onDidRemoveTodos((removedTaskIds) => {
      this.handleRemovedTasks(removedTaskIds);
    });

    TodoProviderBase.onDidTaskStateChange.event(() => {
      this.loadTasks();
      this.refresh();
    });

    this.startPeriodicValidation();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TodoItem): vscode.TreeItem {
    return element;
  }

  abstract filterTasks(tasks: TodoTask[]): TodoTask[];

  getChildren(element?: TodoItem): Thenable<TodoItem[]> {
    if (!element) {
      const filteredTasks = this.filterTasks(this.tasks);
      const sortedTasks = filteredTasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return Promise.resolve(sortedTasks.map((task) => new TodoItem(task)));
    }
    return Promise.resolve([]);
  }

  resetTasks(): void {
    this.tasks = [];
    this.saveTasks();
    this.refresh();
  }

  protected saveTasks(): void {
    this.context.globalState.update("doitTasks", this.tasks);
  }

  protected loadTasks(): void {
    const savedTasks = this.context.globalState.get<TodoTask[]>("doitTasks");
    if (savedTasks) {
      this.tasks = savedTasks.map((task) => ({
        ...task,
        createdAt: new Date(task.createdAt),
      }));
    }
  }

  private startPeriodicValidation(): void {
    const config = vscode.workspace.getConfiguration(CONFIG_NAME);
    const validationInterval = config.get<number>("validationInterval", 180000); // 3 minutos

    this.validationInterval = setInterval(() => {
      this.validateTasksInFiles();
    }, validationInterval);
  }

  private async validateTasksInFiles(): Promise<void> {
    if (this.isValidating) {
      console.log("Validation already in progress, skipping...");
      return;
    }

    const tasksToValidate = this.tasks.filter((t) => t.sourceFile && !t.completed);
    if (tasksToValidate.length === 0) {
      return;
    }

    this.isValidating = true;

    try {
      const removedTaskIds = await this.fileTodoManager.validateExistingTasks(this.tasks);
      if (removedTaskIds.length > 0) {
        console.log(`Validated: ${removedTaskIds.length} tasks no longer exist in files`);
      }
    } catch (error) {
      console.error("Error validating tasks:", error);
    } finally {
      this.isValidating = false;
    }
  }

  protected getWorkspaceName(): vscode.WorkspaceFolder | undefined {
    if (!vscode.workspace.workspaceFolders) {
      return undefined;
    }
    return vscode.workspace.workspaceFolders[0];
  }

  dispose(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
    }
    this.fileTodoManager.dispose();
  }

  rescanWorkspace(): void {
    this.fileTodoManager.clearProcessedCache();
    this.fileTodoManager.dispose();
    this.fileTodoManager = new TodoManager();

    this.fileTodoManager.onDidFindNewTodos((newTodos) => {
      this.addTasksFromFiles(newTodos);
    });

    this.fileTodoManager.onDidRemoveTodos((removedTaskIds) => {
      this.handleRemovedTasks(removedTaskIds);
    });

    setTimeout(() => {
      this.validateTasksInFiles();
    }, 10000);
  }

  private async addTasksFromFiles(newTodos: TodoTask[]): Promise<void> {
    const config = vscode.workspace.getConfiguration(CONFIG_NAME);
    const similarityThreshold = config.get<number>("similarityThreshold", 0.7);
    const autoComplete = config.get<boolean>("autoComplete", true);

    let wasProcessed = false;
    let addedCount = 0;
    let updatedCount = 0;
    let completedCount = 0;
    let deletedCount = 0;

    for (const newTask of newTodos) {
      const existingTask = this.tasks.some((t) => t.id === newTask.id);
      if (existingTask || !newTask.sourceFile) continue;

      /* get tasks from same file that are not completed */
      const tasksFromSameFile = this.tasks.filter((t) => t.sourceFile?.filePath === newTask.sourceFile?.filePath && !t.completed);
      for (const task of tasksFromSameFile) {
        const similarity = this.calculateSimilarity(task.text, newTask.text);
        if (similarity >= similarityThreshold) {
          task.id = newTask.id;
          task.text = newTask.text;
          task.sourceFile = newTask.sourceFile;
          this.saveTasks();
          this.refresh();

          wasProcessed = true;
          updatedCount++;
        } else {
          const taskExists = this.tasks.some((t) => t.id === task.id);
          const existsInFile = await this.fileTodoManager.doesTaskExistInFile(task);

          /* if task exists in file, skip */
          if (taskExists && existsInFile) continue;

          /* if task does not exist in file, complete or delete based on config */
          if (autoComplete) {
            task.completed = true;
            task.sourceFile!.status = "on-removed";
            this.saveTasks();
            this.refresh();

            wasProcessed = false;
            completedCount++;
          } else {
            const taskIndex = this.tasks.findIndex((t) => t.id === task.id);
            if (taskIndex >= 0) {
              this.tasks.splice(taskIndex, 1);
              this.saveTasks();
              this.refresh();

              wasProcessed = false;
              deletedCount++;
            }
          }
        }
      }

      /* if task was not processed, add it */
      !wasProcessed && addedCount++;
      !wasProcessed && this.tasks.push(newTask);

      if (addedCount > 0 || updatedCount > 0 || completedCount > 0) {
        this.saveTasks();
        this.refresh();

        const messages = [];
        if (addedCount > 0) messages.push(`Added ${addedCount} tasks from files`);
        if (updatedCount > 0) messages.push(`Updated ${updatedCount} tasks from files`);
        if (completedCount > 0) {
          const action = autoComplete ? "Completed" : "Removed";
          messages.push(`${action} ${completedCount} tasks in files`);
        }

        if (messages.length > 0) {
          vscode.window.showInformationMessage(`${messages.join(", ")}`);
        }
      }
    }
  }

  private handleRemovedTasks(removedTaskIds: string[]): void {
    if (removedTaskIds.length === 0) {
      return;
    }

    const config = vscode.workspace.getConfiguration(CONFIG_NAME);
    const autoComplete = config.get<boolean>("autoComplete", true);

    let completedCount = 0;
    let deletedCount = 0;

    for (const taskId of removedTaskIds) {
      const task = this.tasks.find((t) => t.id === taskId);

      if (!task || task.completed) {
        continue;
      }

      if (autoComplete) {
        task.completed = true;
        if (task.sourceFile) {
          task.sourceFile.status = "on-removed";
        }
        completedCount++;
      } else {
        const taskIndex = this.tasks.findIndex((t) => t.id === taskId);
        if (taskIndex >= 0) {
          this.tasks.splice(taskIndex, 1);
          deletedCount++;
        }
      }
    }

    if (completedCount > 0 || deletedCount > 0) {
      this.saveTasks();
      this.refresh();

      if (autoComplete && completedCount > 0) {
        const msg =
          completedCount === 1 ? "1 task completed (removed from file)" : `${completedCount} tasks completed (removed from files)`;
        vscode.window.showInformationMessage(msg);
      } else if (!autoComplete && deletedCount > 0) {
        const msg = deletedCount === 1 ? "1 task deleted (removed from file)" : `${deletedCount} tasks deleted (removed from files)`;
        vscode.window.showInformationMessage(msg);
      }
    }
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const cleanText1 = text1.toLowerCase().trim().replace(/\s+/g, " ");
    const cleanText2 = text2.toLowerCase().trim().replace(/\s+/g, " ");

    if (cleanText1 === cleanText2) {
      return 1.0;
    }

    // Si uno es subcadena del otro, dar alta similitud
    if (cleanText1.includes(cleanText2) || cleanText2.includes(cleanText1)) {
      const longer = cleanText1.length > cleanText2.length ? cleanText1 : cleanText2;
      const shorter = cleanText1.length > cleanText2.length ? cleanText2 : cleanText1;
      return Math.max(0.8, shorter.length / longer.length);
    }

    // Calcular distancia de Levenshtein
    const distance = this.levenshteinDistance(cleanText1, cleanText2);
    const maxLength = Math.max(cleanText1.length, cleanText2.length);
    const levenshteinSimilarity = maxLength > 0 ? (maxLength - distance) / maxLength : 0;

    // Calcular similitud por palabras (Jaccard)
    const words1 = cleanText1.split(" ");
    const words2 = cleanText2.split(" ");

    const intersection = words1.filter((word) => words2.includes(word)).length;
    const union = [...new Set([...words1, ...words2])].length;
    const jaccardSimilarity = union > 0 ? intersection / union : 0;

    // Combinar métricas con pesos
    return levenshteinSimilarity * 0.6 + jaccardSimilarity * 0.4;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  addTask(text: string): void {
    const newTask: TodoTask = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: text,
      completed: false,
      project: this.getWorkspaceName()?.name,
      createdAt: new Date(),
    };

    this.tasks.push(newTask);
    this.saveTasks();
    this.refresh();
  }

  editTask(taskId: string, newText: string): void {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.text = newText;
      this.saveTasks();
      this.refresh();
    }
  }

  deleteTask(taskId: string): void {
    const taskIndex = this.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex >= 0) {
      this.tasks.splice(taskIndex, 1);
      this.saveTasks();
      this.refresh();
    }
  }

  toggleTask(taskId: string): void {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.saveTasks();

      TodoProviderBase.onDidTaskStateChange.fire();
    }
  }

  async openTaskInFile(taskId: string): Promise<void> {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task?.sourceFile) {
      await this.fileTodoManager.openFileAtLine(task.sourceFile.filePath, task.sourceFile.lineNumber);
    } else {
      vscode.window.showInformationMessage("This task was not created from a file.");
    }
  }
}
