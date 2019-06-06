import * as vscode from 'vscode';
import { Fragment } from "./fragment";
import { Database } from './database';
import {PythonShell} from 'python-shell';
var fs = require('fs');
const filbert = require('filbert');
var jp = require('jsonpath');
export class PyPa
{
    /**
     * Calculate a parametrized snippet of the code and return it with corresponding placeholders
     * @param code Code to parametrize
     */
    static parametrize(snippet: string): Promise<{}>
    {
        /**
         * Uses the parser filbert and jsonpath to search for undefined parameters inside the snippet
         * @param snippet Selected code snippet
         */
        let findPlaceholders = function(code: string): string[]
        {
            // Parsing the 
            var parsedSnippet: JSON = filbert.parse(code,{locations: true});

            var declarationsSnippet = jp.query(parsedSnippet, '$.body[?(@.type=="VariableDeclaration")].declarations[0].id');
            var parametersSnippet = jp.query(parsedSnippet, '$..arguments[?(@.type=="Identifier")]');

            var placeholders: string[] = [];

            parametersSnippet.forEach((param: any) =>
            {
                var match = false;
                declarationsSnippet.forEach((decl: any) =>
                {
                    if(decl.name === param.name)
                    {
                        match = true;
                    }
                });
                if(!match)
                {
                    placeholders.push(param);
                }
            });
            return placeholders;
        };

        let insertPlaceholders = function(code: string)
        {
            var placeholders = findPlaceholders(code);

            var index = 0;

            placeholders.forEach((placeholder: any) =>
            {
                var placeholderList = findPlaceholders(code);
                var name = placeholder.name;

                placeholderList.forEach((element: any) =>
                {
                    if(element.name === name)
                    {
                        placeholder = element;;
                    }
                });

                var line = placeholder.loc.start.line - 1;
                var startColumn = placeholder.loc.start.column;
                var endColumn = placeholder.loc.end.column;

                var newCode = "";
                var cnt = 0;
                var cnt_save = cnt;
                for(var cnt = 0; cnt < code.length; cnt++)
                {
                    if(line === 0)
                    {
                        break;
                    }
                    if(code[cnt] === '\n')
                    {
                        line--;
                    }
                    newCode += code[cnt];
                }

                cnt_save = cnt;

                for(; cnt < cnt_save + startColumn; cnt++)
                {
                    newCode += code[cnt];
                }

                newCode += "\"${" + index + ":" + name + "}\"";

                for(cnt = cnt_save + endColumn; cnt < code.length; cnt++)
                {
                    newCode += code[cnt];
                }
                code = newCode;
                index++
            });
            return code
        }

        let modifyPythonScript = function(code: string): string
        {
            var editor = vscode.window.activeTextEditor;

            if(editor !== undefined)
            {
                var document = editor.document;

                var placeholders = findPlaceholders(code);

                placeholders.forEach((placeholder: any) =>
                {
                    var placeholderList = findPlaceholders(code);
                    var name = placeholder.name;

                    placeholderList.forEach((element: any) =>
                    {
                        if(element.name === name)
                        {
                            placeholder = element;;
                        }
                    });

                    var line = placeholder.loc.start.line - 1;
                    var startColumn = placeholder.loc.start.column;
                    var endColumn = placeholder.loc.end.column;

                    var newCode = "";
                    var cnt = 0;
                    var cnt_save = cnt;
                    for(var cnt = 0; cnt < code.length; cnt++)
                    {
                        if(line === 0)
                        {
                            break;
                        }
                        if(code[cnt] === '\n')
                        {
                            line--;
                        }
                        newCode += code[cnt];
                    }

                    cnt_save = cnt;

                    for(; cnt < cnt_save + startColumn; cnt++)
                    {
                        newCode += code[cnt];
                    }

                    var properties = JSON.stringify({name: name, line: placeholder.loc.start.line, startColumn: placeholder.loc.start.column, endColumn: placeholder.loc.end.column});

                    newCode += "typeDef(" + properties + ", " + name + ")";

                    for(cnt = cnt_save + endColumn; cnt < code.length; cnt++)
                    {
                        newCode += code[cnt];
                    }
                    code = newCode;
                });

                var typeDef = "def typeDef(properties, x):\n    print('{'  + '\\\"name\\\": ' + '\\\"' + str(properties['name']) + '\\\"' + ', ' + '\\\"type\\\": ' + '\\\"' + str(type(x)) + '\\\"' + '}')\n    return x\n";
                
                var selection = editor.selection;
                var beginning = document.getText(new vscode.Range(new vscode.Position(0, 0), selection.start));
                var end = document.getText(new vscode.Range(selection.end, new vscode.Position(document.lineCount-1, document.lineAt(document.lineCount-1).text.length)));

                code = typeDef + beginning + code + end;
            }
            return code;
        };

        let executePythonScript = function(code: string): Promise<{}>
        {
            return new Promise((resolve, reject) =>
            {
                try
                {
                    PythonShell.runString(code, {}, ((err, results) =>
                    {
                        try
                        {
                            if(err)
                            {
                                throw err;
                            }
                            if(results !== undefined && results !== null)
                            {
                                
                                results = results.filter(value =>
                                {
                                    if(value.match(/^\{"name": .*, "type": .*\}$/))
                                    {
                                        return true;
                                    }
                                    else
                                    {
                                        return false;
                                    }
                                });
                                var placeholders = ""

                                results.forEach((res, index, array) =>
                                {
                                    res = JSON.parse(res)
                                    placeholders += "${" + index + ":" + res.name + ":" + res.type + "}, ";
                                });
                                resolve({body: insertPlaceholders(snippet), placeholders: placeholders});
                            }
                        }
                        catch(err)
                        {
                            console.log("[E] | [PyPa | parametrize]:\n" + err);
                            vscode.window.showWarningMessage("Code in active window not executable (quality of datatypes affected)");
                            reject();
                        }
                    }));
                }
                catch(err)
                {
                    console.log("[E] | [PyPa | parametrize]:\n" + err);
                    vscode.window.showWarningMessage("Failure executing the python script (quality of datatypes affected)");
                    reject();
                }
            });
        };
        return executePythonScript(modifyPythonScript(snippet));


    }
}

