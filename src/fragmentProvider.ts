import * as vscode from 'vscode';
import { Fragment } from "./fragment";
import { Database } from './database';
import { FragmentEditor } from './fragmentEditor';
import { FOEF } from './parametrization';
import { TreeItem } from './treeItem';

/**
 * Provides fragments that should be displayed in a tree view
 */
export class FragmentProvider implements vscode.TreeDataProvider<TreeItem>
{
    private fragmentListFilter: string;
    private fragmentEditor: FragmentEditor;
    private _treeView: vscode.TreeView<TreeItem> | undefined;

    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined> = new vscode.EventEmitter<TreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined> = this._onDidChangeTreeData.event;

    constructor(context: vscode.ExtensionContext)
    {
        /*
        // Stress test the extension
        for(var cnt = 0; cnt < 10000; cnt ++)
        {
            Database.addFragment(new Fragment({label: String(cnt)}));
        }
        */
        this.createTreeStructure();
        this.fragmentListFilter = "";
        this.fragmentEditor = new FragmentEditor(context, this);
        this._treeView = undefined;
    }

    createTreeStructure()
    {
        Database.loadedTreeItems = [];
        var rootTreeItem = new TreeItem({label: "root", isRoot: true, contextValue: "folder"});
        Database.addTreeItem(rootTreeItem);

        var fragments = Database.getFragments();
        if(fragments !== undefined)
        {
            fragments.forEach((fragment: Fragment) =>
            {
                if(fragment !== undefined)
                {
                    var scope = fragment.scope;
                    if(scope !== undefined && scope !== "" && Database.getTreeItem(scope) === undefined)
                    {
                        var newTreeItem1 = new TreeItem({label: scope, contextValue: "folder"});
                        Database.addTreeItem(newTreeItem1);
                        rootTreeItem.addChild(newTreeItem1.label);

                        var domain = fragment.domain;

                        if(domain !== undefined && domain !== "" && Database.getTreeItem(domain) === undefined)
                        {
                            var newTreeItem2 = new TreeItem({label: domain, contextValue: "folder"});
                            Database.addTreeItem(newTreeItem2);
                            newTreeItem1.addChild(newTreeItem2.label);
                        }
                    }

                    if(fragment.scope !== undefined && fragment.scope !== "")
                    {
                        if(fragment.domain !== undefined && fragment.domain !== "")
                        {
                            var newTreeItem3 = new TreeItem({label: fragment.label, contextValue: "fragment", fragment: fragment.label});
                            Database.addTreeItem(newTreeItem3);
                            var parent = Database.getTreeItem(fragment.domain);
                            if(parent !== undefined)
                            {
                                parent.addChild(newTreeItem3.label);
                            }
                        }
                        else
                        {
                            var newTreeItem4 = new TreeItem({label: fragment.label, contextValue: "fragment", fragment: fragment.label});
                            Database.addTreeItem(newTreeItem4);
                            var parent = Database.getTreeItem(fragment.scope);
                            if(parent !== undefined)
                            {
                                parent.addChild(newTreeItem4.label);
                            }
                        }
                    }
                    else
                    {
                        var newTreeItem5 = new TreeItem({label: fragment.label, contextValue: "fragment", fragment: fragment.label});
                        Database.addTreeItem(newTreeItem5);
                        rootTreeItem.addChild(newTreeItem5.label);
                    }
                }
            });
        }
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
                console.log("[E] | [FragmentProvider | getChildren]: List of childs for TreeItem undefined");
                return Promise.resolve([]);
            }
        }
        else
        {
            var rootTreeItem = Database.getTreeItem("root");
            if(rootTreeItem !== undefined)
            {
                var rootlist = Database.getTreeItems(rootTreeItem.childs);
                if(rootlist !== undefined)
                {
                    return Promise.resolve(rootlist);
                }
                else
                {
                    console.log("[E] | [FragmentProvider | getChildren]: List of childs for root TreeItem undefined");
                    return Promise.resolve([]);
                }
            }
            else
            {
                console.log("[E] | [FragmentProvider | getChildren]: Root TreeItem undefined");
                return Promise.resolve([]);
            }
        }
    }

    /**
     * Refresh the displayed list of fragments
     */
    refresh(): void
    {
        this.createTreeStructure();
        this._onDidChangeTreeData.fire();
	}

    /**
     * Opens the editor for the given fragment
     * @param fragment Fragment that should be edited
     */
    editFragment(treeItem: TreeItem | undefined): void
    {
        if(treeItem !== undefined && treeItem.contextValue === "fragment" && treeItem.fragment !== undefined && Database.getTreeItem(treeItem.label) !== undefined)
        {
            this.fragmentEditor.showFragment(Database.getFragment(treeItem.fragment));
            this.refresh();
        }
        else
        {
            console.log("[W] | [FragmentProvider | editFragment]: Can not edit Fragment with the label: " + treeItem);
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
                var rootTreeitem = Database.getTreeItem("root");

                if(rootTreeitem !== undefined)
                {
                    var obj = FOEF.parametrize(text);
                    var newFragment = new Fragment({...{label: label}, ...obj});
                    Database.addFragment(newFragment);

                    vscode.window.showInformationMessage("Fragment Added");
                }

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
        var fragmentLabel = treeItem.fragment;
        if(fragmentLabel !== undefined && fragmentLabel !== "")
        {
            Database.deleteFragment(fragmentLabel);
            this.refresh();
        }
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
