import * as vscode from 'vscode';
import { Fragment } from "./fragment";
import { Database } from './database';
import { FragmentEditor } from './fragmentEditor';

export class FragmentProvider implements vscode.TreeDataProvider<Fragment>
{
    database: Database;
    fragmentListFilter: string;
    fragmentDir: any;
    fragmentEditor: FragmentEditor;

	private _onDidChangeTreeData: vscode.EventEmitter<Fragment | undefined> = new vscode.EventEmitter<Fragment | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Fragment | undefined> = this._onDidChangeTreeData.event;

    constructor(context: vscode.ExtensionContext)
    {
        this.database = new Database();
        this.fragmentListFilter = "";
        this.fragmentDir = require('os').homedir() + "/fragments/";
        this.fragmentEditor = new FragmentEditor(context, this.database, this);
    }

    getTreeItem(element: Fragment): vscode.TreeItem
    {
        return element;
    }

    /**
     * Return list of fragments that are displayed in the tree
     */
    getChildren(element?: Fragment): Thenable<Fragment[]>
    {
        return Promise.resolve(this.database.getFilteredFragments(this.fragmentListFilter));
    }

    /**
     * Refresh the displayed list of fragments
     */
    refresh(): void
    {
		this._onDidChangeTreeData.fire();
	}

    /**
     * Changes the properties of a fragment
     * @param fragment Fragment that should be edited
     */
    editEntry(fragment: Fragment): void
    {
        this.fragmentEditor.showFragment(fragment);
    }

    /**
     * Creates a new fragment by opening a input dialog to enter a new label
     */
    addEntry(): void
    {
        var input = vscode.window.showInputBox({prompt: "Input a label for the Fragment"});
        var editor = vscode.window.activeTextEditor;
        var selection: vscode.Selection;
        var textDocument: vscode.TextDocument;
        var text: String;

        if(editor)
        {
            selection = editor.selection;
            textDocument = editor.document;
            text = textDocument.getText(new vscode.Range(selection.start, selection.end));
        }
        else
        {
            text = "";
        }

        input.then((value) =>
        {
            if(value === "")
            {
                vscode.window.showErrorMessage("Fragment Not Added (no empty label allowed)");
            }
            else if(value === undefined)
            {
                vscode.window.showErrorMessage("Fragment Not Added");
            }
            else if(!this.database.getFragment(value))
            {
                var newCode = this.fragmentOutOfExistingFragments(text);

                this.database.addFragment(String(value), {code:String(newCode)});
    
                vscode.window.showInformationMessage("Fragment Added");
            }
            else
            {
                vscode.window.showErrorMessage("Fragment Not Added (label has to be unique)");
            }
            this.refresh();
        });
    }

    /**
     * Deletes a fragment
     * @param fragment Fragment that should be deleted
     */
    deleteEntry(fragment: Fragment): void
    {
        if(this.database.deleteFragment(fragment.label))
        {
            this.fragmentEditor.onDelete(fragment);
            vscode.window.showInformationMessage("Fragment Deleted");
        }
        else
        {
            vscode.window.showErrorMessage("Fragment Not Deleted");
        }
        this.refresh();
    }

    /**
     * Filters the displayed list of fragments by opening a input dialog and searching for fragments which label contains the input string
     */
    filter(): void
    {
        var input = vscode.window.showInputBox({prompt: "Search for Fragment which contains all the properties searched for as substring in the corresponding property | Usage: <property>:<searchvalue>{,<property>:<searchvalue>} | Properties: label, keyword, language, domain", value: this.fragmentListFilter});

        input.then((value) =>
        {
            if(value === undefined)
            {
                vscode.window.showErrorMessage("Filtering Cancelled");
            } 
            else
            {
                this.fragmentListFilter = String(value);
            }
            this.refresh();
        });
    }

    /**
     * Resets the displayed list of fragments to not be filtered
     */
    reset(): void
    {
        this.fragmentListFilter = "";
        this.refresh();
    }

    fragmentOutOfExistingFragments(code: String)
    {
        /**
         * 1) Split code in array of lines
         * 2) For each line: Delete all predefined symbols from the code
         * 3) For each line: Split resulting code into array of keywords
         * 4) For each line: Find all fragments that have at least one keyword in common
         * 5) For each line: Count occurence of each fragment
         * 6) For each line: Replace line by code of fragment with highest count
         */

        // TODO: Keep original code in lines where no matching fragments were found

        // 1) Split code in array of lines
        var codeLines = code.split("\n");

        // 2) For each line: Delete all predefined symbols from the code
        var deletable = ['\r', '(', ')', '{', '}', '[', ']',';', ';', '\\', ':', '/', '-', '+', '<', '>', '&', '|', '?', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '=', '%', '!'];
        var keywordArrays: String[][] = [];
        codeLines.forEach((line: String) =>
        {
            var reducedCode = "";
            for(var cnt = 0; cnt < line.length; cnt++)
            {
                if(!deletable.includes(line[cnt]))
                {
                    reducedCode += line[cnt];
                }
                else
                {
                    reducedCode += " ";
                }
            }
            keywordArrays.push(reducedCode.split(" ").filter((keyword: String) =>
            {
                if(keyword === '')
                {
                    return false;
                }
                else
                {
                    return true;
                }
            }));
        });

        // 4) For each line: Find all fragments that have at least one keyword in common
        var fragmentsArrays: Fragment[][] = [];
        keywordArrays.forEach((keywordArray: String[]) =>
        {  
            var fragments: Fragment[] = [];
            keywordArray.forEach((keyword: String) =>
            {
                this.database.getFilteredFragments('keyword:'+keyword).forEach((fragment: Fragment) =>
                {
                    console.log(fragment);
                    fragments.push(fragment);
                });
            });
            fragmentsArrays.push(fragments);
        });


        // 5) For each line: Count occurence of each fragment
        var fragmentsMaps: Map<Fragment,number>[] = [];
        fragmentsArrays.forEach((fragmentsArray: Fragment[]) =>
        {
            var fragmentsMap: Map<Fragment,number> = new Map();
            fragmentsArray.forEach((fragment: Fragment) =>
            {
                if(!fragmentsMap.has(fragment))
                {
                    fragmentsMap.set(fragment, 1);
                }
                else
                {
                    fragmentsMap.set(fragment, fragmentsMap.get(fragment)! + 1);
                }
            });
            fragmentsMaps.push(fragmentsMap);
        });

        // 6) For each line: Replace line by code of fragment with highest count
        var fragmentArray: Fragment[]  = [];
        fragmentsMaps.forEach((fragmentsMap: Map<Fragment,number>) =>
        {
            var currentFragment: Fragment;
            var currentCount = 0;
            for (let entrie of fragmentsMap.entries())
            {
                if(entrie[1] > currentCount)
                {
                    currentFragment = entrie[0];
                    currentCount = entrie[1];
                }
            }
            fragmentArray.push(currentFragment!);
        });

        var newCode = "";

        fragmentArray.forEach((fragment: Fragment) =>
        {
            newCode += fragment.code + '\n';
        });

        return newCode;
    }
}
