import {Fragment} from "./fragment";
import * as vscode from 'vscode';
import {Database} from "./database";
import {FragmentProvider} from "./fragmentProvider";
import {FOEF} from "./parametrization";
import {PyPa} from "./parametrization_old";

export class FragmentEditor {
    panel: any;
    context: vscode.ExtensionContext;
    fragmentProvider: FragmentProvider;
    fragment: Fragment | undefined;

    constructor(context: vscode.ExtensionContext, fragmentProvider: FragmentProvider) {
        this.context = context;
        this.fragmentProvider = fragmentProvider;
        this.fragment = undefined;
    }

    createPanel() {
        this.panel = vscode.window.createWebviewPanel(
            "",
            "",
            vscode.ViewColumn.One,
            {
                enableScripts: true
            });

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });

        this.panel.webview.onDidReceiveMessage((message: any) => {
            switch (message.command) {
                case 'cancel':
                    this.panel.dispose();
                    this.panel.onDidDispose();
                    return;
                case 'submit':
                    var newFragment = new Fragment({
                        label: message.text.label,
                        prefix: message.text.prefix,
                        scope: message.text.scope,
                        body: message.text.body,
                        description: message.text.description,
                        keywords: message.text.keywords,
                        tags: message.text.tags,
                        domain: message.text.domain,
                        placeholders: message.text.placeholders
                    });
                    Database.getInstance().updateFragment(newFragment);
                    this.fragmentProvider.refresh();
                    this.panel.dispose();
                    this.panel.onDidDispose();
                    return;
            }
        }, undefined, this.context.subscriptions);
    }

    showFragment(fragment: Fragment | undefined) {
        if (fragment === undefined) {
            return;
        }
        this.fragment = fragment;
        if (this.panel === undefined) {
            this.createPanel();
        }

        this.panel.title = fragment.label;

        const path = require("path");
        let onDiskPath = vscode.Uri.file(path.join(this.context.extensionPath, 'external/materialize', 'materialize.css'));
        const style = onDiskPath.with({scheme: 'vscode-resource'});

        onDiskPath = vscode.Uri.file(path.join(this.context.extensionPath, 'external/materialize', 'materialize.js'));
        const js = onDiskPath.with({scheme: 'vscode-resource'});

        onDiskPath = vscode.Uri.file(path.join(this.context.extensionPath, 'external/materialize', 'googleicons.css'));
        const googleicons = onDiskPath.with({scheme: 'vscode-resource'});

        this.panel.webview.html = this.getWebviewContent(fragment, style, js, googleicons);
        this.panel.reveal();
    }

    onDelete(label: string) {
        if (this.panel.title === label) {
            this.panel.dispose();
        }
    }

    private getWebviewContent(fragment: Fragment, style: vscode.Uri, js: vscode.Uri, googleicons: vscode.Uri) {
        return `<!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${this.formatForHtml(fragment.label)}</title>
            <link rel="stylesheet" href="${style}">
            <link rel="stylesheet" href="${googleicons}">
            <script src="${js}"></script> 
            <style>
                .vscode-dark input { width:100%; color:white; font-size: 15px; border: none }
                .vscode-dark textarea { width:100%; color:white; font-size: 15px; height: auto; resize: none; }
                .vscode-light input { width:100%; color:black; font-size: 15px; border: none }
                .vscode-light textarea { width:100%; color:black; font-size: 15px; height: auto; resize: none; }
                .vscode-light div .input { color: black }
                .vscode-dark div .input { color: white }
            </style>
        </head>
        <body>
            <h3 style="float: left; max-width: 70%; overflow: hidden;" id="label" >${this.formatForHtml(fragment.label)}</h3>
            <button style="float: right; margin: 10px; margin-top: 35px" onclick="cancelFunction()" class="btn waves-effect waves-light" type="submit" name="action">Cancel</button>
            <button style="float: right; margin: 10px; margin-top: 35px" onclick="submitFunction()" class="btn waves-effect waves-light" type="submit" name="action">Save</button>
            <br><br><br><br><br>
            Description: <input id="description" type="text" value="${fragment.description}">
            Keywords: <input id="keywords" type="text" value="${fragment.keywords}">
            Tags: <div class="tags chips-autocomplete"></div>
            Prefix: <input id="prefix" type="text" value="${fragment.prefix}">
            Body: <textarea id="body" rows="16">${fragment.body}</textarea>
            Scope: <input id="scope" type="text" value="${fragment.scope}">
            Domain: <div class="domains chips-autocomplete"></div>
            Placeholders: <input style="color:lightgrey;" id="placeholders" type="text" value="${fragment.placeholders}" disabled>

            <script>
                var tags;
                var domains;

                const vscode = acquireVsCodeApi();
                function submitFunction() {
                    vscode.postMessage({command: 'submit', text: {
                        "label":  document.getElementById("label").innerHTML ,
                        "description": document.getElementById("description").value, 
                        "keywords": document.getElementById("keywords").value,
                        "tags": "" + tags[0].chipsData.map(chip => chip.tag).join(),
                        "prefix": document.getElementById("prefix").value, 
                        "body": document.getElementById("body").value,
                        "scope": document.getElementById("scope").value,
                        "domain": "" + domains[0].chipsData.map(chip => chip.tag).join(),
                        "placeholders": document.getElementById("placeholders").value
                    }});    
                }

                function cancelFunction() {
                    vscode.postMessage({command: 'cancel', text: ''});
                }

                function parametrize() {
                    vscode.postMessage({command: 'parametrize', text: document.getElementById("body").value});
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch(message.command) {
                        case 'parametrize':
                            document.getElementById("body").value = message.text.body;
                            document.getElementById("keywords").value = message.text.keywords;
                            document.getElementById("placeholders").value = message.text.placeholders;
                            return;
                    }
                });

                document.addEventListener('DOMContentLoaded', function () {
                    var tagelems = document.querySelectorAll('.tags');
                    tags = M.Chips.init(tagelems, {
                        ${this.getTagsFromFragment(fragment)}
                        autocompleteOptions: {
                            ${this.getTagList()}
                            limit: Infinity,
                            minLength: 1
                        }
                    });
                    var domainelems = document.querySelectorAll('.domains');
                    domains = M.Chips.init(domainelems, {
                        ${this.getDomainsFromFragment(fragment)}
                        autocompleteOptions: {
                            ${this.getDomainList()}
                            limit: Infinity,
                            minLength: 1
                        }
                    });
                });
            </script>

          </body>
          </html>`;
    }

    private getTagsFromFragment(fragment: Fragment): string {
        if (fragment.tags === undefined || fragment.tags === "") {
            return "";
        }

        var tags: string = "";
        fragment.tags.split(",").forEach(tag => {
            tags = tags + '{ tag: "' + tag + '" },';
        });

        return "data: [" + tags + "],";
    }

    private getDomainsFromFragment(fragment: Fragment): string {
        if (fragment.domain === undefined || fragment.domain === "") {
            return "";
        }

        var domains: string = "";
        fragment.domain.split(",").forEach(domain => {
            domains = domains + '{ tag: "' + domain + '" },';
        });

        return "data: [" + domains + "],";
    }

    private getTagList(): string {
        var tags = "";

        Database.getInstance().getTags().forEach(tag => {
            tags = tags + " '" + tag + "': null,";
        });

        return "data: {" + tags + "},";
    }

    private getDomainList(): string {
        var domains = "";

        Database.getInstance().getDomains().forEach(domain => {
            domains = domains + " '" + domain + "': null,";
        });

        return "data: {" + domains + "},";
    }

    private formatForHtml(input: string): string {
        return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
}