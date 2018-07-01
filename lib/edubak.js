/*
  Backup the database.
  node edubak.js -backup [<database> <backup file>]

  Restore the database.
  node edubak.js -replace [<backup file> <database>]
*/
const dbUrl = "mongodb://127.0.0.1:27017";  // сервер mongodb
const dbName = "edu";                       // <database> база данных по умолчанию
const dbFile = "D:/data/edubackup.json"     // <backup file> резервный_файл по умолчанию

const fs = require("fs");
const async = require('async');
const MongoClient = require('mongodb').MongoClient;

// создание резерной копии коллекций 'chiefs' и 'users' базы данных "dbName"
function backup(database, file) {
  var database_name, backup_file;
  if (database && file) {
    database_name = database;
    backup_file = file
  } else if (!database && !file) {
    database_name = dbName;
    backup_file = dbFile;
  } else {
    warn();
    return;
  }
  var output_list = [];
  MongoClient.connect(dbUrl, function(err, client) {
    if (err) throw err;
    // коллекция 'chiefs' руководители подразделений
    client.db(database_name).collection('chiefs').find({})
    .toArray(function(err, list_chiefs) { 
      if (err) throw err;
      output_list.push({collection: 'chiefs', data: list_chiefs});
      // коллекция 'users' пользователи сайта
      client.db(database_name).collection('users').find({})
      .toArray(function(err, list_users) { 
        if (err) throw err;
        client.close();
        output_list.push({collection: 'users', data: list_users});
        // запись информации в <резервный_файл>
        fs.writeFile(backup_file, JSON.stringify(output_list), function (err) {
          if (err) throw err;
          console.log('Saved in backup file ' + backup_file);
        });
      });
    });
  });
}

function replace(file, database) {
  var database_name, backup_file;
  if (file && database) {
    backup_file = file
    database_name = database;
  } else if (!file && !database) {
    backup_file = dbFile;
    database_name = dbName;
  } else {
    warn();
    return;
  }
  fs.readFile(backup_file, function(err, data) {
    if (err) throw err;
    const collections = JSON.parse(data);
    MongoClient.connect(dbUrl, function(err, client) {
      if (err) throw err;
      const db = client.db(database_name);
      async.eachSeries(
        collections, 
        function(collection, callback) {
          dropCollectionIfExist(db, collection.collection, function (err) {
            if (err) callback(err);
            db.collection(collection.collection).insertMany(
              collection.data, 
              function(err, result) {
                console.log("Restored " + collection.collection + ", " + result.result.n + " documents");
                callback(err);
              }
            );
          });
        },
        function (err) { 
          if (err) throw err;
          client.close();
          console.log('Database ' + database_name + ' from backup file ' + backup_file);
        }
      );
    });
  });
}

function dropCollectionIfExist(db, collName, callback) {
  db.listCollections({ name: collName }).hasNext()
  .then(
    result => {
      if (result) {
        db.collection(collName).drop(function(err, delOK) {callback(err);});
      } else {
        callback(null);
      }
    },
    error => { callback(error); }
  );
}

function warn() {
  console.log('Usage:\n\nBackup the database.\nnode edubak.js -backup [<database> <backup file>]\n\nRestore the database.\nnode edubak.js -replace [<backup file> <database>]')
}

const argv = process.argv;
if (argv[2]) {
  if (argv[2] == '-backup') {
    backup(argv[3], argv[4]);
  } else if (argv[2] == '-replace') {
    replace(argv[3], argv[4]);
  } else warn();
} else warn();
