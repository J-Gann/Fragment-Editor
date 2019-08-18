import { Fragment } from "./fragment";
import sql = require('sql.js');
import fs = require("fs");
import { TreeItem } from "./treeItem";
import * as path from "path";

export class Database {
    private static _default_path: string;
    private static _instance: Database;

    private _fragmentDatabase: any;
    private _fragmentFile: string;
    private _fragmentPath: string;
    private _loadedFragments: Map<string, Fragment>;
    private _loadedTreeItems: Map<string, TreeItem>;

    constructor(dbpath: string, dbname: string) {
        this._fragmentFile = path.join(dbpath, dbname);
        this._fragmentPath = dbpath;
        this.createFragmentDatabase();
        this._loadedFragments = new Map();
        this.loadFragments();
        this._loadedTreeItems = new Map();
    }

    static getInstance(): Database {
        if (Database._instance === undefined) {

            if (Database._default_path === undefined) {
                Database._default_path = path.join(require('os').homedir(), "fragments");
            }
            Database._instance = new Database(Database._default_path, "fragments.db");
        }
        return Database._instance;
    }

    static setDefaultPath(path: string): void {
        this._default_path = path;
    }

    static getDefaultPath(): string {
        return this._default_path;
    }

    createFragmentDatabase(): void {
        if (!fs.existsSync(this._fragmentPath)) {
            fs.mkdirSync(this._fragmentPath);
        }

        if (!fs.existsSync(this._fragmentFile)) {
            const bufferfragmentDatabase = new sql.Database();
            const data = bufferfragmentDatabase.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(this._fragmentFile, buffer);
        }

        const filebuffer = fs.readFileSync(this._fragmentFile);
        this._fragmentDatabase = new sql.Database(filebuffer);
        this._fragmentDatabase.run("CREATE TABLE IF NOT EXISTS fragments (label char PRIMARY KEY,prefix char,scope char,body char,description char,keywords char,tags char,domain char,placeholders char,snippet char);");
        this._fragmentDatabase.run("CREATE VIEW IF NOT EXISTS v_tags AS WITH RECURSIVE split(name, rest) " +
            " AS (SELECT '', tags || ',' FROM fragments UNION ALL SELECT substr(rest, 0, instr(rest, ',')), substr(rest, instr(rest, ',')+1) " +
            "FROM split WHERE rest <> '') SELECT distinct name FROM split WHERE name <> '' ORDER BY name;");
        this._fragmentDatabase.run("CREATE VIEW IF NOT EXISTS v_domains AS WITH RECURSIVE split(name, rest) " +
            " AS (SELECT '', domain || ',' FROM fragments UNION ALL SELECT substr(rest, 0, instr(rest, ',')), substr(rest, instr(rest, ',')+1) " +
            "FROM split WHERE rest <> '') SELECT distinct name FROM split WHERE name <> '' ORDER BY name;");
        this.persist();
    }

