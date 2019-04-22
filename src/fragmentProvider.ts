import * as vscode from 'vscode';
import { Fragment } from "./fragment";
import { Database } from './database';

export class FragmentProvider implements vscode.TreeDataProvider<Fragment>
{
    database: Database;
    fragmentList: Fragment[];
    fragmentDir: any;


	private _onDidChangeTreeData: vscode.EventEmitter<Fragment | undefined> = new vscode.EventEmitter<Fragment | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Fragment | undefined> = this._onDidChangeTreeData.event;

    constructor()
    {
        this.database = new Database();
        this.fragmentList = this.database.getFragments();
        this.fragmentDir = require('os').homedir() + "/fragments/";
    }

    getTreeItem(element: Fragment): vscode.TreeItem
    {
        return element;
    }

    getChildren(element?: Fragment): Thenable<Fragment[]>
    {
        return Promise.resolve(this.database.getFragments());
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
                return;
            }
            else
            {
                vscode.window.showErrorMessage("Fragment Not Added (label has to be unique)");
                return;
            }
        });
    }

    deleteEntry(fragment: Fragment): void
    {
        if(this.database.deleteFragment(fragment.label))
        {
            vscode.window.showInformationMessage("Fragment Deleted");
            return;
        }
        else
        {
            vscode.window.showErrorMessage("Fragment Not Deleted");
            return;
        }
    }

    filter()
    {
        var input = vscode.window.showInputBox({prompt: "Input a string which will be searched for"});

        input.then((value) =>
        {
            if (value === undefined)
            {
                vscode.window.showErrorMessage("SQL Request Cancelled");
                return;
            } 
            else if(value === "")
            {
                this.fragmentList = this.database.getFragments();
                return;
            } 
            else
            {
                this.fragmentList = this.database.getFilteredFragments(String(value));
                return;
            }
        });
    }
}
