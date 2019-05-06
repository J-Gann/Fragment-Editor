import * as vscode from 'vscode';
import { Fragment } from "./fragment";
import { Database } from './database';
import { FragmentEditor } from './fragmentEditor';
import { FOEF } from './parametrization';

/**
 * Provides fragments that should be displayed in a tree view
 */
export class FragmentProvider implements vscode.TreeDataProvider<Fragment>
{
    private fragmentListFilter: string;
    private fragmentEditor: FragmentEditor;

	private _onDidChangeTreeData: vscode.EventEmitter<Fragment | undefined> = new vscode.EventEmitter<Fragment | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Fragment | undefined> = this._onDidChangeTreeData.event;

    constructor(context: vscode.ExtensionContext)
    {
        this.fragmentListFilter = "";
        this.fragmentEditor = new FragmentEditor(context, this);
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
        return Promise.resolve(Database.getFilteredFragments(this.fragmentListFilter));
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
        this.fragmentEditor.showFragment(fragment);
    }

    /**
     * Creates a new fragment by opening a input dialog to enter a new label
     */
    addEntry(): void
    {
        var input = vscode.window.showInputBox({prompt: "Input a label for the Fragment"});
        var editor = vscode.window.activeTextEditor;
        var selection: vscode.Selection;
        var textDocument: vscode.TextDocument;
        var text: string;

        if(editor)
        {
            selection = editor.selection;
            textDocument = editor.document;
            text = textDocument.getText(new vscode.Range(selection.start, selection.end));
        }
        else
        {
            text = "";
        }

        input.then((label) =>
        {
            if(label === "")
            {
                vscode.window.showErrorMessage("Fragment Not Added (no empty label allowed)");
            }
            else if(label === undefined)
            {
                vscode.window.showErrorMessage("Fragment Not Added");
            }
            else if(Database.getFragment(label))
            {
                vscode.window.showErrorMessage("Fragment Not Added (label has to be unique)");
            }
            else
            {
                var obj = FOEF.parametrize(text);
                var newFragment = new Fragment({...{label: label}, ...obj});
                Database.addFragment(newFragment);
                vscode.window.showInformationMessage("Fragment Added");
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
        if(Database.deleteFragment(fragment.label))
        {
            this.fragmentEditor.onDelete(fragment);
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
        var input = vscode.window.showInputBox({prompt: "Search for Fragment which contains all the properties searched for as substring in the corresponding property | Usage: <property>:<searchvalue>{,<property>:<searchvalue>} | Properties: label, keyword, language, domain", value: this.fragmentListFilter});

        input.then((value) =>
        {
            if(value === undefined)
            {
                vscode.window.showErrorMessage("Filtering Cancelled");
            } 
            else
            {
                this.fragmentListFilter = value;
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
