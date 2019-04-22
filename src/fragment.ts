import * as vscode from "vscode";

export class Fragment extends vscode.TreeItem {
    
    keywords: string[];
    code: string;
    language: string;

    constructor(public readonly label: string) {
        super(label);
        this.keywords = [];
        this.code = "";
        this.language = "";
    }

    getLabel(): string {
        return this.label;
    }

    get description(): string {
        return "";
    }

    get tooltip(): string {
        return this.label + "\n\n" + this.code + "\n\n" + this.keywords;
    }
}