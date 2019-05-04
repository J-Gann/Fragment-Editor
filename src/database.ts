import { Fragment } from "./fragment";
import sql = require('sql.js');
import fs = require("fs");
import { print } from "util";

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
        Database.database.run("CREATE TABLE IF NOT EXISTS fragments (label char PRIMARY KEY,prefix char,scope char,body char,description char,keywords char,domain char,placeholders char,snippet char);");
        Database.persist();
    }

    private static loadFragments(): void {
        const res = Database.database.exec("SELECT * FROM fragments")[0];
        if (res === undefined) {
            return;
        }

        res.values.forEach((element: any[]) => {
            var label = element[0];
            var prefix = element[1];
            var scope = element[2];
            var body = element[3];
            var description = element[4];
            var keywords = element[5];
            var domain = element[6];
            var placeholders = element[7];
            var newFragment = new Fragment({label: label, prefix: prefix, scope: scope, body: body, description: description, keywords: keywords, domain: domain, placeholders: placeholders});
            Database.loadedFragments.set(label, newFragment);
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
        if(filter === "")
        {
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
            if(filterElement.includes("scope:") && filterElement.indexOf("scope:") === 0)     // Filtern nach Fragmenten, die die gesuchte Sprache als Substring haben
            {
                filterElement = filterElement.split(":")[1];
                fragmentList = fragmentList.filter(fragment =>
                {
                    if(fragment.scope !== undefined)
                    {
                        return fragment.scope.toLowerCase().includes(filterElement.toLowerCase());
                    }
                });   
            }
            if(filterElement.includes("domain:") && filterElement.indexOf("domain:") === 0)     // Filtern nach Fragmenten, die die gesuchte Domäne als Substring haben
            {
                filterElement = filterElement.split(":")[1];
                fragmentList = fragmentList.filter(fragment =>
                    {
                        if(fragment.domain !== undefined)
                        {
                            return fragment.domain.toLowerCase().includes(filterElement.toLowerCase());
                        }
                    });      
            }
            if(filterElement.includes("keyword:") && filterElement.indexOf("keyword:") === 0)   // Filtern nach Fragmenten, die das exakte gesuchte Keyword besitzen
            {
                filterElement = filterElement.split(":")[1];
                fragmentList = fragmentList.filter(fragment =>
                    {
                        if(fragment.keywords !== undefined)
                        {
                            return fragment.keywords.includes(filterElement);
                        }
                    });
            }
        });
        return fragmentList;
    }

    static getFragment(label: string): Fragment | undefined
    {
        return Database.loadedFragments.get(label);
    }

    /**
     * return true if fragment was created
     * return false if fragment already exists
     */

    static addFragment(fragment: Fragment)
    {
        if(Database.loadedFragments.has(fragment.label))
        {
            return false;
        }
        Database.loadedFragments.set(fragment.label, fragment);
        Database.database.run("INSERT INTO fragments VALUES (?,?,?,?,?,?,?,?,?)", [fragment.label, fragment.prefix, fragment.scope, fragment.body, fragment.description, fragment.keywords, fragment.domain, fragment.placeholders,fragment.snippet]);
        Database.persist();
        return true;
    }

    static deleteFragment (label: string) : boolean
    {
        if (Database.loadedFragments.has(label)) {
            Database.loadedFragments.delete(label);
            Database.database.run("DELETE FROM fragments WHERE label=?", [label]);
            Database.persist();
            return true;
        }
        return false;
    }

    static updateFragment(fragment: Fragment): boolean
    {
        const oldFragment = Database.loadedFragments.get(fragment.label);
        if (oldFragment === undefined)
        {
            return false;
        }

        Database.loadedFragments.set(fragment.label, fragment);
        Database.database.run("UPDATE fragments SET prefix=? , scope=?, body=?, description=?, keywords=?, domain=?, placeholders=? WHERE label=?", [fragment.prefix, fragment.scope, fragment.body, fragment.description, fragment.keywords, fragment.domain, fragment.placeholders, fragment.label]);
        Database.persist();
        return true;
    }
}