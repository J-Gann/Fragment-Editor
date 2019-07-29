import * as vscode from 'vscode';
import { FragmentProvider } from './fragmentProvider';

const path = require('path');
const fs = require('fs');
const jp = require('jsonpath');
const exec = require('child_process').exec;
const execFile = require('child_process').execFile;
const clonedeep = require('lodash.clonedeep');

class Placeholder {
    id: string;
    index: number | undefined;
    name: string;
    col_offset: number;
    lineno: number;
    datatype: number | undefined;

    constructor(name: string, col_offset: number, lineno: number) {
        this.name = name;
        this.col_offset = col_offset;
        this.lineno = lineno;
        this.id = lineno + "|" + col_offset;
    }
}
/**
 * PyPa (Python Parametrization) computes placeholders and the corresponding datatypes of a code snippet for any executable python script.
 * 
 * In order to retrieve placeholders, the AST of the python code gets created and ported in JSON format (using astexport).
 * The AST includes information about which variables are defined and which are used as parameter.
 * Every variable which is used as parameter but is not defined within a code snippet is considered a placeholder.
 * In order to retrieve the datatype of the placeholders, the original python code gets dynamically modified and executed.
 * The following code is inserted at the beginning:
 * def detType(id, x):
 *      print('{\"id\": \"' + str(id) + '\", \"type\": ' + '\"' + str(type(x)) + '\"' + '}')
 *      return x
 * Every placeholder gets replaced by a call of this function with the name of the placeholder (string) as first parameter and the value of the placeholder (any datatype) as second parameter.
 * This function prints the corresponding datatype for each placeholder during runtime.
 * The output is then collected and processed.
 */
export class PyPa {

    /**
     * Test if the call statement defined in the config is at least recognised.
     */
    static testPython(): Promise<string | any> {
        var promise = new Promise((resolve, reject) => {
            exec(vscode.workspace.getConfiguration("fragmentEditor.parametrization").get("pythonCallStatement") + ' -V', (error: any, stdout: string, stderr: string) => {
                if (error) {
                    console.log("[E] | [PyPa | testPython]: Error while testing call statement for python: " + error);
                    reject(error);
                } else if (stderr) {
                    console.log("[E] | [PyPa | testPython]: Error while testing call statement for python: " + stderr);
                    reject(stderr);
                } else {
                    resolve(stdout);
                }
            });
        });
        return promise;
    };

    /**
     * Computes an abstract syntax tree
     * @param document Text for which a python ast should be computed
     */
    static getAST(document: string): Promise<string | any> {
        var promise = new Promise((resolve, reject) => {
            var pythonPath = path.join(FragmentProvider.context.extensionPath, 'external', 'astexport');
            var filePath = path.join(FragmentProvider.context.extensionPath, 'tmp', 'getAST.tmp');
            fs.writeFile(filePath, document, (err: any) => {
                if (!err) {
                    var process = exec(vscode.workspace.getConfiguration("fragmentEditor.parametrization").get("pythonCallStatement") + ' __main__.py -p -i ' + filePath, { cwd: pythonPath }, (error: any, stdout: string, stderr: string) => {
                        if (error) {
                            console.log("[E] | [PyPa | getAST]: Error while calculating the AST: " + error);
                            reject(error);
                        } else if (stderr) {
                            console.log("[E] | [PyPa | getAST]: Error while calculating the AST: " + stderr);
                            reject(stderr);
                        } else {
                            resolve(stdout);
                        }
                    });
                } else {
                    console.log("[E] | [PyPa | getAST]: Error while writing the temporary file: " + err);
                    reject(err);
                }
            })
        });
        return promise;
    };

