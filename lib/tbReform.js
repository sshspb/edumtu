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
const univ = { _id: "00000", code : "000", abbr : "СПбМТУ" };

function run(callback) {
  async.series([
    importD,
    openDB,
    rwSmeta,
    rwEclass,
    rwEstimate,
    rwContract,
    rwSteward,
    stewardContracts,
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

function rwSmeta(callback) {
  db.collection('Inet_SmetaLSAll')
    .find({steward: { $ne: "" }, depCode: { $ne: "" }, eCode: { $ne: "" }  })
    .toArray(function(err, result) {
      if (err) callback(err);
      var pattern = /Наука/i;
      for (var i = 0; i < result.length; i++) {
        result[i].scope = pattern.test(result[i].scope) ? '1' : '0';
        result[i].balanceO = result[i].remains + result[i].income - result[i].outlayO;
      }
      const collName = 'smeta';
      dropCollectionIfExist(db, collName, function (err) {
        if (err) callback(err);
        db.collection(collName).insertMany(result, callback);
        console.log("Reform " + collName + ", " + result.length + " documents");
    });
  });
}

function rwEclass(callback) {
  db.collection('smeta').aggregate(
    [
      {
        $group : { 
          _id: { eCode: "$eCode", eName: "$eName", scope: "$scope"},
          remains: { $sum: "$remains"},
          plan: { $sum: "$plan"},
          income: { $sum: "$income"},
          outlayO: { $sum: "$outlayO"},
          outlay: { $sum: "$outlay"},
          balance: { $sum: "$balance"},
          balanceE: { $sum: "$balanceE"},
          balanceWO: { $sum: "$balanceWO"},
          balanceO: { $sum: "$balanceO"}
        }
      }, {
        $project: {
          name: { $concat: [ "$_id.eCode", " ", "$_id.eName" ] },
          url: { $concat: [ "/report/eclass/", "$_id.eCode" ] },
          scope: "$_id.scope",
          estimate: {
            remains: "$remains",
            plan: "$plan",
            income: "$income",
            outlayO: "$outlayO",
            outlay: "$outlay",
            balance: "$balance",
            balanceE: "$balanceE",
            balanceWO: "$balanceWO",
            balanceO: "$balanceO"
        }}
      }, { 
        $sort: { "_id.eCode": 1 } }
    ]
  ).toArray(function(err, result) {
    if (err) callback(err);
    quantitys.eclasses = result.length;
    var collName = 'eclasses';
    dropCollectionIfExist(db, collName, function (err) {
      if (err) callback(err);
      db.collection(collName).insertMany(result, function (error,res){callback(error);});
      console.log("Create " + collName + ", " + result.length + " documents");
    });
  });
}

function rwEstimate(callback) {
  db.collection('smeta').aggregate(
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
          balanceWO: { $sum: "$balanceWO"},
          balanceO: { $sum: "$balanceO"}
       }
      }, {
        $project: {
          name: { $concat: [ "$_id.eCode", " ", "$_id.eName" ] },
          //url: { $concat: [ "/report/outlays/", "$_id.contract", "/", "$_id.eCode" ] },
          estimate: {
              remains: "$remains",
              plan: "$plan",
              income: "$income",
              outlayO: "$outlayO",
              outlay: "$outlay",
              balance: "$balance",
              balanceE: "$balanceE",
              balanceWO: "$balanceWO",
              balanceO: "$balanceO"
        }}
      },
      { $sort: { "_id.contract": 1, "_id.eCode": 1 } }
    ]
  ).toArray(function(err, result) {
    if (err) callback(err);
    for (var i = 0; i < result.length; i++) {
      result[i].url = "/report/outlays/" + encodeURIComponent(result[i]._id.contract) + 
        "/" + encodeURIComponent(result[i]._id.eCode);
    }
    quantitys.estimates = result.length;
    var collName = 'estimates';
    dropCollectionIfExist(db, collName, function (err) {
      if (err) callback(err);
      db.collection(collName).insertMany(result, function (error,res){callback(error);});
      console.log("Create " + collName + ", " + result.length + " documents");
    });
  });
}

