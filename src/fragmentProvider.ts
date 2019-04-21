import * as vscode from 'vscode';
var sqlite3 = require('sqlite3');
var fs = require("fs");
var db = new sqlite3.Database(':memory:');

export class Fragment extends vscode.TreeItem
{
    keywords: string[];
    code: string;
    constructor(public readonly label: string)
    {
        super(label);
        this.keywords = [];
        this.code = "";
    }

    get description(): string
    {
        return "";
    }

    get tooltip(): string
    {
        return this.label + "\n\n" + this.code + "\n\n" + this.keywords;
    }
}

export class FragmentProvider implements vscode.TreeDataProvider<Fragment>
{
    fragments: Fragment[];

	private _onDidChangeTreeData: vscode.EventEmitter<Fragment | undefined> = new vscode.EventEmitter<Fragment | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Fragment | undefined> = this._onDidChangeTreeData.event;

    constructor()
    {
        this.fragments = this.readFragmentFiles();
    }

    getTreeItem(element: Fragment): vscode.TreeItem
    {
        return element;
    }

    getChildren(element?: Fragment): Thenable<Fragment[]>
    {
        return Promise.resolve(this.fragments);
    }

    refresh(): void
    {
		this._onDidChangeTreeData.fire();
	}

    editEntry(fragment: Fragment): void
    {
        var fragmentFile = vscode.workspace.openTextDocument("C:/Users/Jonas/Documents/fragment-editor/fragments/"+fragment.label+".txt");

        fragmentFile.then((file) =>
        {
            vscode.window.showTextDocument(file);
        });
    }

    addEntry(): void
    {
        var input = vscode.window.showInputBox({prompt: "Input a label for the Fragment"});

        input.then((value) =>
        {
            for(var cnt = 0; cnt < this.fragments.length; cnt++)
            {
                if(this.fragments[cnt].label === value)
                {
                    vscode.window.showErrorMessage("Creation of Fragment Cancelled (Label must be unique)");
                    return;
                }
            }
            if(value === undefined)
            {
                this.refresh();
                vscode.window.showErrorMessage("Creation of Fragment Cancelled");
                return;
            }
            else if(value === '')
            {
                this.refresh();
                vscode.window.showErrorMessage("Creation of Fragment Cancelled (no empty label allowed)");
                return;
            }
            else
            {
                fs.writeFile("C:/Users/Jonas/Documents/fragment-editor/fragments/"+value+".txt", "", function(err: Error)
                {
                    if(err)
                    {
                        vscode.window.showErrorMessage("File not created")
                    }
                    else
                    {
                        vscode.window.showInformationMessage("File created");
                    }
                });
                this.fragments.push(new Fragment(String(value)));
                this.refresh();
                vscode.window.showInformationMessage("New Fragment Added");
            }
        });
    }

    deleteEntry(fragment: Fragment)
    {
        this.fragments = this.fragments.filter(function(element, index, arr)
        {
            return fragment.label !== element.label;
        });

        fs.unlink("C:/Users/Jonas/Documents/fragment-editor/fragments/"+fragment.label+".txt", (err: Error) =>
        {
            if(err)
            {
                vscode.window.showErrorMessage("File not deleted")
            }
            else
            {
                vscode.window.showInformationMessage("File deleted");
            }
            this.refresh();
        });

        this.refresh();

        vscode.window.showInformationMessage("Fragment Deleted");
    }

    readFragmentFiles(): Fragment[]
    {
        var fragmentsList: Fragment[];
        fs.readdir("C:/Users/Jonas/Documents/fragment-editor/fragments", (err: Error, files: []) =>
        {
            if(err)
            {
                vscode.window.showErrorMessage("Unable to scan directory: " + err);
            }
            else
            {
                files.forEach((file) =>
                {
                    this.fragments.push(new Fragment(String(file).substr(0,String(file).length-4)));
                });
                vscode.window.showInformationMessage("Fragments loaded");
                return fragmentsList;
            }
        });
        return [];
    }

    sqlRequest()
    {
        var input = vscode.window.showInputBox({prompt: "Input a SQL Request"});

        input.then((value) =>
        {
            if(value === undefined)
            {
                vscode.window.showErrorMessage("SQL Request Cancelled");
                return;
            }
            else if(value === "")
            {
                vscode.window.showErrorMessage("SQL Request Cancelled (no empty request allowed)");
                return;
            }
            else
            {
                vscode.window.showInformationMessage("SQL Request: " + value);
            }
        });
    }
}
