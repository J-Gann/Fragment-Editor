import { Fragment } from "./fragment";

import sql = require('sql.js');
import fs = require("fs");

export class Database {
    db: any;
    
    fragmentDir: string;
    filebuffer : any;

    constructor() {
        this.fragmentDir = require('os').homedir() + "/fragments/";
        this.createFragmentDir();

        this.db = new sql.Database(this.filebuffer);
    }

    createFragmentDir(): void {
        if (!fs.existsSync(this.fragmentDir)) {
            fs.mkdirSync(this.fragmentDir);
        }
    }

    createFileBuffer(): void {

    }

    createDatabase(): void {
        this.db.run("CREATE TABLE IF NOT EXISTS fragments (a int, b char);");
        this.persist();
    }

    persist(): void {
        const data = this.db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(this.fragmentDir + '/fragment.db', buffer);
    }

    getFragments(): Fragment[] {
        return null;
    }

    getFilteredFragments(filter: string): Fragment[] {
        return null;
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