# st-mssql-tools
CLI Tool to generate standard node modules for a given set of MSSQL DB tables, it will also generate scripts to create Stored Procedures for reading and saving data as well as scripts for user defined table types.

## How to use

### Install

```bash
npm install -g st-mssql-tools
```

### How to use

The program expects a settings JSON that includes a DB settings object, it can contain as many databases as you want.
The settings object will be passed as is to mssql module.

```json
{
    "databases" : {
        "AlarmSystem" : {
            "user": "xxx",
             "password": "xxx",
             "server": "xxx",
             "database": "MyDB",
             "connectionTimeout" : 30000,
             "requestTimeout" : 30000,
             "domain": "DOMAIN"
        }
    }
}
```

For more information on settings see here (insert link).

Additionally you can add a "tables" string array listing all the tables you wish to generate scripts for. If no tables are listed it will generate scripts for all tables in the database.

Add this json to a file named mssql.json on your project root.
Then run:

```bash
st-mssql
```

### How it works

For every table on every database it will generate the following files:

```
/mssql-scripts
    - /[DBName]
        - Table.sql
/mssql-modules
    - /[DBName]
        - Table.js
```

The SQL file contains scripts to create the following:
- User defined table type (udt_TableName_obj)
- List/Get stored procedure (usp_TableName_Get)
  - An optional parameter is added for the identity column, e.g. @p_TableNameID. If passed it will return only that row, if no argument is given it returns a list of all rows.
- Insert/Update stored procedure (usp_TableName_Post)
  - It takes only one parameter named @p_Records of type UDT (the corresponding generated UDT). This procedure can save a single row or multiple rows (see st-mssql-proc for more information).

The Javascript file contains a module that exports the table object with methods to access the generated stored procedures:

#### Static methods

##### TableName.all
Returns a st-promise resolved with the list of all rows on the corresponding table.

##### TableName.byId
Takes an id.
Returns a st-promise resolved with the single row if found.

##### TableName.saveList
Takes an array of objects that conform to the generated UDT.
Returns a st-promise resolved with the list of all new and updated rows.

#### Instance methods
##### save
Saves the instance to the DB by calling usp_TableName_Post

## Limitations

Right now it only works for tables with one identity column (auto-increment).  
Tested with node v4.2.6.
