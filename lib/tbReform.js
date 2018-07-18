const fs = require("fs");
const path = require('path');
const async = require('async');
const moment = require('moment');
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
const tbTables = require('./tbTables');
const univ = config.univ;
var clientDB, db, dbUser, dataYear, logbuffer;
var quantitys = {
  departments: 0,
  contracts: 0,
  stewards: 0,
  incomes: 0,
  outlays0: 0,
  outlays1: 0,
  fromdate: '?',
  loaded: '?',
  version: config.version
};


function run(year, callback) {
  var fileName = path.join(config.tbPath, config.tbPrefix + year, tbTables[0].collection + '.txt');
  try {
    fs.accessSync(fileName, fs.constants.F_OK);
    tbReform(year, callback)
  } catch (err) {
    console.error(fileName + '- no access!');
    fs.writeFileSync("doc/importlog.log", "");
    callback(null);
  }
}


function tbReform(year, callback) {
  dataYear = year;
  async.series([
    openDB,
    singleReformChief,
    copyChief,
    createAdmin,
    rwSmeta,
    rwSteward,
    rwContract,
    rwEstimate,
    rwDepartmentsBuffer,
    rwDepDivContracts,
    rwIncome,
    rwOutlay0,
    rwOutlay1,
    rwSmetaDiff,
    wQuantitys,
    rwLogBuffer
  ], function(err) {
    clientDB.close();
    callback(err);
  });
}

function openDB(callback) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    clientDB = client;
    db = client.db(config.dbName + dataYear);
    dbUser = client.db(config.dbName);
    logbuffer = '\n';
    console.log(dataYear + " база данных " + config.dbName + dataYear);
    callback(null);
  });
}

function singleReformChief(callback) {
  dbUser.collection('chiefs').find({})
  .toArray(function(err, documents) { 
    var mustreform = false;
    if (err) {
      console.log('Error users')
      callback(err);
    } else {
      for (var i = 0; i < documents.length; i++) {
        var dep = documents[i].department;
        if (dep.length == 6) {
          mustreform = true;
          documents[i].department = dep.substr(1, 5);
        } else if (dep.length == 12) {
          mustreform = true;
          documents[i].department = dep.substr(1, 5) + dep.substr(7, 5);
        } else if (dep.length == 18) {
          mustreform = true;
          documents[i].department = dep.substr(1, 5) + dep.substr(7, 5) + dep.substr(13, 5);
        }
      }
    }
    if (mustreform) {
      dropCollectionIfExist(dbUser, 'chiefs', function (err) {
        if (err) callback(err);
        dbUser.collection('chiefs').insertMany(documents, function (error,res){callback(error);});
        console.log("singleReformChief, " + documents.length + " documents");
      });
    } else {
      callback(null);
    } 

  });
}

function copyChief(callback) {
  // копируем 'chiefs' из dbUser в db
  dbUser.collection('chiefs').find({})
  .toArray(function(err, documents) { 
    if (err) callback(err);
    if (documents.length) {
      dropCollectionIfExist(db, 'chiefs', function (err) {
        if (err) callback(err);
        db.collection('chiefs').insertMany(documents, function (error,res){callback(error);});
        console.log("copy chiefs, " + documents.length + " documents");
      });
    } else {
      callback(null);
    }
  });
}

function createAdmin(callback) {
  dbUser.collection('users').find({role: 'admin'})
  .toArray(function(err, documents) { 
    if (err) {
      console.log('Error users')
      callback(err);
    } else {
      if (documents.length) {
        callback(null);
      } else {
        //var salt = Math.random() + '';
        //var hashedPassword = crypto.createHmac('sha1', salt).update(Password).digest('hex');
        dbUser.collection('users').insertMany([
          {
            name: "Администратор", role: "admin", login: "admin",
            salt: "0.8189392053428559", hashedPassword: "f7db7aab4b2b0c2fed80f2802df9d2d434fb3fc4" 
          }, { 
            name: "Экономист", role: "booker", login: "booker",
            salt: "0.726377866201741", hashedPassword: "3acfca4d73190f913f5510780b7f4056ac64b728"
          }, { 
            name: "Ректор", role: "booker", login: "rector",
            salt: "0.8779520790081203", hashedPassword: "96f04986abcc9274f32a069c25c6a03ce009703f"
          }], 
          callback
        )
      }
    }
  });
}

