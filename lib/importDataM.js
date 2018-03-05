/**
 * Импорт данных
 */
var fs = require("fs");
var path = require('path');
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var windows1251 = require('windows-1251'); 
var crypto = require('crypto');
var debug = require('debug')('edu2site:import');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var mongoose = require('mongoose');
var config = require('../config');
var config_local = require('../config_local');
var db;
var uni;
var smeta;
var incomes;
var outlays;
var stewards; 
var departments;
var contracts;
var eclass;
var sources;

module.exports = function reload(callback) {
  db = mongoose.connection;
  async.series([
    dropDB,
    rwStewards,
    readPRI,
    readRCF,
    readSME,
    doUNI,
    writeAll
  ], function(err) {
    uni = null;
    smeta = null;
    incomes = null;
    outlays = null;
    stewards = null; 
    departments = null;
    contracts = null;
    eclass = null;
    sources = null;
    callback(err);
  });
}

function dropDB(callback) {
  db.dropDatabase(callback);
}

function rwStewards(callback) {
  uni = tbRead("UNI");
  // ответственного исполнителя договора из номера возьмём
  for (var i = 0; i < uni.length; i++) {
    uni[i].stewardName = uni[i].contract.replace(/^(?:ЦФ )?(\S+)(?:\s+)(.\.)(?:\s*)(.).*/, "$1 $2$3.");
  }
  uni.sort(function(a,b) { return a.stewardName.localeCompare(b.stewardName) });
  stewards = [], stewardName = null;
  var jChief = 0, jUni = 0, jOtw = 0, lastName = "@@@", lastUser = "@@@", stewardId = null;
  while (jUni < uni.length) {
    if (lastName != uni[jUni].stewardName) {
      // новый ответственный
      lastName = uni[jUni].stewardName;
      stewardId =  new ObjectId();
      stewards.push({
        "_id": stewardId,
        "name": lastName,
        "role": null,
        "login": null,
        "salt": null,
        "hashedPassword": null
      });
    }
    uni[jUni]._steward = stewardId;
    jUni++;
  }
  stewards.push({
    "_id": new ObjectId(),
    "name": "Козловская И.А.",
    "role": "booker",
    "login": "ADMINIA",
    "salt": "0.9681300832414723",
    "hashedPassword": "20831c599b4588e2269f9182e0c41ffae5ebf593"
  });
  stewards.push({
    "_id": new ObjectId(),
    "name": "Николаев Е.А.",
    "role": "admin",
    "login": "ADMINEA",
    "salt": "0.36608349762355497",
    "hashedPassword": "986083579479b59792771d73b31bc480b14f6709"
  });
  db.collection("stewards").insertMany(stewards, callback)
}

function readPRI(callback) {
  incomes = tbRead("PRI");
  callback(null);
}

function readRCF(callback) {
  outlays = tbRead("RCF");
  callback(null);
}

function readSME(callback) {
  smeta = tbRead("SME");
  // контроль на обязательность contract и code
  for (var i = 0; i < smeta.length; i++) {
    if (!(smeta[i].contract && smeta[i].code)) {
      smeta.splice(i, 1);
      i--;
    }
  }
  // контроль на уникальность contract + code
  smeta.sort(function(a,b) { return (a.contract + a.code).localeCompare(b.contract + b.code) });
  for (var i = 0; i < smeta.length; i++) {
    smeta[i].remains = smeta[i].remains.replace(',', '.');
    smeta[i].income = smeta[i].income.replace(',', '.'),
    smeta[i].outlay = smeta[i].outlay.replace(',', '.');
    smeta[i].balance = smeta[i].balance.replace(',', '.');
    if (i && smeta[i-1].contract.concat(smeta[i-1].code) == smeta[i].contract.concat(smeta[i].code)) {
//      console.log("in SME dublicat contract+code " + smeta[i].contract + ' ' + smeta[i].code);
      smeta.splice(i, 1);
      i--;
    }
  } 
  callback(null);
}
  
