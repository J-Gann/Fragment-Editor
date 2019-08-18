import * as vscode from "vscode";

/**
 * Element that represents a vs code snippet with additional properties for management in the editor
 */
export class Fragment extends vscode.TreeItem {
    constructor(obj: { label: string, keywords?: string, tags?: string, prefix?: string, body?: string, scope?: string, domain?: string, placeholders?: string, description?: string }) {
        super(obj.label);
        this._label = obj.label;

        if (obj.keywords !== undefined) {
            this._keywords = obj.keywords;
        } else {
            this._keywords = "";
        }
        if (obj.tags !== undefined) {
            this._tags = obj.tags;
        } else {
            this._tags = "";
        }
        if (obj.prefix !== undefined) {
            this._prefix = obj.prefix;
        } else {
            this._prefix = "";
        }
        if (obj.body !== undefined) {
            this._body = obj.body;
        } else {
            this._body = "";
        }
        if (obj.scope !== undefined) {
            this._scope = obj.scope;
        } else {
            this._scope = "";
        }
        if (obj.domain !== undefined) {
            this._domain = obj.domain;
        } else {
            this._domain = "";
        }
        if (obj.placeholders !== undefined) {
            this._placeholders = obj.placeholders;
        } else {
            this._placeholders = "";
        }
        if (obj.description !== undefined) {
            this._description = obj.description;
        } else {
            this._description = "";
        }
        this._snippet = Fragment.createSnippet(this);
        this._object = obj;
        this.command = { command: "fragmentEditor.editEntry", title: "Edit Node", arguments: [this] };
    }

    // properties of the vscode snippet
    private _label: string;

    get label(): string {
        return this._label;
    }

    set label(label: string) {
        this._label = label;
    }

    private readonly _prefix: string | undefined;

    get prefix(): string | undefined {
        return this._prefix;
    }

    private readonly _scope: string | undefined;

    get scope(): string | undefined {
        return this._scope;
    }

    private readonly _body: string | undefined;

    get body(): string | undefined {
        return this._body;
    }

    private readonly _description: string | undefined;

    get description(): string | undefined {
        return this._description;
    }

    // additional properties
    private readonly _keywords: string | undefined;     // Keywords are used in the parametrisation of FOEF

    get keywords(): string | undefined {
        return this._keywords;
    }

    private _tags: string | undefined;         // Tags are used to create a folder structure in the TreeView

    get tags(): string | undefined {
        return this._tags;
    }

    private readonly _domain: string | undefined;       // The framework the code snippet is uded in (Maybe deprecated -> usa a tag)

    get domain(): string | undefined {
        return this._domain;
    }

    private readonly _placeholders: string | undefined; // The list of unspecified variables of the code snippet

    get placeholders(): string | undefined {
        return this._placeholders;
    }

    private readonly _snippet: string;                // The code snippet and its properties as json object

    get snippet(): string {
        return this._snippet;
    }

    private readonly _object: { label: string, keywords?: string, tags?: string, prefix?: string, body?: string, scope?: string, domain?: string, placeholders?: string, description?: string };

    get object() {
        return this._object;
    }

    /**
     * Text that is displayed when the mouse is hoverng over the element in the TreeView
     */
    get tooltip(): string {
        let text: string = this._label + '\n';
        for (let cnt = 0; cnt < this._label.length; cnt++) {
            text += '~';
        }
        text += '\n' + this._keywords + '\n';
        if (this._keywords !== undefined) {
            for (let cnt = 0; cnt < this._keywords.length; cnt++) {
                text += '~';
            }
        }
        if (this._body !== undefined) {
            text += '\n' + this._body + '\n';
        }
        return text;
    }

    /**
     * Create a vs code snippet as stringified json out of the fragments properties
     * @param fragment The Fragment to use
     */
    private static createSnippet(fragment: Fragment): string {
        const object = {
            label: fragment.label,
            prefix: fragment.prefix,
            scope: fragment.scope,
            body: fragment.body,
            description: fragment.description
        };
        return JSON.stringify(object);
    }

    /**
     * Extract a vs code snippet as json from the given string
     * @param json String to extract the snippet from
     */
    private static extractSnippet(json: string): { label: string, prefix?: string, body?: string, scope?: string, description?: string } {
        return JSON.parse(json);
    }

    /**
     * Adds the given tag to the list of tags of this Fragment
     * @param tag Tag to be added
     */
    addTag(tag: string | undefined) {
        if (this._tags !== undefined && tag !== undefined) {
            const tags = this._tags.split(',');
            if (!tags.includes(tag)) {
                this._tags += tag + ',';
            }
        }
    }

    /**
     * Removes the given tag from the list of tags of this Fragment
     * @param newTag
     */
    removeTag(newTag: string | undefined) {
        if (this._tags !== undefined && newTag !== undefined) {
            let newTags = "";
            const tags = this._tags.split(',');
            tags.forEach((tag: string) => {
                if (tag !== newTag && tag.length !== 0) {
                    newTags += tag + ',';
                }
            });
            this._tags = newTags;
        }
    }
}