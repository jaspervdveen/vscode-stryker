import { Subject, buffer, debounceTime } from 'rxjs';
import * as vscode from 'vscode';

import { config } from '../config';

import { MutationServer } from '../mutation-server/mutation-server';
import { Logger } from '../utils/logger';
import { pathUtils } from '../utils/path-utils';

import { TestControllerHandler } from './test-controller-handler';

export class FileChangeHandler {
  private readonly changedFilePath$Subject = new Subject<string>();
  private readonly changedFilePath$ = this.changedFilePath$Subject.asObservable();

  private readonly deletedFilePath$Subject = new Subject<string>();
  private readonly deletedFilePath$ = this.deletedFilePath$Subject.asObservable();

  private constructor(
    private readonly mutationServer: MutationServer,
    private readonly testControllerHandler: TestControllerHandler,
    private readonly logger: Logger,
  ) {
    // Changes are buffered to bundle multiple changes into one run
    // and debounced to prevent running while the user is still typing
    this.changedFilePath$
      .pipe(buffer(this.changedFilePath$.pipe(debounceTime(config.app.fileChangeDebounceTimeMs))))
      .subscribe((paths) => this.handleFileChange(paths));

    this.deletedFilePath$
      .pipe(buffer(this.deletedFilePath$.pipe(debounceTime(config.app.fileChangeDebounceTimeMs))))
      .subscribe((paths) => this.handlePathDeleted(paths));
  }

  public static async create(
    mutationServer: MutationServer,
    testControllerHandler: TestControllerHandler,
    logger: Logger,
  ): Promise<FileChangeHandler> {
    const handler = new FileChangeHandler(mutationServer, testControllerHandler, logger);
    await handler.createFileWatchers();
    return handler;
  }

  private async handleFileChange(paths: string[]) {
    // Invalidate test results as changes might affect mutation results
    this.testControllerHandler.invalidateTestResults();

    // Pass only unique paths to the mutation server, otherwise Stryker will not handle duplicates correctly
    const uniquePaths = paths.filter((value, index, self) => self.indexOf(value) === index);

    // Filter out paths that are covered by other paths, otherwise Stryker will not handle them correctly
    const filteredPaths = pathUtils.filterCoveredPatterns(uniquePaths);

    try {
      // Instrument files to detect changes
      const instrumentResult = await this.mutationServer.instrument({ globPatterns: filteredPaths });

      this.testControllerHandler.updateTestExplorerFromInstrumentRun(instrumentResult);
    } catch (error: any) {
      await vscode.window.showErrorMessage(config.errors.instrumentationFailed);
      const errorMessage: string = error.toString();
      this.logger.logError(errorMessage);
    }
  }

  private handlePathDeleted(paths: string[]) {
    this.testControllerHandler.invalidateTestResults();

    this.testControllerHandler.deleteFromTestExplorer(paths);
  }

  private async createFileWatchers() {
    if (!vscode.workspace.workspaceFolders) {
      this.logger.logError('No workspace folders found');
      throw new Error('No workspace folders found');
    }

    await Promise.all(
      vscode.workspace.workspaceFolders.map(async (workspaceFolder) => {
        const pattern = new vscode.RelativePattern(workspaceFolder, '{src/**/*,!{**/*.git}'); // TODO: Get from workspace Stryker config

        const watcher = vscode.workspace.createFileSystemWatcher(pattern);

        // Called on file/folder creation and file/folder path changes
        watcher.onDidCreate((uri) => {
          // If the uri is a folder, match everything in the folder
          const uriIsFolder = !uri.fsPath.includes('.');
          if (uriIsFolder) {
            uri = vscode.Uri.parse(uri.fsPath + '/**/*');
          }

          this.changedFilePath$Subject.next(uri.fsPath);
        });

        // Called on file content change
        watcher.onDidChange((uri) => this.changedFilePath$Subject.next(uri.fsPath));

        // Called on file/folder deletion and file/folder path changes
        watcher.onDidDelete((uri) => {
          const relativePath = uri.fsPath.replace(workspaceFolder.uri.fsPath + '/', '');

          this.deletedFilePath$Subject.next(relativePath);
        });
      }),
    );
  }
}