    loadFragments(): void {
        const res = this._fragmentDatabase.exec("SELECT * FROM fragments")[0];
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
            var tags = element[6];
            var domain = element[7];
            var placeholders = element[8];
            var newFragment = new Fragment({
                label: label,
                prefix: prefix,
                scope: scope,
                body: body,
                description: description,
                keywords: keywords,
                tags: tags,
                domain: domain,
                placeholders: placeholders
            });
            this._loadedFragments.set(label, newFragment);
        });
    }

    private persist(): void {
        const data1 = this._fragmentDatabase.export();
        const buffer1 = Buffer.from(data1);
        fs.writeFileSync(this._fragmentFile, buffer1);
    }

    get loadedFragments(): Fragment[] {
        return Array.from(this._loadedFragments.values());
    }

    /**
     * Return all fragments or the ones which labels were given
     * @param labels Labels for which fragments should be returned
     */
    getFragments(labels?: (string | undefined)[]): Fragment[] {
        if (labels !== undefined) {
            var fragments: Fragment[] = [];
            labels.forEach((label: string | undefined) => {
                var occuredLabels: string[] = [];
                if (label !== undefined && !occuredLabels.includes(label)) {
                    occuredLabels.push(label);
                    var fragment = this._loadedFragments.get(label);
                    if (fragment !== undefined) {
                        fragments.push(fragment);
                    }
                }
            });
            return fragments;
        } else {
            return Array.from(this._loadedFragments.values());
        }
    }

    /**
     * Return the Fragment with the given label
     * @param label Label of the Fragment
     */
    getFragment(label: string): Fragment | undefined {
        var fragment = this._loadedFragments.get(label);
        if (fragment !== undefined) {
            return fragment;
        } else {
            console.log("[W] | [Database | getFragment]: Failed for parameter: " + label);
            return undefined;
        }
    }

    /**
     * Adds the given Fragment to the Database
     * @param fragment Fragment to be added
     */
    addFragment(fragment: Fragment | undefined): boolean {
        if (fragment === undefined || this._loadedFragments.has(fragment.label)) {
            console.log("[W] | [Database | addFragment]: Failed for fragment: " + fragment);
            return false;
        } else {
            this._loadedFragments.set(fragment.label, fragment);
            this._fragmentDatabase.run("INSERT INTO fragments VALUES (?,?,?,?,?,?,?,?,?,?)", [fragment.label, fragment.prefix, fragment.scope, fragment.body, fragment.description, fragment.keywords, fragment.tags, fragment.domain, fragment.placeholders, fragment.snippet]);
            this.persist();
            return true;
        }
    }

    /**
     * Delete a Fragment from the Database
     * @param label Label of Fragment
     */
    deleteFragment(label: string | undefined): boolean {
        if (label !== undefined && this._loadedFragments.has(label)) {
            this._loadedFragments.delete(label);
            this._fragmentDatabase.run("DELETE FROM fragments WHERE label=?", [label]);
            this.persist();
            return true;
        } else {
            console.log("[W] | [Database | deleteFragment]: Failed for label: " + label);
            return false;
        }
    }

    /**
     * Replace a Fragment with the same label as the given Fragment
     * @param fragment Fragment as it should be in the Database
     */
    updateFragment(fragment: Fragment | undefined): boolean {
        if (fragment !== undefined && this._loadedFragments.get(fragment.label) !== undefined) {
            this._loadedFragments.set(fragment.label, fragment);
            this._fragmentDatabase.run("UPDATE fragments SET prefix=? , scope=?, body=?, description=?, keywords=?, tags=?, domain=?, placeholders=? WHERE label=?", [fragment.prefix, fragment.scope, fragment.body, fragment.description, fragment.keywords, fragment.tags, fragment.domain, fragment.placeholders, fragment.label]);
            this.persist();
            return true;
        } else {
            console.log("[W] | [Database | updateFragment]: Failed for fragment: " + fragment);
            return false;
        }
    }

    get loadedTreeItems(): TreeItem[] {
        return Array.from(this._loadedTreeItems.values());
    }

    set loadedTreeItems(treeItems: TreeItem[]) {
        this._loadedTreeItems.clear();
        treeItems.forEach((treeItem: TreeItem) => {
            if (treeItem.label !== undefined) {
                this._loadedTreeItems.set(treeItem.label, treeItem);
            }
        });
    }

    /**
     * Adds the TreeItem to the database
     * @param treeItem TreeItem to be added
     */
    addTreeItem(treeItem: TreeItem | undefined): boolean {
        if (treeItem !== undefined && treeItem.label !== undefined && !this._loadedTreeItems.has(treeItem.label)) {
            this._loadedTreeItems.set(treeItem.label, treeItem);
            return true;
        } else {
            console.log("[W] | [Database | addTreeItem]: Failed for TreeItem: " + treeItem);
            return false;
        }
    }

    /**
     * Deletes the TreeItem from the database
     * @param label Label of TreeItem to be deleted
     */
    deleteTreeItem(label: string | undefined): boolean {
        if (label !== undefined && this._loadedTreeItems.has(label)) {
            this._loadedTreeItems.delete(label);
            return true;
        } else {
            console.log("[W] | [Database | deleteTreeItem]: Failed for label: " + label);
            return false;
        }
    }

    /**
     * Replaces TreeItem with the same label as the given TreeItem
     * @param treeItem TreeItem as it should be in the Database
     */
    updateTreeItem(treeItem: TreeItem | undefined): boolean {
        if (treeItem !== undefined && treeItem.label !== undefined && this._loadedTreeItems.has(treeItem.label)) {
            this._loadedTreeItems.set(treeItem.label, treeItem);
            return true;
        } else {
            console.log("[W] | [Database | updateTreeItem]: Failed for TreeItem: " + treeItem);
            return false;
        }
    }

    /**
     * Return the TreeItem with the given label
     * @param label Label of the TreeItem
     */
    getTreeItem(label: string | undefined): TreeItem | undefined {
        if (label !== undefined && this._loadedTreeItems.has(label)) {
            return this._loadedTreeItems.get(label);
        } else {
            // console.log("[W] | [Database | getTreeItem]: Failed for label: " + label);
            return undefined;
        }
    }

    /**
     * Return all Treeitems or the ones which labels were given
     * @param labels List of labels for TreeItems to be returned
     */
    getTreeItems(labels?: (string | undefined)[] | undefined): TreeItem[] {
        if (labels !== undefined) {
            var treeItems: TreeItem[] = [];
            labels.forEach((label: string | undefined) => {
                var occuredLabels: string[] = [];
                if (label !== undefined && !occuredLabels.includes(label)) {
                    occuredLabels.push(label);
                    var treeItem = this._loadedTreeItems.get(label);
                    if (treeItem !== undefined) {
                        treeItems.push(treeItem);
                    }
                }
            });
            return treeItems;
        } else {
            return Array.from(this._loadedTreeItems.values());
        }
    }

    getFilteredFragments(filter: string): Fragment[] {
        if (filter === "") {
            return Array.from(this._loadedFragments.values());
        }

        var filterList = filter.split(",");

        let fragmentList: Fragment[] = Array.from(this._loadedFragments.values());

        filterList.forEach((filterElement: string) => {
            if (filterElement.includes("label:") && filterElement.indexOf("label:") === 0) // Filtern nach Fragmenten, die die gesuchte Label als Substring haben
            {
                filterElement = filterElement.split(":")[1];
                fragmentList = fragmentList.filter(fragment => fragment.label.toLowerCase().includes(filterElement.toLowerCase()));
            }
            if (filterElement.includes("scope:") && filterElement.indexOf("scope:") === 0) // Filtern nach Fragmenten, die die gesuchte Sprache als Substring haben
            {
                filterElement = filterElement.split(":")[1];
                fragmentList = fragmentList.filter(fragment => {
                    if (fragment.scope !== undefined) {
                        return fragment.scope.toLowerCase().includes(filterElement.toLowerCase());
                    }
                });
            }
            if (filterElement.includes("domain:") && filterElement.indexOf("domain:") === 0) // Filtern nach Fragmenten, die die gesuchte Domäne als Substring haben
            {
                filterElement = filterElement.split(":")[1];
                fragmentList = fragmentList.filter(fragment => {
                    if (fragment.domain !== undefined) {
                        return fragment.domain.toLowerCase().includes(filterElement.toLowerCase());
                    }
                });
            }
            if (filterElement.includes("keyword:") && filterElement.indexOf("keyword:") === 0) // Filtern nach Fragmenten, die das exakte gesuchte Keyword besitzen 
            {
                filterElement = filterElement.split(":")[1];
                fragmentList = fragmentList.filter(fragment => {
                    if (fragment.keywords !== undefined) {
                        return fragment.keywords.includes(filterElement);
                    }
                });
            }
        });
        return fragmentList;
    }

    getTags(): string[] {
        let tags: string[] = [];

        const res = this._fragmentDatabase.exec("SELECT * FROM v_tags")[0];
        if (res === undefined) {
            return tags;
        }

        res.values.forEach((element: any[]) => {
            var tag = element[0];
            tags.push(tag);
        });

        return tags;
    }

    getDomains(): string[] {
        let domains: string[] = [];

        const res = this._fragmentDatabase.exec("SELECT * FROM v_domains")[0];
        if (res === undefined) {
            return domains;
        }

        res.values.forEach((element: any[]) => {
            var tag = element[0];
            domains.push(tag);
        });

        return domains;
    }

    clearTreeItems(): void {
        this.loadedTreeItems = [];
    }
}