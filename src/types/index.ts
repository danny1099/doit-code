export const CONFIG_NAME = "doit";

export interface TodoTask {
  id: string;
  text: string;
  completed: boolean;
  project?: string;
  createdAt: Date;
  timeLapsed?: number;
  sourceFile?: {
    status: "in-file" | "on-removed" | "newer";
    filePath: string;
    lineNumber: number;
    originalText: string;
    type: string;
  };
}

export interface ParsedTask {
  text: string;
  line: number;
  originalText: string;
  priority?: string;
  type: "TODO" | "FIXME" | "HACK" | "NOTE" | "BUG";
}
