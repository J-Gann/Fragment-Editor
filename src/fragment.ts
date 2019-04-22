import * as vscode from "vscode";

export class Fragment extends vscode.TreeItem
{
    keywords: string[];
    code: string;
    constructor(public readonly label: string)
    {
        super(label);
        this.keywords = [];
        this.code = "";
    }

    get description(): string
    {
        return "";
    }

    get tooltip(): string
    {
        return this.label + "\n\n" + this.code + "\n\n" + this.keywords;
    }
}