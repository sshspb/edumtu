const fs = require("fs");
const path = require('path');
const async = require('async');
const moment = require('moment');
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');

var db;
var clientDB;
var quantitys = {
  contracts: 0,
  departments: 0,
  stewards: 0,
  incomes: 0,
  outlays0: 0,
  outlays1: 0,
  fromdate: '?',
  loaded: '?',
  version: config.version
};
const univ = config.univ;

function run(callback) {
  async.series([
    //importD,
    openDB,
    singleReformChief,
    createAdmin,
    rwSmeta,
    rwSteward,
    rwContract,
    rwEstimate,
    rwDep,
    rwDiv,
    rwDepDivContracts,
    //depEstimate2,
    rwIncome,
    rwOutlay0,
    rwOutlay1,
    rwSmetaDiff,
    wQuantitys
  ], function(err) {
    clientDB.close();
    callback(err);
  });
}

function importD(callback) {
  callback(null);
  //const importData = require('./tbImport').importData;
  //importData(callback);
}

function openDB(callback) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    clientDB = client;
    db = client.db(config.dbName);
    callback(null);
  });
}

function singleReformChief(callback) {
  db.collection('chiefs').find({})
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
      dropCollectionIfExist(db, 'chiefs', function (err) {
        if (err) callback(err);
        db.collection('chiefs').insertMany(documents, function (error,res){callback(error);});
        console.log("singleReformChief, " + documents.length + " documents");
      });
    } else {
      callback(null);
    } 
  });
}

