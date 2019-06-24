import * as vscode from 'vscode';
import { Fragment } from "./fragment";
import { Database } from './database';
import { exec, ExecException, ChildProcess, execFile } from 'child_process';
import { FragmentProvider } from './fragmentProvider';
const jp = require('jsonpath');

export class PyPaExp {

    static getAST(documentPath: string, successCallback: Function, errorCallback: Function) {
        var child: ChildProcess = exec('astexport -i ' + documentPath + ' -p',
            (error: ExecException | null, stdout: string, stderr: string) => {
                if (stdout) {
                    successCallback(stdout);
                } else if (error) {
                    errorCallback(error);
                } else {
                    errorCallback(stderr);
                }
            });
    }

    static getPlaceholders(jsonAST: JSON) {
        var declarations = jp.query(jsonAST, '$..[?(@.ast_type=="Assign")].targets.*');
        var parameters = jp.query(jsonAST, '$..args[?(@.ast_type=="Name")]');
    }

    static parametrize(textDocument: vscode.TextDocument, selection: vscode.Selection) {

        PyPaExp.getAST(textDocument.uri.fsPath,
            (ast: string) => {
                var jsonAST = JSON.parse(ast);
                PyPaExp.getPlaceholders(jsonAST);
            },
            (err: any) => {
                console.log(err);
            });
    }
}