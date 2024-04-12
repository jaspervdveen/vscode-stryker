import { Subject, buffer, debounceTime } from 'rxjs';
import * as vscode from 'vscode';
import { config } from '../config';
import { TestControllerHandler } from './test-controller-handler';
import { MutationServer } from '../mutation-server/mutation-server';
import { Logger } from '../utils/logger';
import { pathUtils } from '../utils/path-utils';

export class FileChangeHandler {
    #changedFilePath$Subject = new Subject<string>();
    changedFilePath$ = this.#changedFilePath$Subject.asObservable();

    #deletedFilePath$Subject = new Subject<string>();
    deletedFilePath$ = this.#deletedFilePath$Subject.asObservable();

    constructor(mutationServer: MutationServer, testControllerHandler: TestControllerHandler, private logger: Logger) {
        this.createFileWatchers();

        // Changes are buffered to bundle multiple changes into one run
        // and debounced to prevent running while the user is still typing
        const changedFileBufferedPath$ = this.changedFilePath$
            .pipe(buffer(this.changedFilePath$.pipe(debounceTime(config.app.fileChangeDebounceTimeMs))));

        changedFileBufferedPath$.subscribe(async (paths) => {
            testControllerHandler.invalidateTestResults();

            // Pass only unique paths to the mutation server, otherwise Stryker will not handle duplicates correctly
            const uniquePaths = paths.filter((value, index, self) => self.indexOf(value) === index);

            // Filter out paths that are covered by other paths, otherwise Stryker will not handle them correctly
            const filteredPaths = pathUtils.filterCoveredPatterns(uniquePaths);

            try {
                // Instrument files to detect changes
                const instrumentResult = await mutationServer.instrument(filteredPaths);

                testControllerHandler.updateTestExplorerFromInstrumentRun(instrumentResult);
            } catch (error: any) {
                vscode.window.showErrorMessage(config.errors.instrumentationFailed);
                logger.logError(error.toString());
            }
        });

        const deletedFileBufferedPath$ = this.deletedFilePath$
            .pipe(buffer(this.deletedFilePath$.pipe(debounceTime(config.app.fileChangeDebounceTimeMs))));

        deletedFileBufferedPath$.subscribe(paths => {
            testControllerHandler.invalidateTestResults();

            testControllerHandler.deleteFromTestExplorer(paths);
        });
    }

    async createFileWatchers() {
        if (!vscode.workspace.workspaceFolders) {
            this.logger.logError('No workspace folders found');
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


}

