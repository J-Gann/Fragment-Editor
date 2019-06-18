import * as vscode from 'vscode';
import { FragmentProvider } from "./fragmentProvider";
import { XMLHttpRequest } from 'xmlhttprequest-ts';
import { resolve } from 'dns';
import * as extension from './extension';

export class WebViewProvider {
    panel: any;
    context: extension.Ecclass;
    fragmentProvider: FragmentProvider;

    constructor(context: extension.Ecclass, fragmentProvider: FragmentProvider) {
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
                this.panel.webview.html = this.embedSite(http.responseText);
                this.panel.reveal();
            }
        };
    }

    private embedSite(webadress: string) {
        return `<!DOCTYPE html>
          <html lang="de">
          <head>
<script type="text/javascript">
    if (document.addEventListener) { // IE >= 9; other browsers
        document.addEventListener('contextmenu', function(e) {
            alert("You've tried to open context menu"); //here you draw your own menu
            e.preventDefault();
        }, false);
    } else { // IE < 9
        document.attachEvent('oncontextmenu', function() {
            alert("You've tried to open context menu");
            window.event.returnValue = false;
        });
    }
</script>
</head>
          <body>
            <embed src="${webadress}">
          </body>
          </html>`;
    }
}