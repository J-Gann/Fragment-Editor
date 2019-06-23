import {Database} from '../database';
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { Fragment } from '../fragment';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as vscode from 'vscode';
// import * as myExtension from '../extension';

// Defines a Mocha test suite to group tests of similar kind together
suite("Database Tests", () => {
    const dbpath = path.join(require('os').homedir(), "fragments");
    const dbname = "testdb.db";


    if (fs.existsSync(path.join(dbpath, dbname))) {
        //fs.unlinkSync(path.join(dbpath, dbname));
    }
    const db: Database = new Database(dbpath, dbname);
    
    test("Adding functions", function () {
        console.log(db.getFragments());
        assert.equal(db.getFragments().length, 0);
        db.addFragment(new Fragment({label: "asd"}));
        assert.equal(db.getFragments().length, 1);
    });
});

suite("Array Tests", () => {
    test("Array index", function() {
        assert.equal(-1, [1, 2, 3].indexOf(5));
        assert.equal(-1, [1, 2, 3].indexOf(0));
    });
});