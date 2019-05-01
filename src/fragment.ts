import * as vscode from "vscode";
import { FOEF } from './parametrization';
export class Fragment extends vscode.TreeItem {
    information: string;
    keywords: string;
    code: string;
    language: string;
    domain: string;
    length: number;
    placeHolderCount: number;
    placeHolders: string;

    constructor(public readonly label: string, information: string, keywords: string, 
        code:string, language: string, domain: string, placeHolders: string) {
        super(label);
        this.information = information;
        this.keywords = keywords;
        this.code = FOEF.parametrize(code);
        this.language = language;
        this.domain = domain;
        this.length = this.code.length;
        this.placeHolderCount = placeHolders === "" ? 0 : placeHolders.split(",").length;
        this.placeHolders = placeHolders;
        this.command = {command: "fragmentEditor.editEntry", title: "Edit Node", arguments: [this]};
    }

    get tooltip(): string {
        let tip = "";
        tip = this.label + "\n";
        for(var cnt = 0; cnt < this.label.length; cnt++) {
            tip += "-";
        } if(this.code.split("\n\n").length < 5) {
            tip += "\n" + this.code;
        } else {
            tip += "\n" + this.information;
        }
        tip += "\n\n" + this.keywords;
        return tip;
    }
}