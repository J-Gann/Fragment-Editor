import {Database} from '../database';
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { Fragment } from '../fragment';
import { FragmentProvider } from '../fragmentProvider';
import * as vscode from 'vscode';
import * as fragedit from '../extension';



suite("Extension activating", () => {
    const extension = vscode.extensions.getExtension('fragedit.fragment-editor');
    
    test('Extension should be present', () => {
        assert.ok(extension);
    });
    
    test('Extension should activate', function () {
        this.timeout(1 * 60 * 1000);
        
        if (extension === undefined) {
            return;
        }

        return extension.activate().then((api) => {
            assert.ok(true);
            console.log(api);
        });
    });
});

suite("Database Tests", () => {
    const dbpath = path.join(require('os').homedir(), "fragments");
    const dbname = "testdb.db";


    if (fs.existsSync(path.join(dbpath, dbname))) {
        fs.unlinkSync(path.join(dbpath, dbname));
    }
    const db: Database = new Database(dbpath, dbname);
    
    test("Adding functions", () => {
        assert.equal(db.getFragments().length, 0);
        db.addFragment(new Fragment({label: "asd"}));
        assert.equal(db.getFragments().length, 1);
    });

    test("Remove Fragment", () => {
        assert.equal(db.getFragments().length, 1);
        db.deleteFragment("asd");
        assert.equal(db.getFragments().length, 0);
    });
});

suite("Array Tests", () => {
    test("Array index", function() {
        assert.equal(-1, [1, 2, 3].indexOf(5));
        assert.equal(-1, [1, 2, 3].indexOf(0));
    });
});