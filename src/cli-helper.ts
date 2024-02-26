import { exec, ExecException } from 'child_process';

export function executeCliCommand(cliCommand: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cliCommand, (error: ExecException | null, stdout: string, stderr: string) => {
      if (error) {
        reject(`Error executing command: ${error.message}`);
        return;
      }
      if (stderr) {
        reject(`Command stderr: ${stderr}`);
        return;
      }
      resolve(stdout);
    });
  });
}