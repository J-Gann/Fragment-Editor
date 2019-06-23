import * as vscode from 'vscode';
import {Fragment} from "./fragment";
import {Database} from './database';
import {PythonShell} from 'python-shell';

var fs = require('fs');
const filbert = require('filbert');
var jp = require('jsonpath');

class Variable {
    _identification: string;
    _name: string;
    _start: number;
    _length: number;
    _datatype: string;
    _placeholder: Placeholder;
    static variables: Variable[] = [];

    constructor(name: string, id: string, start: number, length: number, datatype: string) {
        this._identification = id + name + "[" + start + "|" + length + "]";
        this._name = name;
        this._start = start;
        this._length = length;
        this._datatype = datatype;
        if (!Variable.variableExists(this._identification)) {
            Variable.variables.push(this);
        }
        if (!Placeholder.placeholderExists(id + name)) {
            Placeholder.addPlaceholder(new Placeholder(id + name, name));
        }
        Placeholder.getPlaceholder(id + name)!.addVariable(this);
        this._placeholder = Placeholder.getPlaceholder(id + name)!;
    }

    static addVariable(variable: Variable | undefined) {
        if (variable !== undefined && !Variable.variables.includes(variable)) {
            Variable.variables.push(variable);
        }
    }

    static variableExists(identification: string): boolean {
        var result = false;
        Variable.variables.forEach(variable => {
            if (variable._identification === identification) {
                result = true;
            }
        });
        return result;
    }
}

class Placeholder {
    _identification: string;
    _name: string;
    _variables: Variable[];

    static placeholders: Placeholder[] = [];

    constructor(identification: string, name: string) {
        this._identification = identification;
        this._name = name;
        this._variables = [];
        if (!Placeholder.placeholderExists(identification)) {
            Placeholder.placeholders.push(this);
        }
    }

    static addPlaceholder(placeholder: Placeholder | undefined) {
        if (placeholder !== undefined && !Placeholder.placeholders.includes(placeholder)) {
            Placeholder.placeholders.push(placeholder);
        }
    }

    static getPlaceholder(identification: string): Placeholder | undefined {
        var result = undefined;
        Placeholder.placeholders.forEach(placeholder => {
            if (placeholder._identification === identification) {
                result = placeholder;
            }
        });
        return result;
    }

    static placeholderExists(identification: string): boolean {
        var result = false;
        Placeholder.placeholders.forEach(placeholder => {
            if (placeholder._identification === identification) {
                result = true;
            }
        });
        return result;
    }

    addVariable(variable: Variable | undefined) {
        if (variable !== undefined && !this._variables.includes(variable)) {
            this._variables.push(variable);
        }
    }

    getVariable(identification: string | undefined): Variable | undefined {
        var result = undefined;
        if (identification !== undefined) {
            this._variables.forEach(variable => {
                if (variable._identification === identification) {
                    result = variable;
                }
            });
        }
        return result;
    }

    getDatatypes(): string {
        var result: string[] = [];
        this._variables.forEach(variable => {
            result.push(variable._datatype);
        });
        var x = (result: string[]) => result.filter((v, i) => result.indexOf(v) === i);
        return x(result).toString().replace(/,/g, ':');
    }
}

/**
 * Python Parametrizer
 */
