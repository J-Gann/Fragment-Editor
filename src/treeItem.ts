import * as vscode from "vscode";
import { Database } from "./database";

/**
 * Elements that get listed in the TreeView.
 * Can be of type 'folder' and 'fragment'
 * A folder contains other folders and/or fragments
 */
export class TreeItem extends vscode.TreeItem
{
    private static _rootExists: boolean = false;    // Is there already a root folder?

    private _isRoot: boolean;   // Is the current TreeItem the root?

    private _childs: string | undefined;    // List of child TreeItems

    private _parents: string | undefined;   //  List of parent TreeItems

    private _fragment: string | undefined;   // The corresponding fragment if TreeItem is no folder (identified by th fragment label)

    /**
     * Constructs a TreeItem
     * @param obj label: Unique identifier of the TreeItem | contextValue: "folder" or "fragment" | fragmentLabel: label of a fragment if contextValue is 'fragment' | isRoot: "true" if TreeItem is root of the TreeView, else "false"
     */
    constructor({label, isRoot=false, childs=[], parents=[], fragment=label, contextValue="fragment"}: {label: string, isRoot?: boolean, childs?: string[], parents?: string[], fragment?: string, contextValue?: string})
    {
        super(label);

        if(contextValue === "folder")
        {
            this.contextValue = "folder";
            if(!TreeItem._rootExists)
            {
                this._isRoot = isRoot;
                if(this._isRoot)
                {
                    TreeItem._rootExists = true;
                }
            }
            else
            {
                this._isRoot = false;
            }
            this.collapsibleState = 1;
            this.childs = childs;
            if(Database.getRootTreeItem() !== undefined && parents.length === 0)
            {
                this.parents = [Database.getRootTreeItem()!.label];
            }
            else
            {
                this.parents = parents;
            }
            this._fragment = undefined;
            this.command = {command: "fragmentEditor.editFolder", title: "Edit Folder", arguments: [this]};
        }
        else
        {
            this.contextValue = "fragment";
            this._isRoot = false;
            this.collapsibleState = 0;
            this._childs = undefined;
            if(Database.getRootTreeItem() !== undefined && parents.length === 0)
            {
                this.parents = [Database.getRootTreeItem()!.label];
            }
            else
            {
                this.parents = parents;
            }
            this._fragment = label;
            this.command = {command: "fragmentEditor.editFragment", title: "Edit Fragment", arguments: [this]};
        }
    }

    /**
     * Returns if a root TreeItem exists
     */
    static get rootExists()
    {
        return TreeItem._rootExists;
    }

    /**
     * Returns the information if the current TreeItem is the one root TreeItem
     */
    get isRoot(): boolean
    {
        return this._isRoot;
    }

    /**
     * Returns label of the fragment corresponding to this TreeItem if the contextValue is 'fragment', undefined otherwise.
     */
    get fragment(): string | undefined
    {
        return this._fragment;
    }

    /**
     * Set the fragment of the curren TreeItem if the contextValue is 'fragment' and the given lable is defined, otherwise ineffective
     */
    set fragment(label: string | undefined)
    {
        if(this.contextValue === "fragment" && label !== undefined)
        {
            this._fragment = label;
        }
    }

    /**
     * Replace the childs of the current TreeItem or empty it if the contextValue is 'folder', otherwise ineffective. Reconfigures all instances of this TreeItem as parent for other TreeItems
     */
    set childs(treeItems: (string|undefined)[] | undefined)
    {
        if(this.contextValue === "folder")
        {
            var oldChilds = this.childs;

            // Set the new childs
            if(treeItems !== undefined)
            {
                var childsString: string = "";
                treeItems.forEach((element: string | undefined) =>
                {
                    if(element !== undefined && element.length !== 0)
                    {
                        childsString += element + ',';
                    }
                });
                this._childs = childsString;
            }
            else
            {
                this._childs = "";
            }

            // Delete childs that no longer are one
            if(oldChilds !== undefined && this.childs !== undefined)
            {
                oldChilds.forEach((child: string | undefined) =>
                {
                    if(!this.childs!.includes(child))
                    {
                        var treeItem = Database.getTreeItem(child);
                        if(treeItem !== undefined)
                        {
                            treeItem.deleteParent(this.label);
                        }
                    }
                });
            }

            //Add all entries of this TreeItem as parent
            if(this.childs !== undefined)
            {
                this.childs.forEach((treeItemLabel: string | undefined) =>
                {
                    if(treeItemLabel !== undefined)
                    {
                        var treeItem = Database.getTreeItem(treeItemLabel);
                        if(treeItem !== undefined)
                        {
                            treeItem.addParent(this.label);
                            var parents = treeItem.parents;
                            if(parents !== undefined && parents.length === 0)
                            {
                                Database.deleteTreeItem(treeItem.label);
                            }
                        }
                    }
                });
            }
        }
    }

