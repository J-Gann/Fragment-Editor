import { Fragment } from "./fragment";
import * as vscode from 'vscode';
import sql = require('sql.js');
import fs = require("fs");
import path = require("path");

export class Database {
    private static database: any;
    private static fragmentDir: string;
    private static loadedFragments: Map<string, Fragment>;

    constructor() {
        Database.fragmentDir = require('os').homedir() + "/fragments";
        Database.createDatabase();
        Database.loadedFragments = new Map();
        Database.loadFragments();
    }

    static createDatabase(): void {
        if (!fs.existsSync(Database.fragmentDir)) {
            fs.mkdirSync(Database.fragmentDir);
        }

        if (!fs.existsSync(Database.fragmentDir + "/fragments.database")) {
            const bufferdatabase = new sql.Database();
            const data = bufferdatabase.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(Database.fragmentDir + '/fragments.database', buffer);
        }

        const filebuffer = fs.readFileSync(Database.fragmentDir + '/fragments.database');
        Database.database = new sql.Database(filebuffer);
        Database.database.run("CREATE TABLE IF NOT EXISTS fragments (label char PRIMARY KEY,information char NOT NULL,keywords char NOT NULL,code char NOT NULL,language char NOT NULL,domain char NOT NULL,placeholdercount int(11) NOT NULL,placeholders char NOT NULL);");
        Database.persist();
    }

    private static loadFragments(): void {
        const res = Database.database.exec("SELECT * FROM fragments")[0];
        if (res === undefined) {
            return;
        }

        res.values.forEach((element: any[]) => {
            Database.loadedFragments.set(element[0], new Fragment(element[0], 
                element[1], 
                element[2], 
                element[3],
                element[4],
                element[5],                  
                element[7]
            ));
        });
    }

    private static persist(): void {
        const data = Database.database.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(Database.fragmentDir + '/fragments.database', buffer);
    }

    static getFragments(): Fragment[] {
        return Array.from(Database.loadedFragments.values());
    }

    static getFilteredFragments(filter: string): Fragment[] {
        if (filter === "") {
            return Array.from(Database.loadedFragments.values());
        }

        var filterList = filter.split(",");

        let fragmentList: Fragment[] = Array.from(Database.loadedFragments.values());

        filterList.forEach((filterElement: string) =>
        {
            if(filterElement.includes("label:") && filterElement.indexOf("label:") === 0)     // Filtern nach Fragmenten, die die gesuchte Label als Substring haben
            {
                filterElement = filterElement.split(":")[1];
                fragmentList = fragmentList.filter(fragment => fragment.label.toLowerCase().includes(filterElement.toLowerCase()));
            }
            if(filterElement.includes("language:") && filterElement.indexOf("language:") === 0)     // Filtern nach Fragmenten, die die gesuchte Sprache als Substring haben
            {
                filterElement = filterElement.split(":")[1];
                fragmentList = fragmentList.filter(fragment => fragment.language.toLowerCase().includes(filterElement.toLowerCase()));    
            }
            if(filterElement.includes("domain:") && filterElement.indexOf("domain:") === 0)     // Filtern nach Fragmenten, die die gesuchte Domäne als Substring haben
            {
                filterElement = filterElement.split(":")[1];
                fragmentList = fragmentList.filter(fragment => fragment.domain.toLowerCase().includes(filterElement.toLowerCase()));    
            }
            if(filterElement.includes("keyword:") && filterElement.indexOf("keyword:") === 0)   // Filtern nach Fragmenten, die das exakte gesuchte Keyword besitzen
            {
                filterElement = filterElement.split(":")[1];
                fragmentList = fragmentList.filter(fragment => fragment.keywords.split(",").includes(filterElement));
            }
        });
        return fragmentList;
        //Original: return Array.from(Database.fragments.values()).filter(fragment => fragment.label.toLowerCase().includes(filter.toLowerCase()));
    }

    static getFragment(label: string): any {
        return Database.loadedFragments.get(label);
    }

    /**
     * return true if fragment was created
     * return false if fragment already exists
     */

    static addFragment(label: string, {
        information = "", 
        keywords = "", 
        code = "",                                        
        language = "", 
        domain = "",
        placeHolders = ""
    }): boolean {
        if (Database.loadedFragments.has(label)) {
            return false;
        }
        const newFragment = new Fragment(
            label, 
            information, 
            keywords, 
            code, 
            language, 
            domain, 
            placeHolders
        );
        Database.loadedFragments.set(label, newFragment);
        Database.database.run("INSERT INTO fragments VALUES (?,?,?,?,?,?,?,?)", [newFragment.label, newFragment.information, newFragment.keywords, newFragment.code, newFragment.language, newFragment.domain, newFragment.placeHolderCount, newFragment.placeHolders]);
        Database.persist();
        return true;
    }

    static deleteFragment (label: string) : boolean {
        if (Database.loadedFragments.has(label)) {
            Database.loadedFragments.delete(label);
            Database.database.run("DELETE FROM fragments WHERE label=?", [label]);
            Database.persist();
            return true;
        }
        return false;
    }

    static updateFragment (label: string, options: any): boolean {
        const oldFragment = Database.loadedFragments.get(label);
        if (oldFragment === undefined) {
            return false;
        }

        var options = options || {};

        const newFragment = new Fragment(
            label, 
            options.information || oldFragment.information, 
            options.keywords || oldFragment.keywords, 
            options.code || oldFragment.code,
            options.language || oldFragment.language,
            options.domain || oldFragment.domain,                  
            options.placeHolders || oldFragment.placeHolders
        );

        Database.loadedFragments.set(label, newFragment);
        Database.database.run("UPDATE fragments SET information=? , keywords=?, code=?, language=?, domain=?, placeholdercount=?, placeholders=? WHERE label=?", [newFragment.information, newFragment.keywords, newFragment.code, newFragment.language, newFragment.domain, newFragment.placeHolderCount, newFragment.placeHolders, newFragment.label]);
        Database.persist();
        return true;
    }
}