#!/usr/bin/env node
'use strict';
//#1 Find mssql.json
//#2 Connect to the DB and get a table description for tables defined in mssql.json or all if none defined
//#3 Generate scripts and put them in new or existing folder ./MSSQLScripts
//#4 Generate classes and put them in new or existing folder ./MSSQLEntities
let dbSettings,
    root = process.cwd(),
    fs = require("fs"),
    MSSQL = require('st-mssql-proc'),
    StPromise = require('st-promise'),
    swig = require('swig'),
    path = require('path');

try {
    let content = fs.readFileSync(path.join(root, 'mssql.json'), "utf8");
    dbSettings = JSON.parse(content);
} catch (e) {
    console.log("mssql.json not found!");
    return;
}

if (!dbSettings || !dbSettings.databases) {
    console.log("mssql.json incorrect format!");
    return;
}
console.log("Working...");

//Create support directory
let databases = [];
Object.keys(dbSettings.databases).forEach(k => databases.push(dbSettings.databases[k]));

databases.forEach(settings => {
    let DB = new MSSQL(settings), resultJson = {};
    resultJson[settings.database] = {};
    let pTables = new StPromise((resolve, reject) => {
        if (settings.tables) {
            resolve(settings.tables);
            return;
        }
        let tables = [];
        DB.call('sp_tables', { table_owner: 'dbo'}).success(r => {
            r.forEach(t => {
                if (t.TABLE_TYPE === 'TABLE' && t.TABLE_NAME !== 'sysdiagrams') {
                    tables.push(t.TABLE_NAME);
                }
            });
            resolve(tables);
        }).error(e => reject(e));
    });
    pTables.success(tables => {
        let colPromises = [];
        tables.forEach(table => {
            resultJson[settings.database][table] = {};
            let pColumns  = DB.call('sp_columns', { table_name: table }).success(r => {
                r.forEach(col => resultJson[settings.database][table][col.COLUMN_NAME] = col);
            });
            colPromises.push(pColumns);
        });
        Promise.all(colPromises).then(() => {
            //fs.writeFile(path.join(supportDir, 'databases.json'), JSON.stringify(resultJson));
            generateScripts(resultJson).success(r => {
                console.log('Done!');
            });
        }, console.log);
    }).error(e => console.log(e));
});

function generateScripts(databases) {
    let scriptsDir = path.join(root, './mssql-scripts');
    if (!fs.existsSync(scriptsDir)){
        fs.mkdirSync(scriptsDir);
    }
    let modulesDir = path.join(root, './mssql-entities');
    if (!fs.existsSync(modulesDir)){
        fs.mkdirSync(modulesDir);
    }
    return new StPromise((resolve, reject) => {
        Object.keys(databases).forEach(db => {
            let dir = path.join(scriptsDir, './' + db);
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            let mdir = path.join(modulesDir, './' + db);
            if (!fs.existsSync(mdir)){
                fs.mkdirSync(mdir);
            }
            Object.keys(databases[db]).forEach(table => {
                let columns = parseColumns(databases[db][table]),
                    tplAttrs = {
                        database: db,
                        table: table,
                        date: new Date(),
                        columns: columns,
                        identity: getIdentityColumn(columns)
                    };
                // swig.renderFile(path.join(__dirname, './templates/udt.sql'), tplAttrs, function(err, out){
                //     if (err) console.log(err);
                //     else console.log(out);
                // });
                let script = '-- MSSQl: UDT --\n\nUSE [' + db + ']\nGO\n';
                script += swig.renderFile(path.join(__dirname, './templates/udt.sql'), tplAttrs);
                script += '\n\n-- MSSQl: GET --\n\n';
                script += swig.renderFile(path.join(__dirname, './templates/get.sql'), tplAttrs);
                script += '\n\n-- MSSQl: POST --\n\n';
                script += swig.renderFile(path.join(__dirname, './templates/post.sql'), tplAttrs);
                fs.writeFile(path.join(dir, table + '.sql'), script);
                fs.writeFile(path.join(mdir, table + '.js'),
                    swig.renderFile(path.join(__dirname, './templates/module.js'), tplAttrs));
            });
        });
        resolve();
    });
}

function parseColumns (columns) {
    let parsedColumns = [];
    Object.keys(columns).forEach(c => {
        let col = columns[c];
        parsedColumns.push({
            name: col.COLUMN_NAME,
            isIdentity: col.TYPE_NAME.indexOf('identity') >= 0,
            definition: getColumnTypeDefinition(col.COLUMN_NAME, col.TYPE_NAME, col.PRECISION, col.SCALE)
        });
    });
    return parsedColumns;
}

function getIdentityColumn (parsedColumns) {
    let identity = { name: ''};
    parsedColumns.forEach(c => {
        if (c.isIdentity) identity = c;
    });
    return identity;
}

function getColumnTypeDefinition(column, type, precision, scale) {
    let isIdentity = type.indexOf('identity') >= 0,
        strings = ['char', 'varchar', 'nchar', 'nvarchar'];
    if (isIdentity) {
        type = type.replace('identity', '').trim();
    }
    if (strings.indexOf(type) >= 0) {
        return '[' + column + '] ' + type + ' (' + precision + ')';
    } else if (type === 'decimal') {
        return '[' + column + '] ' + type + ' (' + precision + ', '+ scale + ')';
    } else {
        return '[' + column + '] ' + type;
    }
}
