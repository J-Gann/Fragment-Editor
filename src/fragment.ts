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
    private _placeholders: string[] | undefined;

    constructor(label: string, obj?:{keywords?: string, prefix?: string, body?: string, scope?: string, domain?: string, placeholders?: string[], description?: string})
    {
        super(label);
        this._label = label;

        if(obj !== undefined)
        {
            if(obj.keywords !== undefined)
            {
                this._keywords = obj.keywords;
            }
            if(obj.prefix !== undefined)
            {
                this._prefix = obj.prefix;
            }
            if(obj.body !== undefined)
            {
                this._body = obj.body;
            }
            if(obj.scope !== undefined)
            {
                this._scope = obj.scope;
            }
            if(obj.domain !== undefined)
            {
                this._domain = obj.domain;
            }
            if(obj.placeholders !== undefined)
            {
                this._placeholders = obj.placeholders;
            }
            if(obj.description !== undefined)
            {
                this._description = obj.description;
            }
        }
        this.command = {command: "fragmentEditor.editEntry", title: "Edit Node", arguments: [this]};
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

    get placeholders(): string[] | undefined
    {
        return this._placeholders;
    }


    set label(label: string)
    {
        this._label = label;
    }

    set prefix(prefix: string | undefined)
    {
        this._prefix = prefix;
    }

    set scope(scope: string | undefined)
    {
        this._scope = scope;
    }

    set body(body: string | undefined)
    {
        this._body = body;
    }

    set description(description: string | undefined)
    {
        this._description = description;
    }

    set keywords(keywords: string | undefined)
    {
        this._keywords = keywords;
    }

    set domain(domain: string | undefined)
    {
        this._domain = domain;
    }  

    set placeholders(placeholders: string[] | undefined)
    {
        this._placeholders = placeholders;
    }
}