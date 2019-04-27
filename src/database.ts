import { Fragment } from "./fragment";
import * as vscode from 'vscode';

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
            this.fragments.set(element[0], new Fragment(element[0], 
                element[1], 
                element[2], 
                element[3],
                element[4],
                element[5],                  
                element[7]
            ));
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

    getExistingLanguages(): string[]
    {
        var languages: string[] = [];
        this.fragments.forEach(element => {
            var language = element.language;
            if(!languages.includes(language))
            {
                languages.push(language);
            }
        });
        return languages;
    }

    getExistingDomains(): string[]
    {
        var domains: string[] = [];
        this.fragments.forEach(element => {
            var domain = element.domain;
            if(!domains.includes(domain))
            {
                domains.push(domain);
            }
        });
        return domains;
    }

    getFilteredFragments(filter: string): Fragment[] {
        if (filter === "") {
            return Array.from(this.fragments.values());
        }

        var filterList = filter.split(",");

        let fragmentList: Fragment[] = Array.from(this.fragments.values());

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
        //Original: return Array.from(this.fragments.values()).filter(fragment => fragment.label.toLowerCase().includes(filter.toLowerCase()));
    }

    getFragment(label: string): any {
        return this.fragments.get(label);
    }

    /**
     * return true if fragment was created
     * return false if fragment already exists
     */

    addFragment(label: string, {
        information = "", 
        keywords = "", 
        code = "",                                        
        language = "", 
        domain = "",
        placeHolders = ""
    }): boolean {
        if (this.fragments.has(label)) {
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

        const newFragment = new Fragment(
            label, 
            options.information || oldFragment.information, 
            options.keywords || oldFragment.keywords, 
            options.code || oldFragment.code,
            options.language || oldFragment.language,
            options.domain || oldFragment.domain,                  
            options.placeHolders || oldFragment.placeHolders
        );

        this.fragments.set(label, newFragment);
        this.db.run("UPDATE fragments SET information=? , keywords=?, code=?, language=?, domain=?, placeholdercount=?, placeholders=? WHERE label=?", [newFragment.information, newFragment.keywords, newFragment.code, newFragment.language, newFragment.domain, newFragment.placeHolderCount, newFragment.placeHolders, newFragment.label]);
        this.persist();
        return true;
    }
}