function rwSmeta(callback) {
  // очистим набор досументов со сметами
  db.collection('Inet_MUSmetaFin')
  //.find({ contract: {$ne: ""}, depCode: {$ne: ""}, scope: {$ne: ""}, source: {$ne: ""}})
  .find({ contract: {$ne: ""}, depCode: {$ne: ""}})
  .toArray(function(err, smeta) {
    if (err) callback(err);

    dropCollectionIfExist(db, 'smeta', function (err) {
      if (err) callback(err);
      db.collection('smeta').insertMany(smeta, function (err) {
        if (err) callback(err);
        console.log("Create smeta, " + smeta.length + " documents");
  
  // соберём источники финансирования
  db.collection('Inet_MUSmetaFin')
  .aggregate([
    {$match: { contract: {$ne: ""}, depCode: {$ne: ""}, scope: {$ne: ""}, source: {$ne: ""}}},
    //{$match: { contract: {$ne: ""}, depCode: {$ne: ""}}},
    {$group: {_id: {source: "$source", scope: "$scope"} } },
    {$sort: {"_id.scope": 1, "_id.source": 1}}
  ])
  .toArray(function(err, result) {
    if (err) callback(err);
    var pattern = /Наука/i;
    // источники финансирования sourceParents [[Основная],[Наука]]
    var source1 = ['Основная', 'Наука'];
    var source2 = [ [], [] ];
    var source3 = [ [], [] ];
    var fin = [ [], [] ];
    for (var i = 0; i < result.length; i++) {
      // Вид деятельности
      result[i].scope = pattern.test(result[i]._id.scope) ? '1' : '0';
      var name, parent, nameId, parentId;
      // Источник финансирования
      var sourceName = result[i]._id.source;
      // Первое слово в sourceName считать ГруппойФинансирования parent
      var gapIndex = sourceName.indexOf(' ');
      if (gapIndex > 0) {
        parent = sourceName.substring(0, gapIndex);
        name = sourceName.substring(gapIndex);
      }
      else {
        parent = sourceName;
        name = ' ---'
      }
      parentId = source2[result[i].scope].indexOf(parent);
      if (parentId < 0) {
        parentId = source2[result[i].scope].length; 
        source2[result[i].scope].push(parent);
        source3[result[i].scope].push([]);
      }
      nameId = source3[result[i].scope][parentId].indexOf(name);
      if (nameId < 0) {
        nameId = source3[result[i].scope][parentId].length; 
        source3[result[i].scope][parentId].push(name);
        fin[result[i].scope].push({
          name: sourceName, 
          code: '0'+result[i].scope+parentId+nameId
        });
      }
    }
    var source = [{ _id: "0", name: "Вся деятельность"}];
    for (var i1 = 0; i1 < source1.length; i1++) {
      var lvl2 = source2[i1].length > 1 || (source2[i1].length && source3[i1][0] && source3[i1][0].length > 1);
      var lvl3 = source3[i1][0] && source3[i1][0].length > 1;
      source.push({ 
        _id: '0' + i1 + (lvl2 ? '' : '00'), 
        name: source1[i1] 
      });
      //if (source2[i1].length > 1 || (source2[i1].length && source3[i1][0] && source3[i1][0].length > 1) ) {
      if (lvl2) {
        for (var i2 = 0; i2 < source2[i1].length; i2++) {
          source.push({
            _id: '0' + i1 + i2 + (lvl3 ? '' : '0'), 
            name: source1[i1] + ' / ' + source2[i1][i2]
          });
          //if (source3[i1][0] && source3[i1][0].length > 1) {
            if (lvl3) {
            for (var i3 = 0; i3 < source3[i1][i2].length; i3++) {
              source.push({
                _id: '0' + i1 + i2 + i3, 
                name: source1[i1] + ' / ' + source2[i1][i2] + ' / ' + source3[i1][i2][i3]
              });
            }
          }
        }
      }
    }
    source.push({ _id: "0999", name: "Не указан тип или финансирование"});
    dropCollectionIfExist(db, 'sources', function (err) {
      if (err) callback(err);
      db.collection('sources').insertMany(source, function (err) {
        if (err) callback(err);
        console.log("Create sources, " + result.length + " documents");

        // сметы договоров сгрупировать по кодам КОСГУ eCode eName
        db.collection('Inet_MUSmetaFin')
        .aggregate([ 
          //{$match: { contract: {$ne: ""}, depCode: {$ne: ""}, scope: {$ne: ""}, source: {$ne: ""}}},
          {$match: { contract: {$ne: ""}, depCode: {$ne: ""}}},
          { $group : { 
                _id : {
                  contract : "$contract",  eCode: "$eCode", eName: "$eName"
                },
                remains: { $sum: "$remains"},
                plan: { $sum: "$plan"},
                income: { $sum: "$income"},
                outlayO: { $sum: "$outlayO"},
                outlay: { $sum: "$outlay"},
                balance: { $sum: "$balance"},
                balanceE: { $sum: "$balanceE"}
            } }, 
            { $lookup: {
              from: "smeta",
              localField: "_id.contract",
              foreignField: "contract",
              as: "options"
            } },
            {  $sort: { "_id.contract": 1, "_id.eCode": 1 } } 
        ])
        .toArray(function(err, result) {
          if (err) callback(err);
          var today = new Date();
          var currentYear = today.getFullYear();
          var restmonths;
          if (currentYear == dataYear) {
            restmonths = 1.0 / (12 - today.getMonth()) ;
          } else {
            restmonths = 0.0;
          }
          var pattern = /Наука/i;
          for (var i = 0; i < result.length; i++) {
            if (result[i].options.length) {
              result[i]._id.scope = result[i].options[0].scope, 
              result[i]._id.source = result[i].options[0].source, 
              result[i]._id.depCode = result[i].options[0].depCode, 
              result[i]._id.divCode = result[i].options[0].divCode, 
              result[i]._id.depAbbr = result[i].options[0].depAbbr, 
              result[i]._id.divAbbr = result[i].options[0].divAbbr, 
              result[i]._id.steward = result[i].options[0].steward 
            } else {
              result[i]._id.scope = '', 
              result[i]._id.source = '', 
              result[i]._id.depCode = '', 
              result[i]._id.divCode = '', 
              result[i]._id.depAbbr = '', 
              result[i]._id.divAbbr = '', 
              result[i]._id.steward = ''
            }
            result[i].options = null;
            if (result[i]._id.eCode == '') {
              result[i]._id.eCode = 'н.сметы';
            }
            // источник финансирования
            result[i].eCodeUrl = encodeURIComponent(result[i]._id.eCode);
            var sourceId = '0999';
            if (result[i]._id.scope && result[i]._id.source) {
              var scope = pattern.test(result[i]._id.scope) ? '1' : '0';
              for (var j = 0; j < fin[scope].length; j++) {
                if (fin[scope][j].name === result[i]._id.source) {
                  sourceId = fin[scope][j].code;
                  break;
                }
              }
            }
            result[i].source = sourceId;
            // идентификатор подразделения
            var department = univ._id;
            if (result[i]._id.depCode) {
              department += "00000".concat(result[i]._id.depCode).substr(-5);
              if (result[i]._id.divCode) {
                department += "00000".concat(result[i]._id.divCode).substr(-5);
              }
            }
            result[i].parent = department;
            result[i].steward = result[i]._id.steward;
            var balanceEM = result[i].balanceE * restmonths;
            result[i].balanceEM = Number(balanceEM.toFixed(2));
          }
          dropCollectionIfExist(db, 'smeta', function (err) {
            if (err) callback(err);
            db.collection('smeta').insertMany(result, callback);
            console.log("Create smeta, " + result.length + " documents");
          });
        });
      });
    });
  });
});
});
});
}

