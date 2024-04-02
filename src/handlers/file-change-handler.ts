import { Subject, buffer, debounceTime, distinctUntilChanged } from 'rxjs';
import * as vscode from 'vscode';
import { config } from '../config';
import { Platform } from '../platforms/platform';
import { TestControllerHandler } from './test-controller-handler';

export class FileChangeHandler {
    #changedFilePath$Subject = new Subject<string>();
    changedFilePath$ = this.#changedFilePath$Subject.asObservable();


    #deletedFilePath$Subject = new Subject<string>();
    deletedFilePath$ = this.#deletedFilePath$Subject.asObservable();

    constructor(platform: Platform, testControllerHandler: TestControllerHandler) {
        this.createFileWatchers();

        // Changes are buffered to bundle multiple changes into one run
        // and debounced to prevent multiple runs for the same path.

        const changedFileBufferedPath$ = this.changedFilePath$
            .pipe(buffer(this.changedFilePath$.pipe(debounceTime(config.app.fileChangeDebounceTimeMs))));

        changedFileBufferedPath$.subscribe(paths => {
            platform.instrumentationRun(paths).then((result) =>
                testControllerHandler.updateTestExplorerFromInstrumentRun(result)
            );
        });

        const deletedFileBufferedPath$ = this.deletedFilePath$
            .pipe(buffer(this.deletedFilePath$.pipe(debounceTime(config.app.fileChangeDebounceTimeMs))));

        deletedFileBufferedPath$.subscribe(paths => {
            testControllerHandler.deleteFromTestExplorer(paths);
        });

    }

    async createFileWatchers() {
        if (!vscode.workspace.workspaceFolders) {
            return; // handle the case of no open folders
        }

        vscode.workspace.workspaceFolders.map(async workspaceFolder => {
            const pattern = new vscode.RelativePattern(workspaceFolder, '{src/**/*,!{**/*.git}'); // TODO: Get from workspace Stryker config

            const watcher = vscode.workspace.createFileSystemWatcher(pattern);

            // called on file/folder creation and file/folder path changes
            watcher.onDidCreate(uri => {
                const uriIsFolder = !uri.fsPath.includes('.');
                if (uriIsFolder) {
                    // match all files in the folder
                    uri = vscode.Uri.parse(uri.fsPath + '/**/*');
                }

                this.#changedFilePath$Subject.next(uri.fsPath);
            });

            // called on file content change
            watcher.onDidChange(uri => {
                                this.#changedFilePath$Subject.next(uri.fsPath);
            });

            // called on file/folder deletion and file/folder path changes
            watcher.onDidDelete(uri => {
                const relativePath = uri.fsPath.replace(config.app.currentWorkingDirectory + '/', '');

                this.#deletedFilePath$Subject.next(relativePath);
            });
        });
    }
}

