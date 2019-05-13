import { Fragment } from "./fragment";
import sql = require('sql.js');
import fs = require("fs");
import { TreeItem } from "./treeItem";
import * as vscode from 'vscode';

export class Database {
    private static _fragmentDatabase: any;
    private static _fragmentDirectory: string;
    private static _loadedFragments: Map<string, Fragment>;

    private static _treeItemDatabase: any;
    private static _treeItemDirectory: string;
    private static _loadedTreeItems: Map<string, TreeItem>;

    constructor(path: string)
    {
        Database._fragmentDirectory= path;
        Database.createFragmentDatabase();
        Database._loadedFragments = new Map();
        Database.loadFragments();
        Database._loadedTreeItems = new Map();
    }

    static createFragmentDatabase(): void
    {
        if(!fs.existsSync(Database._fragmentDirectory))
        {
            fs.mkdirSync(Database._fragmentDirectory);
        }

        if (!fs.existsSync(Database._fragmentDirectory + "/fragments.fragmentDatabase")) {
            const bufferfragmentDatabase = new sql.Database();
            const data = bufferfragmentDatabase.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(Database._fragmentDirectory + '/fragments.fragmentDatabase', buffer);
        }

        const filebuffer = fs.readFileSync(Database._fragmentDirectory + '/fragments.fragmentDatabase');
        Database._fragmentDatabase = new sql.Database(filebuffer);
        Database._fragmentDatabase.run("CREATE TABLE IF NOT EXISTS fragments (label char PRIMARY KEY,prefix char,scope char,body char,description char,keywords char,domain char,placeholders char,snippet char);");
        Database.persist();
    }

    private static loadFragments(): void
    {
        const res = Database._fragmentDatabase.exec("SELECT * FROM fragments")[0];
        if (res === undefined)
        {
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
            Database._loadedFragments.set(label, newFragment);
        });
    }

    private static persist(): void
    {
        const data1 = Database._fragmentDatabase.export();
        const buffer1 = Buffer.from(data1);
        fs.writeFileSync(Database._fragmentDirectory + '/fragments.fragmentDatabase', buffer1);
    }

    static getFragments(): Fragment[]
    {
        return Array.from(Database._loadedFragments.values());
    }

    static getFilteredFragments(filter: string): Fragment[]
    {
        if(filter === "")
        {
            return Array.from(Database._loadedFragments.values());
        }

        var filterList = filter.split(",");

        let fragmentList: Fragment[] = Array.from(Database._loadedFragments.values());

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
        return Database._loadedFragments.get(label);
    }

    static addFragment(fragment: Fragment)
    {
        if(Database._loadedFragments.has(fragment.label))
        {
            return false;
        }
        Database._loadedFragments.set(fragment.label, fragment);
        Database._fragmentDatabase.run("INSERT INTO fragments VALUES (?,?,?,?,?,?,?,?,?)", [fragment.label, fragment.prefix, fragment.scope, fragment.body, fragment.description, fragment.keywords, fragment.domain, fragment.placeholders,fragment.snippet]);
        Database.persist();
        return true;
    }

    static deleteFragment (label: string) : boolean
    {
        if (Database._loadedFragments.has(label)) {
            Database._loadedFragments.delete(label);
            Database._fragmentDatabase.run("DELETE FROM fragments WHERE label=?", [label]);
            Database.persist();
            return true;
        }
        return false;
    }

    static updateFragment(fragment: Fragment): boolean
    {
        const oldFragment = Database._loadedFragments.get(fragment.label);
        if (oldFragment === undefined)
        {
            return false;
        }

        Database._loadedFragments.set(fragment.label, fragment);
        Database._fragmentDatabase.run("UPDATE fragments SET prefix=? , scope=?, body=?, description=?, keywords=?, domain=?, placeholders=? WHERE label=?", [fragment.prefix, fragment.scope, fragment.body, fragment.description, fragment.keywords, fragment.domain, fragment.placeholders, fragment.label]);
        Database.persist();
        return true;
    }



    /**
     * Returns the list of loaded TreeItems
     */
    static get loadedTreeItems(): TreeItem[]
    {
        return Array.from(Database._loadedTreeItems.values());
    }

    /**
     * Adds the TreeItem to the database
     * @param treeItem TreeItem to be added
     */
    static addTreeItem(treeItem: TreeItem | undefined): void
    {
        if(treeItem !== undefined && treeItem.label !== undefined && !this._loadedTreeItems.has(treeItem.label))
        {
            this._loadedTreeItems.set(treeItem.label, treeItem);
        }
/*
        this._loadedTreeItems.forEach((treeItem: TreeItem) =>
        {
            console.log(treeItem);
        });
        console.log("##################");
*/
/*
        this._loadedFragments.forEach((treeItem: Fragment) =>
        {
            console.log(treeItem);
        });
        console.log("##################");
*/
    }

    /**
     * Deletes the TreeItem from the database
     * @param label Label of TreeItem to be deleted
     */
    static deleteTreeItem(label: string | undefined): void
    {
        if(label !== undefined && Database._loadedTreeItems.has(label))
        {
            var treeItem = Database.getTreeItem(label);

            Database._loadedTreeItems.delete(label);
        }

    }

    /**
     * Replaces TreeItem with the same label as the given TreeItem
     * @param treeItem TreeItem to replace
     */
    static updateTreeItem(treeItem: TreeItem | undefined): void
    {
        if(treeItem !== undefined && treeItem.label !== undefined && Database._loadedTreeItems.has(treeItem.label))
        {
            Database.deleteTreeItem(treeItem.label);
            Database.addTreeItem(treeItem);
        }
    }

    /**
     * 
     * @param label Returns the TreeItem with the given label
     */
    static getTreeItem(label: string | undefined): TreeItem | undefined
    {
        if(label !== undefined && this._loadedTreeItems.has(label))
        {
            return this._loadedTreeItems.get(label);
        }
    }

    /**
     * Returns list of TreeItems for given list of labels
     * @param labels List of labels for TreeItems to be returned
     */
    static getTreeItems(labels?: (string|undefined)[] | undefined): TreeItem[] | undefined
    {
        if(labels !== undefined)
        {
            var treeItemList: TreeItem[] = [];
            labels.forEach((element: string | undefined) =>
            {
                if(element !== undefined)
                {
                    var treeItem = Database.getTreeItem(element);
                    if(treeItem !== undefined)
                    {
                        treeItemList.push(treeItem);
                    }
                }
            });
            return treeItemList;
        }
        else
        {
            return Array.from(this._loadedTreeItems.values());
        }
    }

    static set loadedTreeItems(treeItems: TreeItem[])
    {
        this._loadedTreeItems.clear();
        treeItems.forEach((treeItem: TreeItem) =>
        {
            if(treeItem.label !== undefined)
            {
                this._loadedTreeItems.set(treeItem.label, treeItem);
            }
        })
    }
}