function rwSteward(callback) {
  // кадры, для администратора
  db.collection('smeta')
  .aggregate([
    {$match: { steward: { $ne: "" } } },
    {$group: {_id: {steward: "$steward"} } },
    {$sort: { "_id.steward": 1 } }
  ])
  .toArray(function(err, result) {
    if (err) callback(err);
    quantitys.stewards = result.length;
    for (var i = 0; i < result.length; i++) {
      result[i].name = result[i]._id.steward;
      result[i].url = encodeURIComponent(result[i]._id.steward);
    }
    dropCollectionIfExist(db, 'stewards', function (err) {
      if (err) callback(err);
      db.collection('stewards').insertMany(result, function (err){
        if (err) callback(err);
        // копия в базу администратора dbUser
        dropCollectionIfExist(dbUser, 'stewards', function (err) { 
          if (err) callback(err);
          dbUser.collection('stewards').insertMany(result, callback);
        });
        console.log("Create stewards, " + result.length + " documents");
      });
    });
  });
}

function rwContract(callback) {
  // список договоров
  db.collection('smeta').aggregate([ 
    { $group : { 
      _id : { 
      contract: "$_id.contract", 
      depCode: "$_id.depCode", 
      divCode: "$_id.divCode",
      steward: "$_id.steward",
      source: "$source" }
    }},
    { $sort: { "_id.contract": 1 } }
  ]).toArray(function(err, result) {
    if (err) callback(err);
    quantitys.contracts = result.length;
    var department, fullname, dd;
    for (var i = 0; i < result.length; i++) {
      department = univ._id;
      fullname = '/';
      if (result[i]._id.depCode) {
        dd = "00000".concat(result[i]._id.depCode).substr(-5);
        department += dd;
        fullname += dd + '/';
        if (result[i]._id.divCode) {
          dd = "00000".concat(result[i]._id.divCode).substr(-5);
          department += dd;
          fullname += dd + '/';
        }
      }
      fullname += ' ' + result[i]._id.contract;
      result[i].parent = department; 
      result[i].fullname = fullname;
    }
    dropCollectionIfExist(db, 'contracts', function (err) {
      if (err) callback(err);
      db.collection('contracts').insertMany(result, function (error,res){callback(error);});
      console.log("Create contracts, " + result.length + " documents");
    });
  });
}

