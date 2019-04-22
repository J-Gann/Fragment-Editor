import { Fragment } from "./fragment";

import sql = require('sql.js');
import fs = require("fs");

export class Database {
    db: any;
    fragmentDir: string;

    fragments: Map<string, Fragment>;

    constructor() {
        this.fragmentDir = require('os').homedir() + "/fragments/";
        this.createDatabase();

        this.fragments = new Map();

        this.fragments.set("asd", new Fragment("asd"));
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

    loadFragments(): void {
        
    }

    persist(): void {
        const data = this.db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(this.fragmentDir + '/fragment.db', buffer);
    }

    getFragments(): Fragment[] {
        return Array.from(this.fragments.values());
    }

    getFilteredFragments(filter: string): Fragment[] {
        if (filter === "") {
            return Array.from(this.fragments.values());
        }
        return Array.from(this.fragments.values()).filter(fragment => fragment.getLabel().toLowerCase().includes(filter));
    }

    getFragment(label: string): any {
        return this.fragments.get(label);
    }

    /**
     * return true if fragment was created
     * return false if fragment already exists
     */

    addFragment(label: string, {}): boolean {
        if (this.fragments.has(label)) {
            return false;
        }
        this.fragments.set(label, new Fragment(label));
        return true;
    }

    deleteFragment(label: string) : boolean {
        if (this.fragments.has(label)) {
            this.fragments.delete(label);
            return true;
        }
        return false;
    }
}