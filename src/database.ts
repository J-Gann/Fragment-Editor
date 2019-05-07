import { Fragment } from "./fragment";
import sql = require('sql.js');
import fs = require("fs");
import { TreeItem } from "./treeItem";

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

        var fragment = new Fragment({label: "testFragment"});
        Database._loadedFragments.set(fragment.label, fragment);

        var test2 = new TreeItem({label: "FragmentName", contextValue: "fragment"})
        test2.fragmentLabel = fragment.label;
        Database._loadedTreeItems.set("FragmentName", test2);
        
        var test1 = new TreeItem({label: "FolderName1", contextValue: "folder"})
        test1.treeItems = [test2];
        Database._loadedTreeItems.set("FolderName1", test1);

        var test0 = new TreeItem({label: "Root", isRoot: true, contextValue: "folder"})
        test0.treeItems = [test1];
        Database._loadedTreeItems.set("Root", test0);

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
    
    static createTreeItemDatabase(): void
    {
        if(!fs.existsSync(Database._treeItemDirectory))
        {
            fs.mkdirSync(Database._treeItemDirectory);
        }

        if (!fs.existsSync(Database._treeItemDirectory + "/fragments.treeItemDatabase")) {
            const buffertreeItemDatabase = new sql.Database();
            const data = buffertreeItemDatabase.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(Database._treeItemDirectory + '/fragments.treeItemDatabase', buffer);
        }

        const filebuffer = fs.readFileSync(Database._treeItemDirectory + '/fragments.treeItemDatabase');
        Database._treeItemDatabase = new sql.Database(filebuffer);
        Database._treeItemDatabase.run("CREATE TABLE IF NOT EXISTS treeItems (label char PRIMARY KEY,isRoot char,treeItems char,fragmentLabel char);");
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

    private static loadTreeItems(): void
    {
        const res = Database._treeItemDatabase.exec("SELECT * FROM treeItems")[0];
        if (res === undefined)
        {
            return;
        }

        res.values.forEach((element: any[]) => {
            var label = element[0];
            var isRoot = undefined;
            if(element[1] == "true")
            {
                isRoot = true;
            }
            else
            {
                isRoot = false;
            }
            var treeItems = element[2];     // TODO: TreeItems have to be parsed from and to string
            var fragmentLabel = element[3];
            var newTreeItem = new TreeItem({label: label, isRoot: isRoot, treeItems: treeItems, fragmentLabel: fragmentLabel});
            Database._loadedTreeItems.set(label, newTreeItem);
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

    static get loadedTreeItems(): TreeItem[]
    {
        return Array.from(Database._loadedTreeItems.values());
    }

    static getRootTreeItem(): TreeItem | undefined
    {
        var treeItem = undefined;
        this._loadedTreeItems.forEach((element) =>
        {
            if(element.isRoot)
            {
                treeItem = element;
            }
        })
        return treeItem;
    }

    static addTreeItem(treeItem: TreeItem)
    {
        if(treeItem.label !== undefined && !this._loadedTreeItems.has(treeItem.label))
        {
            this._loadedTreeItems.set(treeItem.label, treeItem);
        }
    }

    static deleteTreeItem(label: string)
    {
        console.log(Database._loadedTreeItems.has(label));
        if(Database._loadedTreeItems.has(label))
        {
            Database._loadedTreeItems.forEach((treeItem: TreeItem) =>
            {
                treeItem.deleteTreeItem(label);
            });
            Database._loadedTreeItems.delete(label);
           // Database.treeItemsDatabase.run("DELETE FROM fragments WHERE label=?", [label]);
           // Database.persist();
            return true;
        }
        return false;
    }

    static updateTreeItem(treeItem: TreeItem)
    {
        if(treeItem.label !== undefined)
        {
            const oldTreeItem = Database._loadedFragments.get(treeItem.label);
            if(oldTreeItem  === undefined)
            {
                return false;
            }
    
            Database._loadedTreeItems.set(treeItem.label, treeItem);
           // Database._fragmentDatabase.run("UPDATE fragments SET prefix=? , scope=?, body=?, description=?, keywords=?, domain=?, placeholders=? WHERE label=?", [fragment.prefix, fragment.scope, fragment.body, fragment.description, fragment.keywords, fragment.domain, fragment.placeholders, fragment.label]);
           // Database.persist();
            return true;
        }
    }

    static getTreeItem(label: string)
    {
        if(this._loadedTreeItems.has(label))
        {
            return this._loadedTreeItems.get(label);
        }
    }
}