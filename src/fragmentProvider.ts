import * as vscode from 'vscode';
import { Fragment } from "./fragment";
import { Database } from './database';
import { FragmentEditor } from './fragmentEditor';
import { FOEF } from './parametrization';
import { TreeItem } from './treeItem';
import { FolderEditor } from './folderEditor';

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
            return Promise.resolve(element.treeItems);
        }
        else
        {
            var rootTreeItem = Database.getRootTreeItem();
            if(rootTreeItem !== undefined)
            {
                return Promise.resolve(rootTreeItem.treeItems);
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
     * Changes the properties of a fragment
     * @param fragment Fragment that should be edited
     */
    editFragment(treeItem: TreeItem): void
    {
        if(treeItem.contextValue === "fragment")
        {
            if(treeItem.fragmentLabel !== undefined)
            {
                this.fragmentEditor.showFragment(Database.getFragment(treeItem.fragmentLabel));
            }
        }
    }

    editFolder(treeItem: TreeItem): void
    {
        if(treeItem.contextValue === "folder")
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
            else if(Database.getFragment(label))
            {
                vscode.window.showErrorMessage("Fragment Not Added (label has to be unique)");
            }
            else
            {   
                var treeViewSelections = undefined
                if(this._treeView !== undefined)
                {
                    treeViewSelections = this._treeView.selection;
                }
                var obj = FOEF.parametrize(text);
                var newFragment = new Fragment({...{label: label}, ...obj});
                var newTreeItem = new TreeItem({label: label, contextValue: "fragment"})
                Database.addFragment(newFragment);
                Database.addTreeItem(newTreeItem);
                if(treeViewSelections !== undefined && treeViewSelections.length > 0)
                {
                    treeViewSelections.forEach(treeItem =>
                    {
                        treeItem.treeItems.push(newTreeItem);
                    });
                }
                else
                {
                    var rootTreeItem = Database.getRootTreeItem()
                    if(rootTreeItem !== undefined)
                    {
                        rootTreeItem.treeItems.push(newTreeItem);
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
            else if(Database.getFragment(label))
            {
                vscode.window.showErrorMessage("Folder Not Added (label has to be unique)");
            }
            else
            {
                var treeViewSelections = undefined;
                if(this._treeView !== undefined)
                {
                    treeViewSelections = this._treeView.selection;
                }
                var newTreeItem = new TreeItem({label: label, contextValue: "folder"})
                Database.addTreeItem(newTreeItem);
                if(treeViewSelections !== undefined && treeViewSelections.length > 0)
                {
                    treeViewSelections.forEach(treeItem =>
                    {
                        treeItem.treeItems.push(newTreeItem);
                    });
                }
                else
                {
                    var rootTreeItem = Database.getRootTreeItem()
                    if(rootTreeItem !== undefined)
                    {
                        rootTreeItem.treeItems.push(newTreeItem);
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
        if(treeItem.contextValue === "folder")
        {
            treeItem.treeItems.forEach((element) =>
            {
                this.deleteEntry(element);
            });
            if(treeItem.label !== undefined)
            {
                Database.deleteTreeItem(treeItem.label);
            }
        }
        else
        {
            if(treeItem.label !== undefined)
            {
                Database.deleteTreeItem(treeItem.label);
            }
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

    set treeView(treeView: vscode.TreeView<TreeItem>)
    {
        this._treeView = treeView;
    }
}
