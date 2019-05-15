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
        this.createTreeStructure();
        this.fragmentListFilter = "";
        this.fragmentEditor = new FragmentEditor(context, this);
        this._treeView = undefined;
    }

    createTreeStructure()
    {
        // Clean existing TreeItems
        Database.loadedTreeItems = [];

        var fragments = Database.getFragments();
        if(fragments !== undefined)
        {
            fragments.forEach((fragment: Fragment) =>
            {
                if(fragment !== undefined)
                {
                    var tags = fragment.tags;
                    if(tags !== undefined && tags.length !== 0)
                    {
                        var tagList = tags.split(',');
                        tagList.forEach((tag: string) =>
                        {
                            console.log(tag);
                            if(tag.length !== 0 && tag !== ',')
                            {
                                if(Database.getTreeItem(tag) === undefined)
                                {
                                    // Add a new tag to Database
                                    var treeItem = new TreeItem({label: tag, contextValue: "tag"});
                                    Database.addTreeItem(treeItem);
                                }
                                else
                                {
                                    // Tag already exists
                                }
                                // Create a TreeItem representing the fragment for this tag
                                var treeItem = new TreeItem({label: fragment.label, contextValue: "fragment", tag: tag});
                                Database.addTreeItem(treeItem);
                                // Add this ne TreeItem as a child of to the corresponding tag
                                var tagTreeItem = Database.getTreeItem(tag);
                                if(tagTreeItem !== undefined)
                                {
                                    tagTreeItem.addChild(fragment.label);
                                }
                            }
                            else
                            {
                                // Do not add tag
                            }
                        });
                    }
                    else
                    {
                        // Sort fragment in root folder because it has no assigned tags
                        var treeItem = new TreeItem({label: fragment.label, contextValue: "fragment"});
                        Database.addTreeItem(treeItem);
                    }
                }
                else
                {

                }
            });
        }
        else
        {

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
            var list = Database.getTreeItems();
            if(list !== undefined)
            {
                return Promise.resolve(list.filter((treeItem: TreeItem) =>
                {
                    if(treeItem !== undefined && treeItem.label !== undefined && treeItem.tag === undefined)
                    {
                        return true;
                    }
                    else
                    {
                        return false;
                    }
                }));
            }
            else
            {
                console.log("[E] | [FragmentProvider | getChildren]: List of TreeItems undefined");
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
        if(treeItem !== undefined && treeItem.contextValue === "fragment" && treeItem.label !== undefined && Database.getFragment(treeItem.label) !== undefined)
        {
            this.fragmentEditor.showFragment(Database.getFragment(treeItem.label));
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

        var input = vscode.window.showInputBox({prompt: "Input a label for the Fragment and add it to the selected tags (root tag if nothing selected)"});
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
                var obj = FOEF.parametrize(text);
                var newFragment = new Fragment({...{label: label}, ...obj});
                Database.addFragment(newFragment);

                vscode.window.showInformationMessage("Fragment Added");

            }
            this.refresh();
        });
    }

    /**
     * Deletes a TreeItemcorresponding to a Fragment. This deletes the tag corresponding to this TreeItem in the properties of the Fragment.
     * @param fragment Fragment that should be deleted
     */
    deleteTreeItem(treeItem: TreeItem): void
    {
        if(treeItem.contextValue === "fragment" && treeItem.label !== undefined && Database.getFragment(treeItem.label) !== undefined)
        {
            var fragment = Database.getFragment(treeItem.label);
            if(fragment !== undefined)
            {
                if(fragment.tags !== undefined && fragment.tags.length === 0)
                {
                    Database.deleteFragment(fragment.label);
                }
                else if(fragment.tags !== undefined)
                {
                    fragment.removeTag(treeItem.tag);
                    Database.updateFragment(fragment);
                }

                this.refresh();
            }
            else
            {
                console.log("[W] | [FragmentProvider | deleteTreeItem]: Can not delete tag: " + treeItem.tag);
            }
        }
        else
        {
            console.log("[W] | [FragmentProvider | deleteTreeItem]: Can not delete TreeItem with the label: " + treeItem.label);
        }
    }

    set treeView(treeView: vscode.TreeView<TreeItem>)
    {
        this._treeView = treeView;
    }
}
