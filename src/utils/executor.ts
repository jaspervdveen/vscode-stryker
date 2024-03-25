import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import { config } from '../config.js';

const exec = promisify(execCallback);

export function executeCommand(command: string) {
    console.log(config.app.currentWorkingDirectory);
    return exec(command, { cwd: config.app.currentWorkingDirectory });
}