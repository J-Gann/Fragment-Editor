'use strict';

import * as vscode from 'vscode';
import { Fragment } from "./fragment";
import { FragmentProvider } from './fragmentProvider';


export function activate(context: vscode.ExtensionContext) {
	const fragmentProvider = new FragmentProvider();
	vscode.window.registerTreeDataProvider('fragmentEditor', fragmentProvider);
	vscode.commands.registerCommand('fragmentEditor.addEntry', () => fragmentProvider.addEntry());
	vscode.commands.registerCommand('fragmentEditor.editEntry', (fragment: Fragment) => fragmentProvider.editEntry(fragment));
	vscode.commands.registerCommand('fragmentEditor.deleteEntry', (fragment: Fragment) => fragmentProvider.deleteEntry(fragment));
	vscode.commands.registerCommand('fragmentEditor.filter', () => fragmentProvider.filter());
	vscode.commands.registerCommand('fragmentEditor.reset', () => fragmentProvider.reset());
}

export function deactivate() {}
