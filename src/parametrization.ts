import * as vscode from 'vscode';
import {Fragment} from "./fragment";
import {Database} from './database';
import {PythonShell} from 'python-shell';

const filbert = require('filbert');
const jp = require('jsonpath');
const clonedeep = require('lodash.clonedeep');

class Placeholder {
    start_index: number;
    start_line: number;
    end_index: number;
    end_line: number;
    name: string;
    type: string | undefined;
    index: number | undefined;
    id: number;

    constructor(id: number, name: string, start_index: number, end_index: number, start_line: number, end_line: number, type?: string, index?: number) {
        this.start_index = start_index;
        this.start_line = start_line;
        this.end_index = end_index;
        this.end_line = end_line;
        this.name = name;
        this.type = type;
        this.index = index;
        this.id = id;
    }
}

export class PyPa {
    /**
     * Calculates the index of a character of which only line and column are known
     * @param document The document, for which the index of a line-column-pair should be calculated
     * @param line The line of the char which index should be calculated
     * @param column The column of the char which index should be calculated
     */
    static calculateIndex(document: string, line: number, column: number): number {
        var document_array = document.split('\n');
        var index = 0;
        for (var cnt = 0; cnt < line - 1; cnt++) {
            index += document_array[cnt].length + 1;
        }
        index += column;
        return index;
    }

    /**
     * Replaces a section of a document with a new one
     * @param original The original document
     * @param start The first index of the to be replaced section
     * @param end The last index of the to be replaced section
     * @param replacement The new section
     */
    static replace(original: string, start: number, end: number, replacement: string): string {
        var firstPart = original.substring(0, start);
        var lastPart = original.substring(end, original.length);
        return firstPart + replacement + lastPart;
    }

    /**
     * Finds all variables, which are undefined in the snippet [best effort] and returns a list of so called Placeholders
     * @param snippet The snippet, which contains the Placeholders
     * @param document The code, containing the snippet
     * @param start_snippet_index The first index of the snippet in reference to the document
     * @param end_snippet_index The last index of the snippet in reference to the document
     */
    static findPlaceholders(snippet: string): Placeholder[] {
        // Use 'filbert' and 'jsonpath' to extract declarations and parameters
        var parsed: JSON = filbert.parse(snippet, {locations: true});
        var declarations = jp.query(parsed, '$.body[?(@.type=="VariableDeclaration")].declarations[0].id');
        var parameters = jp.query(parsed, '$..arguments[?(@.type=="Identifier")]');
        var placeholders: Placeholder[] = [];

        // Mark evers placeholders as defined, if a declaration of a variable with the same name appears anywhere in the snippet [best effort]
        parameters.forEach((parameter: any) => {
            var match = false;
            declarations.forEach((decl: any) => {
                if (decl.name === parameter.name) {
                    match = true;
                }
            });
            if (!match) {
                var name = parameter.name;
                var start_index = PyPa.calculateIndex(snippet, parameter.loc.start.line, parameter.loc.start.column);
                var end_index = PyPa.calculateIndex(snippet, parameter.loc.end.line, parameter.loc.end.column);
                var start_line = parameter.loc.start.line;
                var end_line = parameter.loc.end.line;
                placeholders.push(new Placeholder(start_index, name, start_index, end_index, start_line, end_line));
            }
        });

        return placeholders;
    }

    /**
     * Inserts a parametrized format instead of the variable name for every Placeholder
     * @param snippet The snippet that should be parametrized
     * @param placeholders The placeholders the snippet contains
     */
    static parametrizeSnippet(snippet: string, placeholders: Placeholder[]): string {
        var placeholdersTmp = clonedeep(placeholders);
        var index = 1;
        placeholdersTmp.forEach((placeholder: any) => {
            var insert = "{" + index + ":" + placeholder.name + "}";
            snippet = PyPa.replace(snippet, placeholder.start_index, placeholder.end_index, insert);
            placeholdersTmp.forEach((other_parameter: any) => {
                if (placeholder.start_index !== other_parameter.start_index && placeholder.start_line <= other_parameter.start_line) {
                    other_parameter.start_index += insert.length - placeholder.name.length;
                    other_parameter.end_index += insert.length - placeholder.name.length;
                }
            });
            placeholders.forEach((_placeholder: Placeholder) => {
                if (_placeholder.id === placeholder.id) {
                    _placeholder.index = index;
                }
            });
            index += 1;
        });
        return snippet;
    }