function rwContract(callback) {
  db.collection('smeta').aggregate(
    [ 
      { $match : { contract: { $ne: ''} } },
      { $group : { 
          _id : { 
            contract: "$contract", 
            depCode: "$depCode", 
            depAbbr: "$depAbbr",
            divCode: "$divCode",
            divAbbr: "$divAbbr",
            steward: "$steward",
            scope: "$scope"
          },
          remains: { $sum: "$remains"},
          plan: { $sum: "$plan"},
          income: { $sum: "$income"},
          outlayO: { $sum: "$outlayO"},
          outlay: { $sum: "$outlay"},
          balance: { $sum: "$balance"},
          balanceE: { $sum: "$balanceE"},
          balanceWO: { $sum: "$balanceWO"},
          balanceO: { $sum: "$balanceO"}
      }},
      { $sort: { "_id.contract": 1 } }
    ]
  ).toArray(function(err, result) {
    if (err) callback(err);
    quantitys.contracts = result.length;
    var docs = [];
    for (var i = 0; i < result.length; i++) {
      var department = result[i]._id.scope + univ._id;
      if (result[i]._id.depCode) {
        department += result[i]._id.scope + "00000".concat(result[i]._id.depCode).substr(-5);
        if (result[i]._id.divCode) 
          department +=  result[i]._id.scope + "00000".concat(result[i]._id.divCode).substr(-5);
      }
      docs.push({
        _id: result[i]._id.contract,
        name: result[i]._id.contract,
        parent: department, 
        url: "/report/contract/".concat(encodeURIComponent(result[i]._id.contract)), 
        steward: result[i]._id.steward,
        scope: result[i]._id.scope,
        stewardId: {
          steward: result[i]._id.steward, 
          scope: result[i]._id.scope 
        },
        stewardUrl: '/report/steward/' + encodeURIComponent(result[i]._id.steward),
        estimate: { 
          remains: result[i].remains, 
          plan: result[i].plan, 
          income: result[i].income,
          outlayO: result[i].outlayO, 
          outlay: result[i].outlay, 
          balance: result[i].balance, 
          balanceE: result[i].balanceE, 
          balanceWO: result[i].balanceWO, 
          balanceO: result[i].balanceO
        }
      });
    }
    var collName = 'contracts';
    dropCollectionIfExist(db, collName, function (err) {
      if (err) callback(err);
      db.collection(collName).insertMany(docs, function (error,res){callback(error);});
      console.log("Create " + collName + ", " + docs.length + " documents");
    });
  });
}

function rwSteward(callback) {
  db.collection('contracts').aggregate(
    [ 
      {
        $group : { 
          _id : { steward : "$steward", scope: "$scope"},
          remains: { $sum: "$estimate.remains"},
          plan: { $sum: "$estimate.plan"},
          income: { $sum: "$estimate.income"},
          outlayO: { $sum: "$estimate.outlayO"},
          outlay: { $sum: "$estimate.outlay"},
          balance: { $sum: "$estimate.balance"},
          balanceE: { $sum: "$estimate.balanceE"},
          balanceWO: { $sum: "$estimate.balanceWO"},
          balanceO: { $sum: "$estimate.balanceO"}
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
        _id: result[i]._id,
        name: result[i]._id.steward,
        scope: result[i]._id.scope,
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
          balanceWO: result[i].balanceWO, 
          balanceO: result[i].balanceO
        }
      });
    }
    docs.push({
      _id: "Козловская И.А.",
      name: "Козловская И.А.",
      scope: null,
      role: "booker",
      login: "ADMINIA",
      salt: "0.9681300832414723",
      hashedPassword: "20831c599b4588e2269f9182e0c41ffae5ebf593",
      estimate: { remains: 0, plan: 0, income: 0,
        outlayO: 0, outlay: 0, balance: 0, balanceE: 0, balanceWO: 0, balanceO: 0 }
    });
    /*
    docs.push({
      _id: "Николаев Е.А.",
      role: "admin",
      login: "ADMINEA",
      salt: "0.36608349762355497",
      hashedPassword: "986083579479b59792771d73b31bc480b14f6709",
      estimate: { remains: 0, plan: 0, income: 0,
        outlayO: 0, outlay: 0, balance: 0, balanceE: 0, balanceWO: 0, balanceO: 0 }
    });
    */
    const collName = 'stewards';
    dropCollectionIfExist(db, collName, function (err) {
      if (err) callback(err);
      db.collection(collName).insertMany(docs, function (error,res){callback(error);});
      console.log("Create " + collName + ", " + docs.length + " documents");
    });
  });
}

