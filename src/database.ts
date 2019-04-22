import { Fragment } from "./fragment";

var sql = require('sql.js');
const fs = require("fs");
var fragmentDir = require('os').homedir() + "/fragments/";

if (!fs.existsSync(fragmentDir)) {
    fs.mkdirSync(fragmentDir);
}

var filebuffer = fs.readFileSync(fragmentDir + 'test.db');
var db = null;

export class Database {
    
    db: any;

    constructor() {
        db = new sql.Database(filebuffer);

        var sqlstr = "CREATE TABLE IF NOT EXISTS fragments (a int, b char);";
        db.run(sqlstr);
        
        this.persist();
    }

    createDir(): void {

    }

    persist(): void {
        const data = this.db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(fragmentDir + '/db/test.db', buffer);
    }

    getFragments(): Fragment[] {
        return null;
    }

    getFilteredFragments(filter: string): void {

    }

    /**
     * return true if fragment was created
     * return false if fragment already exists
     */

    addFragment(label: String, {}): boolean {
        return false;
    }

    deleteFragment(label: String) : boolean {
        return false;
    }
}