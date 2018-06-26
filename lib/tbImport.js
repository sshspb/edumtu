const fs = require("fs");
const path = require('path');
const async = require('async');
const windows1251 = require('windows-1251'); 
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
const tbTables = require('./tbTables');

function run(dataYear, callback) {
  const dbUrl = config.dbUrl;
  const dbName = config.dbName + dataYear;
  const tbPath = path.join(config.tbPath, config.tbPrefix + dataYear);
  console.log(dataYear + " год из папки " + tbPath);
  MongoClient.connect(dbUrl, function(err, client) {
    const db = client.db(dbName);
    async.eachSeries(
      tbTables, 
      function(table, callback) {
        dropCollectionIfExist(db, table.collection, function (err) {
          if (err) callback(err);
          db.collection(table.collection).insertMany(
            readTb(path.join(tbPath, table.collection + '.txt'), table.fields), 
            function(err, result) {
              console.log("Import " + table.collection + ", " + result.result.n + " documents");
              callback(err);
            }
          );
        })
      },
      function (err) { 
        client.close();
        callback(err);
      }
    );
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

const readTb = function(fileName, fields) {
  var content = fs.readFileSync(fileName).toString('binary');
  content = windows1251.decode(content);    // cp1251 --> utf8
  content = content.split(/[\n\r]+/ig);     // строка --> массив строк
  content.shift();                          // первую строку отбросить
  var hashData = [ ];
  content.forEach(function(item){
    if(item){
      // отбросить символы '~' в начале и в конце строки, и разбить на массив подстрок
      item = item.replace(/^~|~~$/g, '').split('~~');
      var hashItem = { };
      fields.forEach(function(field, index){
        if (field.name) {
          switch (field.type) {
            case 'string': 
              hashItem[field.name] = item[index].trim();
              break;
            case 'int': 
              hashItem[field.name] = Number(item[index].trim() || '0');
              break;
            case 'double': 
              var k = Number(item[index].trim().replace(',', '.') || '0');
              hashItem[field.name] = Number(k.toFixed(2));
              break;
            case 'decimal': 
              var k = Number(item[index].trim().replace(',', '.') || '0');
              hashItem[field.name] = Number(k.toFixed(2));
              //hashItem[field.name] = mongodb.Decimal128.fromString(k.toFixed(2));
              break;
            case 'date': 
              var dmy = item[index].trim().split('.');
              hashItem[field.name] = new Date(dmy[2], +dmy[1] - 1, dmy[0]);
              break;
            case 'bool': 
              hashItem[field.name] = Boolean( item[index].trim() == 'False' ? 0 : 1);
              break;
            default: 
              hashItem[field.name] = item[index].trim();
              break;
          }
        }
      });
      hashData.push(hashItem);
    }
  });
  return hashData;
}

if (module.parent) {
  module.exports.importData = run;
} else {
  const argv = process.argv;
  var dataYear;
  if (argv[2]) {
    dataYear = argv[2];
  } else {
    dataYear = new Date().getFullYear();
  }
  run(dataYear, function (err) {
    if (err) throw new Error(err);
  });
}
