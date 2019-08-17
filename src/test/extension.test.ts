import { Database } from '../database';
import * as assert from 'assert';
import { Fragment } from '../fragment';
import * as vscode from 'vscode';
import { FragmentProvider } from '../fragmentProvider';
import { PyPa } from '../parametrization';
import { chownSync } from 'fs';
const fs = require('fs-extra');
const path = require('path');
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as vscode from 'vscode';
// import * as myExtension from '../extension';

// Defines a Mocha test suite to group tests of similar kind together
/*
suite("Database Tests", () => {
    const dbpath = path.join(require('os').homedir(), "fragments");
    const dbname = "testdb.db";


    if (fs.existsSync(path.join(dbpath, dbname))) {
        fs.unlinkSync(path.join(dbpath, dbname));
    }
    const db: Database = new Database(dbpath, dbname);

    test("Adding functions", () => {
        assert.equal(db.getFragments().length, 0);
        db.addFragment(new Fragment({ label: "asd" }));
        assert.equal(db.getFragments().length, 1);
    });

    test("Remove Fragment", () => {
        assert.equal(db.getFragments().length, 1);
        db.deleteFragment("asd");
        assert.equal(db.getFragments().length, 0);
    });
});
*/

function testPyPa(script: string, selection: vscode.Selection, name: string, placeholderCompareList: string[], bodyCompareList: string[]) {
    const filePath: string = path.join(FragmentProvider.context.extensionPath, 'tmp', name);
    return fs.writeFile(filePath, script)
        .then(() => {
            return vscode.workspace.openTextDocument(filePath)
                .then((textDocument: vscode.TextDocument) => {
                    return PyPa.parametrizeWithDatatypes(textDocument, selection)
                        .then((result: { body: string, placeholders: string }) => {
                            var placeholderList: string[] = [];
                            result.placeholders.split(',').forEach((placeholder: string) => {
                                placeholderList.push(placeholder.trim());
                            });
                            placeholderCompareList.forEach((placeholderCompare: string) => {
                                if (!placeholderList.includes(placeholderCompare)) {
                                    throw new Error("Placeholder list does not include " + placeholderCompare);
                                }
                            });
                            bodyCompareList.forEach((bodyPlaceholder: string) => {
                                if (!result.body.includes(bodyPlaceholder)) {
                                    throw new Error("Body does not include " + bodyPlaceholder);
                                }
                            })
                        })
                })
        })
}

// These tests create a file which contains some python code. Then the PyPa parametrization gets applied on the file with a previously specified selection
// In order to succeed, the result of PyPa has to contain previously specified placeholders.
suite("PyPa", () => {
    test("Parametrization of simple addition", function () {
        const content: string =
            'x = 10' + '\n' +
            'y = 10' + '\n' +
            '' + '\n' +
            'x + y' + '\n' + // Selected Snippet
            ''
        const selection: vscode.Selection = new vscode.Selection(new vscode.Position(2, 0), new vscode.Position(4, 0));
        return testPyPa(content, selection, 'test1.py', ["{0:x:<class 'int'>}", "{1:y:<class 'int'>}"], ["{0:x}", "{1:y}"])
    });
    test("Parametrization of simple function", function () {
        const content: string =
            'def func(x):' + '\n' +
            '    x + 1' + '\n' +
            'x = 0' + '\n' +
            '' + '\n' +
            'func(x)' + '\n' + // Selected Snippet
            ''
        const selection: vscode.Selection = new vscode.Selection(new vscode.Position(3, 0), new vscode.Position(5, 0));
        return testPyPa(content, selection, 'test2.py', ["{0:func:<class 'function'>}", "{1:x:<class 'int'>}"], ["{0:func}", "{1:x}"])
    });
    test("Parametrization of simple class", function () {
        const content: string =
            'class Point:' + '\n' +
            '   def __init__(self):' + '\n' +
            '       pass' + '\n' +
            '   def someFunc(self):' + '\n' +
            '       pass' + '\n' +
            'p = Point()' + '\n' +
            '' + '\n' +
            'p.someFunc()' + '\n' + // Selected Snippet
            ''
        const selection: vscode.Selection = new vscode.Selection(new vscode.Position(6, 0), new vscode.Position(8, 0));
        return testPyPa(content, selection, 'test3.py', ["{0:p:<class '__main__.Point'>}"], ["{0:p}"])
    });
    test("Parametrization of simple loop", function () {
        const content: string =
            'y = 0' + '\n' +
            '' + '\n' +
            'for x in range(10):' + '\n' +
            '   y + 1' + '\n' +
            ''
        const selection: vscode.Selection = new vscode.Selection(new vscode.Position(1, 0), new vscode.Position(4, 0));
        return testPyPa(content, selection, 'test4.py', ["{0:y:<class 'int'>}"], ["{0:y}"])
    });
    test("Parametrization of simple lambda function", function () {
        const content: string =
        'func = lambda a : a + 10' + '\n' +
        '' + '\n' +
        'func(10)' + '\n' +
        ''
        const selection: vscode.Selection = new vscode.Selection(new vscode.Position(1, 0), new vscode.Position(3, 0));
        return testPyPa(content, selection, 'test5.py', ["{0:func:<class 'function'>}"], ["{0:func}"])
    });
    test("Parametrization of a larger program", function () {
        // Taken from: https://www.programiz.com/python-programming/examples/natural-number-recursion
        const content: string =
        '# Python program to find the sum of natural numbers up to n using recursive function' + '\n' +
        'def recur_sum(n):' + '\n' +
        '   """Function to return the sum of natural numbers using recursion"""' + '\n' +
        '   if n <= 1:' + '\n' +
        '       return n' + '\n' +
        '   else:' + '\n' +
        '       return n + recur_sum(n-1)' + '\n' +
        '# change this value for a different result' + '\n' +
        'num = 16' + '\n' +
        '' + '\n' +
        'if num < 0:' + '\n' +
        '   print("Enter a positive number")' + '\n' +
        'else:' + '\n' +
        '   print("The sum is",recur_sum(num))' + '\n' +
        ''
        const selection: vscode.Selection = new vscode.Selection(new vscode.Position(9, 0), new vscode.Position(14, 0));
        return testPyPa(content, selection, 'test6.py', ["{0:num:<class 'int'>}", "{1:recur_sum:<class 'function'>}", "{2:num:<class 'int'>}", ], ["{0:num}", "{1:recur_sum}", "{2:num}"])
    });
});