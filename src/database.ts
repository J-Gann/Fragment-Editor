import { Fragment } from "./fragment";

import sql = require('sql.js');
import fs = require("fs");
import path = require("path");

export class Database {
    db: any;
    fragmentDir: string;

    fragments: Map<string, Fragment>;

    constructor() {
        this.fragmentDir = require('os').homedir() + "/fragments";
        this.createDatabase();

        this.fragments = new Map();
        this.loadFragments();
        this.updateFragment("asd", {code:"ichbincode"});
    }

    createDatabase(): void {
        if (!fs.existsSync(this.fragmentDir)) {
            fs.mkdirSync(this.fragmentDir);
        }

        if (!fs.existsSync(this.fragmentDir + "/fragments.db")) {
            const bufferdatabase = new sql.Database();
            const data = bufferdatabase.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(this.fragmentDir + '/fragments.db', buffer);
        }

        const filebuffer = fs.readFileSync(this.fragmentDir + '/fragments.db');
        this.db = new sql.Database(filebuffer);
        this.db.run("CREATE TABLE IF NOT EXISTS fragments (label char PRIMARY KEY,information char NOT NULL,keywords char NOT NULL,code char NOT NULL,language char NOT NULL,domain char NOT NULL,placeholdercount int(11) NOT NULL,placeholders char NOT NULL);");
        this.persist();
    }

    loadFragments(): void {
        const res = this.db.exec("SELECT * FROM fragments")[0];
        if (res === undefined) {
            return;
        }

        res.values.forEach((element: any[]) => {
            this.fragments.set(element[0], new Fragment(element[0], {
                information: element[1], 
                keywords: element[2], 
                code: element[3],
                language: element[4],
                domain: element[5],                  
                placeHolders: element[7]
            }));
        });
    }

    persist(): void {
        const data = this.db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(this.fragmentDir + '/fragments.db', buffer);
    }

    getFragments(): Fragment[] {
        return Array.from(this.fragments.values());
    }

    getFilteredFragments(filter: string): Fragment[] {
        if (filter === "") {
            return Array.from(this.fragments.values());
        }
        return Array.from(this.fragments.values()).filter(fragment => fragment.label.toLowerCase().includes(filter));
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
        const newFragment = new Fragment(label, {});
        this.fragments.set(label, newFragment);
        this.db.run("INSERT INTO fragments VALUES (?,?,?,?,?,?,?,?)", [newFragment.label, newFragment.information, newFragment.keywords, newFragment.code, newFragment.language, newFragment.domain, newFragment.placeHolderCount, newFragment.placeHolders]);
        this.persist();
        return true;
    }

    deleteFragment (label: string) : boolean {
        if (this.fragments.has(label)) {
            this.fragments.delete(label);
            this.db.run("DELETE FROM fragments WHERE label=?", [label]);
            this.persist();
            return true;
        }
        return false;
    }

    updateFragment (label: string, options: any): boolean {
        const oldFragment = this.fragments.get(label);
        if (oldFragment === undefined) {
            return false;
        }

        var options = options || {};

        const newFragment = new Fragment(label, {
            information: options.information || oldFragment.information, 
            keywords: options.keywords || oldFragment.keywords, 
            code: options.code || oldFragment.code,
            language: options.language || oldFragment.language,
            domain: options.domain || oldFragment.domain,                  
            placeHolders: options.placeHolders || oldFragment.placeHolders
        });

        this.fragments.set(label, newFragment);
        this.db.run("UPDATE fragments SET information=? , keywords=?, code=?, language=?, domain=?, placeholdercount=?, placeholders=? WHERE label=?", [newFragment.information, newFragment.keywords, newFragment.code, newFragment.language, newFragment.domain, newFragment.placeHolderCount, newFragment.placeHolders, newFragment.label]);
        this.persist();
        return true;
    }
}