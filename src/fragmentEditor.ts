import { Fragment } from "./fragment";
import * as vscode from 'vscode';
import { Database } from "./database";
import { FragmentProvider } from "./fragmentProvider";

export class FragmentEditor {
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
                        var newFragment = new Fragment({label: message.text.label, prefix: message.text.prefix, scope: message.text.scope, body: message.text.body, description: message.text.description, keywords: message.text.keywords, domain: message.text.domain, placeholders: message.text.placeholders});
                        const updated: boolean = Database.updateFragment(newFragment);
                        vscode.window.showInformationMessage(updated? "Fragment edited.": "Fragment not edited.");
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

    showFragment(fragment: Fragment)
    {
        if (this.panel === undefined)
        {
            this.createPanel();
        }
        
        this.panel.title = fragment.label;

        const path = require("path");
        const onDiskPath = vscode.Uri.file(path.join(this.context.extensionPath, 'external/materialize', 'materialstyle.css'));
    
        const style = onDiskPath.with({ scheme: 'vscode-resource' });

        this.panel.webview.html = this.getWebviewContent(fragment, style);
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

    private getWebviewContent(fragment: Fragment, style: vscode.Uri) {
        return `<!DOCTYPE html>
          <html lang="de">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${fragment.label}</title>
              <link rel="stylesheet" href="${style}">
              <style>
                  input { width:100%; color:white; font-size: 15px; border: none }
                  textarea { width:100%; color:white; font-size: 15px; height: auto; resize: none; }
              </style>
          </head>
          <body>
      
                  <h3 style="float: left; max-width: 70%; overflow: hidden;" id="label" >${fragment.label}</h3>
                  <button style="float: right; margin: 10px; margin-top: 35px" onclick="cancelFunction()" class="btn waves-effect waves-light" type="submit" name="action">Cancel</button>
                  <button style="float: right; margin: 10px; margin-top: 35px" onclick="submitFunction()" class="btn waves-effect waves-light" type="submit" name="action">Save</button>
                  <br><br><br><br><br>
                  Description: <input id="description" type="text" value="${fragment.description}">
                  Keywords: <input id="keywords" type="text" value="${fragment.keywords}">
                  Prefix: <input id="prefix" type="text" value="${fragment.prefix}">
                  Body: <textarea id="body" rows="16">${fragment.body}</textarea>
                  Scope: <input id="scope" type="text" value="${fragment.scope}">
                  Domain: <input id="domain" type="text" value="${fragment.domain}">
                  Placeholders: <input id="placeholders" type="text" value="${fragment.placeholders}">
      
      
              <script>
                  const vscode = acquireVsCodeApi();
                  function submitFunction() {
                      vscode.postMessage({command: 'submit', text: {
                          "label":  document.getElementById("label").innerHTML ,
                          "description": document.getElementById("description").value, 
                          "keywords": document.getElementById("keywords").value,
                          "prefix": document.getElementById("prefix").value, 
                          "body": document.getElementById("body").value,
                          "scope": document.getElementById("scope").value,
                          "domain": document.getElementById("domain").value,
                          "placeholders": document.getElementById("placeholders").value
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