    /**
     * Returns list of labels of TreeItems being a child of the current TreeItem if the contextValue is 'folder', otherwise undefined
     */
    get childs(): (string|undefined)[] | undefined
    {
        if(this.contextValue === "folder" && this._childs !== undefined)
        {
            var returnList: string[] = [];
            var childsList = this._childs.split(',');
            childsList.forEach((element: string) =>
            {
                if(element.length !== 0)
                {
                    returnList.push(element);
                }
            });
            return returnList;
        }
    }

    /**
     * Returns if the current TreeItem has the given TreeItem label as child
     * @param treeItemLabel TreeItem label to be tested
     */
    hasChild(treeItemLabel: string | undefined): boolean
    {
        if(treeItemLabel !== undefined)
        {
            if(this.childs !== undefined)
            {
                return this.childs.includes(treeItemLabel);
            }
        }
        return false;
    }

    /**
     * Delete the given lable from the list of childs of the current TreeView. Deletes this TreeView as parent of the deleted child.
     * @param treeItem Label of TreeItem to be deleted
     */
    deleteChild(treeItem: string | undefined): void
    {
        if(!this.hasChild(treeItem))
        {
            return;
        }

        if(this._childs !== undefined && treeItem !== undefined)
        {
            // Add new child
            var newChilds: string = "";
            this._childs.split(",").forEach((element: string) =>
            {
                if(element !== treeItem && element.length !== 0)
                {
                    newChilds += element + ',';
                }
            });
            this._childs = newChilds;

            // Remove this TreeView as parent of that child
            var treeItemChild = Database.getTreeItem(treeItem);
            if(treeItemChild !== undefined)
            {
                treeItemChild.deleteParent(this.label);
                var parents = treeItemChild.parents;
                if(parents !== undefined && parents.length === 0)
                {
                    Database.deleteTreeItem(treeItemChild.label);
                }
            }
        }
    }

    /**
     * Adds the given lable to the list of childs of the current TreeView. Adds this TreeView as parent of the new child.
     * @param treeItem Label of TreeItem to be added as child
     */
    addChild(treeItem: string | undefined): void
    {
        if(this.hasChild(treeItem))
        {
            return;
        }

        if(this._childs !== undefined && treeItem !== undefined && this.contextValue === "folder")
        {
            this._childs += treeItem + ',';

            // Add this TreeView as parent of that child
             var treeItemChild = Database.getTreeItem(treeItem);
            if(treeItemChild !== undefined)
            {
                treeItemChild.addParent(this.label);
            }
        }

        else if(this._childs === undefined && treeItem !== undefined && this.contextValue === "folder")
        {
            this._childs = treeItem + ',';

            // Add this TreeView as parent of that child
            var treeItemChild = Database.getTreeItem(treeItem);
            if(treeItemChild !== undefined)
            {
                treeItemChild.addParent(this.label);
            }
        }
    }