    /**
     * Creates a modified version of a python script in order to print datatypes of placeholders
     * @param placeholders List of placeholders of the snippet
     * @param document Document which includes the snippet
     * @param snippet Snippet containing the placeholders
     * @param snippet_start_index First index of the snippet in relation to the document
     * @param snippet_end_index Last index of the snippet in relation to the document
     */
    static createScript(placeholders: Placeholder[], document: string, snippet: string, snippet_start_index: number, snippet_end_index: number): string {
        var placeholdersTmp = clonedeep(placeholders);
        placeholdersTmp.forEach((placeholder: any) => {
            var insert = "error";
            placeholders.forEach((_placeholder: Placeholder) => {
                if (_placeholder.id === placeholder.id) {
                    insert = "detType(" + "'" + _placeholder.id + "'" + ", " + placeholder.name + ")";
                }
            });
            snippet = PyPa.replace(snippet, placeholder.start_index, placeholder.end_index, insert);
            placeholdersTmp.forEach((other_parameter: any) => {
                if (placeholder.start_index !== other_parameter.start_index && placeholder.start_line <= other_parameter.start_line) {
                    other_parameter.start_index += insert.length - placeholder.name.length;
                    other_parameter.end_index += insert.length - placeholder.name.length;
                }
            });
        });
        var detType = "def detType(id, x):\n" +
            "    print('{\\\"id\\\": ' + str(id) + ', \\\"type\\\": ' + '\\\"' + str(type(x)) + '\\\"' + '}')\n" +
            "    return x\n";

        return detType + PyPa.replace(document, snippet_start_index, snippet_end_index, snippet);
    }

    /**
     * Assigns datatypes to Placeholders according to the results from the modified python script
     * @param results Print statements of the modified python script
     * @param placeholders Placeholders, for which datatypes should be assigned according to the results
     */
    static assignDatatypes(results: string[], placeholders: Placeholder[]) {
        var result = results.filter(value => {
            if (value.match(/^\{"id": .*, "type": .*\}$/)) {
                return true;
            } else {
                return false;
            }
        });
        placeholders.forEach((placeholder: Placeholder) => {
            result.forEach((elem: string) => {
                var obj = JSON.parse(elem);
                if (obj.id === placeholder.id) {
                    placeholder.type = obj.type;
                }
            });
        });
    }

    /**
     * Executes a python script
     * @param script Python script that should be executed
     * @param placeholders
     * @param snippet
     */
    static executeScript(script: string, placeholders: Placeholder[], snippet: string): Promise<{ body: string, placeholders: string }> {
        return new Promise((resolve, reject) => {
            try {
                PythonShell.runString(script, {}, ((err: any, results: any) => {
                    try {
                        if (err) {
                            throw err;
                        }
                        if (results !== undefined && results !== null) {

                            PyPa.assignDatatypes(results, placeholders);
                            var result = PyPa.formatResult(placeholders, snippet);
                            resolve(result);
                        } else {
                            reject();
                        }
                    } catch (err) {
                        console.log("[E] | [PyPa | executeScript]: Failed: " + err);
                        reject(err);
                    }

                }));
            } catch (err) {
                console.log("[E] | [PyPa | executeScript]: Failed: " + err);
                reject(err);
            }

        });
    }

    /**
     * Formats the results in order to return them correctly
     * @param placeholders Placeholders, of the snippet
     * @param snippet Parametrized snippet
     */
    static formatResult(placeholders: Placeholder[], snippet: string) {
        var placeholderString = "";
        placeholders.forEach((placeholder: Placeholder) => {
            placeholderString += "{" + placeholder.index + ":" + placeholder.name + ":" + placeholder.type + "}" + ", ";
        });
        return {body: snippet, placeholders: placeholderString};
    }

    /**
     * Parametrized the selection of the document and determines the datatypes of the placeholders
     * @param textDocument
     * @param selection
     */
    static parametrize(textDocument: vscode.TextDocument, selection: vscode.Selection): Promise<{ body: string, placeholders: string }> | undefined {
        var document = textDocument.getText();
        var snippet = textDocument.getText(new vscode.Range(selection.start, selection.end));
        var placeholders = PyPa.findPlaceholders(snippet);
        if (placeholders.length !== 0)
        {
            var parametrizedSnippet = PyPa.parametrizeSnippet(snippet, placeholders);
            var snippet_start_index = PyPa.calculateIndex(document, selection.start.line + 1, selection.start.character);
            var snippet_end_index = PyPa.calculateIndex(document, selection.end.line + 1, selection.end.character);
            var script = PyPa.createScript(placeholders, document, snippet, snippet_start_index, snippet_end_index);
            console.log(script)
            return this.executeScript(script, placeholders, parametrizedSnippet);
        }
    }

    static parametrize_test(snippet: string, document: string, snippet_start_index: number, snippet_end_index: number) {
        var placeholders = PyPa.findPlaceholders(snippet);
        var parametrizedSnippet = PyPa.parametrizeSnippet(snippet, placeholders);
        var placeholders = PyPa.findPlaceholders(snippet);
        var parametrizedSnippet = PyPa.parametrizeSnippet(snippet, placeholders);
        var script = PyPa.createScript(placeholders, document, snippet, snippet_start_index, snippet_end_index);
        return this.executeScript(script, placeholders, parametrizedSnippet);
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