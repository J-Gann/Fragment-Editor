import * as vscode from "vscode";
import { Database } from "./database";

/**
 * Elements that get listed in the TreeView.
 * Can be of type 'folder' and 'fragment'
 * A folder contains other folders and/or fragments
 */
export class TreeItem extends vscode.TreeItem
{
    private _isRoot: boolean;   // Is the current TreeItem the root?

    private _treeItems: TreeItem[]; // List of childs

    private _fragmentLabel: string | undefined;   // The corresponding fragment if TreeItem is no folder (identified by th fragment label)

    /**
     * Constructs a TreeItem
     * @param obj label: Unique identifier of the TreeItem | contextValue: "folder" or "fragment" | fragmentLabel: label of a fragment if contextValue is 'fragment' | isRoot: "true" if TreeItem is root of the TreeView, else "false"
     */
    constructor({label, isRoot=false, treeItems=[], fragmentLabel=label, contextValue="fragment"}: {label: string, isRoot?: boolean, treeItems?: TreeItem[], fragmentLabel?: string, contextValue?: string})
    {
        super(label);

        if(contextValue === "folder")
        {
            this.contextValue = "folder";
            this._isRoot = isRoot;
            this.collapsibleState = 1;
            this._treeItems = treeItems;
            this._fragmentLabel = undefined;

            this.command = {command: "fragmentEditor.editFolder", title: "Edit Folder", arguments: [this]};
        }
        else
        {
            this.contextValue = "fragment";
            this._isRoot = false;
            this.collapsibleState = 0;
            this._treeItems = [];
            this._fragmentLabel = label;

            this.command = {command: "fragmentEditor.editFragment", title: "Edit Fragment", arguments: [this]};
        }
    }

    get treeItems(): TreeItem[]
    {
        return this._treeItems;
    }

    get fragmentLabel(): string | undefined
    {
        return this._fragmentLabel;
    }

    get isRoot(): boolean
    {
        return this._isRoot;
    }

    set treeItems(treeItems: TreeItem[])
    {
        if(this.contextValue === "folder")
        {
            this._treeItems = treeItems;
        }
    }

    set fragmentLabel(label: string | undefined)
    {
        if(this.contextValue === "fragment")
        {
            this._fragmentLabel = label;
        }
    }

    deleteTreeItem(treeItem: string)
    {
        var newList: TreeItem[] = [];
        this._treeItems.forEach((element: TreeItem) =>
        {
            if(element.label !== treeItem)
            {
                newList.push(element);
            }
        })
        this._treeItems = newList;
    }
}