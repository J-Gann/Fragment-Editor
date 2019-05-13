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

    private _childs: string | undefined;    // List of child TreeItems

    private _fragment: string | undefined;   // The corresponding fragment if TreeItem is no folder (identified by th fragment label)

    /**
     * Constructs a TreeItem
     * @param obj label: Unique identifier of the TreeItem | contextValue: "folder" or "fragment" | fragmentLabel: label of a fragment if contextValue is 'fragment' | isRoot: "true" if TreeItem is root of the TreeView, else "false"
     */
    constructor({label, isRoot=false, fragment=label, contextValue="fragment"}: {label: string, isRoot?: boolean, fragment?: string, contextValue?: string})
    {
        super(label);

        if(contextValue === "folder")
        {
            this.contextValue = "folder";
            this._isRoot = isRoot;
            this._childs = "";
            this._fragment = undefined;
            this.collapsibleState = 1;
            this.command = {command: "fragmentEditor.editFolder", title: "Edit Folder", arguments: [this]};
        }
        else
        {
            this.contextValue = "fragment";
            this._isRoot = false;
            this.collapsibleState = 0;
            this._childs = undefined;
            this._fragment = label;
            this.command = {command: "fragmentEditor.editFragment", title: "Edit Fragment", arguments: [this]};
        }
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
        if(this.contextValue === "fragment" && label !== undefined && label !== "")
        {
            this._fragment = label;
        }
        else
        {
            console.log("[W] | [TreeItem | set fragment]: Failed");
        }
    }

    /**
     * Returns list of labels of TreeItems being a child of the current TreeItem if the contextValue is 'folder', otherwise undefined
     */
    get childs(): (string|undefined)[] | undefined
    {
        if(this.contextValue === "folder")
        {
            if(this._childs !== undefined)
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
            else
            {
                return [];
            }
        }
        else
        {
            console.log("[W] | [TreeItem | get childs]: Failed");
        }
    }

    /**
     * Adds the given lable to the list of childs of the current TreeView. Adds this TreeView as parent of the new child.
     * @param treeItem Label of TreeItem to be added as child
     */
    addChild(treeItem: string | undefined): void
    {
        if(treeItem !== undefined && treeItem !== "" && this.contextValue === "folder")
        {
            if(this._childs !== undefined)
            {
                this._childs += treeItem + ',';
            }
            else
            {
                this._childs = treeItem + ',';
            }
        }
        else
        {
            console.log("[W] | [TreeItem | addChild]: Failed for label: " + treeItem);
        }
    }
}