function rwEstimate(callback) {
  // итоговые суммы по договору
  db.collection('smeta').aggregate([ 
      { $group : { 
          _id : { contract: "$_id.contract" },
          remains: { $sum: "$remains"},
          plan: { $sum: "$plan"},
          income: { $sum: "$income"},
          outlayO: { $sum: "$outlayO"},
          outlay: { $sum: "$outlay"},
          balance: { $sum: "$balance"},
          balanceE: { $sum: "$balanceE"},
          balanceEM: { $sum: "$balanceEM"}
      }},
      { $lookup: {
        from: "contracts",
        localField: "_id.contract",
        foreignField: "_id.contract",
        as: "contracts"
    } },
    { $sort: { "_id.contract": 1 } }
  ]).toArray(function(err, result) {
    if (err) callback(err);
    //quantitys.estimates = result.length;
    var docs = [];
    for (var i = 0; i < result.length; i++) {
      for (var j = 0; j < result[i].contracts.length; j++) {
        docs.push({
          contract: result[i]._id.contract,
          steward: result[i].contracts[j]._id.steward,
          source: result[i].contracts[j]._id.source,
          //fullname: result[i].contracts[j].fullname,
          parent: result[i].contracts[j].parent,
          estimate: {
            remains: result[i].remains,
            plan: result[i].plan,
            income: result[i].income,
            outlayO: result[i].outlayO,
            outlay: result[i].outlay,
            balance: result[i].balance,
            balanceE: result[i].balanceE,
            balanceEM: result[i].balanceEM
          }
        });
      }
    }
    dropCollectionIfExist(db, 'estimates', function (err) {
      if (err) callback(err);
      db.collection('estimates').insertMany(docs, function (error,res){callback(error);});
      console.log("Create estimates, " + docs.length + " documents");
    });
  });
}

