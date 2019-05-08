import * as vscode from 'vscode';
import { Fragment } from "./fragment";
import { Database } from './database';
import { FragmentEditor } from './fragmentEditor';
import { FOEF } from './parametrization';
import { TreeItem } from './treeItem';
import { FolderEditor } from './folderEditor';
import { unwatchFile } from 'fs';

/**
 * Provides fragments that should be displayed in a tree view
 */
export class FragmentProvider implements vscode.TreeDataProvider<TreeItem>
{
    private fragmentListFilter: string;
    private fragmentEditor: FragmentEditor;
    private folderEditor: FolderEditor;
    private _treeView: vscode.TreeView<TreeItem> | undefined;

	private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined> = new vscode.EventEmitter<TreeItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined> = this._onDidChangeTreeData.event;

    constructor(context: vscode.ExtensionContext)
    {
        this.fragmentListFilter = "";
        this.fragmentEditor = new FragmentEditor(context, this);
        this.folderEditor = new FolderEditor(context, this);
        this._treeView = undefined;
    }

    getTreeItem(element: TreeItem): vscode.TreeItem
    {
        return element;
    }

    /**
     * Return list of fragments that are displayed in the tree
     */
    getChildren(element?: TreeItem): Thenable<TreeItem[]>
    {
        if(element !== undefined)
        {
            var list = Database.getTreeItems(element.childs);
            if(list !== undefined)
            {
                return Promise.resolve(list);
            }
            else
            {
                return Promise.resolve([]);

            }
        }
        else
        {
            var rootTreeItem = Database.getRootTreeItem();
            if(rootTreeItem !== undefined)
            {
                var rootlist = Database.getTreeItems(rootTreeItem.childs);
                if(rootlist !== undefined)
                {
                    return Promise.resolve(rootlist);
                }
                else
                {
                    return Promise.resolve([]);
                }
            }
            else
            {
                return Promise.resolve([]);
            }
        }
    }

    /**
     * Refresh the displayed list of fragments
     */
    refresh(): void
    {
        this._onDidChangeTreeData.fire();
	}

    /**
     * Opens the editor for the given fragment
     * @param fragment Fragment that should be edited
     */
    editFragment(treeItem: TreeItem | undefined): void
    {
        if(treeItem !== undefined && treeItem.contextValue === "fragment" && treeItem.fragment !== undefined)
        {
            this.fragmentEditor.showFragment(Database.getFragment(treeItem.fragment));
        }
    }

    /**
     * Opens the editor for the given folder
     * @param treeItem Folder that should be edited
     */
    editFolder(treeItem: TreeItem | undefined): void
    {
        if(treeItem !== undefined && treeItem.contextValue === "folder")
        {
            this.folderEditor.showFolder(treeItem);
        }
    }

    /**
     * Creates a new fragment by opening a input dialog to enter a new label
     */
    addFragment(): void
    {
        var editor = vscode.window.activeTextEditor;
        var selection: vscode.Selection;
        var textDocument: vscode.TextDocument;
        var text: string = "";

        if(editor)
        {
            selection = editor.selection;
            textDocument = editor.document;
            text = textDocument.getText(new vscode.Range(selection.start, selection.end));
        }

        var input = vscode.window.showInputBox({prompt: "Input a label for the Fragment and add it to the selected folders (root folder if nothing selected)"});
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
            else if(Database.getTreeItem(label))
            {
                vscode.window.showErrorMessage("Fragment Not Added (label has to be unique)");
            }
            else
            {   

                if(this._treeView !== undefined)
                {
                    var sel = this._treeView.selection[0];
                    if(sel !== undefined && sel.label !== undefined)
                    {
                        var obj = FOEF.parametrize(text);
                        var newFragment = new Fragment({...{label: label}, ...obj});
                        var newTreeItem = new TreeItem({label: label, contextValue: "fragment", parents: [sel.label]});
                        Database.addFragment(newFragment);
                        Database.addTreeItem(newTreeItem);
                    }
                    else
                    {
                        var obj = FOEF.parametrize(text);
                        var newFragment = new Fragment({...{label: label}, ...obj});
                        var newTreeItem = new TreeItem({label: label, contextValue: "fragment"});
                        Database.addFragment(newFragment);
                        Database.addTreeItem(newTreeItem);
                    }
                }
                vscode.window.showInformationMessage("Fragment Added");
            }
            this.refresh();
        });
    }

    /**
     * Creates a new folder by opening a input dialog to enter a new label
     */
    addFolder(): void
    {
        var input = vscode.window.showInputBox({prompt: "Input a label for the Folder  and add it to the selected folders (root folder if nothing selected)"});
        input.then((label) =>
        {
            if(label === "")
            {
                vscode.window.showErrorMessage("Folder Not Added (no empty label allowed)");
            }
            else if(label === undefined)
            {
                vscode.window.showErrorMessage("Folder Not Added");
            }
            else if(Database.getTreeItem(label))
            {
                vscode.window.showErrorMessage("Folder Not Added (label has to be unique)");
            }
            else
            {
                if(this._treeView !== undefined)
                {
                    var sel = this._treeView.selection[0];
                    if(sel !== undefined && sel.label !== undefined)
                    {
                        var newTreeItem = new TreeItem({label: label, contextValue: "folder", parents: [sel.label]});
                        Database.addTreeItem(newTreeItem);
                    }
                    else
                    {
                        var newTreeItem = new TreeItem({label: label, contextValue: "folder"});
                        Database.addTreeItem(newTreeItem);
                    }
                }
                vscode.window.showInformationMessage("Folder Added");
            }
            this.refresh();
        });
    }

    /**
     * Deletes a TreeItem
     * @param fragment Fragment that should be deleted
     */
    deleteEntry(treeItem: TreeItem): void
    {
        Database.deleteTreeItem(treeItem.label);
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

    set treeView(treeView: vscode.TreeView<TreeItem>)
    {
        this._treeView = treeView;
    }
}