    /**
     * Calculates the placeholders of a code snippet
     * @param documentCode Text of the document which contains the code snippet
     * @param selection The selected code snippet
     * @param preDefinedNames List of predefined python variables
     */
    static getPlaceholders(documentCode: string, selection: vscode.Selection, preDefinedNames: string[]): Promise<Placeholder | any> {
        var promise = new Promise((resolve, reject) => {
            PyPa.getAST(documentCode)
                .then((value: string) => {
                    var jsonAST = JSON.parse(value);
                    var declarations: any[] = [];
                    var assignmentDeclarations = jp.query(jsonAST, '$..[?(@.ast_type=="Assign")].targets.*');
                    var forLoopTargetDeclarations = jp.query(jsonAST, '$..[?(@.ast_type=="For")].target');
                    var functionDeclarations = jp.query(jsonAST, '$..[?(@.ast_type=="FunctionDef")]');
                    var functionDefParamDeclarations = jp.query(jsonAST, '$..[?(@.ast_type=="FunctionDef")].args.args.*');
                    functionDefParamDeclarations.forEach((definition: any) => {
                        definition.id = definition.arg;
                    });
                    functionDeclarations.forEach((definition: any) => {
                        definition.id = definition.name;
                    });
                    declarations = declarations.concat(assignmentDeclarations, forLoopTargetDeclarations, functionDeclarations, functionDefParamDeclarations);

                    var parameters: any[] = [];
                    var expressionParameters = jp.query(jsonAST, '$..[?(@.ast_type=="Expr")]..[?(@.ast_type=="Name")]');
                    var compareParameters = jp.query(jsonAST, '$..[?(@.ast_type=="Compare")]..[?(@.ast_type=="Name")]');
                    var returnParameters = jp.query(jsonAST, '$..[?(@.ast_type=="Return")]..[?(@.ast_type=="Name")]');
                    var callParameters = jp.query(jsonAST, '$..[?(@.ast_type=="Call")]..[?(@.ast_type=="Name")]');
                    parameters = parameters.concat(expressionParameters, compareParameters, returnParameters, callParameters);

                    var selectionStartLine = selection.start.line + 1;
                    var selectionEndLine = selection.end.line + 1;

                    var declarationsInSelection: { col_offset: number, id: string, lineno: number }[] = [];
                    var parametersInSelection: { col_offset: number, id: string, lineno: number }[] = [];

                    // Delete all declarations which are not in the selection
                    declarations.forEach((declaration: { col_offset: number, id: string, lineno: number }) => {
                        if (declaration.lineno >= selectionStartLine && declaration.lineno <= selectionEndLine && !preDefinedNames.includes(declaration.id)) {
                            declarationsInSelection.push(declaration);
                        }
                    });

                    // Delete all parameters which are not in the selection
                    parameters.forEach((parameter: { col_offset: number, id: string, lineno: number }) => {
                        if (parameter.lineno >= selectionStartLine && parameter.lineno <= selectionEndLine && !preDefinedNames.includes(parameter.id)) {
                            parametersInSelection.push(parameter);
                        }
                    });

                    var placeholders: Placeholder[] = [];
                    // For every parameter, search if there exists a declaration with the same name and a lower line number
                    parametersInSelection.forEach((parameter: { col_offset: number, id: string, lineno: number }) => {
                        var defined = false;
                        declarationsInSelection.forEach((declaration: { col_offset: number, id: string, lineno: number }) => {
                            if (parameter.id === declaration.id && declaration.lineno <= parameter.lineno) {
                                defined = true;
                            }
                        });
                        if (!defined) {
                            placeholders.push(new Placeholder(parameter.id, parameter.col_offset, parameter.lineno));
                        }
                    });

                    var uniquePlaceholders: Placeholder[] = [];
                    placeholders.forEach((placeholder: Placeholder) => {
                        var exists = false;
                        uniquePlaceholders.forEach((uniquePlaceholder: Placeholder) => {
                            if (placeholder.id === uniquePlaceholder.id) {
                                exists = true;
                            }
                        });
                        if (!exists) {
                            uniquePlaceholders.push(placeholder);
                        }
                    });

                    resolve(uniquePlaceholders);
                })
                .catch((error: any) => {
                    console.log("[E] | [PyPa | getPlaceholders]: Error while calculating the AST");
                    reject(error)
                })
        });
        return promise;
    }

    /**
     * Transforms the indices of placeholders extracted from a document to the corresponding indices in a snippet
     */
    static placeholderIndicesToSnippet(placeholders: Placeholder[], selection: vscode.Selection): Placeholder[] {
        var lineOffset = selection.start.line;
        placeholders.forEach((placeholder: Placeholder) => {
            placeholder.lineno -= lineOffset;
        });
        return placeholders;
    }