function createAdmin(callback) {
  db.collection('users').find({role: 'admin'})
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
        db.collection('users').insertMany([
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
  // соберём источники финансирования
  db.collection('Inet_MUSmetaFin')
  .aggregate([
    {$match: {steward: { $ne: "" }, depCode: { $ne: "" } } },
    {$group: {_id: {source: "$source", scope: "$scope"} } },
    {$sort: {"_id.scope": 1, "_id.source": 1}}
  ])
  .toArray(function(err, result) {
    if (err) callback(err);
    var pattern = /Наука/i;
    // источники финансирования sourceParents [[Основная],[Наука]]
    var source1 = ['Основная', 'Наука'];
    var source2 = [[], []];
    var source3 = [[], []];
    var fin = [[], []];
    for (var i = 0; i < result.length; i++) {
      result[i].scope = pattern.test(result[i]._id.scope) ? '1' : '0';
      var name, parent, nameId, parentId;
      var gapIndex = result[i]._id.source.indexOf(' ');
      if (gapIndex > 0) {
        parent = result[i]._id.source.substring(0, gapIndex);
        name = result[i]._id.source.substring(gapIndex);
      }
      else {
        parent = result[i]._id.source;
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
          name: result[i]._id.source, 
          code: '0'+result[i].scope+parentId+nameId
        });
      }
    }
    var source = [{ _id: "0", name: "Вся деятельность"}];
    for (var i1 = 0; i1 < source1.length; i1++) {
      source.push({ 
        _id: '0' + i1, 
        name: source1[i1] 
      });
      if (source2[i1].length > 1 || (source2[i1].length && source3[i1][0] && source3[i1][0].length > 1) ) {
        for (var i2 = 0; i2 < source2[i1].length; i2++) {
          source.push({
            _id: '0' + i1 + i2, 
            name: source1[i1] + ' / ' + source2[i1][i2]
          });
          if (source3[i1][0] && source3[i1][0].length > 1) {
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
    //source.push({ _id: "0999", name: "Прочие"});
    dropCollectionIfExist(db, 'sources', function (err) {
      if (err) callback(err);
      db.collection('sources').insertMany(source, function (err) {
        if (err) callback(err);
        console.log("Create sources, " + result.length + " documents");

        // сметы договоров
        db.collection('Inet_MUSmetaFin')
        .aggregate([ 
            { $match: { contract: {$ne: ""}, depCode: {$ne: ""} } },
            { $group : { 
                _id : {
                  contract : "$contract", scope: "$scope", source: "$source", 
                  eCode: "$eCode", eName: "$eName",
                  depCode:"$depCode", divCode: "$divCode", 
                  depAbbr:"$depAbbr", divAbbr: "$divAbbr", 
                  steward: "$steward"
                },
                remains: { $sum: "$remains"},
                plan: { $sum: "$plan"},
                income: { $sum: "$income"},
                outlayO: { $sum: "$outlayO"},
                outlay: { $sum: "$outlay"},
                balance: { $sum: "$balance"},
                balanceE: { $sum: "$balanceE"}
            } }, 
            {  $sort: { "_id.contract": 1, "_id.eCode": 1 } } 
        ])
        .toArray(function(err, result) {
          if (err) callback(err);
          var pattern = /Наука/i;
          for (var i = 0; i < result.length; i++) {
            if (result[i]._id.eCode == '') {
              result[i]._id.eCode = 'н.сметы';
            }
            result[i].eCodeUrl = encodeURIComponent(result[i]._id.eCode);
            var scope = pattern.test(result[i]._id.scope) ? '1' : '0';
            var sourceId = '0999';
            for (var j = 0; j < fin[scope].length; j++) {
              if (fin[scope][j].name === result[i]._id.source) {
                sourceId = fin[scope][j].code;
                break;
              }
            }
            result[i].source = sourceId;
            var department = univ._id;
            if (result[i]._id.depCode) {
              department += "00000".concat(result[i]._id.depCode).substr(-5);
              if (result[i]._id.divCode) {
                department += "00000".concat(result[i]._id.divCode).substr(-5);
              }
            }
            result[i].parent = department;
            result[i].steward = result[i]._id.steward;
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
      db.collection('stewards').insertMany(result, function (error,res){callback(error);});
      console.log("Create stewards, " + result.length + " documents");
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
          balanceE: { $sum: "$balanceE"}
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
          parent: result[i].contracts[j].parent,
          fullname: result[i].contracts[j].fullname,
          estimate: {
            remains: result[i].remains,
            plan: result[i].plan,
            income: result[i].income,
            outlayO: result[i].outlayO,
            outlay: result[i].outlay,
            balance: result[i].balance,
            balanceE: result[i].balanceE
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


function rwDep(callback) {
  db.collection('smeta').aggregate([
    { $group: { _id: { depCode: "$_id.depCode", depAbbr: "$_id.depAbbr"} } },
    { $sort: { "_id.depCode": 1 } }
  ])
  .toArray(function(err, result) {
    if (err) callback(err);
    for (var i = 0; i < result.length; i++) {
      result[i]._id.divCode = "";
      result[i]._id.divAbbr = "";
      result[i].name = result[i]._id.depCode + ' ' + result[i]._id.depAbbr;
      result[i].parent = univ._id;
      result[i].node = univ._id + "00000".concat(result[i]._id.depCode).substr(-5) ;
    }
    result.unshift({
      _id: {depCode: univ.code, depAbbr: univ.abbr, divCode : "", divAbbr : ""},
      name: univ.code + ' ' + univ.abbr,
      parent: '',
      node: univ._id
  });
  const collName = 'departments';
    dropCollectionIfExist(db, collName, function (err) {
      if (err) callback(err);
      db.collection(collName).insertMany(result, callback);
    });
  });
}

function rwDiv(callback) {
  db.collection('smeta').aggregate([
      { $match: { "_id.divCode": { $ne: ''} } },
      { $group: { _id: { 
          depCode : "$_id.depCode", depAbbr : "$_id.depAbbr",
          divCode : "$_id.divCode", divAbbr : "$_id.divAbbr"
      } } },
      { $sort: { "_id.depCode": 1, "_id.divCode": 1 } }
  ])
  .toArray(function(err, result) {
    if (err) callback(err);
    for (var i = 0; i < result.length; i++) {
      result[i].name = result[i]._id.divCode + ' ' + result[i]._id.divAbbr;
      result[i].parent = univ._id + "00000".concat(result[i]._id.depCode).substr(-5);
      result[i].node = result[i].parent + "00000".concat(result[i]._id.divCode).substr(-5);
      }
    db.collection('departments').insertMany(result, callback);
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
            chief += ',... ';
          } else {
            chief = a[0];
            chiefUrl = "/report/steward/" + encodeURIComponent(a[0]);
          }
          chiefs += a[j];
        }
      }
      result[i].chief = chief;
      result[i].chiefUrl = chiefUrl;
      result[i].estimate = {remains: 0, plan: 0, income: 0, outlayO: 0, outlay: 0, balance: 0, balanceE: 0};
      for(var j = 0; j < result[i].contracts.length; j++) {
        result[i].estimate.remains += result[i].contracts[j].estimate.remains;
        result[i].estimate.plan += result[i].contracts[j].estimate.plan;
        result[i].estimate.income += result[i].contracts[j].estimate.income;
        result[i].estimate.outlayO += result[i].contracts[j].estimate.outlayO;
        result[i].estimate.outlay += result[i].contracts[j].estimate.outlay;
        result[i].estimate.balance += result[i].contracts[j].estimate.balance;
        result[i].estimate.balanceE += result[i].contracts[j].estimate.balanceE;
      }
    }
    const collName = 'departments_contracts';
    dropCollectionIfExist(db, collName, function (err) {
      if (err) { console.log(err); callback(err); }
      db.collection(collName).insertMany(result, callback);
      console.log("Create " + collName + ", " + result.length + " documents");
    });
  });
}

function depEstimate2(callback) {
  db.collection('departments_buffer').aggregate([
    { $match: { parent: { $ne: "" } } },
    { $lookup:
      {
        from: "departments_buffer",
        localField: "_id",
        foreignField: "parent",
        as: "childrens"
      }
    },
    { $sort: { "_id": 1} }
  ])
  .toArray(function(err, result) {
    if (err) callback(err);
    var mtu = [
      {
        _id: '0' + univ._id,
        name: univ.code + ' ' + univ.abbr,
        parent: '',
        scope: '0',
        url: '/report/department/'.concat('0' + univ._id),
        steward: null,
        estimate: { remains: 0, plan: 0, income: 0,
          outlayO: 0, outlay: 0, balance: 0, balanceE: 0, balanceWO: 0, balanceO: 0 },
        contracts : []
      },
      {
        _id: '1' + univ._id,
        name: univ.code + ' ' + univ.abbr,
        parent: '',
        scope: '1',
        url: '/report/department/'.concat('1' + univ._id),
        steward: null,
        estimate: { remains: 0, plan: 0, income: 0,
          outlayO: 0, outlay: 0, balance: 0, balanceE: 0, balanceWO: 0, balanceO: 0 },
        contracts : []
      }
    ];
    for (var i = 0; i < result.length; i++) {
      if (result[i].parent != "") {
        for(var k = 0; k < result[i].childrens.length; k++) {
          result[i].estimate.remains += result[i].childrens[k].estimate.remains;
          result[i].estimate.plan += result[i].childrens[k].estimate.plan;
          result[i].estimate.income += result[i].childrens[k].estimate.income;
          result[i].estimate.outlayO += result[i].childrens[k].estimate.outlayO;
          result[i].estimate.outlay += result[i].childrens[k].estimate.outlay;
          result[i].estimate.balance += result[i].childrens[k].estimate.balance;
          result[i].estimate.balanceE += result[i].childrens[k].estimate.balanceE;
          result[i].estimate.balanceWO += result[i].childrens[k].estimate.balanceWO;
          result[i].estimate.balanceO += result[i].childrens[k].estimate.balanceO;
        }
      }
      if (result[i].parent == result[i].scope + univ._id) {
        var ns = Number(result[i].scope);
        mtu[ns].estimate.remains += result[i].estimate.remains;
        mtu[ns].estimate.plan += result[i].estimate.plan;
        mtu[ns].estimate.income += result[i].estimate.income;
        mtu[ns].estimate.outlayO += result[i].estimate.outlayO;
        mtu[ns].estimate.outlay += result[i].estimate.outlay;
        mtu[ns].estimate.balance += result[i].estimate.balance;
        mtu[ns].estimate.balanceE += result[i].estimate.balanceE;
        mtu[ns].estimate.balanceWO += result[i].estimate.balanceWO;
        mtu[ns].estimate.balanceO += result[i].estimate.balanceO;
      }
      result[i].childrens = null;
    }
    result.unshift(mtu[1]);
    result.unshift(mtu[0]);

    const collName = 'departments_contracts';
    dropCollectionIfExist(db, collName, function (err) {
      if (err) console.log(err);
      if (err) callback(err);
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
  const stat = fs.statSync(path.join(config.tbPath, 'Inet_MUSmetaFin.txt'));
  moment.locale('ru');
  quantitys.fromdate = moment(stat.mtime).format("LLL");
  quantitys.loaded = moment().format("LLL");
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

if (module.parent) {
  module.exports.reformData = run;
} else {
  run(function(err) {
    if (err) console.log('Ops Error while reform');
    else console.log('OK reform done');
  });
}