function stewardContracts(callback) {
  db.collection('stewards').aggregate([
    { $lookup:
      {
        from: "contracts",
        localField: "_id",
        foreignField: "stewardId",
        as: "contracts"
      }
    }
    //,{ $sort: { "_id": 1} }
  ])
  .toArray(function(err, result) {
    if (err) callback(err);
    const collName = 'stewards_contracts';
    dropCollectionIfExist(db, collName, function (err) {
      if (err) callback(err);
      db.collection(collName).insertMany(result, callback);
      console.log("Create " + collName + ", " + result.length + " documents");
    });
  });
}


function rwDep(callback) {
  db.collection('smeta').aggregate([
    { $match:  { depCode: { $ne: ''} } },
    { $group: { _id: { code: "$depCode", abbr: "$depAbbr", scope: "$scope" } } }
  ])
  .toArray(function(err, result) {
    if (err) callback(err);
    for (var i = 0; i < result.length; i++) {
      result[i].name = result[i]._id.code + ' ' + result[i]._id.abbr;
      result[i].parent = result[i]._id.scope + univ._id;
      result[i].scope = result[i]._id.scope;
      result[i]._id = result[i]._id.scope + univ._id + 
          result[i]._id.scope + "00000".concat(result[i]._id.code).substr(-5) ;
      result[i].url = '/report/department/'.concat(result[i]._id);
      result[i].steward = null;
      result[i].estimate = { remains: 0, plan: 0, income: 0,
        outlayO: 0, outlay: 0, balance: 0, balanceE: 0, balanceWO: 0, balanceO: 0 };
    }
    const collName = 'departments';
    dropCollectionIfExist(db, collName, function (err) {
      if (err) callback(err);
      db.collection(collName).insertMany(result, callback);
    });
  });
}

function rwDiv(callback) {
  db.collection('smeta').aggregate([
      { $match: { $and: [{ depCode: { $ne: ''}}, { divCode: { $ne: ''}}]}},
      { $group: { _id: { 
        depCode : "$depCode", depAbbr : "$depAbbr",
        divCode : "$divCode", divAbbr : "$divAbbr", scope: "$scope" 
      }}}
  ])
  .toArray(function(err, result) {
    if (err) callback(err);
    for (var i = 0; i < result.length; i++) {
      result[i].name = result[i]._id.divCode + ' ' + result[i]._id.divAbbr,
      result[i].parent = result[i]._id.scope + univ._id + 
                  result[i]._id.scope + "00000".concat(result[i]._id.depCode).substr(-5);
      result[i].scope = result[i]._id.scope;
      result[i]._id = result[i].parent + 
                  result[i]._id.scope + "00000".concat(result[i]._id.divCode).substr(-5);
      result[i].url = '/report/department/'.concat(result[i]._id);
      result[i].steward = null;
      result[i].estimate = { remains: 0, plan: 0, income: 0,
          outlayO: 0, outlay: 0, balance: 0, balanceE: 0, balanceWO: 0, balanceO: 0 };
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
        result[i].estimate.balanceO += result[i].contracts[j].estimate.balanceO;
      }
    }
    dropCollectionIfExist(db, collName, function (err) {
      if (err) console.log(err);
      if (err) callback(err);
      db.collection(collName).insertMany(result, callback);
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
    var mtu = [
      {
        _id: '0' + univ._id,
        name: univ.code + ' ' + univ.abbr,
        parent: '',
        scope: '0',
        url: '/report/department/'.concat(univ._id),
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
        url: '/report/department/'.concat(univ._id),
        steward: null,
        estimate: { remains: 0, plan: 0, income: 0,
          outlayO: 0, outlay: 0, balance: 0, balanceE: 0, balanceWO: 0, balanceO: 0 },
        contracts : []
      }
    ];
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
        result[i].estimate.balanceO += result[i].childrens[k].estimate.balanceO;
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
    dropCollectionIfExist(db, collName, function (err) {
      if (err) console.log(err);
      if (err) callback(err);
      db.collection(collName).insertMany(result, callback);
      console.log("Create " + collName + ", " + result.length + " documents");
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
      console.log("Create " + collName + ", " + result.length + " documents");
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
      console.log("Create " + collName + ", " + result.length + " documents");
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
      console.log("Create " + collName + ", " + result.length + " documents");
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