    /**
     * Calculates a body where the names of all placeholders are replaced by a parametrized string: {index:name}
     * @param textDocument Original document which contains the snippet
     * @param selection Selection of the snippet
     * @param placeholders Previously calculated placeholders
     */
    static parametrizedSnippet(textDocument: vscode.TextDocument, selection: vscode.Selection, placeholders: Placeholder[]): string {
        var snippet = textDocument.getText(new vscode.Range(selection.start, selection.end));
        var placeholdersCopy = clonedeep(placeholders);
        var index = 0;
        placeholdersCopy.forEach((placeholder: Placeholder) => {
            var snippetList = snippet.split('\n');
            placeholder.index = index;
            placeholders.forEach((placeholderOriginal: Placeholder) => {
                if (placeholder.id === placeholderOriginal.id) {
                    placeholderOriginal.index = index
                }
            });
            var parameter = '{' + placeholder.index + ':' + placeholder.name + '}';
            snippetList[placeholder.lineno - 1] = snippetList[placeholder.lineno - 1].substring(0, placeholder.col_offset) + parameter + snippetList[placeholder.lineno - 1].substring(placeholder.col_offset + placeholder.name.length, snippetList[placeholder.lineno - 1].length);
            var tmp = "";
            snippetList.forEach((elem: string) => {
                tmp += elem + '\n';
            });
            snippet = tmp;
            placeholdersCopy.forEach((placeholder_: Placeholder) => {
                if (placeholder.lineno === placeholder_.lineno && placeholder.col_offset < placeholder_.col_offset) {
                    placeholder_.col_offset += parameter.length - placeholder.name.length;
                }
            });
            index++;
        });
        return snippet;
    }

    /**
     * Modifies the original python document to print the datatype of each placeholder
     * @param textDocument Original document which contains the snippet
     * @param selection Selection of the snippet
     * @param placeholders Previously calculated placeholders
     */
    static createScript(textDocument: vscode.TextDocument, selection: vscode.Selection, placeholders: Placeholder[]): string {
        var snippet = textDocument.getText(new vscode.Range(selection.start, selection.end));
        var placeholdersCopy = clonedeep(placeholders);
        placeholdersCopy.forEach((placeholder: Placeholder) => {
            var snippetList = snippet.split('\n');
            var insert = "detType(" + "'" + placeholder.id + "'" + ", " + placeholder.name + ")";
            snippetList[placeholder.lineno - 1] = snippetList[placeholder.lineno - 1].substring(0, placeholder.col_offset) + insert + snippetList[placeholder.lineno - 1].substring(placeholder.col_offset + placeholder.name.length, snippetList[placeholder.lineno - 1].length);
            var tmp = "";
            snippetList.forEach((elem: string) => {
                tmp += elem + '\n';
            });
            snippet = tmp;
            placeholdersCopy.forEach((placeholder_: Placeholder) => {
                if (placeholder.lineno === placeholder_.lineno && placeholder.col_offset < placeholder_.col_offset) {
                    placeholder_.col_offset += insert.length - placeholder.name.length;
                }
            });
        });
        var detType = "def detType(id, x):\n" +
            "    print('{\\\"id\\\": \\\"' + str(id) + '\\\", \\\"type\\\": ' + '\\\"' + str(type(x)) + '\\\"' + '}')\n" +
            "    return x\n";
        return detType + textDocument.getText(new vscode.Range(textDocument.positionAt(0), selection.start)) + snippet + textDocument.getText(new vscode.Range(selection.end, new vscode.Position(textDocument.lineCount, textDocument.lineAt(textDocument.lineCount - 1).text.length)));
    }

    /**
     * Sorts placeholders by line and column
     */
    static sortPlaceholders(placeholders: Placeholder[]): Placeholder[] {
        placeholders.sort((a: Placeholder, b: Placeholder) => {
            if (a.lineno < b.lineno) {
                return -1;
            } else if (a.lineno === b.lineno && a.col_offset < b.col_offset) {
                return -1;
            } else {
                return 1;
            }
        });
        return placeholders;
    }

