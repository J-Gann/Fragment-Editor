import { Fragment } from "./fragment";

import sql = require('sql.js');
import fs = require("fs");

export class Database {
    db: any;
    fragmentDir: string;

    fragments: Fragment[];

    constructor() {
        this.fragmentDir = require('os').homedir() + "/fragments/";
        this.createDatabase();

        this.fragments = [
            new Fragment("a"),
            new Fragment("as"),
            new Fragment("asd"),
            new Fragment("asdf"),
            new Fragment("asdfg")
        ];
    }

    createDatabase(): void {
        if (!fs.existsSync(this.fragmentDir)) {
            fs.mkdirSync(this.fragmentDir);
        }

        if (!fs.existsSync(this.fragmentDir + "/fragments.db")) {
            const bufferdatabase = new sql.Database();
            const data = bufferdatabase.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(this.fragmentDir + '/fragment.db', buffer);
        }
        const filebuffer = fs.readFileSync(this.fragmentDir + '/fragment.db');
        this.db = new sql.Database(filebuffer);
        this.db.run("CREATE TABLE IF NOT EXISTS fragments (a int, b char);");
        this.persist();
    }

    persist(): void {
        const data = this.db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(this.fragmentDir + '/fragment.db', buffer);
    }

    getFragments(): Fragment[] {
        return this.fragments;
    }

    getFilteredFragments(filter: string): Fragment[] {
        if (filter === "") {
            return this.fragments;
        }
        return this.fragments.filter(fragment => fragment.getLabel().toLowerCase().includes(filter));
    }

    getFragment(label: String): Fragment {
        return new Fragment("asd");
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