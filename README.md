# frag.edit

A VS Code extension which was created for the course "Programming Tools For Data Science" at Heidelberg University.

## Description

This VS Code extension can be used to create, edit and manage code snippets from any language. For the python language, placeholders in code snippets can be calculated alongside with their datatype.
A placeholder is considered to be a variable which is used but not declared inside a code snippet.

## Features

- Create an empty Fragment (code snippet along with additional properties)
- Display a list of Fragments in a Tree View
- Edit the properties of a Fragment with a simple editor
- Delete Fragments from the Tree View
- Parametrize code snippets written in python
- Calculate datatypes of placeholders for executable python code
- Sorting of Fragments using folders by assigning tags to each Fragment

## Usage

### Adding Empty Fragments
When the Extension is installed, a new Tree View Container appears on the left side of the editor. This container displays the Fragment Editor Tree View. This Tree View will be populated by created Fragments. To create an empty Fragment, click on the box on the top right of the Tree View. Enter the name of the Fragment, then press enter. The name of the Fragment now appears in the Tree View on the left. If you click on an entry in the Tree View, an editor opens. With this editor properties of the Fragment can be edited and saved with the button 'save' on the top right.

![Add Empty Fragment](https://j.gifs.com/4Q46g6.gif)

### Adding Tags

In order to structure Fragments in folders, the tag property of Fragments can be used. A tag, when created in the tag property of a Fragment, will appear as a folder in the Tree View and contains all Fragments which have this tag added to their tag property.

![Add Tag](https://j.gifs.com/K1m8Kr.gif)

### Parametrizing Fragments

In order to create Fragments out of an existing document select the text you want to add as a Fragment, then press the right mouse button. In the appearing menue press 'Add Fragment' and give it a name. If the document has a '.py' ending, the extension will try to determine placeholders and their datatypes. Corresponding information and warning visualisations will appear. It is important that in order to determine datatypes the extension will try to execute the document, which contains the selected code snippet.

![Parametrize Fragment](https://j.gifs.com/NLpONz.gif)

### Canceling Execution

If the execution takes too long, it can be cancelled using the button 'Cancel' which appears on the bottom right.

![Cancel Execution](https://j.gifs.com/q7DQJr.gif)

To execute the python code the extension uses the (configurable) call statement 'python3'.

### Parametrization inside Fragment Editor

If an already saved Fragment should be parametrized, (because it was f.e. added by the frag.Extract Addon) the button 'Parametrize as Python' in the Fragment Editor beneath the body property can be used. This tries to extract placeholders from the Fragment, assuming the Fragment's language is Python. Notice, that datatypes of placeholders can't be determined in this case.

![Parametrize in Editor](https://j.gifs.com/4Q46E2.gif)

## Extension Settings

Following properties of the extension are configurable
- The call statement of python code (f.e. python or python2 or python3)

## External Libraries

- For design of the Fragment editor: https://materializecss.com/
- For calculating an ast in JSON format: https://github.com/fpoli/python-astexport
- For querying the JSON ast: https://www.npmjs.com/package/jsonpath

## Internal Structure of the Extension

The Extension consists of 5 main Parts:
- Fragment
- Database
- Tree View
- Parametrization Algorithm
- Fragment Editor

The Fragment is an object which contains important properties of a code snippet. The database manages creation and storage of Fragments and Tags. The Tree View displays all stored Fragments and Tags. The parametrization algorithm provides the main functionality of the extension: Parametrization of python Fragments. The Fragment Editor enables the user to look at and modify the properties of every Fragment.

The logic of the extension is located in the 'src' file. The Fragment is implemented in the file 'fragments.ts'. It is the goal of the extension to enable the creation, modification and overall management of these Fragments. The database is implemented in the file 'database.ts' and utilises sqlite. The Tree View (the junction of the extension) is implemented in the file 'fragmentProvider.ts'. Most of the functionality the user can access through the GUI is defined here. The parametrization algorithm called PyPa is implemented in the file 'parametrization.ts'.

### Fragment
The Fragment contains typical properties of a code snippet like label, description, prefix, body and scope but also contains some additional information for management in the editor like tags, placeholders, keywords and domain.

### Database
The database utilises sqlite. It saves Fragments on disk and loads them all into memory on startup. The database is defined to be located at the homedirectory inside a folder called 'fragments'. The corresponding file gets automatically created if it does not exist. The database contains several utility methods for managing Fragments in order to f.e. add Fragments, delete Fragments and update Fragments.

Besides Fragments, the database class stores TreeItems, Tags and Domains (not persistent) and contains several utility functions for these similar to those for Fragments.

### Fragment Provider
As the name suggests, this class provides Fragments to the editor, in this case, as entries to the Tree View. What is displayed in the Tree View are not actually the Fragments themselves but an object called treeItem. These treeItems can either appear as a Tag or as a Fragment, depending on how they were instantiated. A treeItem with the contextValue "fragment" appears with the label of it's assigned fragment in the treeView. A treeItem with the contextValue "tag" appears as a folder with it's initialized name in the TreeView. This folder can contain multiple treeItems with contextValue "fragment", which have a fragment assigned that contains the tag of the folder in its tag propertie. The method 'createTreeStructure' creates all necessary treeItems for the stored Fragments dynamically. The method 'getChildren' gets called by the Tree View and displays all TreeItems the function returns.

The Fragment Provider contains several functions which can be called by the user from the GUI:
- editFragment: Open the editor for the given fragment
- addEmptyFragment: Add an empty fragment
- addFragment: Add a fragment by selecting a snippet inside a text document
- deleteTreeItem: Delete the given treeitem (In case the TreeItem is a tag, the tag gets removed from the Fragment. In case the TreeItem is a Fragment, the Fragment gets deleted)

### Parametrization
PyPa (Python Parametrization) computes placeholders and the corresponding datatypes of a code snippet for any executable python script.
In order to retrieve placeholders, the AST (abstract syntax tree) of the python code gets created and ported in JSON format (using astexport).
The AST includes information about which variables are defined and which are used as parameter.
Every variable, which is used as parameter but is not defined within a code snippet is considered a placeholder.
In order to find these placeholders, the AST is queried for declared and used variables (using jsonpath).
In order to retrieve the datatype of found placeholders, the original python code gets modified and executed.
The following code is inserted at the beginning:
```Python
def detType(id, x):
     print('{\"id\": \"' + str(id) + '\", \"type\": ' + '\"' + str(type(x)) + '\"' + '}')
     return x
```
Every placeholder gets replaced by a call of this function with the name of the placeholder (string) as first parameter and the value of the placeholder (any datatype) as second parameter. This function prints the corresponding datatype for each placeholder during runtime. The output is then collected and processed.

### Fragment Editor
The Fragment Editor is implemented using a Web View. Through vscode specific API's the communication between Web View and Extension is possible and therefore enables the modification of Fragments through the Web View with according updates in the Database.

## TODOs

- Add Testing (especially for PyPa to find as many cases of declarations and parameters in the AST as possible)
- Algorithm for parametrizing non-python code snippets (should be no problem f.e for strongly typed languages)
- Functionality for importing and exporting the database
- In PyPa: Add recognition of definitions in imported modules (PyPa f.e. assumes all imported functions to be placeholders because they were not defined in the document itself)
- Updating the sqlite dependency the database uses (updates to usage of promises)
- In PyPa: Find a workaround for infinite loops to be able to get datatypes even if the code does not terminate
- Color highlighting of placeholders in body in Fragment Editor / general syntax highlighting
