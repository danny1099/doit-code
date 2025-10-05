import * as vscode from "vscode";
import { TodoParser } from "./parser";
import { type TodoTask, CONFIG_NAME } from "./types";

export class TodoManager {
  private parser: TodoParser;
  private fileWatcher: vscode.FileSystemWatcher;
  private processedTodos: Set<string> = new Set();
  private onNewTodosFound: vscode.EventEmitter<TodoTask[]>;
  private onTodosRemoved: vscode.EventEmitter<string[]>;

  private fileCache: Map<string, { todos: TodoTask[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5000;

  readonly onDidFindNewTodos: vscode.Event<TodoTask[]>;
  readonly onDidRemoveTodos: vscode.Event<string[]>;

  private readonly excludePatterns = [
    "**/node_modules/**",
    "**/chunks/**",
    "**/dist/**",
    "**/build/**",
    "**/out/**",
    "**/.git/**",
    "**/.vscode/**",
    "**/vendor/**",
    "**/target/**",
    "**/bin/**",
    "**/obj/**",
    "**/.next/**",
    "**/.nuxt/**",
    "**/coverage/**",
    "**/.nyc_output/**",
    "**/logs/**",
    "**/*.min.js",
    "**/*.bundle.js",
    "**/.DS_Store",
  ];

  constructor() {
    this.parser = new TodoParser();
    this.onNewTodosFound = new vscode.EventEmitter<TodoTask[]>();
    this.onTodosRemoved = new vscode.EventEmitter<string[]>();
    this.onDidFindNewTodos = this.onNewTodosFound.event;
    this.onDidRemoveTodos = this.onTodosRemoved.event;

    /* create watcher for file changes in workspace */
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(
      "**/*.{js,ts,jsx,tsx,py,java,cs,cpp,c,php,go,rs,html,css,scss,sql,txt,vue,svelte,rb,swift,kt,scala,clj}",
      false,
      false,
      false
    );

    this.setupWatchers();
    this.scanWorkspace();
  }

  private setupWatchers() {
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (this.parser.shouldParseFile(document) && this.shouldScanPath(document.uri.fsPath)) {
        this.invalidateFileCache(document.uri.fsPath);
        this.scanDocument(document);
      }
    });

    vscode.workspace.onDidDeleteFiles((event) => {
      event.files.forEach((uri) => {
        this.invalidateFileCache(uri.fsPath);
      });
    });
  }