function rwDepartmentsBuffer(callback) {
  db.collection('smeta').aggregate([
    { $group: { _id: { 
        depCode : "$_id.depCode", depAbbr : "$_id.depAbbr",
        divCode : "$_id.divCode", divAbbr : "$_id.divAbbr"
    } } },
    { $sort: { "_id.depCode": 1, "_id.divCode": 1 } }
  ])
  .toArray(function(err, buffer) {
    if (err) callback(err);
    var result = [];
    var depId = '@@@',  divId = '@@@', depName = '@@@', divName = '@@@';
    for (var i = 0; i < buffer.length; i++) {
      if (depId !== buffer[i]._id.depCode) {
        // очередной факультет
        depName = buffer[i]._id.depAbbr;
        divName = buffer[i]._id.depCode + buffer[i]._id.divCode;
        depId = buffer[i]._id.depCode;
        divId = buffer[i]._id.depCode;
        result.push({
          _id: { 
            depCode: buffer[i]._id.depCode, 
            divCode: ''
          },
          depAbbr: buffer[i]._id.depAbbr,
          divAbbr: '',
          name: buffer[i]._id.depCode + ' ' + buffer[i]._id.depAbbr,
          parent: univ._id,
          node: univ._id + "00000".concat(buffer[i]._id.depCode).substr(-5)
        })
      } else {
        if (depName !== buffer[i]._id.depAbbr) {
        logbuffer += depId + " - факультет имеет разные наименования! Исправлено.\n"
        }
      }
      if (divId !== buffer[i]._id.depCode + buffer[i]._id.divCode) {
        divId = buffer[i]._id.depCode + buffer[i]._id.divCode;
        divName = divId + buffer[i]._id.divAbbr;
        result.push({
          _id: { 
            depCode: buffer[i]._id.depCode, 
            divCode: buffer[i]._id.divCode
          },
          depAbbr: buffer[i]._id.depAbbr,
          divAbbr: buffer[i]._id.divAbbr,
          name: buffer[i]._id.divCode + ' ' + buffer[i]._id.divAbbr,
          parent: univ._id + "00000".concat(buffer[i]._id.depCode).substr(-5),
          node: univ._id + "00000".concat(buffer[i]._id.depCode).substr(-5) + 
              "00000".concat(buffer[i]._id.divCode).substr(-5)
        })
      } else {
        if (divName !== buffer[i]._id.depCode + buffer[i]._id.divCode + buffer[i]._id.divAbbr) {
        logbuffer += '/' + buffer[i]._id.depCode + '/' + buffer[i]._id.divCode + " - кафедра имеет разные наименования! Исправлено.\n"
        }
      }
    }
    result.unshift({
      _id: {depCode: univ.code, divCode : "" },
      depAbbr: univ.abbr,
      divAbbr: "",
      name: univ.code + ' ' + univ.abbr,
      parent: '',
      node: univ._id
    });
    dropCollectionIfExist(db, 'departments', function (err) {
    if (err) callback(err);
    db.collection('departments').insertMany(result, function (err) {
      if (err) callback(err);
        // копия в базу администратора dbUser
        dropCollectionIfExist(dbUser, 'departments', function (err) { 
          if (err) callback(err);
          dbUser.collection('departments').insertMany(result, callback);
        });
      });
    });
  });
}

function rwDepDivContracts(callback) {
  db.collection('departments').aggregate([
    { $lookup: {
        from: "estimates",
        localField: "node",
        foreignField: "parent",
        as: "contracts"
    } },
    { $lookup: {
      from: "chiefs",
      localField: "node",
      foreignField: "department",
      as: "chiefs"
    } }, 
    { $sort: { "node": 1} }
  ])
  .toArray(function(err, result) {
    if (err) callback(err);
    quantitys.departments = result.length;
    for (var i = 0; i < result.length; i++) {
      var chiefs = "", chief = "", chiefUrl = "#";
      if (result[i].chiefs.length) {
        var a = [];
        for (var j =0; j < result[i].chiefs.length; j++) {
          a.push(result[i].chiefs[j].steward)
        }
        a.sort();
        for (var j =0; j < a.length; j++) {
          if (j) {
            chiefs += ', ';
            chief += ', ..';
          } else {
            chief = a[0];
            chiefUrl = "/report/steward/" + encodeURIComponent(a[0]);
          }
          chiefs += a[j];
        }
      }
      result[i].chief = chief;
      result[i].chiefUrl = chiefUrl;
    }
    const collName = 'departments_contracts';
    dropCollectionIfExist(db, collName, function (err) {
      if (err) { console.log(err); callback(err); }
      db.collection(collName).insertMany(result, callback);
      console.log("Create " + collName + ", " + result.length + " documents");
    });
  });
}

