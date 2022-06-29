import { ExecException } from "child_process";

export type ExecResponse = {
  error: ExecException | null;
  stdout: string;
  stderr: string;
};
