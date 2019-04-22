import * as vscode from 'vscode';
import { Fragment } from "./fragment";
import { Database } from './database';

export class FragmentProvider implements vscode.TreeDataProvider<Fragment>
{
    database: Database;
    fragmentListFilter: string;
    fragmentDir: any;

	private _onDidChangeTreeData: vscode.EventEmitter<Fragment | undefined> = new vscode.EventEmitter<Fragment | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Fragment | undefined> = this._onDidChangeTreeData.event;

    constructor()
    {
        this.database = new Database();
        this.fragmentListFilter = "";
        this.fragmentDir = require('os').homedir() + "/fragments/";
    }

    getTreeItem(element: Fragment): vscode.TreeItem
    {
        return element;
    }

    getChildren(element?: Fragment): Thenable<Fragment[]>
    {
        return Promise.resolve(this.database.getFilteredFragments(this.fragmentListFilter));
    }

    refresh(): void
    {
		this._onDidChangeTreeData.fire();
	}

    editEntry(fragment: Fragment): void
    {

    }

    addEntry(): void
    {
        var input = vscode.window.showInputBox({prompt: "Input a label for the Fragment"});

        input.then((value) =>
        {
            if(this.database.addFragment(String(value), {}))
            {
                vscode.window.showInformationMessage("Fragment Added");
            }
            else
            {
                vscode.window.showErrorMessage("Fragment Not Added (label has to be unique)");
            }
            this.refresh();
        });
    }

    deleteEntry(fragment: Fragment): void
    {
        if(this.database.deleteFragment(fragment.label))
        {
            vscode.window.showInformationMessage("Fragment Deleted");
        }
        else
        {
            vscode.window.showErrorMessage("Fragment Not Deleted");
        }
        this.refresh();
    }

    filter()
    {
        var input = vscode.window.showInputBox({prompt: "Input a string which will be searched for"});

        input.then((value) =>
        {
            if(value === undefined)
            {
                vscode.window.showErrorMessage("Filtering Cancelled");
            } 
            else
            {
                this.fragmentListFilter = String(value);
            }
            this.refresh();
        });
    }
}
