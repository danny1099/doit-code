import * as vscode from "vscode";
import { type TodoTask, type ParsedTask, CONFIG_NAME } from "./types";

export class TodoParser {
  /* Patterns for different types of comments */
  private readonly patterns = {
    singleLine: /^\s*\/\/\s*(TODO|FIXME|HACK|NOTE|BUG):?\s*(.+)$/i,
    blockComment: /^\s*\/\*\s*(TODO|FIXME|HACK|NOTE|BUG):?\s*(.+?)\s*\*\/$/i,
    htmlComment: /^\s*<!--\s*(TODO|FIXME|HACK|NOTE|BUG):?\s*(.+?)\s*-->$/i,
    hashComment: /^\s*#\s*(TODO|FIXME|HACK|NOTE|BUG):?\s*(.+)$/i,
    dashComment: /^\s*--\s*(TODO|FIXME|HACK|NOTE|BUG):?\s*(.+)$/i,
  };

  parseFile(document: vscode.TextDocument): ParsedTask[] {
    const todos: ParsedTask[] = [];
    const totalLines = document.lineCount;

    for (let i = 0; i < totalLines; i++) {
      const line = document.lineAt(i);
      const todo = this.parseLine(line.text, i);
      if (todo) {
        todos.push(todo);
      }
    }

    return todos;
  }

  private parseLine(lineText: string, lineNumber: number): ParsedTask | null {
    for (const [_patternName, pattern] of Object.entries(this.patterns)) {
      const match = lineText.match(pattern);

      if (match) {
        const type = match[1].toUpperCase().trim() as ParsedTask["type"];
        const text = match[2].trim();

        return {
          text: text,
          line: lineNumber,
          originalText: lineText.trim(),
          type: type,
        };
      }
    }

    return null;
  }

  parsedTodoToTask(parsed: ParsedTask, filePath: string): TodoTask {
    const workspaceFolder = this.getWorkspaceFolderForFile(filePath);
    const normalizedFilePath = this.normalizeFilePath(filePath);
    const taskIdUnique = `${normalizedFilePath.toLocaleLowerCase()}:${parsed.text}`;

    return {
      id: taskIdUnique,
      text: `${parsed.text.trim()}`,
      completed: false,
      createdAt: new Date(),
      project: workspaceFolder,
      sourceFile: {
        filePath: normalizedFilePath.toLocaleLowerCase(),
        lineNumber: parsed.line,
        originalText: parsed.originalText,
        type: parsed.type,
        status: "in-file",
      },
    };
  }

  /* Get the workspace folder for a file */
  private getWorkspaceFolderForFile(filePath: string): string | undefined {
    if (!vscode.workspace.workspaceFolders) {
      return undefined;
    }

    for (const folder of vscode.workspace.workspaceFolders) {
      if (filePath.startsWith(folder.uri.fsPath)) {
        return folder.name;
      }
    }
    return vscode.workspace.workspaceFolders[0].name;
  }

  /* verify if the file should be parsed */
  shouldParseFile(document: vscode.TextDocument): boolean {
    const config = vscode.workspace.getConfiguration(CONFIG_NAME);
    const autoScan = config.get<boolean>("autoScan", true);

    if (!autoScan) {
      return false;
    }

    const maxFileSize = config.get<number>("maxFileSize", 1048576); // 1MB por defecto
    const fileSize = Buffer.byteLength(document.getText(), "utf8");
    if (fileSize > maxFileSize) {
      console.log(`Skipping large file: ${document.fileName} (${fileSize} bytes)`);
      return false;
    }

    /* Verificar extensiones soportadas */
    const supportedTypes = config.get<string[]>("supportedFileTypes", [
      "js",
      "ts",
      "jsx",
      "tsx",
      "py",
      "java",
      "cs",
      "cpp",
      "c",
      "php",
      "go",
      "rs",
      "html",
      "css",
      "scss",
      "sql",
      "txt",
      "vue",
      "svelte",
      "rb",
      "swift",
      "kt",
      "scala",
      "clj",
    ]);

    const fileExtension = document.fileName.split(".").pop()?.toLowerCase();
    return (
      supportedTypes.includes(document.languageId) ||
      (fileExtension && supportedTypes.includes(fileExtension)) ||
      document.fileName.endsWith(".txt")
    );
  }

  /* Get custom patterns from configuration */
  getCustomPatterns(): RegExp[] {
    const config = vscode.workspace.getConfiguration(CONFIG_NAME);
    const customPatterns = config.get<string[]>("customPatterns", []);

    return customPatterns
      .map((pattern) => {
        try {
          return new RegExp(pattern, "i");
        } catch (e) {
          console.warn(`Invalid custom pattern: ${pattern}`);
          return null;
        }
      })
      .filter(Boolean) as RegExp[];
  }

  normalizeFilePath(filePath: string): string {
    return filePath.replace(/\\+/g, "\\").toLocaleLowerCase().toString();
  }
}
