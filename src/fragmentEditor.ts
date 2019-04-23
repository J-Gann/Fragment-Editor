import { Fragment } from "./fragment";

import * as vscode from 'vscode';
import { Database } from "./database";
import { FragmentProvider } from "./fragmentProvider";

export class FragmentEditor {
    panel: any;
    context: vscode.ExtensionContext;
    dataBase: Database;
    fragmentProvider: FragmentProvider;

    constructor(context: vscode.ExtensionContext, dataBase: Database, fragmentProvider: FragmentProvider) {
        this.context = context;
        this.dataBase = dataBase;
        this.fragmentProvider = fragmentProvider;
    }

    createPanel() {
        this.panel = vscode.window.createWebviewPanel(
            "",
            "",
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        this.panel.onDidDispose(() => {
            this.panel = undefined;
          }
        );

        this.panel.webview.onDidReceiveMessage(
            (message: any) => {
                switch (message.command) {
                    case 'cancel':
                        this.panel.dispose();
                        this.panel.onDidDispose();
                        return;
                    case 'submit':
                        const updated: boolean = this.dataBase.updateFragment(message.text.label, {
                            information: message.text.information, 
                            keywords: message.text.keywords, 
                            code: message.text.code,
                            language: message.text.language,
                            domain: message.text.domain,
                            placeHolders: message.text.placeHolders
                        });
                        vscode.window.showInformationMessage(updated ? "Fragment edited.": "Fragment not edited.");
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

    showFragment(fragment: Fragment) {
        if (this.panel === undefined) {
            this.createPanel();
        }
        
        this.panel.title = fragment.label;

        const path = require("path");
        const onDiskPath = vscode.Uri.file(path.join(this.context.extensionPath, 'style', 'materialstyle.css'));
    
        const style = onDiskPath.with({ scheme: 'vscode-resource' });

        this.panel.webview.html = getWebviewContent(fragment, style);
        this.panel.reveal();
    }

    onDelete(fragment: Fragment) {
        if (this.panel === undefined) {
            return;
        }

        if (this.panel.title === fragment.label) {
            this.panel.dispose();
        }
    }
}

function getWebviewContent(fragment: Fragment, style: vscode.Uri) {
  return `<!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${fragment.label}</title>
        <link rel="stylesheet" href="${style}">
        <style>
            input { width:100%; color:white; font-size: 15px; }
            textarea { width:100%; color:white; font-size: 15px; height: auto; }
        </style>
    </head>
    <body>
        <h3 id="label">${fragment.label}</h3>
        Information: <input id="information" type="text" value="${fragment.information}">
        Keywords: <input id="keywords" type="text" value="${fragment.keywords}">
        Code: <textarea id="code" rows="16">${fragment.code}</textarea>
        Codelength:<input style="color:lightgrey;" id="codelength" type="text" value="${fragment.length}" disabled>
        Language: <input id="language" type="text" value="${fragment.language}">
        Domain: <input id="domain" type="text" value="${fragment.domain}">
        Placeholders: <input id="placeholders" type="text" value="${fragment.placeHolders}">
        Placeholdercount: <input style="color:lightgrey;" id="placeholdercount" type="number" value="${fragment.placeHolderCount}" disabled>
        <button onclick="submitFunction()" class="btn waves-effect waves-light" type="submit" name="action">Save</button>
        <button onclick="cancelFunction()" class="btn waves-effect waves-light" type="submit" name="action">Cancel</button>

        <script>
            const vscode = acquireVsCodeApi();
            function submitFunction() {
                vscode.postMessage({command: 'submit', text: {
                    "label":  document.getElementById("label").innerHTML ,
                    "information": document.getElementById("information").value, 
                    "keywords": document.getElementById("keywords").value, 
                    "code": document.getElementById("code").value,
                    "language": document.getElementById("language").value,
                    "domain": document.getElementById("domain").value,
                    "placeHolders": document.getElementById("placeholders").value
                }});
                
            }
            function cancelFunction() {
                vscode.postMessage({command: 'cancel', text: ''});
            }
        </script>
    </body>
    </html>`;
}