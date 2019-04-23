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

    /**
     * Return list of fragments that are displayed in the tree
     */
    getChildren(element?: Fragment): Thenable<Fragment[]>
    {
        return Promise.resolve(this.database.getFilteredFragments(this.fragmentListFilter));
    }

    /**
     * Refresh the displayed list of fragments
     */
    refresh(): void
    {
		this._onDidChangeTreeData.fire();
	}

    /**
     * Changes the properties of a fragment
     * @param fragment Fragment that should be edited
     */
    editEntry(fragment: Fragment): void
    {

    }

    /**
     * Creates a new fragment by opening a input dialog to enter a new label
     */
    addEntry(): void
    {
        var input = vscode.window.showInputBox({prompt: "Input a label for the Fragment"});

        input.then((value) =>
        {
            if(value === "")
            {
                vscode.window.showErrorMessage("Fragment Not Added (no empty label allowed)");
            }
            else if(value === undefined)
            {
                vscode.window.showErrorMessage("Fragment Not Added");
            }
            else if(this.database.addFragment(String(value), {}))
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

    /**
     * Deletes a fragment
     * @param fragment Fragment that should be deleted
     */
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

    /**
     * Filters the displayed list of fragments by opening a input dialog and searching for fragments which label contains the input string
     */
    filter(): void
    {
        var input = vscode.window.showInputBox({prompt: "Input a string which will be searched for", value: this.fragmentListFilter});

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

    /**
     * Resets the displayed list of fragments to not be filtered
     */
    reset(): void
    {
        this.fragmentListFilter = "";
        this.refresh();
    }
}
