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
                                                language = "", domain = "",
                                                placeHolders = ""}) {
        super(label);
        this.information = information; //placeholder reihenfolge
        this.keywords = keywords;
        this.code = code;
        this.language = language;
        this.domain = domain;
        this.length = this.code.length;
        this.placeHolderCount = placeHolders.split(",").length;
        this.placeHolders = placeHolders;
    }

    get description(): string {
        return "";
    }

    get tooltip(): string {
        let tip = "";
        tip = this.label + "\n";
        for(var cnt = 0; cnt < this.label.length; cnt++)
        {
            tip += "-";
        }
        if(this.code.split("\n\n").length < 5)
        {
            tip += "\n" + this.code;
        }
        else
        {
            tip += this.information;
        }
        tip += "\n\n" + this.keywords;
        return tip;
    }
}