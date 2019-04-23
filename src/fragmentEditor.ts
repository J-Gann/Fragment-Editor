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
                        console.log(message.text);
                        const updated: boolean = this.dataBase.updateFragment(message.text.label, {
                            information: message.text.information, 
                            keywords: message.text.keywords, 
                            code: message.text.code,
                            language: message.text.language,
                            domain: message.text.domain,
                            placeHolders: message.text.placeHolders
                        });
                        console.log("entry edited " + updated);
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
        this.panel.webview.html = getWebviewContent(fragment);
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

function getWebviewContent(fragment: Fragment) {
  return `<!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${fragment.label}</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css">
        <style>
        body { font-size: 15px; }
        input { width:100%; color:lightgrey; font-size: 15px; }
        input:disabled { color:white; font-size: 15px; }
        textarea { width:100%; color:lightgrey; font-size: 15px; }
        </style>
    </head>
    <body>
        <h3 id="label">${fragment.label}</h3>
        Information: <input id="information" type="text" value="${fragment.information}">
        Keywords: <input id="keywords" type="text" value="${fragment.keywords}">
        Code: <textarea id="code" rows="16">${fragment.code}</textarea>
        Codelength:<input id="codelength" type="text" value="${fragment.length}" disabled>
        Language: <input id="language" type="text" value="${fragment.language}">
        Domain: <input id="domain" type="text" value="${fragment.domain}">
        Placeholders: <input id="placeholders" type="text" value="${fragment.placeHolders}">
        Placeholdercount: <input id="placeholdercount" type="number" value="${fragment.placeHolderCount}" disabled>
        <button onclick="submitFunction()" class="btn waves-effect waves-light" type="submit" name="action">Save</button>
        <button onclick="cancelFunction()" class="btn waves-effect waves-light" type="submit" name="action">Cancel</button>

        <script>
            const vscode = acquireVsCodeApi();
            function submitFunction() {
                vscode.postMessage({command: 'submit', text: {
                    "label":  document.getElementById("label").innerHTML ,
                    "information": document.getElementById("information").value, 
                    "keywords": document.getElementById("keywords").value, 
                    "code": document.getElementById("code").innerHTML,
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