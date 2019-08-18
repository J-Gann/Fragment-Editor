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

When the Extension is installed, a new Tree View Container should appear on the left side of the editor. This container displays the Fragment Editor Tree View. This Tree View will be populated by created Fragments. To create an empty Frgment, click on the box to the top right of the Tree View. Enter the name of the Fragment, then press enter. The name of the Fragment should now appear in the Tree View on the left. If you click on the name a editor should open. With this editor almost avery property of the Fragment can be edited and saved with the button 'save' on the top right.

![Add Empty Fragment](https://j.gifs.com/4Q46g6.gif)

In order to structure the Fragments in folders the tag property of Fragments can be edited. A tag, when created in the tag property of a Fragment, will appear as a folder in the Tree View and contains all Fragments which have this tag added to their tag property.

![Add Tag](https://j.gifs.com/K1m8Kr.gif)

In order to create Fragments out of an existing document select the text you want to add as a Fragment then press the right mouse button. In the appearing menue press 'Add Fragment' and give it a name. If the document has a '.py' ending the extension will try to determine placeholders and their datatypes. Corresponding information and warning visualisations will appear. It is important that in order to determine datatypes the extension will try to execute the document which contains the selected code snippet.

![Parametrize Fragment](https://j.gifs.com/NLpONz.gif)

If the execution takes too long, it can be cancelled using the button 'Cancel' which appears on the bottom right.

![Cancel Execution](https://j.gifs.com/q7DQJr.gif)

To execute the python code the extension uses the (configurable) call statement 'python3' by default.

## Extension Settings

Following properties of the extension are configurable
- The call statement of python code (f.e. python or python2 or python3)

## External Libraries

- For design of the Fragment editor: https://materializecss.com/
- For calculating an ast in JSON format: https://github.com/fpoli/python-astexport
- For querying the JSON ast: https://www.npmjs.com/package/jsonpath

## Internal Structure of the Extension

The Extension consists of 3 main Parts:
- Database
- Tree View 
- Parametrization Algorithm

The database manages the creation and storage of Fragments and Tags, the Tree View displays all stored Fragments and Tags and the parametrization algorithm provides the main functionality of the extension: Parametrization of python Fragments.

The logic of the extension is located in the 'src' file. The database is implemented in the file 'database.ts' and utilises sqlite. The Tree View (the junction of the extension) is implemented in the file 'fragmentProvider.ts'. Most of the functionality the user can access through the GUI is defined here. The parametrization algorithm called PyPa is implemented in the file 'parametrization.ts'. 

## TODOs

- Add Testing
- Algorithm for parametrizing non-python code snippets
- Functionality for importing and exporting the database