    /**
     * Executes a python script and collects the output
     * @param script Script to be executed
     */
    static executeScript(script: string): Promise<string | any> {
        var resPromise = vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Executing Python Code",
            cancellable: true
        }, (progress, token) => {
            var promise = new Promise<string | any>((resolve, reject) => {
                var filePath = path.join(FragmentProvider.context.extensionPath, 'tmp', 'script.tmp');
                fs.writeFile(filePath, script, (err: any) => {
                    if (!err) {
                        var child = exec(vscode.workspace.getConfiguration("fragmentEditor.parametrization").get("pythonCallStatement") + " " + filePath, { detached: true }, (error: any, stdout: string, stderr: string) => {
                            if (error) {
                                reject(error);
                            } else if (stderr) {
                                reject(stderr);
                            } else {
                                resolve(stdout);
                            }
                        });
                        token.onCancellationRequested(() => {
                            require('tree-kill')(child.pid);
                        });
                    } else {
                        console.log("[E] | [PyPa | executeScript]: Error while writing the temporary file: " + err);
                        reject(err);
                    }
                });
            });
            return promise;
        });

        return new Promise((resolve, reject) => {
            resPromise.then((success) => {
                resolve(success);
            }, (error) => {
                reject(error);
            })
        });
    }

    /**
     * Extracts the useful information from the output of the python script
     * @param output Output of the script created by 'createScript'
     */
    static parseScriptOutput(output: string): string[] {
        var result = output.split("\r\n").filter(value => {
            if (value.match(/^\{"id": .*, "type": .*\}$/)) {
                return true;
            } else {
                return false;
            }
        });

        var uniqueResult: string[] = [];
        result.forEach((element: string) => {
            if (!uniqueResult.includes(element)) {
                uniqueResult.push(element);
            }
        });
        return uniqueResult;
    }

    /**
     * Assings the calculated datatypes to the corresponding placeholders
     */
    static assignDatatypes(parsedScript: string[], placeholders: Placeholder[]) {
        parsedScript.forEach((datatype: string) => {
            var datatypeJSON = JSON.parse(datatype);
            placeholders.forEach((placeholder: Placeholder) => {
                if (placeholder.id === datatypeJSON.id) {
                    placeholder.datatype = datatypeJSON.type;
                }
            })
        });
        return placeholders;
    }

    /**
     * Formats the result of the parametrization
     * @param placeholders Final list of placeholders which should be saved
     * @param snippet Body corresponding to the placeholders which should be saved
     */
    static formatResult(placeholders: Placeholder[], snippet: string): { body: string, placeholders: string } | undefined {
        var placeholderString = "";
        placeholders.forEach((placeholder: Placeholder) => {
            if (placeholder.datatype !== undefined) {
                placeholderString += "{" + placeholder.index + ":" + placeholder.name + ":" + placeholder.datatype + "}" + ", ";
            } else {
                placeholderString += "{" + placeholder.index + ":" + placeholder.name + "}" + ", ";
            }
        });
        return { body: snippet, placeholders: placeholderString };
    }

    /**
     * Parametrizes the selected code snippet
     * @param textDocument Text document containing the selection
     * @param selection Selection of a code snippet
     */
    static parametrizeWithDatatypes(textDocument: vscode.TextDocument, selection: vscode.Selection): Promise<{ body: string, placeholders: string }> {
        var placeholdersDocument: Placeholder[] = [];
        var placeholdersSnippet: Placeholder[] = [];
        var body = "";
        var preDefinedNames = ["abs", "delattr", "hash", "memoryview", "set", "all", "dict", "help", "min", "setattr", "any", "dir", "hex", "next", "slice", "ascii", "divmod", "id", "object", "sorted", "bin", "enumerate",
            "input", "oct", "staticmethod", "bool", "eval", "int", "open", "str", "breakpoint", "exec", "isinstance", "ord", "sum", "bytearray", "filter", "issubclass", "pow", "super", "bytes", "float",
            "iter", "print", "tuple", "callable", "format", "len", "property", "type", "chr", "frozenset", "list", "range", "vars", "classmethod", "getattr", "locals", "repr", "zip", "compile", "globals",
            "map", "reversed", "__import__", "complex", "hasattr", "max", "round"]

        var promise = new Promise<{ body: string, placeholders: string } | any>((resolve, reject) => {

            PyPa.testPython()
                .then(() => PyPa.getPlaceholders(textDocument.getText(), selection, preDefinedNames))
                .then((documentPlaceholders: Placeholder[]) => {
                    placeholdersDocument = documentPlaceholders;
                    var snippetPlaceholders = PyPa.placeholderIndicesToSnippet(documentPlaceholders, selection);
                    return snippetPlaceholders;
                })
                .then((snippetPlaceholders: Placeholder[]) => PyPa.sortPlaceholders(snippetPlaceholders))
                .then((sortedSnippetPlaceholders: Placeholder[]) => {
                    placeholdersSnippet = sortedSnippetPlaceholders;
                    return PyPa.parametrizedSnippet(textDocument, selection, sortedSnippetPlaceholders);
                })
                .then((parametrizedSnippet: string) => {
                    body = parametrizedSnippet;
                    return PyPa.createScript(textDocument, selection, placeholdersDocument);
                })
                .then((script: string) => PyPa.executeScript(script))
                .then((output: string) => PyPa.parseScriptOutput(output))
                .then((typeDefinitions: string[]) => PyPa.assignDatatypes(typeDefinitions, placeholdersSnippet))
                .then((placeholders: Placeholder[]) => {
                    placeholdersSnippet = placeholders;
                    resolve(PyPa.formatResult(placeholdersSnippet, body));
                })
                .catch((err) => {
                    var oc = vscode.window.createOutputChannel("Execution Error");
                    oc.append("Execution Error\n---------------\n\n" + err);
                    oc.appendLine("\n\nFailed to compute datatypes of placeholders. Is the python code executable? Does python code terminate eventually? Is the correct python call statement configured (python2, python3, etc.)");
                    oc.append("Calculation of datatypes is still work in progress. Internal errors occuring during execution might be displayed");
                    oc.show();
                    console.log("[E] | [PyPa | parametrizeWithDatatypes]: Error while parametrizing with datatypes: " + err);
                    reject(err);
                })
        });
        return promise;
    }

    static parametrize(textDocument: vscode.TextDocument, selection: vscode.Selection) {
        var placeholdersDocument: Placeholder[] = [];
        var placeholdersSnippet: Placeholder[] = [];
        var body = "";
        var preDefinedNames = ["abs", "delattr", "hash", "memoryview", "set", "all", "dict", "help", "min", "setattr", "any", "dir", "hex", "next", "slice", "ascii", "divmod", "id", "object", "sorted", "bin", "enumerate",
            "input", "oct", "staticmethod", "bool", "eval", "int", "open", "str", "breakpoint", "exec", "isinstance", "ord", "sum", "bytearray", "filter", "issubclass", "pow", "super", "bytes", "float",
            "iter", "print", "tuple", "callable", "format", "len", "property", "type", "chr", "frozenset", "list", "range", "vars", "classmethod", "getattr", "locals", "repr", "zip", "compile", "globals",
            "map", "reversed", "__import__", "complex", "hasattr", "max", "round"]

        var promise = new Promise<{ body: string, placeholders: string } | any>((resolve, reject) => {

            PyPa.testPython()
                .then(() => PyPa.getPlaceholders(textDocument.getText(), selection, preDefinedNames))
                .then((documentPlaceholders: Placeholder[]) => {
                    placeholdersDocument = documentPlaceholders;
                    var snippetPlaceholders = PyPa.placeholderIndicesToSnippet(documentPlaceholders, selection);
                    return snippetPlaceholders;
                })
                .then((snippetPlaceholders: Placeholder[]) => PyPa.sortPlaceholders(snippetPlaceholders))
                .then((sortedSnippetPlaceholders: Placeholder[]) => {
                    placeholdersSnippet = sortedSnippetPlaceholders;
                    body = PyPa.parametrizedSnippet(textDocument, selection, sortedSnippetPlaceholders);
                })
                .then(() => {
                    resolve(PyPa.formatResult(placeholdersSnippet, body));
                })
                .catch((err) => {
                    var oc = vscode.window.createOutputChannel("Parametrization Error");
                    oc.append("Parametrization Error\n---------------------\n\n" + err);
                    oc.append("\n\nCalculation of placeholders is still work in progress. Internal errors occuring during parametrization might be displayed");
                    oc.show();
                    console.log("[E] | [PyPa | parametrize]: Error while parametrizing: " + err);
                    reject(err);
                })
        });
        return promise;
    }
}