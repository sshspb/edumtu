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
  eclasses: 0,
  estimates: 0,
  incomes: 0,
  outlays: 0,
  sources: 0,
  species: 0,
  stewards: 0,
  fromdate: '?',
  loaded: '?',
  version: config.version
};
const univ = { _id: "000000", code : "000", abbr : "СПбМТУ" };

function run(callback) {
  async.series([
    importD,
    openDB,
    rwEclass,
    rwEstimate,
    rwContract,
    rwSteward,
    rwDep,
    rwDiv,
    depEstimate1,
    depEstimate2,
    rwSource,
    rwIncome,
    rwOutlay,
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

function rwEclass(callback) {
  db.collection('Inet_SmetaLSAll').aggregate(
    [
      {
        $group : { 
          _id: { eCode: "$eCode", eName: "$eName"},
          remains: { $sum: "$remains"},
          plan: { $sum: "$plan"},
          income: { $sum: "$income"},
          outlayO: { $sum: "$outlayO"},
          outlay: { $sum: "$outlay"},
          balance: { $sum: "$balance"},
          balanceE: { $sum: "$balanceE"},
          balanceWO: { $sum: "$balanceWO"}
        }
      },
      { $sort: { "_id.eCode": 1 } }
    ]
  ).toArray(function(err, result) {
    if (err) callback(err);
    quantitys.eclasses = result.length;
    var collName = 'eclasses';
    dropCollectionIfExist(db, collName, function (err) {
      if (err) callback(err);
      db.collection(collName).insertMany(result, function (error,res){callback(error);});
      console.log("Inserted " + result.length + " documents into the " + collName);
    });
  });
}

function rwEstimate(callback) {
  db.collection('Inet_SmetaLSAll').aggregate(
    [ {
        $group : { 
          _id : { 
            contract : "$contract",  eCode: "$eCode", eName: "$eName"
          },
          remains: { $sum: "$remains"},
          plan: { $sum: "$plan"},
          income: { $sum: "$income"},
          outlayO: { $sum: "$outlayO"},
          outlay: { $sum: "$outlay"},
          balance: { $sum: "$balance"},
          balanceE: { $sum: "$balanceE"},
          balanceWO: { $sum: "$balanceWO"}
        }
      },
      { $sort: { "_id.contract": 1, "_id.eCode": 1 } }
    ]
  ).toArray(function(err, result) {
    if (err) callback(err);
    for (var i = 0; i < result.length; i++) {
      result[i].url = "/report/outlays/".concat(encodeURIComponent(result[i]._id.contract), 
        "/", encodeURIComponent(result[i]._id.eCode));
    }
    quantitys.estimates = result.length;
    var collName = 'estimates';
    dropCollectionIfExist(db, collName, function (err) {
      if (err) callback(err);
      db.collection(collName).insertMany(result, function (error,res){callback(error);});
      console.log("Inserted " + result.length + " documents into the " + collName);
    });
  });
}

function rwContract(callback) {
  db.collection('Inet_SmetaLSAll').aggregate(
    [ 
      { $match : { contract: { $ne: ''} } },
      { $group : { 
          _id : { 
            contract: "$contract", 
            depCode: "$depCode", 
            depAbbr: "$depAbbr",
            divCode: "$divCode",
            divAbbr: "$divAbbr",
            steward: "$steward"
          },
          remains: { $sum: "$remains"},
          plan: { $sum: "$plan"},
          income: { $sum: "$income"},
          outlayO: { $sum: "$outlayO"},
          outlay: { $sum: "$outlay"},
          balance: { $sum: "$balance"},
          balanceE: { $sum: "$balanceE"},
          balanceWO: { $sum: "$balanceWO"}
      }},
      { $sort: { "_id.contract": 1 } }
    ]
  ).toArray(function(err, result) {
    if (err) callback(err);
    quantitys.contracts = result.length;
    var docs = [];
    for (var i = 0; i < result.length; i++) {
      var department = univ._id;
      if (result[i]._id.depCode) {
        department += "000000".concat(result[i]._id.depCode).substr(-6);
        if (result[i]._id.divCode) 
          department +=  "000000".concat(result[i]._id.divCode).substr(-6);
      }
      docs.push({
        _id: result[i]._id.contract,
        name: result[i]._id.contract,
        parent: department, 
        url: "/report/contract/".concat(encodeURIComponent(result[i]._id.contract)), 
        steward: result[i]._id.steward,
        estimate: { 
          remains: result[i].remains, 
          plan: result[i].plan, 
          income: result[i].income,
          outlayO: result[i].outlayO, 
          outlay: result[i].outlay, 
          balance: result[i].balance, 
          balanceE: result[i].balanceE, 
          balanceWO: result[i].balanceWO 
        }
      });
    }
    var collName = 'contracts';
    dropCollectionIfExist(db, collName, function (err) {
      if (err) callback(err);
      db.collection(collName).insertMany(docs, function (error,res){callback(error);});
      console.log("Inserted " + docs.length + " documents into the " + collName);
    });
  });
}

function rwSteward(callback) {
  db.collection('contracts').aggregate(
    [ 
      {
        $group : { 
          _id : { steward : "$steward"},
          remains: { $sum: "$estimate.remains"},
          plan: { $sum: "$estimate.plan"},
          income: { $sum: "$estimate.income"},
          outlayO: { $sum: "$estimate.outlayO"},
          outlay: { $sum: "$estimate.outlay"},
          balance: { $sum: "$estimate.balance"},
          balanceE: { $sum: "$estimate.balanceE"},
          balanceWO: { $sum: "$estimate.balanceWO"}
        }
      },
      { $sort: { "_id.steward": 1 } }
    ]
  ).toArray(function(err, result) {
    if (err) callback(err);
    quantitys.stewards = result.length + 2;
    var docs = [];
    for (var i = 0; i < result.length; i++) {
      docs.push({
        _id: result[i]._id.steward,
        url: '/report/steward/'.concat(encodeURIComponent(result[i]._id.steward)),
        role: 'master',
        login: null,
        hashedPassword: null,
        salt: null,
        estimate: { 
          remains: result[i].remains, 
          plan: result[i].plan, 
          income: result[i].income,
          outlayO: result[i].outlayO, 
          outlay: result[i].outlay, 
          balance: result[i].balance, 
          balanceE: result[i].balanceE, 
          balanceWO: result[i].balanceWO 
        }
      });
    }
    docs.push({
      _id: "Козловская И.А.",
      role: "booker",
      login: "ADMINIA",
      salt: "0.9681300832414723",
      hashedPassword: "20831c599b4588e2269f9182e0c41ffae5ebf593",
      estimate: { remains: 0, plan: 0, income: 0,
        outlayO: 0, outlay: 0, balance: 0, balanceE: 0, balanceWO: 0 }
    });
    /*
    docs.push({
      _id: "Николаев Е.А.",
      role: "admin",
      login: "ADMINEA",
      salt: "0.36608349762355497",
      hashedPassword: "986083579479b59792771d73b31bc480b14f6709",
      estimate: { remains: 0, plan: 0, income: 0,
        outlayO: 0, outlay: 0, balance: 0, balanceE: 0, balanceWO: 0 }
    });
    */
    const collName = 'stewards';
    dropCollectionIfExist(db, collName, function (err) {
      if (err) callback(err);
      db.collection(collName).insertMany(docs, function (error,res){callback(error);});
      console.log("Inserted " + result.length + " documents into the " + collName);
    });
  });
}

function rwDep(callback) {
  db.collection('Inet_SmetaLSAll').aggregate([
    { $match:  { depCode: { $ne: ''} } },
    { $group: { _id: { code: "$depCode", abbr: "$depAbbr" } } }
  ])
  .toArray(function(err, result) {
    if (err) callback(err);
    for (var i = 0; i < result.length; i++) {
      result[i].name = result[i]._id.code + ' ' + result[i]._id.abbr;
      result[i].parent = univ._id;
      result[i]._id = univ._id + "000000".concat(result[i]._id.code).substr(-6) ;
      result[i].url = '/report/department/'.concat(result[i]._id);
      result[i].steward = null;
      result[i].estimate = { remains: 0, plan: 0, income: 0,
        outlayO: 0, outlay: 0, balance: 0, balanceE: 0, balanceWO: 0 };
    }
    const collName = 'departments';
    dropCollectionIfExist(db, collName, function (err) {
      if (err) callback(err);
      db.collection(collName).insertMany(result, callback);
    });
  });
}

function rwDiv(callback) {
  db.collection('Inet_SmetaLSAll').aggregate([
      { $match: { $and: [{ depCode: { $ne: ''}}, { divCode: { $ne: ''}}]}},
      { $group: { _id: { 
        depCode : "$depCode", depAbbr : "$depAbbr",
        divCode : "$divCode", divAbbr : "$divAbbr"
      }}}
  ])
  .toArray(function(err, result) {
    if (err) callback(err);
    for (var i = 0; i < result.length; i++) {
      result[i].name = result[i]._id.divCode + ' ' + result[i]._id.divAbbr,
      result[i].parent = univ._id + "000000".concat(result[i]._id.depCode).substr(-6);
      result[i]._id = result[i].parent + "000000".concat(result[i]._id.divCode).substr(-6);
      result[i].url = '/report/department/'.concat(result[i]._id);
      result[i].steward = null;
      result[i].estimate = { remains: 0, plan: 0, income: 0,
          outlayO: 0, outlay: 0, balance: 0, balanceE: 0, balanceWO: 0 };
      }
    db.collection('departments').insertMany(result, callback);
  });
}

function depEstimate1(callback) {
  const collName = 'departments';
  db.collection(collName).aggregate([
    { $lookup:
      {
        from: "contracts",
        localField: "_id",
        foreignField: "parent",
        as: "contracts"
      }
    },
    { $sort: { "_id": 1} }
  ])
  .toArray(function(err, result) {
    if (err) callback(err);
    quantitys.departments = result.length;
    for (var i = 0; i < result.length; i++) {
      for(var j = 0; j < result[i].contracts.length; j++) {
        result[i].estimate.remains += result[i].contracts[j].estimate.remains;
        result[i].estimate.plan += result[i].contracts[j].estimate.plan;
        result[i].estimate.income += result[i].contracts[j].estimate.income;
        result[i].estimate.outlayO += result[i].contracts[j].estimate.outlayO;
        result[i].estimate.outlay += result[i].contracts[j].estimate.outlay;
        result[i].estimate.balance += result[i].contracts[j].estimate.balance;
        result[i].estimate.balanceE += result[i].contracts[j].estimate.balanceE;
        result[i].estimate.balanceWO += result[i].contracts[j].estimate.balanceWO;
      }
    }
    dropCollectionIfExist(db, collName, function (err) {
      if (err) console.log(err);
      if (err) callback(err);
      db.collection(collName).insertMany(result, callback);
      console.log("Inserted " + result.length + " documents into the " + collName);
    });
  });
}

function depEstimate2(callback) {
  const collName = 'departments';
  db.collection(collName).aggregate([
    { $lookup:
      {
        from: "departments",
        localField: "_id",
        foreignField: "parent",
        as: "childrens"
      }
    },
    { $sort: { "_id": 1} }
  ])
  .toArray(function(err, result) {
    if (err) callback(err);
    var mtu = {
      _id: univ._id,
      name: univ.code + ' ' + univ.abbr,
      parent: '',
      url: '/report/department/'.concat(univ._id),
      estimate: { remains: 0, plan: 0, income: 0,
        outlayO: 0, outlay: 0, balance: 0, balanceE: 0, balanceWO: 0 },
      contracts : []
    };
    for (var i = 0; i < result.length; i++) {
      for(var k = 0; k < result[i].childrens.length; k++) {
        result[i].estimate.remains += result[i].childrens[k].estimate.remains;
        result[i].estimate.plan += result[i].childrens[k].estimate.plan;
        result[i].estimate.income += result[i].childrens[k].estimate.income;
        result[i].estimate.outlayO += result[i].childrens[k].estimate.outlayO;
        result[i].estimate.outlay += result[i].childrens[k].estimate.outlay;
        result[i].estimate.balance += result[i].childrens[k].estimate.balance;
        result[i].estimate.balanceE += result[i].childrens[k].estimate.balanceE;
        result[i].estimate.balanceWO += result[i].childrens[k].estimate.balanceWO;
      }
      if (result[i].parent == univ._id) {
        mtu.estimate.remains += result[i].estimate.remains;
        mtu.estimate.plan += result[i].estimate.plan;
        mtu.estimate.income += result[i].estimate.income;
        mtu.estimate.outlayO += result[i].estimate.outlayO;
        mtu.estimate.outlay += result[i].estimate.outlay;
        mtu.estimate.balance += result[i].estimate.balance;
        mtu.estimate.balanceE += result[i].estimate.balanceE;
        mtu.estimate.balanceWO += result[i].estimate.balanceWO;
      }
      result[i].childrens = null;
    }
    result.push(mtu);
    dropCollectionIfExist(db, collName, function (err) {
      if (err) console.log(err);
      if (err) callback(err);
      db.collection(collName).insertMany(result, callback);
      console.log("Inserted " + result.length + " documents into the " + collName);
    });
  });
}

function rwSource(callback) {
/*
  db.collection('contracts').aggregate(
    [ {
        $group : { 
          _id : { source : "$source"},
          remains : { $sum: "$estimate.remains"},
          income : { $sum: "$estimate.income"},
          outlay : { $sum: "$estimate.outlay"},
          balance : { $sum: "$estimate.balance"}
        }
      },
      { $sort: { "_id": 1 } }
    ]
  ).toArray(function(err, result) {
    if (err) callback(err);
    quantitys.sources = result.length;
*/
    var result = [{}];
    const collName = 'sources';
    dropCollectionIfExist(db, collName, function (err) {
      if (err) callback(err);
      db.collection(collName).insertMany(result, function (error,res){callback(error);});
      console.log("Inserted " + result.length + " documents into the " + collName);
    });
//  });
}

function rwIncome(callback) {
//  db.collection('Inet_Oplata_All').find({})
//  .project({ _id: 0, contract: 1, date: 1, total : 1, note : 1 })
//  .toArray(function(err, result) {
//    if (err) callback(err);
//    quantitys.incomes = result.length;
    var result = [{}];
    const collName = 'incomes';
    dropCollectionIfExist(db, collName, function (err) {
      if (err) console.log(err);
      if (err) callback(err);
      db.collection(collName).insertMany(result, callback);
      console.log("Inserted " + result.length + " documents into the " + collName);
    });
//  });
}

function rwOutlay(callback) {
//  db.collection('Inet_RashodLS').find({})
//  .project({ _id: 0, contract: 1, eclass: 1, date: 1, species: 1 , total : 1, note : 1 })
//  .toArray(function(err, result) {
//    if (err) callback(err);
//    quantitys.outlays = result.length;
    var result = [{}];
    const collName = 'outlays';
    dropCollectionIfExist(db, collName, function (err) {
      if (err) console.log(err);
      if (err) callback(err);
      db.collection(collName).insertMany(result, callback);
      console.log("Inserted " + result.length + " documents into the " + collName);
    });
//  });
}

function wQuantitys(callback) {
  const stat = fs.statSync(path.join(config.tbPath, 'Inet_SmetaLSAll.txt'));
  moment.locale('ru');
  quantitys.fromdate = moment(stat.mtime).format("LLL");
  quantitys.loaded = moment().format("LLL");
  const collName = 'quantitys';
  dropCollectionIfExist(db, collName, function (err) {
    if (err) callback(err);
    db.collection(collName).insert(quantitys, callback);
    console.log('Inserted collection ' + collName);
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