    /**
     * Replace the parents of the current TreeItem or empty it. Reconfigures all instances of this TreeItem as child for other TreeItems
     */
    set parents(treeItems: (string|undefined)[] | undefined)
    {
        var oldParents = this.parents;

        // Set the new parents
        if(treeItems !== undefined && treeItems.length !== 0)
        {
            var parentsString: string = "";
            treeItems.forEach((element: string | undefined) =>
            {
                if(element !== undefined)
                {
                    parentsString += element + ',';
                }
            });
            this._parents = parentsString;
        }
        else
        {
            this._parents = "";
        }

        // Delete parents that no longer are one
        if(oldParents !== undefined && this.parents !== undefined)
        {
            oldParents.forEach((parent: string | undefined) =>
            {
                if(!this.parents!.includes(parent))
                {
                    var treeItem = Database.getTreeItem(parent);
                    if(treeItem !== undefined)
                    {
                        treeItem.deleteChild(this.label);
                    }
                }
            });
        }

        // Add all entries of this TreeItem as child
        if(this.parents !== undefined)
        {
            this.parents.forEach((treeItemLabel: string | undefined) =>
            {
                if(treeItemLabel !== undefined)
                {
                    var treeItem = Database.getTreeItem(treeItemLabel);
                    if(treeItem !== undefined && treeItemLabel.length !== 0)
                    {
                        treeItem.addChild(this.label);
                    }
                }
            });
        }

        // Delete this TreeItem (and the corresponding fragment)
        if(this._parents.length === 0 && this._isRoot !== true)
        {
            if(this.contextValue === "fragment" && this._fragment !== undefined)
            {
                Database.deleteFragment(this._fragment);
            }
        }
    }

    /**
     * Returns list of labels of TreeItems being a parent of the current TreeItem if the contextValue is 'folder'.
     */
    get parents(): (string|undefined)[] | undefined
    {
        if(this._parents !== undefined)
        {
            var returnList: string[] = [];
            var parentsList = this._parents.split(',');
            parentsList.forEach((element: string) =>
            {
                if(element.length !== 0)
                {
                    returnList.push(element);
                }
            });
            return returnList;
        }
    }

    /**
     * Returns if the current TreeItem has the given TreeItem label as parent
     * @param treeItemLabel TreeItem label to be tested
     */
    hasParent(treeItemLabel: string | undefined): boolean
    {
        if(treeItemLabel !== undefined)
        {
            if(this.parents !== undefined)
            {
                return this.parents.includes(treeItemLabel);
            }
        }
        return false;
    }

    /**
     * Delete the given lable from the list of parents of the current TreeView. Deletes this TreeView as child of the deleted parent.
     * @param treeItem Label of TreeItem to be deleted
     */
    deleteParent(treeItem: string | undefined): void
    {
        if(!this.hasParent(treeItem))
        {
            return;
        }
        if(this._parents !== undefined && treeItem !== undefined)
        {
            // Add new parent
            var newParents: string = "";
            this._parents.split(",").forEach((element: string) =>
            {
                if(element !== treeItem && element.length !== 0)
                {
                    newParents += element + ',';
                }
            });
            this._parents = newParents;

            // Remove this TreeView as child of that parent
            var treeItemParent = Database.getTreeItem(treeItem);
            if(treeItemParent !== undefined)
            {
                treeItemParent.deleteChild(this.label);
            }

            // Delete this TreeItem (and the corresponding fragment)
            if(this._parents.length === 0 && this._isRoot !== true)
            {
                if(this.contextValue === "fragment" && this._fragment !== undefined)
                {
                    Database.deleteFragment(this._fragment);
                }
            }
        }
    }

    /**
     * Adds the given lable to the list of parents of the current TreeView. Adds this TreeView as child of the new parent.
     * @param treeItem Label of TreeItem to be added as parent
     */
    addParent(treeItem: string | undefined): void
    {
        if(this.hasParent(treeItem))
        {
            return;
        }

        if(this._parents !== undefined && treeItem !== undefined)
        {
            this._parents += treeItem + ',';

            // Add this TreeView as child of that parent
            var treeItemParent = Database.getTreeItem(treeItem);
            if(treeItemParent !== undefined)
            {
                treeItemParent.addChild(this.label);
            }
        }
        else if(this._parents === undefined && treeItem !== undefined)
        {
            this._parents = treeItem + ',';
        }
    }
}