export class PyPa {
    /**
     * Return a parametrized code snippet along with corresponding placeholders including datatypes
     * @param code Code snippet to parametrize
     * @description This function tries to run a modified version of the python program which is currently selected in the editor by a python interpreter called 'python-shell'.
     * The program gets modified in a way, that for every variable which is used in the code snippet but is undefined in the code snippet gets replaced by a special function.
     * This extraction of placeholders is implemented by parsing the code snippet with 'filbert' and searching for declarations and parameters using 'jsonpath'.
     * The inserted function has the variable, which it replaces, as parameter and also returns it (=> The functionality of the program does not change).
     * The function also prints out the 'typeof(variable)' in order to retrieve the possible datatypes of the variable.
     * The outputs then are collected and processed in order to return them in the correct format.
     * @
     */
    static parametrize(snippet: string): Promise<{}> {
        /**
         * Uses the parser filbert and jsonpath to search for undefined parameters inside the snippet
         * @param snippet Selected code snippet
         */
        let findPlaceholders = function (code: string): string[] {
            // Parsing the code snippet using 'filbert' (locations of the objects should be included)
            var parsedSnippet: JSON = filbert.parse(code, {locations: true});

            // Search for all declarations in the parsed code snippet using 'jsonpath'
            var declarationsSnippet = jp.query(parsedSnippet, '$.body[?(@.type=="VariableDeclaration")].declarations[0].id');
            // Search for all parameters in the parsed code snippet using 'jsonpath'
            var parametersSnippet = jp.query(parsedSnippet, '$..arguments[?(@.type=="Identifier")]');
            // List of all found placeholders
            var placeholders: string[] = [];
            // Search for all parameters of the code snippet which were not declared in the code snippet
            parametersSnippet.forEach((param: any) => {
                var match = false;
                declarationsSnippet.forEach((decl: any) => {
                    if (decl.name === param.name) {
                        match = true;
                    }
                });
                if (!match) {
                    placeholders.push(param);
                }
            });
            return placeholders;
        };

        /**
         * Replaces the variable of each placeholder by a standardized format: ${number:variable}
         * @param code Code snippet where variables of placeholders should be replaced
         */
        let insertPlaceholders = function (code: string) {
            // List of all placeholders found in the code snippet
            var placeholders = findPlaceholders(code);

            // Sort the placeholders (top to down, left to right) in order to make sure, that the placeholders get inserted in the right order with the right index
            placeholders = placeholders.sort((a: any, b: any) => {
                if (a.loc.start.line > b.loc.start.line || a.loc.start.line === b.loc.start.line && a.loc.start.column > b.loc.start.column) {
                    return 1;
                } else {
                    return -1;
                }
            });

            // Number of variables of paceholders that have already been replaced
            var index = 0;
            // Execute the replacement for each placeholder seperately
            placeholders.forEach((placeholder: any) => {
                // Again, calculate all placeholders of the code snippet (by iteratively changing the code,
                // the location of the remaining variables can change -> therefore placeholders have to be calculated again)
                var placeholderList = findPlaceholders(code);

                // Sort the placeholderList in order to make sure, that the placeholders get inserted in the right order with the right index
                placeholderList = placeholderList.sort((a: any, b: any) => {

                    if (a.loc.start.line > b.loc.start.line || a.loc.start.line === b.loc.start.line && a.loc.start.column > b.loc.start.column) {
                        return 1;
                    } else {
                        return -1;
                    }
                });

                // Save the name of the current placeholder
                var name = placeholder.name;

                // A inserted placeholder no longer gets recognised as placeholder, so the next placeholder is alway on index 0
                placeholder = placeholderList[0];

                // Extract position metrics from the placeholder
                var line = placeholder.loc.start.line - 1;
                var startColumn = placeholder.loc.start.column;
                var endColumn = placeholder.loc.end.column;

                // Define some helping variables
                var newCode = "";
                var cnt = 0;
                var cnt_save = cnt;
                // Count the number of characters until the line of the placeholder (in order to access the characters of the placeholder by index of the code snippet)
                // While counting, append all characters to 'newCode' which in the end should contain the additional standardized placeholder
                for (var cnt = 0; cnt < code.length; cnt++) {
                    if (line === 0) {
                        break;
                    }
                    if (code[cnt] === '\n') {
                        line--;
                    }
                    newCode += code[cnt];
                }

                cnt_save = cnt;
                // Appent the characters of the line until the first character of the placeholder to 'newCode'
                for (; cnt < cnt_save + startColumn; cnt++) {
                    newCode += code[cnt];
                }

                // Insert the standardized placeholder ("##-o-## is going to be deleted in the end but is necessary for the parser to work
                // -> The inserted placeholder gets recognized as string insted of a faulty syntax)
                newCode += "\"##-o-##${" + index + ":" + name + "}##-o-##\"";

                // Append the characters after the placeholder until the end to 'newCode'
                for (cnt = cnt_save + endColumn; cnt < code.length; cnt++) {
                    newCode += code[cnt];
                }
                code = newCode;
                index++;
            });
            // Delete the cryptic symbols
            code = code.replace(/"##-o-##/g, "");
            code = code.replace(/##-o-##"/g, "");
            return code;
        };

        /**
         * This function injects code into the code snippet and replaces placeholders by a function in order to be able to retrieve the datatypes of the placeholders
         * @param code Code snippet which should be modified
         */
        let modifyPythonScript = function (code: string): string {
            // Save the current editor
            var editor = vscode.window.activeTextEditor;

            if (editor !== undefined) {
                // Save the currently active document (sould be the same as the document where the selection of the code snippet took place)
                var document = editor.document;
                // Save list of placeholders found in the code snippet
                var placeholders = findPlaceholders(code);

                // Sort the placeholders in order to make sure, that the inserted function gets te correct index for the placeholder (corresponding to the order ininsertPlaceholders)
                placeholders = placeholders.sort((a: any, b: any) => {
                    if (a.loc.start.line > b.loc.start.line || a.loc.start.line === b.loc.start.line && a.loc.start.column > b.loc.start.column) {
                        return 1;
                    } else {
                        return -1;
                    }
                });
                var index = 0;
                // Execute the replacement for each placeholder seperately
                placeholders.forEach((placeholder: any) => {
                    // Again, calculate all placeholders of the code snippet (by iteratively changing the code,
                    // the location of the remaining variables can change -> therefore placeholders have to be calculated again)
                    var placeholderList = findPlaceholders(code);

                    // Sort the placeholderList in order to make sure, that the inserted function gets te correct index for the placeholder (corresponding to the order ininsertPlaceholders)
                    placeholderList = placeholderList.sort((a: any, b: any) => {

                        if (a.loc.start.line > b.loc.start.line || a.loc.start.line === b.loc.start.line && a.loc.start.column > b.loc.start.column) {
                            return 1;
                        } else {
                            return -1;
                        }
                    });

                    // The index states increments with every inserted function, so the current placeholder to be replaced is on index
                    placeholder = placeholderList[index];

                    // Save the name of the current placeholder
                    var name = placeholder.name;

                    // Extract position metrics from the placeholder
                    var line = placeholder.loc.start.line - 1;
                    var startColumn = placeholder.loc.start.column;
                    var endColumn = placeholder.loc.end.column;

                    // Define some helping variables
                    var newCode = "";
                    var cnt = 0;
                    var cnt_save = cnt;
                    // Count the number of characters until the line of the placeholder (in order to access the characters of the placeholder by index of the code snippet)
                    // While counting, append all characters to 'newCode' which in the end should contain the additional standardized placeholder
                    for (var cnt = 0; cnt < code.length; cnt++) {
                        if (line === 0) {
                            break;
                        }
                        if (code[cnt] === '\n') {
                            line--;
                        }
                        newCode += code[cnt];
                    }

                    cnt_save = cnt;
                    // Appent the characters of the line until the first character of the placeholder to 'newCode'
                    for (; cnt < cnt_save + startColumn; cnt++) {
                        newCode += code[cnt];
                    }

                    // properties of the current placeholder as a object
                    var properties = JSON.stringify({name: name, index: cnt, length: endColumn - startColumn});

                    // Insert the special function with appropriate parameters
                    newCode += "typeDef(" + properties + ", " + name + ")";

                    // Append the characters after the placeholder until the end to 'newCode'
                    for (cnt = cnt_save + endColumn; cnt < code.length; cnt++) {
                        newCode += code[cnt];
                    }
                    code = newCode;
                    index++;

                });

                // Define the special function
                var typeDef = "def typeDef(properties, x):\n    print('{'  + '\\\"name\\\": ' + '\\\"' + str(properties['name']) + '\\\"' + ', ' + '\\\"index\\\": ' + '\\\"' + str(properties['index']) + '\\\"' + ', ' + '\\\"length\\\": ' + '\\\"' + str(properties['length']) + '\\\"' + ', ' + '\\\"type\\\": ' + '\\\"' + str(type(x)) + '\\\"' + ', ' + '\\\"id\\\": ' + '\\\"' + str(id(x)) + '\\\"' + '}')\n    return x\n";

                // Split the document in code before and after the code snippet
                var selection = editor.selection;
                var beginning = document.getText(new vscode.Range(new vscode.Position(0, 0), selection.start));
                var end = document.getText(new vscode.Range(selection.end, new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length)));

                // Stick all pieces together
                code = typeDef + beginning + code + end;
            }
            return code;
        };

        /**
         * Tries to execute python code and return the resulting parametrization
         * @param code Code to be executed
         */
        let executePythonScript = function (code: string): Promise<{}> {
            // Return a promise of the solution
            return new Promise((resolve, reject) => {
                try {
                    // Execute the python code by using 'python-shell'. All prints of the python code during executionare saved in the variable 'results'
                    PythonShell.runString(code, {}, ((err, results) => {
                        try {
                            if (err) {
                                throw err;
                            }
                            if (results !== undefined && results !== null) {
                                // Filter all the possible prints by the format of our placeholders
                                results = results.filter(value => {
                                    if (value.match(/^\{"name": .*, "index": .*, "length": .*, "type": .*, "id": .*\}$/)) {
                                        return true;
                                    } else {
                                        return false;
                                    }
                                });
                                Placeholder.placeholders = [];
                                Variable.variables = [];
                                results.forEach(variable => {
                                    variable = JSON.parse(variable);
                                    new Variable(variable.name, variable.id, variable.index, variable.length, variable.type);
                                });
                                var placeholders = "";
                                // Bring the placeholders in a standardized format
                                Variable.variables.forEach((res, index, array) => {
                                    placeholders += "${" + index + ":" + res._name + ":" + res._placeholder.getDatatypes() + "}, ";
                                });
                                // Deliver the promised parametrization
                                resolve({body: insertPlaceholders(snippet), placeholders: placeholders});
                            }
                        } catch (err) {
                            console.log("[E] | [PyPa | parametrize]:\n" + err);
                            vscode.window.showWarningMessage("Code in active window not executable (quality of datatypes affected)");
                            reject();
                        }
                    }));
                } catch (err) {
                    console.log("[E] | [PyPa | parametrize]:\n" + err);
                    vscode.window.showWarningMessage("Failure executing the python script (quality of datatypes affected)");
                    reject();
                }
            });
        };
        // Call all the necessarry functions
        return executePythonScript(modifyPythonScript(snippet));
    }
}

/**
 * Try to create a fragment out of existing fragments
 */
export class FOEF {
    /**
     * Calculate a parametrized snippet of the code and return it
     * @param code Code to parametrize
     */
    static parametrize(code: string): { body: string, keywords: string, placeholders: string } {
        // 1) Split code in array of lines
        var codeLines = code.split("\n");

        // 2) For each line: Delete all predefined symbols from the code
        var deletable = ['\r', '(', ')', '{', '}', '[', ']', ';', ';', ':', '/', '-', '+', '<', '>', '&', '|', '?', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '=', '%', '!'];
        var keywordArrays: string[][] = [];
        codeLines.forEach((line: string) => {
            var reducedCode = "";
            for (var cnt = 0; cnt < line.length; cnt++) {
                if (!deletable.includes(line[cnt])) {
                    reducedCode += line[cnt];
                } else {
                    reducedCode += " ";
                }
            }
            keywordArrays.push(reducedCode.split(" ").filter((keyword: string) => {
                if (keyword === '') {
                    return false;
                } else {
                    return true;
                }
            }));
        });

        var findKeywords: string[] = [];
        keywordArrays.forEach((keywordArray: string[]) => {
            keywordArray.forEach((keyword: string) => {
                findKeywords.push(keyword);
            });
        });

        // 4) For each line: Find all fragments that have at least one keyword in common
        var fragmentsArrays: Fragment[][] = [];
        keywordArrays.forEach((keywordArray: string[]) => {
            var fragments: Fragment[] = [];
            keywordArray.forEach((keyword: string) => {
                Database.getInstance().getFilteredFragments('keyword:' + keyword).forEach((fragment: Fragment) => {
                    fragments.push(fragment);
                });
            });
            fragmentsArrays.push(fragments);
        });

        // 5) For each line: Count occurence of each fragment
        var fragmentsMaps: Map<Fragment, number>[] = [];
        fragmentsArrays.forEach((fragmentsArray: Fragment[]) => {
            var fragmentsMap: Map<Fragment, number> = new Map();

            if (fragmentsArray.length !== 0) {
                fragmentsArray.forEach((fragment: Fragment) => {
                    if (!fragmentsMap.has(fragment)) {
                        fragmentsMap.set(fragment, 1);
                    } else {
                        fragmentsMap.set(fragment, fragmentsMap.get(fragment)! + 1);
                    }
                });
            }
            fragmentsMaps.push(fragmentsMap);
        });

        // 6) For each line: Reduce count of fragment for each keyword i has that is not present in the selected code
        for (var cnt = 0; cnt < fragmentsMaps.length; cnt++) {
            for (let entrie of fragmentsMaps[cnt].entries()) {
                var fragment = entrie[0];
                var count = entrie[1];
                var keywords: string[] = [];
                if (fragment.keywords !== undefined) {
                    keywords = fragment.keywords.split(',');
                }

                // Substract one for each keyword the line does not have but the fragment has
                keywords.forEach((keyword: string) => {
                    if (!keywordArrays[cnt].includes(keyword)) {
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
        var fragmentArray: Fragment[] = [];
        fragmentsMaps.forEach((fragmentsMap: Map<Fragment, number>) => {
            var currentFragment: Fragment;
            var currentCount = 0;
            for (let entrie of fragmentsMap.entries()) {
                if (entrie[1] > currentCount) {
                    currentFragment = entrie[0];
                    currentCount = entrie[1];
                }
            }
            fragmentArray.push(currentFragment!);
        });

        // 8) If matching fragments were found, replace line with fragments, otherwise leave original line untouched
        var newCode = "";
        for (var cnt = 0; cnt < fragmentArray.length; cnt++) {
            if (fragmentArray[cnt] === undefined) {
                if (cnt !== fragmentArray.length - 1) {
                    newCode += codeLines[cnt] + '\n';
                } else {
                    newCode += codeLines[cnt];
                }
            } else {
                // include whitespace before inserted fragments
                var previousCode = codeLines[cnt];
                var whitespace = "";
                for (var cnt1 = 0; cnt1 < previousCode.length; cnt1++) {
                    if (previousCode[cnt1] === " ") {
                        whitespace += " ";
                    } else if (previousCode[cnt1] === "\t") {
                        whitespace += "\t";
                    } else {
                        break;
                    }
                }
                if (cnt !== fragmentArray.length - 1) {
                    newCode += whitespace + fragmentArray[cnt].body + '\n';
                } else {
                    newCode += whitespace + fragmentArray[cnt].body;
                }
            }
        }

        // Adapt placeholder in body so that their number is incrementing also over different lines
        var placeholderCnt = 1;
        var _newCode = "";
        for (var cnt = 0; cnt < newCode.length; cnt++) {
            var ch1 = newCode.charAt(cnt);
            var ch2 = newCode.charAt(cnt + 1);
            if (ch1 === '$' && ch2 === '{') {
                _newCode += "${" + placeholderCnt;
                cnt += 2;
                placeholderCnt++;
            } else {
                _newCode += ch1;
            }
        }

        // Create new list of placeholders
        var newPlaceholders: string = "";

        for (var cnt = 0; cnt < fragmentArray.length; cnt++) {
            if (fragmentArray[cnt] !== undefined) {
                if (fragmentArray[cnt].placeholders !== undefined) {
                    newPlaceholders += fragmentArray[cnt].placeholders + ',';
                }
            }
        }

        // Adapt placeholders in list of placeholders so that their number is incrementing
        var _newPlaceholders: string = "";
        placeholderCnt = 1;
        for (var cnt = 0; cnt < newPlaceholders.length; cnt++) {
            var ch1 = newPlaceholders.charAt(cnt);
            var ch2 = newPlaceholders.charAt(cnt + 1);
            if (ch1 === '$' && ch2 === '{') {
                _newPlaceholders += "${" + placeholderCnt;
                cnt += 2;
                placeholderCnt++;
            } else {
                _newPlaceholders += ch1;
            }
        }

        _newPlaceholders = _newPlaceholders.substr(0, _newPlaceholders.length - 1);

        // Create new list of keywords
        var newKeywords: string = "";

        for (cnt = 0; cnt < fragmentArray.length; cnt++) {
            if (fragmentArray[cnt] !== undefined) {
                if (fragmentArray[cnt].keywords !== undefined) {
                    newKeywords += fragmentArray[cnt].keywords + ',';
                }
            }
        }
        newKeywords = newKeywords.substr(0, newKeywords.length - 1);

        return {body: _newCode, keywords: newKeywords, placeholders: _newPlaceholders};
    }
}