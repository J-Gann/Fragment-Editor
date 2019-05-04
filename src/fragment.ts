import * as vscode from "vscode";
import { FOEF } from './parametrization';
export class Fragment extends vscode.TreeItem {
    // properties of the vscode snippet
    private _label: string;
    private _prefix: string | undefined;
    private _scope: string | undefined;
    private _body: string | undefined;
    private _description: string | undefined;
    // additional properties
    private _keywords: string | undefined;
    private _domain: string | undefined;
    private _placeholders: string | undefined;
    private _object: {label: string, keywords?: string, prefix?: string, body?: string, scope?: string, domain?: string, placeholders?: string, description?: string};
    private _snippet: string;

    constructor(obj:{label: string, keywords?: string, prefix?: string, body?: string, scope?: string, domain?: string, placeholders?: string, description?: string})
    {
        super(obj.label);
        this._label = obj.label;

        if(obj !== undefined)
        {
            if(obj.keywords !== undefined)
            {
                this._keywords = obj.keywords;
            }
            else
            {
                this._keywords = "";
            }
            if(obj.prefix !== undefined)
            {
                this._prefix = obj.prefix;
            }
            else
            {
                this._prefix = "";
            }
            if(obj.body !== undefined)
            {
                this._body = obj.body;
            }
            else
            {
                this._body = "";
            }
            if(obj.scope !== undefined)
            {
                this._scope = obj.scope;
            }
            else
            {
                this._scope = "";
            }
            if(obj.domain !== undefined)
            {
                this._domain = obj.domain;
            }
            else
            {
                this._domain = "";
            }
            if(obj.placeholders !== undefined)
            {
                this._placeholders = obj.placeholders;
            }
            else
            {
                this._placeholders = "";
            }
            if(obj.description !== undefined)
            {
                this._description = obj.description;
            }
            else
            {
                this._description = "";
            }
        }
        this._object = obj;
        this._snippet = Fragment.createSnippet(this);
        this.command = {command: "fragmentEditor.editEntry", title: "Edit Node", arguments: [this]};
    }

    private static createSnippet(fragment: Fragment): string
    {
        var object = {label: fragment.label, prefix: fragment.prefix, scope: fragment.scope, body: fragment.body, description: fragment.description};
        return JSON.stringify(object);
    }

    private static extractSnippet(json: string): {label: string, prefix?: string, body?: string, scope?: string, description?: string}
    {
        return JSON.parse(json);
    }

    get label(): string
    {
        return this._label;
    }

    get prefix(): string | undefined
    {
        return this._prefix;
    }

    get scope(): string | undefined
    {
        return this._scope;
    }

    get body(): string | undefined
    {
        return this._body;
    }

    get description(): string | undefined
    {
        return this._description;
    }

    get keywords(): string | undefined
    {
        return this._keywords;
    }

    get domain(): string | undefined
    {
        return this._domain;
    }  

    get placeholders(): string | undefined
    {
        return this._placeholders;
    }

    get object(): {label: string, keywords?: string, prefix?: string, body?: string, scope?: string, domain?: string, placeholders?: string, description?: string}
    {
        return this._object;
    }

    get snippet(): string
    {
        return this._snippet;
    }

}