  private async scanWorkspace() {
    const customExcludes = this.getCustomExcludePatterns();
    const allExcludes = [...this.excludePatterns, ...customExcludes];
    const excludePattern = `{${allExcludes.join(",")}}`;
    const files = await vscode.workspace.findFiles(
      "**/*.{js,ts,jsx,tsx,py,java,cs,cpp,c,php,go,rs,html,css,scss,sql,md,txt,vue,svelte,rb,swift,kt,scala,clj}",
      excludePattern
    );

    let scannedCount = 0;
    let todosFound = 0;

    // Procesar archivos en lotes para no bloquear el hilo principal
    const BATCH_SIZE = 10;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (file) => {
          if (this.shouldScanPath(file.fsPath)) {
            const newTodos = await this.scanFile(file);
            scannedCount++;
            todosFound += newTodos.length;
          }
        })
      );

      // Pequeña pausa entre lotes para no saturar
      if (i + BATCH_SIZE < files.length) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    console.log(`Scanned ${scannedCount} files, found ${todosFound} TODOs`);
  }

  private async scanFile(uri: vscode.Uri): Promise<TodoTask[]> {
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      return this.scanDocument(document);
    } catch (error) {
      console.warn(`Failed to scan file ${uri.fsPath}:`, error);
      return [];
    }
  }

  private scanDocument(document: vscode.TextDocument): TodoTask[] {
    if (!this.parser.shouldParseFile(document) || !this.shouldScanPath(document.uri.fsPath)) {
      return [];
    }

    const uriPath = document.uri.fsPath;
    const filePath = this.parser.normalizeFilePath(uriPath).toLowerCase();
    const parsedTodos = this.parser.parseFile(document);
    const newTodos: TodoTask[] = [];

    for (const parsed of parsedTodos) {
      if (parsed.text.trim() === "" || parsed.text.trim().length <= 8) {
        continue;
      }

      const todoKey = `${filePath}:${parsed.line}:${parsed.type}:${parsed.text.trim()}`;
      if (!this.processedTodos.has(todoKey)) {
        const todoTask = this.parser.parsedTodoToTask(parsed, filePath);
        newTodos.push(todoTask);
        this.processedTodos.add(todoKey);
      }
    }

    if (newTodos.length > 0) {
      this.onNewTodosFound.fire(newTodos);
    }

    return newTodos;
  }

  private shouldScanPath(filePath: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, "/").toLowerCase();

    // Lista de carpetas y patrones a excluir
    const excludeItems = [
      "node_modules",
      "chunks",
      "dist",
      "build",
      "out",
      ".git",
      ".vscode",
      "vendor",
      "target",
      "bin",
      "obj",
      ".next",
      ".nuxt",
      "coverage",
      ".nyc_output",
      "logs",
      ".webpack",
      ".parcel-cache",
      "__pycache__",
      ".pytest_cache",
      ".idea",
      ".venv",
      "venv",
      "env",
      "next-env",
      "README",
    ];

    // Verificar si el path contiene alguna carpeta excluida
    for (const excludeItem of excludeItems) {
      if (
        normalizedPath.includes(`/${excludeItem}/`) ||
        normalizedPath.includes(`\\${excludeItem}\\`) ||
        normalizedPath.endsWith(`/${excludeItem}`) ||
        normalizedPath.endsWith(`\\${excludeItem}`)
      ) {
        return false;
      }
    }

    // Verificar archivos específicos a excluir
    const excludeFiles = [".min.js", ".bundle.js", ".chunk.js", ".DS_Store", "next-env.d.ts"];
    for (const excludeFile of excludeFiles) {
      if (normalizedPath.includes(excludeFile)) {
        return false;
      }
    }

    // Verificar patrones personalizados
    const customExcludes = this.getCustomExcludePatterns();
    for (const pattern of customExcludes) {
      try {
        const regex = new RegExp(pattern.replace(/\*/g, ".*"), "i");
        if (regex.test(normalizedPath)) {
          return false;
        }
      } catch (e) {
        console.warn(`Invalid exclude pattern: ${pattern}`);
      }
    }

    return true;
  }

  private getCustomExcludePatterns(): string[] {
    const config = vscode.workspace.getConfiguration(CONFIG_NAME);
    return config.get<string[]>("excludePatterns", []);
  }

  async openFileAtLine(filePath: string, lineNumber: number) {
    try {
      const uri = vscode.Uri.file(filePath);
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);

      const position = new vscode.Position(lineNumber, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${error}`);
    }
  }

  async validateExistingTasks(tasks: TodoTask[]): Promise<string[]> {
    const removedTaskIds: string[] = [];
    const tasksByFile = new Map<string, TodoTask[]>();

    // Filtrar y agrupar solo tareas relevantes
    const tasksToValidate = tasks.filter((task) => task.sourceFile && !task.completed);

    if (tasksToValidate.length === 0) {
      return removedTaskIds;
    }

    // Agrupar por archivo
    for (const task of tasksToValidate) {
      const filePath = task.sourceFile!.filePath;
      if (!tasksByFile.has(filePath)) {
        tasksByFile.set(filePath, []);
      }
      tasksByFile.get(filePath)!.push(task);
    }

    // Validar cada archivo (con cache)
    const validationPromises = Array.from(tasksByFile.entries()).map(async ([filePath, fileTasks]) => {
      try {
        // Intentar usar cache primero
        const cachedTodos = this.getFromCache(filePath);
        let currentTodos: ReturnType<typeof this.parser.parseFile>;

        if (cachedTodos) {
          // Convertir de TodoTask a formato parseado
          currentTodos = cachedTodos.map((todo) => ({
            line: todo.sourceFile!.lineNumber,
            text: todo.text,
            originalText: todo.sourceFile!.originalText,
            type: todo.sourceFile!.type as "TODO" | "FIXME" | "NOTE" | "HACK" | "BUG",
          }));
        } else {
          const uri = vscode.Uri.file(filePath);
          const document = await vscode.workspace.openTextDocument(uri);
          currentTodos = this.parser.parseFile(document);

          const todoTasks = currentTodos.map((parsed) => this.parser.parsedTodoToTask(parsed, filePath));
          this.updateCache(filePath, todoTasks);
        }

        const currentTodoKeys = new Set(currentTodos.map((todo) => `${filePath}:${todo.line}:${todo.text.trim()}`));

        for (const task of fileTasks) {
          const taskKey = `${filePath}:${task.sourceFile!.lineNumber}:${task.text.trim()}`;
          if (!currentTodoKeys.has(taskKey)) {
            removedTaskIds.push(task.id);
          }
        }
      } catch (error) {
        console.warn(`Could not validate file ${filePath}:`, error);
        fileTasks.forEach((task) => removedTaskIds.push(task.id));
        this.invalidateFileCache(filePath);
      }
    });

    // Procesar todas las validaciones en paralelo
    await Promise.all(validationPromises);

    if (removedTaskIds.length > 0) {
      this.onTodosRemoved.fire(removedTaskIds);
    }

    return removedTaskIds;
  }

  async doesTaskExistInFile(task: TodoTask): Promise<boolean> {
    if (!task.sourceFile || task.completed) {
      return false;
    }

    const filePath = task.sourceFile.filePath;

    try {
      const cachedTodos = this.getFromCache(filePath);
      let currentTodos: ReturnType<typeof this.parser.parseFile>;

      if (cachedTodos) {
        currentTodos = cachedTodos.map((todo) => ({
          line: todo.sourceFile!.lineNumber,
          text: todo.text,
          originalText: todo.sourceFile!.originalText,
          type: todo.sourceFile!.type as "TODO" | "FIXME" | "NOTE" | "HACK" | "BUG",
        }));
      } else {
        const uri = vscode.Uri.file(filePath);
        const document = await vscode.workspace.openTextDocument(uri);
        currentTodos = this.parser.parseFile(document);

        const todoTasks = currentTodos.map((parsed) => this.parser.parsedTodoToTask(parsed, filePath));
        this.updateCache(filePath, todoTasks);
      }

      const taskKey = `${filePath}:${task.sourceFile.lineNumber}:${task.text.trim()}`;
      const taskExists = currentTodos.some((todo) => `${filePath}:${todo.line}:${todo.text.trim()}` === taskKey);

      return taskExists;
    } catch (error) {
      console.warn(`Could not validate file ${filePath}:`, error);
      this.invalidateFileCache(filePath);

      // En caso de error, asumir que la tarea fue removida
      this.onTodosRemoved.fire([task.id]);
      return false;
    }
  }

  private getFromCache(filePath: string): TodoTask[] | null {
    const cached = this.fileCache.get(filePath);
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.fileCache.delete(filePath);
      return null;
    }

    return cached.todos;
  }

  private updateCache(filePath: string, todos: TodoTask[]): void {
    this.fileCache.set(filePath, {
      todos,
      timestamp: Date.now(),
    });
  }

  private invalidateFileCache(filePath: string): void {
    this.fileCache.delete(filePath);
  }

  markTodoAsProcessed(filePath: string, lineNumber: number, text: string) {
    const todoKey = `${filePath}:${lineNumber}:${text}`;
    this.processedTodos.add(todoKey);
  }

  clearProcessedCache() {
    this.processedTodos.clear();
    this.fileCache.clear();
  }

  dispose() {
    this.fileWatcher.dispose();
    this.onNewTodosFound.dispose();
    this.onTodosRemoved.dispose();
    this.fileCache.clear();
  }
}
