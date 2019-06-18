'use strict';

import * as vscode from 'vscode';
import { Fragment } from "./fragment";
import { FragmentProvider } from './fragmentProvider';
import { Database } from './database';

export class Ecclass{
	public subscriptions: { dispose(): any }[];
	public extensionPath: string;
	constructor(subs: { dispose(): any }[], expath: string) {
		this.subscriptions = subs;
		this.extensionPath = expath;
	}
}

export function activate(context: vscode.ExtensionContext) {
	var database = new Database(context.extensionPath + "/data");
	const contextclass = new Ecclass(context.subscriptions, context.extensionPath);
	const fragmentProvider = new FragmentProvider(contextclass);
	vscode.window.registerTreeDataProvider('fragmentEditor', fragmentProvider);
	vscode.commands.registerCommand('fragmentEditor.addEntry', () => fragmentProvider.addEntry());
	vscode.commands.registerCommand('fragmentEditor.editEntry', (fragment: Fragment) => fragmentProvider.editEntry(fragment));
	vscode.commands.registerCommand('fragmentEditor.deleteEntry', (fragment: Fragment) => fragmentProvider.deleteEntry(fragment));
	vscode.commands.registerCommand('fragmentEditor.filter', () => fragmentProvider.filter());
	vscode.commands.registerCommand('fragmentEditor.reset', () => fragmentProvider.reset());
	vscode.commands.registerCommand('fragmentEditor.openWeb', () => fragmentProvider.openWeb());
}

export function deactivate() {}