function doUNI(callback) {
  // коллекция source Источники финансирования
  uni.sort(function(a,b) { return a.source.localeCompare(b.source) });
  var lastSource = "@@@";
  var sourceId;
  var jSource = 0;
  sources = [];
  for (var i = 0; i < uni.length; i++) {
    if (lastSource.localeCompare(uni[i].source)) {
      lastSource = uni[i].source;
      sourceId = new ObjectId(),
      sources[jSource++] = {
        _id: sourceId,
        name: lastSource,
      };
    }
    uni[i].sourceId = sourceId;
  }
  // контроль данных в реестре договоров 
  uni.sort(function(a,b) { return a.contract.localeCompare(b.contract) });
  for (var i = 0; i < uni.length; i++) {
      // контроль на обязательность depkod, depname
      if (!uni[i].DEPKOD) {
        uni[i].DEPKOD = '1';
        uni[i].DEPNAME = 'Ректорат';
      }
      // контроль на обязательность divkod, divname
      if (!uni[i].DIVKOD) {
        uni[i].DIVKOD = '00';
        uni[i].DIVNAME = 'Дирекция';
      }
      // контроль на обязательность contract
      if (!uni[i].contract) {
//        console.log("in UNI empty contract " + uni[i].contract)
        uni.splice(i, 1);
        i--;
      }
      // контроль на уникальность contract
      if (i > 0 && uni[i-1].contract.localeCompare(uni[i].contract) == 0) {
//        console.log("in UNI dublicat contract " + uni[i].contract)
        uni.splice(i, 1);
        i--;
      }
  }

  incomes.sort(function(a,b) { return a.contract.localeCompare(b.contract) });
  outlays.sort(function(a,b) { return a.contract.localeCompare(b.contract) });
  var jIncome = 0;
  var jOutlay = 0;
  var saldoUni = 0;
  var s = 0;
  // идём по списку договоров
  for (var i = 0; i < uni.length; i++) {
    // вспомогательные поля
    uni[i].idDep = "000000".concat(uni[i].DEPKOD).slice(-6)
    uni[i].idDiv = uni[i].idDep + "000000".concat(uni[i].DIVKOD).slice(-6);
    uni[i].contractId = uni[i].idDiv + "000000".concat(i.toString()).slice(-6);
    // Пролистываем сметы до текущего договора
    while ((s < smeta.length) && (smeta[s].contract.localeCompare(uni[i].contract) < 0)) {
      smeta.splice(s, 1);
    }
    var saldo = 0;
    var estimate = [];
    // Смета данного договора
    while (s < smeta.length && smeta[s].contract.localeCompare(uni[i].contract) == 0) {
      estimate.push({
        code: smeta[s].code,
        name: smeta[s].name,
        remains: Number(smeta[s].remains),
        income: Number(smeta[s].income),
        outlay: Number(smeta[s].outlay),
        balance: Number(smeta[s].balance)
      });
      saldo += Number(smeta[s].balance);
      s++;
    }
    uni[i].estimate = estimate;
    uni[i].saldo = saldo;
    saldoUni += saldo;
    // в доходы надо внести Id договора
    while ((jIncome < incomes.length) && (incomes[jIncome].contract.localeCompare(uni[i].contract) < 0)) {
      jIncome++;  // это безхозная запись затрат, без договора
    }
    while ((jIncome < incomes.length) && (incomes[jIncome].contract.localeCompare(uni[i].contract) == 0)) {
      incomes[jIncome].contractId = uni[i].contractId;
      jIncome++;
    }
    // в затраты надо внести Id договора
    while ((jOutlay < outlays.length) && (outlays[jOutlay].contract.localeCompare(uni[i].contract) < 0)) {
      jOutlay++;  // это безхозная запись затрат, без договора
    }
    while ((jOutlay < outlays.length) && (outlays[jOutlay].contract.localeCompare(uni[i].contract) == 0)) {
      outlays[jOutlay].contractId = uni[i].contractId;
      jOutlay++;
    }
  }
    
  // создание коллекций contracts и departments
  contracts = [];
  departments = [];
  uni.sort(function(a,b) { return a.contractId.localeCompare(b.contractId) });
  var saldoDep = 0;
  var saldoDiv = 0;
  var lastJDep = -1;
  var lastJDiv = -1;
  var idDep = "@@@";
  var idDiv = "@@@";
  var jD = 0;
  
  departments[jD++] = {
    _id: '000000',
    node: '000000',
    parent: '000000',
    code: '0',
    abbr: 'СПбГМТУ',
    name: 'СПбГМТУ',
    saldo: saldoUni 
  };

  for (var i = 0; i < uni.length; i++) {
    var row = uni[i]; 
    // очередной договор 
    contracts.push({
      _id: row.contractId,
      name: row.contract,
      _source: row.sourceId,
      department: row.idDiv,
      parentunit: row.idDep,
      _steward: row._steward,
      estimate: row.estimate || []
    });
    // очередное подразделение Dep 
    if (idDep.localeCompare(row.idDep)) {
      // итоговые суммы в предыдущее подразделение
      departments[jD] = {
        _id: row.idDep,
        node: row.idDep,
        parent: '000000',
        code: row.DEPKOD,
        abbr: row.DEPABBR,
        name: row.DEPNAME
      };
      idDep = row.idDep;
      idDiv = "@@@";
      if (lastJDep >= 0) {
        departments[lastJDep].saldo = saldoDep
        saldoDep = 0;
      }
      lastJDep = jD;
      jD++;
    }
    // очередное подразделение Div
    if (idDiv.localeCompare(row.idDiv)) {
      departments[jD] = {
        _id: row.idDiv,
        node: row.idDiv,
        parent: row.idDep,
        code: row.DIVKOD,
        abbr: row.DIVABBR,
        name: row.DIVNAME
      };
      idDiv = row.idDiv;
      if (lastJDiv >= 0) {
        departments[lastJDiv].saldo = saldoDiv
        saldoDiv = 0;
      }
      lastJDiv = jD;
      jD++;
    }
    saldoDep += row.saldo;
    saldoDiv += row.saldo;
  }

  //  коллекция elcass
  smeta.sort(function(a,b) { return a.code.localeCompare(b.code) });
  var lastCode = "@@@";
  var jEclass = 0;
  eclass = [];
  for (var i = 0; i < smeta.length; i++) {
    if (lastCode.localeCompare(smeta[i].code)) {
      eclass[jEclass++] = {
        code: smeta[i].code,
        name: smeta[i].name,
      };
      lastCode = smeta[i].code;
    }
  }
  callback(null);
}

