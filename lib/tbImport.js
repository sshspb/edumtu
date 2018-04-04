const fs = require("fs");
const path = require('path');
const async = require('async');
const windows1251 = require('windows-1251'); 
const mongodb = require('mongodb');
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
const tbTables = require('./tbTables');

function run(callback) {
  const tbPath = config.tbPath;
  const dbUrl = config.dbUrl;
  const dbName = config.dbName;
  MongoClient.connect(dbUrl, function(err, client) {
    const db = client.db(dbName);
    db.dropDatabase()
    .then (
      result => {
        async.eachSeries(
          tbTables, 
          function(table, callback) {
            db.collection(table.collection).insertMany(
              readTb(path.join(tbPath, table.collection + '.txt'), table.fields), 
              function(err, result) {
                console.log("Import " + table.collection + ", " + result.result.n + " documents");
                callback(err);
              }
            );
          },
          function (err) { 
            client.close();
            callback(err);
          }
        )
      },
      error => {
          client.close(); 
          callback(new Error("o_O"));
      }
    )
  });
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
  run(function (err) {
    if (err) throw new Error(err);
  });
}
