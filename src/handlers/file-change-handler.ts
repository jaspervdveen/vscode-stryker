import * as fs from 'fs';

import { Subject, buffer, debounceTime } from 'rxjs';
import * as vscode from 'vscode';

import { config } from '../config';
import { Logger } from '../utils/logger';
import { pathUtils } from '../utils/path-utils';
import { MutationServer } from '../mutation-server/mutation-server';

import { TestControllerHandler } from './test-controller-handler';

export class FileChangeHandler {
  private readonly changedUri$Subject = new Subject<vscode.Uri>();
  private readonly changedUri$ = this.changedUri$Subject.asObservable();

  private readonly deletedUri$Subject = new Subject<vscode.Uri>();
  private readonly deletedUri$ = this.deletedUri$Subject.asObservable();

  private constructor(
    private readonly mutationServer: MutationServer,
    private readonly testControllerHandler: TestControllerHandler,
    private readonly logger: Logger,
    private readonly workspaceFolder: vscode.WorkspaceFolder,
  ) {
    // Changes are buffered to bundle multiple changes into one run
    // and debounced to prevent running while the user is still typing
    this.changedUri$
      .pipe(buffer(this.changedUri$.pipe(debounceTime(config.app.fileChangeDebounceTimeMs))))
      .subscribe(this.handleUrisChanged.bind(this));

    this.deletedUri$
      .pipe(buffer(this.deletedUri$.pipe(debounceTime(config.app.fileChangeDebounceTimeMs))))
      .subscribe(this.handleUrisDeleted.bind(this));
  }

  public static async create(
    mutationServer: MutationServer,
    testControllerHandler: TestControllerHandler,
    logger: Logger,
    workspaceFolder: vscode.WorkspaceFolder,
  ): Promise<FileChangeHandler> {
    const handler = new FileChangeHandler(mutationServer, testControllerHandler, logger, workspaceFolder);
    await handler.createFileWatchers();
    return handler;
  }

  private async handleUrisChanged(globPatternUris: vscode.Uri[]) {
    // Invalidate test results as changes might affect earlier mutation results
    this.testControllerHandler.invalidateTestResults();

    // Convert glob pattern uris to relative glob patterns paths
    const relativeGlobPatterns = globPatternUris.map((uri) => vscode.workspace.asRelativePath(uri, false));

    // Filter out patterns that are covered by other paths, otherwise Stryker will not handle them correctly
    const filteredGlobPatterns = pathUtils.filterCoveredPatterns(relativeGlobPatterns);
    try {
      // Instrument files to detect changes
      const instrumentResult = await this.mutationServer.instrument({
        globPatterns: filteredGlobPatterns,
      });

      this.testControllerHandler.updateTestExplorerFromInstrumentRun(instrumentResult);
    } catch (error) {
      await vscode.window.showErrorMessage(config.errors.instrumentationFailed);
      this.logger.logError(Logger.getErrorMessage(error), this.workspaceFolder.name);
    }
  }

  private handleUrisDeleted(uris: vscode.Uri[]) {
    this.testControllerHandler.invalidateTestResults();

    this.testControllerHandler.deleteFromTestExplorer(uris);
  }

  private async createFileWatchers() {
    const pattern = new vscode.RelativePattern(this.workspaceFolder, '{src/**/*,!{**/*.git}'); // TODO: pattern from Stryker config (PBI 7276)

    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    // Called on file/folder creation and file/folder path changes
    watcher.onDidCreate((uri) => {
      // If the uri is a folder, match everything in the folder
      if (fs.lstatSync(uri.fsPath).isDirectory()) {
        this.changedUri$Subject.next(uri.with({ path: uri.path + '/**/*' }));
      } else {
        this.changedUri$Subject.next(uri);
      }
    });

    // Called on file content change
    watcher.onDidChange((uri) => this.changedUri$Subject.next(uri));

    // Called on file/folder deletion and file/folder path changes
    watcher.onDidDelete((uri) => this.deletedUri$Subject.next(uri));
  }
}
