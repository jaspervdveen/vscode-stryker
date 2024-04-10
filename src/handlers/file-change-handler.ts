import { Subject, buffer, debounceTime } from 'rxjs';
import * as vscode from 'vscode';
import { Config } from '../config';
import { TestControllerHandler } from './test-controller-handler';
import { minimatch } from 'minimatch';
import { MutationServer } from '../mutation-server/mutation-server';

export class FileChangeHandler {
    #changedFilePath$Subject = new Subject<string>();
    changedFilePath$ = this.#changedFilePath$Subject.asObservable();

    #deletedFilePath$Subject = new Subject<string>();
    deletedFilePath$ = this.#deletedFilePath$Subject.asObservable();

    constructor(mutationServer: MutationServer, testControllerHandler: TestControllerHandler) {
        this.createFileWatchers();

        // Changes are buffered to bundle multiple changes into one run
        // and debounced to prevent running while the user is still typing
        const changedFileBufferedPath$ = this.changedFilePath$
            .pipe(buffer(this.changedFilePath$.pipe(debounceTime(Config.app.fileChangeDebounceTimeMs))));

        changedFileBufferedPath$.subscribe(paths => {
            // Pass only unique paths to the mutation server, otherwise Stryker will not handle duplicates correctly
            const uniquePaths = paths.filter((value, index, self) => self.indexOf(value) === index);

            // Filter out paths that are covered by other paths, otherwise Stryker will not handle them correctly
            const filteredPaths = this.filterCoveredPatterns(uniquePaths);

            // Instrument files to detect changes
            mutationServer.instrument(filteredPaths).then((result) =>
                // Update the test explorer with the new test items
                testControllerHandler.updateTestExplorerFromInstrumentRun(result)
            );
        });

        const deletedFileBufferedPath$ = this.deletedFilePath$
            .pipe(buffer(this.deletedFilePath$.pipe(debounceTime(Config.app.fileChangeDebounceTimeMs))));

        deletedFileBufferedPath$.subscribe(paths => {
            testControllerHandler.deleteFromTestExplorer(paths);
        });
    }

    async createFileWatchers() {
        if (!vscode.workspace.workspaceFolders) {
            throw new Error('No workspace folders found');
        }

        vscode.workspace.workspaceFolders.map(async workspaceFolder => {
            const pattern = new vscode.RelativePattern(workspaceFolder, '{src/**/*,!{**/*.git}'); // TODO: Get from workspace Stryker config

            const watcher = vscode.workspace.createFileSystemWatcher(pattern);

            // Called on file/folder creation and file/folder path changes
            watcher.onDidCreate(uri => {
                // If the uri is a folder, match everything in the folder
                const uriIsFolder = !uri.fsPath.includes('.');
                if (uriIsFolder) {
                    uri = vscode.Uri.parse(uri.fsPath + '/**/*');
                }

                this.#changedFilePath$Subject.next(uri.fsPath);
            });

            // Called on file content change
            watcher.onDidChange(uri => this.#changedFilePath$Subject.next(uri.fsPath));

            // Called on file/folder deletion and file/folder path changes
            watcher.onDidDelete(uri => {
                const relativePath = uri.fsPath.replace(workspaceFolder.uri.fsPath + '/', '');

                this.#deletedFilePath$Subject.next(relativePath);
            });
        });
    }

    private filterCoveredPatterns(globPatterns: string[]): string[] {
        return globPatterns.filter((globPattern, index) => {
            return !globPatterns.some((otherGlobPattern, otherIndex) => otherIndex !== index && minimatch(globPattern, otherGlobPattern));
        });
    }
}