function rwIncome(callback) {
  db.collection('Inet_MUDohod')
  .aggregate([
    {$match: {contract: {$ne: ""}}},
    { $lookup: {
        from: "contracts",
        localField: "contract",
        foreignField: "_id.contract",
        as: "contracts"
    } }
  ])
  .toArray(function(err, result) {
    if (err) callback(err);
    quantitys.incomes = result.length;
    for (var i = 0; i < result.length; i++) {
      if (result[i].contracts[0]) {
        result[i].parent = result[i].contracts[0].parent;
        result[i].steward = result[i].contracts[0]._id.steward;
        result[i].source = result[i].contracts[0]._id.source;
      } else {
        result[i].parent = '';
        result[i].steward = '';
        result[i].source = '0999';
      }
      result[i].contracts = null;
      if (result[i].eCode == '') {
        result[i].eCode = 'н.сметы';
      }
    }
    dropCollectionIfExist(db, 'incomes', function (err) {
      if (err) callback(err);
      db.collection('incomes').insertMany(result, callback);
      console.log("Create incomes, " + result.length + " documents");
    });
  });
}

function rwOutlay0(callback) {
  db.collection('Inet_MURashodLS')
  .aggregate([
    {$match: {contract: {$ne: ""}}},
    { $lookup: {
        from: "contracts",
        localField: "contract",
        foreignField: "_id.contract",
        as: "contracts"
    } }
  ])
  .toArray(function(err, result) {
    if (err) callback(err);
    quantitys.outlays0 = result.length;
    for (var i = 0; i < result.length; i++) {
      if (result[i].contracts[0]) {
        result[i].parent = result[i].contracts[0].parent;
        result[i].steward = result[i].contracts[0]._id.steward;
        result[i].source = result[i].contracts[0]._id.source;
      } else {
        result[i].parent = '';
        result[i].steward = '';
        result[i].source = '0999';
      }
      result[i].contracts = null;
      if (result[i].eCode == '') {
        result[i].eCode = 'н.сметы';
      }
    }
    const collName = 'outlays0';
    dropCollectionIfExist(db, collName, function (err) {
      if (err) callback(err);
      db.collection(collName).insertMany(result, callback);
      console.log("Create " + collName + ", " + result.length + " documents");
    });
  });
}

function rwOutlay1(callback) {
  db.collection('Inet_MURashodFaktLS')
  .aggregate([
    {$match: {contract: {$ne: ""}}},
    { $lookup:
      {
        from: "contracts",
        localField: "contract",
        foreignField: "_id.contract",
        as: "contracts"
      }
    }
  ])
  .toArray(function(err, result) {
    if (err) callback(err);
    quantitys.outlays1 = result.length;
    for (var i = 0; i < result.length; i++) {
      if (result[i].contracts[0]) {
        result[i].parent = result[i].contracts[0].parent;
        result[i].steward = result[i].contracts[0]._id.steward;
        result[i].source = result[i].contracts[0]._id.source;
      } else {
        result[i].parent = '';
        result[i].steward = '';
        result[i].source = '0999';
      }
      result[i].contracts = null;
      if (result[i].eCode == '') {
        result[i].eCode = 'н.сметы';
      }
    }
    const collName = 'outlays1';
    dropCollectionIfExist(db, collName, function (err) {
      if (err) callback(err);
      db.collection(collName).insertMany(result, callback);
      console.log("Create " + collName + ", " + result.length + " documents");
    });
  });
}


