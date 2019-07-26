import * as vscode from 'vscode';
import { FragmentProvider } from './fragmentProvider';

const path = require('path');
const fs = require('fs');
const jp = require('jsonpath');
const exec = require('child_process').exec;
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
                    reject(error);
                } else if (stderr) {
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
            var pythonPath = path.join(FragmentProvider.context.extensionPath, 'src', 'python-astexport', 'astexport');
            var filePath = path.join(FragmentProvider.context.extensionPath, 'tmp', 'getAST.tmp');
            fs.writeFile(filePath, document, (err: any) => {
                if (!err) {
                    exec(vscode.workspace.getConfiguration("fragmentEditor.parametrization").get("pythonCallStatement") + ' __main__.py -p -i ' + filePath, { cwd: pythonPath }, (error: any, stdout: string, stderr: string) => {
                        if (error) {
                            reject(error);
                        } else if (stderr) {
                            reject(stderr);
                        } else {
                            resolve(stdout);
                        }
                    });
                } else {
                    reject(err);
                }
            })
        });
        return promise;
    };

    /**
     * 
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
                    reject(error)
                })
        });
        return promise;
    }

    static placeholderIndicesToSnippet(placeholders: Placeholder[], selection: vscode.Selection): Placeholder[] {
        var lineOffset = selection.start.line;
        placeholders.forEach((placeholder: Placeholder) => {
            placeholder.lineno -= lineOffset;
        });
        return placeholders;
    }

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

    static executeScript(script: string): Promise<string | any> {
        var promise = new Promise((resolve, reject) => {
            var filePath = path.join(FragmentProvider.context.extensionPath, 'tmp', 'script.tmp');
            fs.writeFile(filePath, script, (err: any) => {
                if (!err) {
                    var oc = vscode.window.createOutputChannel("Executing Python Script ...");
                    oc.append("Executing Python Script ...\n");
                    oc.show();
                    exec(vscode.workspace.getConfiguration("fragmentEditor.parametrization").get("pythonCallStatement") + " " + filePath, { timeout: vscode.workspace.getConfiguration("fragmentEditor.parametrization").get("pythonExecutionTimeout") }, (error: any, stdout: string, stderr: string) => {
                        if (error) {
                            oc.appendLine(error);
                            reject(error);
                        } else if (stderr) {
                            oc.appendLine(stderr);
                            reject(stderr);
                        } else {
                            oc.appendLine("Done!");
                            oc.hide();
                            resolve(stdout);
                            oc.dispose();
                        }
                    });
                } else {
                    reject(err);
                }
            });
        });
        return promise;
    }

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

    static formatResult(placeholders: Placeholder[], snippet: string): { body: string, placeholders: string } | undefined {
        var placeholderString = "";
        placeholders.forEach((placeholder: Placeholder) => {
            placeholderString += "{" + placeholder.index + ":" + placeholder.name + ":" + placeholder.datatype + "}" + ", ";
        });

        return { body: snippet, placeholders: placeholderString };

    }

    static parametrize(textDocument: vscode.TextDocument, selection: vscode.Selection): Promise<{ body: string, placeholders: string }> {
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
                    var oc = vscode.window.createOutputChannel("Parametrization Error");
                    oc.append("Parametrization Error\n---------------------\n\n" + err);
                    oc.append("\n\nParametrization is still work in progress. Internal errors occuring during parametrization might be displayed");
                    oc.show();
                    reject(err);
                })
        });
        return promise;
    }
}