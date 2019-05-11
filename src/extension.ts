'use strict';

import * as vscode from 'vscode';
import { Fragment } from "./fragment";
import { FragmentProvider } from './fragmentProvider';
import { Database } from './database';

export function activate(context: vscode.ExtensionContext) {
	var database = new Database(context.extensionPath + "/data");
	const fragmentProvider = new FragmentProvider(context);
	vscode.window.registerTreeDataProvider('fragmentEditor', fragmentProvider);
	vscode.commands.registerCommand('fragmentEditor.addEntry', () => fragmentProvider.addEntry());
	vscode.commands.registerCommand('fragmentEditor.editEntry', (fragment: Fragment) => fragmentProvider.editEntry(fragment));
	vscode.commands.registerCommand('fragmentEditor.deleteEntry', (fragment: Fragment) => fragmentProvider.deleteEntry(fragment));
	vscode.commands.registerCommand('fragmentEditor.filter', () => fragmentProvider.filter());
	vscode.commands.registerCommand('fragmentEditor.reset', () => fragmentProvider.reset());
	vscode.commands.registerCommand('fragmentEditor.openWeb', () => fragmentProvider.openWeb());
}

export function deactivate() {}
