import * as vscode from 'vscode';
import { Database } from "./database";
import { FragmentProvider } from "./fragmentProvider";
import { TreeItem } from "./treeItem";

export class FolderEditor {
    panel: any;
    context: vscode.ExtensionContext;
    fragmentProvider: FragmentProvider;

    constructor(context: vscode.ExtensionContext, fragmentProvider: FragmentProvider) {
        this.context = context;
        this.fragmentProvider = fragmentProvider;
    }

    createPanel()
    {
        this.panel = vscode.window.createWebviewPanel(
            "",
            "",
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        this.panel.onDidDispose(() =>
        {
            this.panel = undefined;
        });

        this.panel.webview.onDidReceiveMessage(
            (message: any) =>
            {
                switch (message.command)
                {
                    case 'cancel':
                        this.panel.dispose();
                        this.panel.onDidDispose();
                        return;
                    case 'submit':
                        var treeItem = Database.getTreeItem(message.text.label);
                        if(treeItem !== undefined)
                        {
                            treeItem.childs = message.text.childs.split(',');
                            treeItem.parents = message.text.parents.split(',');
                        }
                        this.fragmentProvider.refresh();
                        this.panel.dispose();
                        this.panel.onDidDispose();
                        return;
                }
            },
            undefined,
            this.context.subscriptions
          );
    }

    showFolder(treeItem: TreeItem | undefined)
    {
        if(treeItem === undefined)
        {
            return;
        }
        if (this.panel === undefined)
        {
            this.createPanel();
        }
        
        this.panel.title = treeItem.label;

        const path = require("path");
        const onDiskPath = vscode.Uri.file(path.join(this.context.extensionPath, 'external/materialize', 'materialstyle.css'));
    
        const style = onDiskPath.with({ scheme: 'vscode-resource' });
 
        this.panel.webview.html = this.getWebviewContent(treeItem, style);
        this.panel.reveal();
    }

    onDelete(treeItem: TreeItem) {
        if (this.panel === undefined) {
            return;
        }

        if (this.panel.title === treeItem.label) {
            this.panel.dispose();
        }
    }

    private getWebviewContent(treeItem: TreeItem, style: vscode.Uri) {
        return `<!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${treeItem.label}</title>
            <link rel="stylesheet" href="${style}">
            <style>
                input { width:100%; color:white; font-size: 15px; border: none }
                textarea { width:100%; color:white; font-size: 15px; height: auto; resize: none; }
            </style>
        </head>
        <body>
      
                <h3 style="float: left; max-width: 70%; overflow: hidden;" id="label" >${treeItem.label}</h3>
                <!--<button style="float: right; margin: 10px; margin-top: 35px" onclick="cancelFunction()" class="btn waves-effect waves-light" type="submit" name="action">Cancel</button>-->
                <!--<button style="float: right; margin: 10px; margin-top: 35px" onclick="submitFunction()" class="btn waves-effect waves-light" type="submit" name="action">Save</button>-->
                <br><br><br><br><br>
                Parents: <input id="parents" style="color:lightgrey;" type="text" value="${treeItem.parents}" disabled>
                Childs: <input id="childs" style="color:lightgrey;" type="text" value="${treeItem.childs}" disabled>

            <script>
                const vscode = acquireVsCodeApi();
                function submitFunction() {
                    vscode.postMessage({command: 'submit', text: {
                        "label": document.getElementById("label").innerHTML,
                        "parents": document.getElementById("parents").value,
                        "childs": document.getElementById("childs").value
                    }});    
                }
                function cancelFunction() {
                    vscode.postMessage({command: 'cancel', text: ''});
                }

            </script>
        </body>
        </html>`;
    }
}