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

    findDefinedKeywords(code: String, keywords: String[]): String[]
    {
        var lines = code.split('\n');
        var definedKeywords: String[] = [];
        keywords.forEach((keyword: String) =>
        {
            var length = keyword.length;
            for(var cnt = 0; cnt < lines.length; cnt++)
            {
                if(lines[cnt].indexOf(String(keyword+":")) !== -1)
                {
                    definedKeywords.push(keyword+"#"+cnt+"#"+lines[cnt].indexOf(String(keyword+":")));
                }
                if(lines[cnt].indexOf(String(keyword+"=")) !== -1)
                {
                    definedKeywords.push(keyword+"#"+cnt+"#"+lines[cnt].indexOf(String(keyword+"=")));
                }
                if(lines[cnt].indexOf(String(keyword+" =")) !== -1)
                {
                    definedKeywords.push(keyword+"#"+cnt+"#"+lines[cnt].indexOf(String(keyword+" =")));
                }
            }
        });
        // Format: ["keyword#line#position",...]
        return definedKeywords;
    }

    fragmentOutOfExistingFragments(code: String)
    {
        /**
         * 1) Split code in array of lines
         * 2) For each line: Delete all predefined symbols from the code
         * 3) For each line: Split resulting code into array of keywords
         * 4) For each line: Find all fragments that have at least one keyword in common
         * 5) For each line: Count occurence of each fragment
         * 6) For each line: Reduce count of fragment for each keyword i has that is not present in the selected code
         * 7) For each line: Replace line by code of fragment with highest count
         * 8) If matching fragments were found, replace line with fragments, otherwise leave original line untouched
         */

        // Measurement how good a fragment fits to a line:
        // 1) Calculate how many keywords the line and the fragment have in common
        // 2) Substract how many keywords the fragment has but the line does not have (Discard fragment if it has too many false keywords)
        // 3) If the resulting number is below zero, the fragment dows not get selected
        // 4) If the resulting number is above zero, the higher the number, the better the fit

        // TODO: Improve / test count of insertion fragment candidates
        
        // TODO: Search if keywords are defined in the selected code, if thats the case they are parameters which have to stay

        // TODO: Implement a way to insert certain keywords into inserted fragments as parameters

        // Question: Do we add the keywords of the inserted fragments to the keywords of the new fragment? If a fragment has too much keywords, it maybe will always be inserted.
        //           Maybe also add a panelty for insertion fragment candidates if it has keywords that dont occur in the selected code

        // 1) Split code in array of lines
        var codeLines = code.split("\n");

        // 2) For each line: Delete all predefined symbols from the code
        var deletable = ['\r', '(', ')', '{', '}', '[', ']',';', ';', ':', '/', '-', '+', '<', '>', '&', '|', '?', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '=', '%', '!'];
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

        var findKeywords: String[] = [];
        keywordArrays.forEach((keywordArray: String[]) =>
        {
            keywordArray.forEach((keyword: String) =>
            {
                findKeywords.push(keyword);
            });
        });

        console.log(this.findDefinedKeywords(code, findKeywords));

        // 4) For each line: Find all fragments that have at least one keyword in common
        var fragmentsArrays: Fragment[][] = [];
        keywordArrays.forEach((keywordArray: String[]) =>
        {  
            var fragments: Fragment[] = [];
            keywordArray.forEach((keyword: String) =>
            {
                this.database.getFilteredFragments('keyword:'+keyword).forEach((fragment: Fragment) =>
                {
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

            if(fragmentsArray.length !== 0)
            {
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
            }
            fragmentsMaps.push(fragmentsMap);
        });

        // 6) For each line: Reduce count of fragment for each keyword i has that is not present in the selected code
        for(var cnt = 0; cnt < fragmentsMaps.length; cnt++)
        {
            for (let entrie of fragmentsMaps[cnt].entries())
            {
                var fragment = entrie[0];
                var count = entrie[1];
                var keywords: String[] = fragment.keywords.split(',');

                // Substract one for each keyword the line does not have but the fragment has
                keywords.forEach((keyword: String) =>
                {
                    if(!keywordArrays[cnt].includes(keyword))
                    {
                        count -= 1;
                    }
                });

                // Substract one for each keyword the fragment does not have but the line has: Too restrictive
                /*
                keywordArrays[cnt].forEach((keyword: String) =>
                {
                    if(!keywords.includes(keyword))
                    {
                        count -= 1;
                    }
                });
                */
                console.log(count);
                fragmentsMaps[cnt].set(fragment, count);
            }
        }

        // 7) For each line: Replace line by code of fragment with highest count
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

        // 8) If matching fragments were found, replace line with fragments, otherwise leave original line untouched
        var newCode = "";
        for(var cnt = 0; cnt < fragmentArray.length; cnt++)
        {
            if(fragmentArray[cnt] === undefined)
            {
                newCode += codeLines[cnt] + '\n';
            }
            else
            {
                // include whitespace before inserted fragments
                var previousCode = codeLines[cnt];
                var whitespace = "";
                for(var cnt1 = 0; cnt1 < previousCode.length; cnt1++)
                {
                    if(previousCode[cnt1] === " ")
                    {
                        whitespace += " ";
                    }
                    else if(previousCode[cnt1] === "\t")
                    {
                        whitespace += "\t";
                    }
                    else
                    {
                        break;
                    }
                }
                newCode += whitespace + fragmentArray[cnt].code + '\n';
            }
        }
        return newCode;
    }
}
