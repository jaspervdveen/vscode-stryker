import { Subject, buffer, debounceTime, distinctUntilChanged } from 'rxjs';
import * as vscode from 'vscode';
import { config } from '../config';
import { Platform } from '../platforms/platform';
import { TestControllerHandler } from './test-controller-handler';

export class FileChangeHandler {

    #changedFilePath$Subject = new Subject<string>();
    changedFilePath$ = this.#changedFilePath$Subject.asObservable();

    #createdFilePath$Subject = new Subject<string>();
    createdFilePath$ = this.#createdFilePath$Subject.asObservable();

    #deletedFilePath$Subject = new Subject<string>();
    deletedFilePath$ = this.#deletedFilePath$Subject.asObservable();

    constructor(private platform: Platform, private testControllerHandler: TestControllerHandler) {
        this.createFileWatchers();

        const changedFileBufferedPath$ = this.changedFilePath$
            .pipe(buffer(this.changedFilePath$.pipe(debounceTime(config.app.fileChangeDebounceTimeMs))));

        changedFileBufferedPath$.subscribe(paths => {
            platform.instrumentationRun(paths).then((result) =>
                testControllerHandler.updateTestExplorerFromInstrumentRun(result)
            );
        });

        const createdFileBufferedPath$ = this.createdFilePath$
            .pipe(buffer(this.createdFilePath$.pipe(debounceTime(config.app.fileChangeDebounceTimeMs))));

        createdFileBufferedPath$.subscribe(paths => {
            platform.instrumentationRun(paths).then((result) =>
                testControllerHandler.addToTestExplorer(result)
            );
        });

        const deletedFileBufferedPath$ = this.deletedFilePath$
            .pipe(buffer(this.deletedFilePath$.pipe(debounceTime(config.app.fileChangeDebounceTimeMs))));

        deletedFileBufferedPath$.subscribe(paths => {
            platform.instrumentationRun(paths).then((result) =>
                testControllerHandler.deleteFromTestExplorer(result)
            );
        });

    }

    async createFileWatchers() {
        if (!vscode.workspace.workspaceFolders) {
            return; // handle the case of no open folders
        }

        vscode.workspace.workspaceFolders.map(async workspaceFolder => {
            const pattern = new vscode.RelativePattern(workspaceFolder, 'src/**/*.ts'); // TODO: Get from workspace Stryker config

            const watcher = vscode.workspace.createFileSystemWatcher(pattern);

            watcher.onDidCreate(uri => {
                this.#createdFilePath$Subject.next(uri.fsPath);
            });

            watcher.onDidChange(uri => {
                this.#changedFilePath$Subject.next(uri.fsPath);
            });

            watcher.onDidDelete(uri => {
                this.#deletedFilePath$Subject.next(uri.fsPath);
            });

        });
    }
}