function writeAll(callback) {
  var eclassCollection = db.collection("eclasses");
  var departmentCollection = db.collection("departments");
  var contractCollection = db.collection("contracts");
  var sourcesCollection = db.collection("sources");
  var incomeCollection = db.collection("incomes");
  var outlayCollection = db.collection("outlays");
  async.parallel([
    function(callback) { 
      async.each(eclass, function(r, callback) {
      eclassCollection.insert(r, callback);
    }, callback)},
    function(callback) { 
      async.each(departments, function(r, callback) {
      departmentCollection.insert(r, callback);
    }, callback)},
    function(callback) { 
      async.each(contracts, function(r, callback) {
      contractCollection.insert(r, callback);
    }, callback)},
    function(callback) { 
      async.each(sources, function(r, callback) {
      sourcesCollection.insert(r, callback);
    }, callback)},
    function(callback) { 
      async.each(incomes, function(r, callback) {
      var dmy = r.date.split('.');
      var w = {
        contract: r.contractId,
        date: new Date(dmy[2], +dmy[1] - 1, dmy[0]),
        sum: r.sum.replace(',', '.'),
        note: r.note
      }
      incomeCollection.insert(w, callback);
    }, callback)},
    function(callback) { 
      async.each(outlays, function(r, callback) {
      var dmy = r.date.split('.');
      var w = {
        contract: r.contractId,
        eclass: r.eclass,
        date: new Date(dmy[2], +dmy[1] - 1, dmy[0]),
        species: r.species.charAt(0) + r.species.substring(1).toLowerCase(),
        sum: r.sum.replace(',', '.'),
        dct: r.dct,
        note: r.note
      }
      outlayCollection.insert(w, callback);
    }, callback)}
  ], callback);
}

/**
 * Чтение файла табличных данных формата ТБ
 *
 * @param {string} tableName Наименование таблицы
 * @returns {Array оf Objects} Массив JavaScript объектов
 */
function tbRead(tableName) {
  var tbTable = config.tbTables[tableName];
  var directory = tbTable.directory ? path.join(__dirname, tbTable.directory) : config_local.tbPath;
  var content = fs.readFileSync(path.join(directory, tbTable.filename)).toString('binary');
  content = windows1251.decode(content);    // cp1251 --> utf8
  content = content.split(/[\n\r]+/ig);     // строка --> массив строк
  content.shift();                          // отбросить первую строку
  var headers = tbTable.headers.split(','); // массив заголовков столбцов
  var hashData = [ ];
  content.forEach(function(item){
    if(item){
      // отбросить (replace) символы '~' в начале и в конце строки,
      // после чего строку разбить (split) на массив подстрок
      item = item.replace(/^~|~~$/g, '').split('~~');
      var hashItem = { };
      headers.forEach(function(headerItem, index){
        if (headerItem.trim()) {
          hashItem[headerItem.trim()] = item[index].trim();
        }
      });
      hashData.push(hashItem);
    }
  });
  return hashData;
}
