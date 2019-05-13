import * as vscode from 'vscode';
import { FragmentProvider } from "./fragmentProvider";
import { XMLHttpRequest } from 'xmlhttprequest-ts';
import { resolve } from 'dns';

export class WebViewProvider {
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
                }
            },
            undefined,
            this.context.subscriptions
          );
    }

    openWeb(webadress: string)
    {
        if (this.panel === undefined)
        {
            this.createPanel();
        }

        this.panel.title = 'webView';

       this.getWebviewContent(webadress);
    }

    setthis(resp:any, response:any)
    {
        resp = response;
    }

    private getWebviewContent(webadress: string) {
        const http = new XMLHttpRequest();
        http.open("GET", webadress, true);
        http.send(null);
        let resp: any;
        http.onreadystatechange = () =>
        {
            if(http.readyState === 4)
            {
                this.panel.webview.html = http.responseText;
                this.panel.reveal();
            }
        };
    }
}