function rwSmetaDiff(callback) {
  db.collection('outlays0').aggregate([
    {$group: {
      _id: {contract: "$contract", eCode: "$eCode"},
      outlayO: {$sum: "$total" }
    }},
    { $sort : { "_id.contract": 1, "_id.eCode": 1 } }
  ])
  .toArray(function(err, result0) {
    if (err) callback(err);

    db.collection('outlays1').aggregate([
      {$group: {
        _id: {contract: "$contract", eCode: "$eCode"},
        outlay: {$sum: "$total" }
      }},
      { $sort : { "_id.contract": 1, "_id.eCode": 1 } }
    ])
    .toArray(function(err, result1) {
      if (err) callback(err);

      db.collection('smeta').find({})
      .sort({ "_id.contract": 1, "_id.eCode": 1 })
      .toArray(function(err, result) {
        if (err) callback(err);
        //var pattern = /Наука/i;
        var i0 = 0, i1 = 0;
        for (var i = 0; i < result.length; i++) {
          
          while (i0 < result0.length && result0[i0]._id.contract < result[i]._id.contract ) {
            i0++;
          }
          while (i0 < result0.length && result0[i0]._id.contract == result[i]._id.contract && result0[i0]._id.eCode < result[i]._id.eCode) {
            i0++;
          }
          if (i0 < result0.length && result0[i0]._id.contract == result[i]._id.contract  && result0[i0]._id.eCode == result[i]._id.eCode) {
            result[i].diffPlan = Math.abs( Math.round(result[i].outlayO) - Math.round(result0[i0].outlayO) );
            //result[i].outlayO = Math.round(result0[i0].outlayO);
          } else {
            result[i].diffPlan = Math.abs( Math.round(result[i].outlayO) );
            //result[i].outlayO = 0.0;
          }

          while (i1 < result1.length && result1[i1]._id.contract < result[i]._id.contract ) {
            i1++;
          }
          while (i1 < result1.length && result1[i1]._id.contract == result[i]._id.contract && result1[i1]._id.eCode < result[i]._id.eCode) {
            i1++;
          }
          if (i1 < result1.length && result1[i1]._id.contract == result[i]._id.contract  && result1[i1]._id.eCode == result[i]._id.eCode) {
            result[i].diffFact = Math.abs( Math.round(result[i].outlay) - Math.round(result1[i1].outlay) );
            //result[i].outlay = Math.round(result1[i1].outlay);
          } else {
            result[i].diffFact = Math.abs( Math.round(result[i].outlay) );
            //result[i].outlay = 0.0;
          }

          //result[i].balanceE = Math.round(result[i].remains + result[i].plan - result[i].outlayO);
          //result[i].balance = Math.round(result[i].remains + result[i].income - result[i].outlay);
        }
        const collName = 'smeta';
        dropCollectionIfExist(db, collName, function (err) {
          if (err) callback(err);
          db.collection(collName).insertMany(result, callback);
          console.log("Reform " + collName + ", " + result.length + " documents");
        });
      });
    });
  });
}

function wQuantitys(callback) {
  const stat = fs.statSync(path.join(config.tbPath, config.tbPrefix + dataYear, 'Inet_MUSmetaFin.txt'));
  moment.locale('ru');
  quantitys.fromdate = moment(stat.mtime).format("LLL");
  quantitys.loaded = moment().format("LLL");
  quantitys.year = dataYear;
  const collName = 'quantitys';
  dropCollectionIfExist(db, collName, function (err) {
    if (err) callback(err);
    db.collection(collName).insert(quantitys, callback);
    console.log("Create " + collName + ", 1 document");
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

function rwLogBuffer(callback) {
  db.collection('Inet_MUSmetaFin')
  .aggregate([
    {$match: { contract: {$ne: ""}, scope:""}},
    {$group: { _id: { contract : "$contract"}}}
    ])
  .toArray(function(err, result1) {
    if (err) callback(err);
    for (var i = 0; i < result1.length; i++) {
      logbuffer += result1[i]._id.contract + " - договор, не указан Тип_договора!\n";
    }
    db.collection('Inet_MUSmetaFin')
    .aggregate([
      {$match: { contract: {$ne: ""}, source:""}},
      {$group: { _id: { contract : "$contract"}}}
      ])
    .toArray(function(err, result2) {
      if (err) callback(err);
      for (var i = 0; i < result2.length; i++) {
        logbuffer += result2[i]._id.contract + " - договор, не указано Финансирование!\n";
      }
      fs.writeFileSync("doc/importlog.log", logbuffer);
      console.log(logbuffer);
      callback(null);
    });
  });
}


if (module.parent) {
  module.exports.reformData = run;
} else {
  const argv = process.argv;
  var dataYear;
  if (argv[2]) {
    dataYear = argv[2];
  } else {
    dataYear = new Date().getFullYear();
  }
  run(dataYear, function (err) {
    if (err) console.log('Ops Error while reform');
    if (err) throw new Error(err);
  });
}
