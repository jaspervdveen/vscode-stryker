import { Subject, buffer, debounceTime, distinctUntilChanged } from 'rxjs';
import * as vscode from 'vscode';
import { config } from '../config';
import { Platform } from '../platforms/platform';
import { TestControllerHandler } from './test-controller-handler';

export class FileChangeHandler {

    #path$Subject = new Subject<string>();
    path$ = this.#path$Subject.asObservable();
    bufferedPath$ = this.path$.pipe(buffer(this.path$.pipe(debounceTime(config.app.fileChangeDebounceTimeMs))));

    constructor(private platform: Platform, private testControllerHandler: TestControllerHandler) {
        this.createFileWatchers(); 

        this.bufferedPath$.subscribe(paths => {

            platform.instrumentationRun(paths).then((result) => 
                testControllerHandler.updateTestExplorerFromInstrumentRun(result)
            );

            console.log('Buffered paths: ', paths);
        });

    }

    async createFileWatchers() {
        if (!vscode.workspace.workspaceFolders) {
            return []; // handle the case of no open folders
        }
    
        vscode.workspace.workspaceFolders.map(async workspaceFolder => {
            const pattern = new vscode.RelativePattern(workspaceFolder, 'src/**/*.ts'); // TODO: Get from workspace Stryker config
    
            const watcher = vscode.workspace.createFileSystemWatcher(pattern);
    
            watcher.onDidCreate(uri => {
                console.log('File created: ' + uri.toString());
            });
    
    
            watcher.onDidChange(uri => {
                this.#path$Subject.next(uri.fsPath);
            });
    
            watcher.onDidDelete(uri => {
                console.log('File deleted: ' + uri.toString());
            });
    
        });
    }
}

