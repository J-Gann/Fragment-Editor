'use strict';

import * as vscode from 'vscode';
import {FragmentProvider} from './fragmentProvider';
import {Database} from './database';
import {TreeItem} from './treeItem';
const shell = require("shelljs");
import * as fs from "fs";
import { PyPa } from './parametrization';
const rimraf = require("rimraf");
const path = require("path");


export function activate(context: vscode.ExtensionContext) {    
	// Delete temporary files on restart
	rimraf(path.join(context.extensionPath, 'tmp/*'), () => {});

    // install process upon first activation
	if (!fs.existsSync(context.globalStoragePath)) {
		fs.mkdirSync(context.globalStoragePath);
	}
	if (!fs.existsSync(context.extensionPath + "/out/frag.extract.host/extract.py")) {
		fs.readFile(context.extensionPath + "/out/frag.extract.host/raw.py", 'utf8', function (err, data) {
			if (err) {
				return console.log(err);
			}
			var result = data.replace(/path/, Database.getDefaultPath().replace(/\\/g, '/') + "/fragments.db");

			var path = context.extensionPath + "/out/frag.extract.host/extract.py";

			fs.writeFile(path, result, 'utf8', function (err) {
				fs.chmod(path, 0o0755, function (err) {
					if (err) {
						return console.log(err);
					}
				});
			});
		});
		if (process.platform === 'win32') {
			shell.exec('"' + context.extensionPath + '"' + '\\out\\frag.extract.host\\install_host.bat');
		} else {
			shell.exec(context.extensionPath + '/out/frag.extract.host/install_host.sh');
		}
	}


    const fragmentProvider = new FragmentProvider(context);
    var treeView = vscode.window.createTreeView('fragmentEditor', {treeDataProvider: fragmentProvider});
	vscode.commands.registerCommand('fragmentEditor.addEmptyFragment', () => fragmentProvider.addEmptyFragment());
	vscode.commands.registerCommand('fragmentEditor.addFragment', () => fragmentProvider.addFragment());
    vscode.commands.registerCommand('fragmentEditor.editFragment', (treeItem: TreeItem) => fragmentProvider.editFragment(treeItem));
	vscode.commands.registerCommand('fragmentEditor.deleteTreeItem', (treeItem: TreeItem) => fragmentProvider.deleteTreeItem(treeItem));

    // refreshes the Fragmentlist everytime a change in the database is detected (5 sec intervall)
	fs.watchFile(Database.getDefaultPath() + '/fragments.db', (curr, prev) => {
		Database.getInstance().loadFragments();
		fragmentProvider.refresh();
	});
}

export function deactivate() {
}
