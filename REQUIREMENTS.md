![](RackMultipart20210216-4-15nai25_html_4b07c7b46b91852b.png)

# Hoppscotch (Group 5)

**Mentor**

- Liyas Thomas ([https://in.linkedin.com/in/liyasthomas](https://in.linkedin.com/in/liyasthomas))

- Andrew Bastin ([https://github.com/AndrewBastin](https://github.com/AndrewBastin))

[https://www.linkedin.com/in/andrew-bastin-7456771a8/](https://www.linkedin.com/in/andrew-bastin-7456771a8/)

**Students**

- Rohan Rajpal (2017089)

- Isha Gupta (2018040)

- Raghav Gupta (2018076)

- Osheen Sachdev (2018059)

**Github (**[https://github.com/hoppscotch/hoppscotch](https://github.com/hoppscotch/hoppscotch)**)**

**Table of Contents**

[About Hoppscotch](#_5msm7s5mycgn)

[Abstract](#_oxykyqfrkdt5)

[Technology Stack](#_6hett9duzrzh)

[Software Requirements Specification](#_zbvzjme1x8h1)

[[P0] Teams feature](#_r701czf28feo)

[[P0] Workspaces](#_gexq52sckpx4)

[[P0] History, Collections, and Environments in GraphQL](#_9jdc9e0z12u)

[[P1] Navigation of API Document Generation](#_i7kcifx5zd10)

[[P2] API documentation markdown file](#_odk9f1pesd2r)

[[P1] Sync Collection with Git Repository / Gist](#_41b2ycxrwxzy)

[[P2] Open API support](#_hng68ob6clvn)

[FormData support for POST and PUT requests](#_2o4oskk2mw4c)

[Minutes of Meeting](#_e29dboyrm6x)

#

#

#

# About Hoppscotch

A free, fast, and beautiful API request builder used by 150k+ developers.

# Abstract

Hoppscotch is one of the most popular API request builders used by developers all across the world. There is a request for many features to make Hoppscotch even better, like teams, workspaces, porting RESTful API features such as History, Collections into GraphQL compatible and more.

# Technology Stack

- UI:
  - VueJS
  - TailwindCSS UI Framework
  - v-tooltip: pointer change on hover
  - vuejs-autocomplete: autocompleting the headers
  - nuxtjs/toast: Responsive, touch compatible toast plugin for Nuxt.js
- Axios, Promise based HTTP client for the browser and node.js
- Dynamic Code editor:
  - Ace: for inserting a dynamic code editor
  - Acorn - JavaScript parser used for linting purposes linter to format the code inside
  - Esprima - ECMAScript parser used for error detection and lintingto show errors in the code editor
  - Tern - A JavaScript code analyzer for deep, cross-editor language support autocomplete
- Firebase: Serverless backend as a service manages all the backend:
  - Auth providers: Google, Github
  - Database: Firestore (NoSQL): users
  - analytics
- GraphQL: for writing GraphQL queries, generating graphQL code completion, testing GraphQL endpoints etc.
- Paho-MQTT: Node client for MQTT ( machine-to-machine (M2M)/&quot;Internet of Things&quot; connectivity) protocol )
- mustache: Logicless templating system used to generate GitHub flavored Markdown compatible API documentation from JSONrendering JSON files
- Template engine
- Vuex-persist: A Vuex (state management library for Vue.js) plugin that enables you to save the state of your app to a persisted storage like Cookies or localStorage. save the current state of the application to the local browser storage
- NuxtJS : Web application framework based on Vue.js, Node.js, Webpack and Babel.js
- Yargs-parser: Option **parser** used by **yargs** to create the code for a request
- JavaScript

#

# Software Requirements Specification

## [P0] Teams feature

- The system shall allow the user to create a new team using a &quot;new team&quot; button on the landing/home page (ie: RESTful API page), GraphQL page and Settings page. CORRECTION: When the Teams feature is completed, users should be able to create teams from landing/home page (ie: RESTful API page), GraphQL page and Settings page.
- When the &quot;new team&quot; button is clicked, the system shall take:
  - the name of a team
  - email ID of the members
  - permission of the members
- When team creation details are entered, and the &quot;submit&quot; button is clicked, the following should be validated:
  - team name \&gt;= 6 characters
  - member email id format
- The system shall allow the user to toggle between &quot;My Collections&quot; and &quot;Team Collections&quot; on all pages.
- When the &quot;Team Collections&quot; tab is selected, the system shall allow the user to select and switch between a team from the existing teams.
- When a team is selected in the &quot;Team Collections&quot; tab, all collections of the team should be displayed as in the existing &quot;Collections&quot; tab.
- The system shall use &quot;[https://hoppscotch-backend.herokuapp.com/graphql](https://hoppscotch-backend.herokuapp.com/graphql)&quot; as the backend.

### Owner

- The system shall allow the owner of a team to &quot;edit&quot; the following parameters of the team:
  - Edit team name
  - Delete team
  - Remove and add members
  - Change member permissions
- When team edit details are entered and &quot;update&quot; button is clicked, the following should be validated for changed parameters:
  - team name \&gt;= 6 characters
  - member email id format

- The system shall allow the owners of a team to create a collection with the team.
- The system shall allow the owners of a team to import a collection from the personal collections.
- The system shall allow the owner to edit a team collection.
- The system shall allow the owner to export a team collection.
- The system shall allow the owner to export a team collection to a personal collections.
- The system shall allow the owner to exit a team only if the owner is not the only owner of the team.

### Editor

- The system shall allow the editor to create a collection with the team.
- The system shall allow the editor to import a collection to the team from the personal collections.
- The system shall allow the editor to edit a collection shared in the team.
- The system shall allow the editor to export a collection shared in the team.
- The system shall allow the editor to export a collection shared in the team to a personal collections.
- The system shall allow the editor to create a copy of a collection shared in the team.
- The system shall allow the editor to exit the team.

### Viewer

- The system shall allow the viewer to export a collection shared in the team.
- The system shall allow the viewer to exit the team.

## [P0] Workspaces

- The system shall allow the user to create and delete workspaces.
- The system shall allow the user to name and rename workspaces.
- The system shall allow the user to open, close and switch between different workspaces.
- The system shall display the following pages on each workspace:
  - Home
  - Realtime
  - GraphQL
  - Documentation
  - Settings
- The system shall save the state (current request setup) and history separately for each workspace.
- The system shall save the settings separately for each workspace.
- The system shall maintain a common set of collections, environments, notes and teams for the user, independent of the workspace.
- If a user is signed in, the system shall sync the state and history of each workspace with cloud.
- If a user is not signed in, the system shall sync the state and history of each workspace with the local browser cache.
- The system shall allow the user to share a workspace with teams.
- If a user has the owner or editor permission in a team the system shall allow the user to:
  - work on the workspace shared with the team (make queries and send requests)
  - view the current state and history of the workspace shared with the team.
- If a user has view access in a team the system shall allow the user to only view the current state and history of the workspace shared with the team.
- If no workspace is created initially, the system shall create a default workspace.
- The system shall not allow the user to close a workspace if that is the only open workspace

![](RackMultipart20210216-4-15nai25_html_f4ad6a548001475.jpg)

## [P0] History, Collections, and Environments in GraphQL

### History on GraphQL page:

- If the play button for a graphQL query is pressed, the system shall move the URL, headers, and query to the history section of GraphQL
- The system shall allow the user to restore the request saved in the history section, i.e., view the request again and reuse it.
- The system shall allow the user to star the request i.e. mark it as important
- The system shall allow the user to delete a request i.e. remove a request from history
- The system shall allow the user to clear entire history

### Collections on GraphQL page:

- The system shall allow the user to create an empty collection.
- The system shall allow the user to edit a collection&#39;s name.
- The system shall allow the user to delete a collection.
- The system shall allow the user to create and delete folders inside a collection or folder.
- The system shall allow the user to save the URL, headers and query as a request to a collection or a folder inside a collection.
- The system shall allow the user to create a collection of requests via importing/replacing with JSON from the local machine.
- The system shall allow the user to create a collection of requests via importing a Github Gist if the user is logged in with Github.
- The system shall allow the user to export a request as JSON to local machine.
- The system shall allow the user to export a request as a secret Gist on Github if the user is logged in via Github.

### Environment on GraphQL page:

- The system shall allow the user to save and create local environment variables, which can be passed as parameters while querying.
- The system shall allow the user to create local environment variables via importing/replacing with JSON from local machine.
- The system shall allow the user to create local environment variables via importing a Github Gist if the user is logged in with Github.
- The system shall allow the user to export local environment variables as JSON to local machine.
- The system shall allow the user to export local environment variables as a secret Gist on Github if the user is logged in via Github.

## [P1] Navigation of API Document Generation

- The system shall allow the user to cherry pick collections , folders and requests to generate documentation
- The system shall display checkboxes with each collection, folder and requests.

## [P2] API documentation markdown file

- The system shall display an auto generated table of content from selected requests/folders/collection
- generate API documentation UI with **modern best practices**
- The system shall allow the user to add metadata about the api queries.
  - metadata for the request - description
  - don&#39;t print values of parameters if it&#39;s empty
  - postman api documentation - reference
  - [https://documenter.getpostman.com/view/1559979/space-v1/6YwzFwT#701ca9dc-6060-9b1e-2b41-291bf9ca11b3](https://documenter.getpostman.com/view/1559979/space-v1/6YwzFwT#701ca9dc-6060-9b1e-2b41-291bf9ca11b3)

## [P1] Sync Collection with Git Repository / Gist

- If the user is logged in via Github, the system shall allow the user to remotely link their collection with a new github repository / gist
- The system shall sync a linked collection with github repository/gist on any change in the collection.
- The system shall allow the user fetch from repository button if user allows - permissions
- User should be able to toggle the syncing button on and off. If the user is not signed in with github the button will be disabled. If the user turns the toggle button take permission to create repository from user

## [P2] Open API support

- The system shall allow users to import OpenAPI specifications.
- The system shall transpile the imported specifications into Hoppscotch collections structure.
- The system shall display the transpiled specifications in the collections section.
- The system shall allow the user to choose whether to add new collections or replace old collections on import.

## FormData support for POST and PUT requests

- the table which accepts key and value should also accept files as values
- the user should be able to upload multiple files for a single request
- there should be a toggle whether to send the file or not
- there should be a delete button to remove that file from the table of key and values
- switch from the raw toggle to tabs, have two tabs: raw and tabular
- user should be able to switch between tabular input and raw input via tabs

###


# Minutes of Meeting

- Meeting 1: Introduction to Hoppscotch
  - Date: 19th January 2021
  - Duration: 40 Minutes
  - Duration - Mentor speaking: 30 Minutes
  - Duration - Students speaking: 10 Minutes
  - Who all attended the meeting: Liyas Thomas
  - Main points:
    - Team and course introduction
    - Project discussion
  -
- Meeting 2: Introduction to tech stack of Hoppscotch
  - Date: 22nd January 2021
  - Duration: 2 hours
  - Duration - Mentor speaking: 1 hour
  - Duration - Students speaking: 1 hour
  - Who all attended the meeting: Liyas Thomas
  - Agenda:
    - In depth discussion of different packages/modules used in Hoppscotch.
    - Discussion about different tech stack and how to get started with them.
- Meeting 3
  - Date: 25th January 2021
  - Duration: 2 hours
  - Duration - Mentor speaking: 1 hour
  - Duration - Students speaking: 1 hour
  - Who all attended the meeting: Liyas Thomas
  - Main points:
    - Discussion of SRS requirements in detail
    - Clarification on the features of teams
    - [https://drive.google.com/file/d/1OXj4u0h6pgWBN3Z-C-ZmXpXf-Kt8o5SF/view?usp=sharing](https://drive.google.com/file/d/1OXj4u0h6pgWBN3Z-C-ZmXpXf-Kt8o5SF/view?usp=sharing)
- Meeting 4
  - Date: 1st February 2021
  - Duration: 1 hour
  - Duration - Mentor speaking: 30 minutes
  - Duration - Students speaking: 30 minutes
  - Who all attended the meeting: Liyas Thomas, Andrew Bastin
  - Main points:
    - Discussed doubts in the first draft of the SRS
    - Discussion on how to start the next task i.e. the teams task
    - [https://drive.google.com/file/d/1pJR5ubL4pn3m8WDu01FpgU9Y2WJ13Ho5/view?usp=sharing](https://drive.google.com/file/d/1pJR5ubL4pn3m8WDu01FpgU9Y2WJ13Ho5/view?usp=sharing)
- Meeting 5
  - Date: 8th February 2021
  - Duration: 1 hour
  - Duration - Mentor speaking: 30 minutes
  - Duration - Students speaking: 30 minutes
  - Who all attended the meeting: Liyas Thomas
  - Main points:
    - Discussed doubts in the teams feature
    - Discussed doubt in the workspace feature regarding what all components needs to be synced
    - Discussed the front end and back end aspects of the formData feature
    - Understood the basic flow and structure of the code
  - Notes
    - formdata is an array of arrays, each inner array has a key and a value
    - setroute query emits an event in the query page