/**
 * Try to create a fragment out of existing fragments
 */
export class FOEF
{
    /**
     * Calculate a parametrized snippet of the code and return it
     * @param code Code to parametrize
     */
    static parametrize(code: string): {body: string, keywords: string, placeholders: string}
    {
        // 1) Split code in array of lines
        var codeLines = code.split("\n");

        // 2) For each line: Delete all predefined symbols from the code
        var deletable = ['\r', '(', ')', '{', '}', '[', ']',';', ';', ':', '/', '-', '+', '<', '>', '&', '|', '?', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '=', '%', '!'];
        var keywordArrays: string[][] = [];
        codeLines.forEach((line: string) =>
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
            keywordArrays.push(reducedCode.split(" ").filter((keyword: string) =>
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

        var findKeywords: string[] = [];
        keywordArrays.forEach((keywordArray: string[]) =>
        {
            keywordArray.forEach((keyword: string) =>
            {
                findKeywords.push(keyword);
            });
        });

        // 4) For each line: Find all fragments that have at least one keyword in common
        var fragmentsArrays: Fragment[][] = [];
        keywordArrays.forEach((keywordArray: string[]) =>
        {  
            var fragments: Fragment[] = [];
            keywordArray.forEach((keyword: string) =>
            {
                Database.getFilteredFragments('keyword:'+keyword).forEach((fragment: Fragment) =>
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
                var keywords: string[] = [];
                if(fragment.keywords !== undefined)
                {
                    keywords = fragment.keywords.split(',');
                }

                // Substract one for each keyword the line does not have but the fragment has
                keywords.forEach((keyword: string) =>
                {
                    if(!keywordArrays[cnt].includes(keyword))
                    {
                        count -= 1;
                    }
                });

                // Substract one for each keyword the fragment does not have but the line has: Too restrictive
                /*
                keywordArrays[cnt].forEach((keyword: string) =>
                {
                    if(!keywords.includes(keyword))
                    {
                        count -= 1;
                    }
                });
                */
               
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
                if(cnt !== fragmentArray.length - 1)
                {
                    newCode += codeLines[cnt] + '\n';
                }
                else
                {
                    newCode += codeLines[cnt];
                }
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
                if(cnt !== fragmentArray.length - 1)
                {
                    newCode += whitespace + fragmentArray[cnt].body + '\n';
                }
                else
                {
                    newCode += whitespace + fragmentArray[cnt].body;
                }
            }
        }

        // Adapt placeholder in body so that their number is incrementing also over different lines
        var placeholderCnt = 1;
        var _newCode = "";
        for(var cnt = 0; cnt < newCode.length; cnt++)
        {
            var ch1 = newCode.charAt(cnt);
            var ch2 = newCode.charAt(cnt+1);
            if(ch1 === '$' && ch2 === '{')
            {
                _newCode += "${" + placeholderCnt;
                cnt += 2;
                placeholderCnt++;
            }
            else
            {
                _newCode += ch1;
            }
        }

        // Create new list of placeholders
        var newPlaceholders: string = "";

        for(var cnt = 0; cnt < fragmentArray.length; cnt++)
        {
            if(fragmentArray[cnt] !== undefined)
            {
                if(fragmentArray[cnt].placeholders !== undefined)
                {
                    newPlaceholders += fragmentArray[cnt].placeholders + ',';
                }
            }
        }

        // Adapt placeholders in list of placeholders so that their number is incrementing
        var _newPlaceholders: string = "";
        placeholderCnt = 1;
        for(var cnt = 0; cnt < newPlaceholders.length; cnt++)
        {
            var ch1 = newPlaceholders.charAt(cnt);
            var ch2 = newPlaceholders.charAt(cnt+1);
            if(ch1 === '$' && ch2 === '{')
            {
                _newPlaceholders += "${" + placeholderCnt;
                cnt += 2;
                placeholderCnt++;
            }
            else
            {
                _newPlaceholders += ch1;
            }
        }

        _newPlaceholders = _newPlaceholders.substr(0, _newPlaceholders.length - 1);

        // Create new list of keywords
        var newKeywords: string = "";

        for(cnt = 0; cnt < fragmentArray.length; cnt++)
        {
            if(fragmentArray[cnt] !== undefined)
            {
                if(fragmentArray[cnt].keywords !== undefined)
                {
                    newKeywords += fragmentArray[cnt].keywords + ',';
                }
            }
        }
        newKeywords = newKeywords.substr(0, newKeywords.length - 1);

        return {body: _newCode, keywords: newKeywords, placeholders: _newPlaceholders};
    }
}