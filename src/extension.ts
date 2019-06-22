'use strict';

import * as vscode from 'vscode';
import {FragmentProvider} from './fragmentProvider';
import {Database} from './database';
import {TreeItem} from './treeItem';

export function activate(context: vscode.ExtensionContext) {
    var database = new Database(context.extensionPath + "/data");
    const fragmentProvider = new FragmentProvider(context);
    var treeView = vscode.window.createTreeView('fragmentEditor', {treeDataProvider: fragmentProvider});
    vscode.commands.registerCommand('fragmentEditor.addFragment', () => fragmentProvider.addFragment());
    vscode.commands.registerCommand('fragmentEditor.editFragment', (treeItem: TreeItem) => fragmentProvider.editFragment(treeItem));
    vscode.commands.registerCommand('fragmentEditor.deleteTreeItem', (treeItem: TreeItem) => fragmentProvider.deleteTreeItem(treeItem));
}

export function deactivate() {
}
