import * as vscode from "vscode";

export class Fragment extends vscode.TreeItem {
    information: string;
    keywords: string;
    code: string;
    language: string;
    domain: string;
    length: number;
    placeHolderCount: number;
    placeHolders: string;

    constructor(public readonly label: string, {information = "", keywords = "", code = "", 
                                                language = "", domain = "", placeHolderCount = 0,
                                                placeHolders = ""}) {
        super(label);
        this.information = information; //placeholder reihenfolge
        this.keywords = keywords;
        this.code = code;
        this.language = language;
        this.domain = domain;
        this.length = this.code.length;
        this.placeHolderCount = placeHolderCount;
        this.placeHolders = placeHolders;
    }

    get description(): string {
        return "";
    }

    get tooltip(): string {
        return this.information;
    }
}