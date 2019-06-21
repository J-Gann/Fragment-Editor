import * as vscode from 'vscode';
import {Fragment} from "./fragment";
import {Database} from './database';
import {FragmentEditor} from './fragmentEditor';
import {PyPa} from './parametrization';
import {TreeItem} from './treeItem';

/**
 * Provides TreeItems that should be displayed in a tree view
 */
export class FragmentProvider implements vscode.TreeDataProvider<TreeItem> {
    static context: vscode.ExtensionContext;
    private _fragmentEditor: FragmentEditor;
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined> = new vscode.EventEmitter<TreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined> = this._onDidChangeTreeData.event;

    constructor(context: vscode.ExtensionContext) {
        this.createTreeStructure();
        FragmentProvider.context = context;
        this._fragmentEditor = new FragmentEditor(context, this);
    }

    /**
     * Creates all necessary TreeItems after it deletes all previous TreeItems
     */
    createTreeStructure() {
        // Clear existing TreeItems
        Database.loadedTreeItems = [];

        const fragments = Database.getFragments();
        if (fragments !== undefined) {
            fragments.forEach((fragment: Fragment) => {
                if (fragment !== undefined) {
                    const tags = fragment.tags;
                    if (tags !== undefined && tags.length !== 0) {
                        const tagList = tags.split(',');
                        tagList.forEach((tag: string) => {
                            if (tag.length !== 0 && tag !== ',') {
                                if (Database.getTreeItem(tag) === undefined) {
                                    const newTag = new TreeItem({label: tag, contextValue: "tag"});
                                    Database.addTreeItem(newTag);
                                }
                                const newFragment = new TreeItem({
                                    label: fragment.label + " [TAG:" + tag + "]",
                                    contextValue: "fragment",
                                    tag: tag,
                                    fragment: fragment.label
                                });
                                Database.addTreeItem(newFragment);
                                const tagTreeItem = Database.getTreeItem(tag);
                                if (tagTreeItem !== undefined) {
                                    tagTreeItem.addChild(newFragment.label);
                                }
                            }
                        });
                    } else {
                        const treeItem = new TreeItem({
                            label: fragment.label,
                            contextValue: "fragment",
                            fragment: fragment.label
                        });
                        Database.addTreeItem(treeItem);
                    }
                }
            });
        }
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * Return list of fragments that are displayed in the tree
     */
    getChildren(element?: TreeItem): Thenable<TreeItem[]> {
        if (element !== undefined) {
            const elementList = Database.getTreeItems(element.childs);
            if (elementList !== undefined) {
                return Promise.resolve(elementList);
            } else {
                console.log("[E] | [FragmentProvider | getChildren]: List of childs for TreeItem undefined");
                return Promise.resolve([]);
            }
        } else {
            const rootList = Database.getTreeItems();
            if (rootList !== undefined) {
                return Promise.resolve(rootList.filter((treeItem: TreeItem) => {
                    return !!(treeItem !== undefined && treeItem.label !== undefined && treeItem.tag === undefined);
                }));
            } else {
                console.log("[E] | [FragmentProvider | getChildren]: List of TreeItems undefined");
                return Promise.resolve([]);
            }
        }
    }

    /**
     * Refresh the displayed list of fragments
     */
    refresh(): void {
        this.createTreeStructure();
        this._onDidChangeTreeData.fire();
    }

    /**
     * Opens the editor for the given fragment
     * @param treeItem
     */
    editFragment(treeItem: TreeItem | undefined): void {
        if (treeItem !== undefined && treeItem.contextValue === "fragment" && treeItem.fragment !== undefined && Database.getFragment(treeItem.fragment) !== undefined) {
            this._fragmentEditor.showFragment(Database.getFragment(treeItem.fragment));
            this.refresh();
        } else {
            console.log("[W] | [FragmentProvider | editFragment]: Can not edit Fragment with the label: " + treeItem!.label);
        }
    }

    /**
     * Creates a new fragment by opening a input dialog to enter a new label
     */
    addFragment(): void {
        const editor = vscode.window.activeTextEditor;
        let selection: vscode.Selection;
        let textDocument: vscode.TextDocument;
        let text: string = "";

        if (editor) {
            selection = editor.selection;
            textDocument = editor.document;
            text = textDocument.getText(new vscode.Range(selection.start, selection.end));
        }

        const input = vscode.window.showInputBox({prompt: "Input a label for the Fragment"});
        input.then((label) => {
            if (label === "") {
                vscode.window.showErrorMessage("Fragment Not Added (no empty label allowed)");
                console.log("[W] | [FragmentProvider | addFragment]: Failed");
            } else if (label === undefined) {
                vscode.window.showErrorMessage("Fragment Not Added");
                console.log("[W] | [FragmentProvider | addFragment]: Failed");
            } else if (Database.getTreeItem(label)) {
                vscode.window.showErrorMessage("Fragment Not Added (label has to be unique)");
                console.log("[W] | [FragmentProvider | addFragment]: Failed");
            } else {
                //var obj = FOEF.parametrize(text);
                //var newFragment = new Fragment({...{label: label}, ...obj});
                //Database.addFragment(newFragment);
                PyPa.parametrize(text).then((obj) => {
                    const newFragment = new Fragment({...{label: label}, ...obj});
                    Database.addFragment(newFragment);
                    this.refresh();
                });
            }
            this.refresh();
        });
    }

    /**
     * Deletes a TreeItemcorresponding to a Fragment. This deletes the tag corresponding to this TreeItem in the properties of the Fragment.
     * @param treeItem
     */
    deleteTreeItem(treeItem: TreeItem): void {
        if (treeItem.contextValue === "fragment" && treeItem.fragment !== undefined && Database.getFragment(treeItem.fragment) !== undefined) {
            const fragment = Database.getFragment(treeItem.fragment);
            if (fragment !== undefined) {
                if (fragment.tags !== undefined && fragment.tags.length === 0) {
                    Database.deleteFragment(fragment.label);
                } else if (fragment.tags !== undefined) {
                    fragment.removeTag(treeItem.tag);
                    Database.updateFragment(fragment);
                }
                this.refresh();
            } else {
                console.log("[W] | [FragmentProvider | deleteTreeItem]: Can not delete tag: " + treeItem.tag);
            }
        } else {
            console.log("[W] | [FragmentProvider | deleteTreeItem]: Can not delete TreeItem with the label: " + treeItem.label);
        }
    }
}
