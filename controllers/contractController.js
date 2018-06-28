const async = require('async');
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
const titleKOSGU = '<abbr title = "Классификация операций сектора государственного управления">КОСГУ</abbr>';

exports.contract_estimate_list = function(req, res, next) {
  // смета договора  url: /report/contract/:contract 
  const contract = req.params.contract;
  const sourceCode = res.locals.source_code;
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName + res.locals.year);
    // пользователь руководит подразделениями
    client.db(config.dbName).collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs){
/*
      var regnodes = [];
      if (res.locals.userRole != 'booker') {
        for (var k = 0; k < departs.length; k++) {
          regnodes.push(RegExp('^'+departs[k].department));
        }
      }
*/
      var regnodes = [];
      var query;
      if (res.locals.userRole == 'booker') {
        // выбрать записи по договору contract и финансирования sourceCode
        query = { $match: { 
          source: { $regex: '^' + sourceCode } ,
          "_id.contract": contract 
        } };
      } else {
        // выбрать записи по договору где res.locals.userName руководитель
        var scopeSteward = [ { "_id.steward": { $eq: res.locals.userName } } ];
          // и по договорам всех подразделений где res.locals.userName руководитель
        for (var i = 0; i < departs.length; i++) {
          scopeSteward.push({ parent: { $regex: '^' + departs[i].department } })
        }
        query = { $match:
          { $and: [
            { source: { $regex: '^' + sourceCode } },
            { "_id.contract": contract },
            { $or: scopeSteward }
          ] } 
        };
        // маски договоров в подчинении
        for (var k = 0; k < departs.length; k++) {
          regnodes.push(RegExp('^'+departs[k].department));
        }
      }

      // смета договора
      //.find({ "_id.contract": contract })
      //.sort({ "_id.eCode": 1})
      db.collection('smeta')
      .aggregate([ query, {$sort: {"_id.eCode": 1}} ])
      .toArray(function (err, list_estimates) {
        if (err) { return next(err); }
        // подразделение, руководитель, видДеятельности договора
        var node = '', steward = '', sourceName = '';
        if (list_estimates.length) {
          node = list_estimates[0].parent;
          steward = list_estimates[0].steward;
          for (var i = 0; i < res.locals.source_list.length; i++) {
            if (res.locals.source_list[i].code === list_estimates[0].source) {
              sourceName = res.locals.source_list[i].name;
            }
          }
        }
        // смета будет в таком виде
        var estimate_list = [];
        for (var i = 0; i < list_estimates.length; i++) {
          estimate_list.push({
            name: list_estimates[i]._id.eCode + " " + list_estimates[i]._id.eName,
            url: "/report/outlays/contract/" + encodeURIComponent(contract) + "/ecode/" + encodeURIComponent(list_estimates[i]._id.eCode),
            estimate: {
              remains: list_estimates[i].remains,
              plan: list_estimates[i].plan,
              income: list_estimates[i].income,
              outlayO: list_estimates[i].outlayO,
              outlay: list_estimates[i].outlay,
              balance: list_estimates[i].balance,
              balanceE: list_estimates[i].balanceE,
              balanceEM: list_estimates[i].balanceEM
            }
          })
        }
        // path структура подразделения где выполняется договор
        db.collection('departments')
        .find({node: node})
        .toArray(function (err, departments) {
          if (err) { return next(err); }
          client.close();
          var dep_doc = [];
          if (departments.length) {
            dep_doc = departments[0];
          }
          res.render('report/detail', {
            title: contract,
            title1: titleKOSGU,
            //longTitle: longTitle(list_departments, contract, steward, sourceName),
            longTitle: pathTitle(dep_doc, regnodes, contract, steward, res.locals.userRole, sourceName),
            ecode: '',
            tabs: [
              { flag: true, href: "/report/contract/" + encodeURIComponent(contract)},
              { flag: false, href: "/report/incomes/contract/" + encodeURIComponent(contract)},
              { flag: false, href: "/report/outlays/contract/" + encodeURIComponent(contract)}
            ],
            record_list: estimate_list,
            income_list: [],
            outlay_list: []
          });
        });
      });
    });
  });
}

exports.contract_income_list = function(req, res, next) {
  // url /report/incomes/contract/:contract записи прихода по договору
  const contract = req.params.contract;
  const sourceCode = res.locals.source_code;
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName + res.locals.year);
    // пользователь руководит подразделениями
    client.db(config.dbName).collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {
/*
      var regnodes = [];
      if (res.locals.userRole != 'booker') {
        for (var k = 0; k < departs.length; k++) {
          regnodes.push(RegExp('^'+departs[k].department));
        }
      }
*/
      var regnodes = [];
      var query;
      if (res.locals.userRole == 'booker') {
        // выбрать записи по договору contract и финансирования sourceCode
        query = { $match: { 
          source: { $regex: '^' + sourceCode } ,
          contract: contract 
        } };
      } else {
        // выбрать записи по договору где res.locals.userName руководитель
        var scopeSteward = [ { steward: { $eq: res.locals.userName } } ];
          // и по договорам всех подразделений где res.locals.userName руководитель
        for (var i = 0; i < departs.length; i++) {
          scopeSteward.push({ parent: { $regex: '^' + departs[i].department } })
        }
        query = { $match:
          { $and: [
            { source: { $regex: '^' + sourceCode } },
            { contract: contract },
            { $or: scopeSteward }
          ] } 
        };
        // маски договоров в подчинении
        for (var k = 0; k < departs.length; k++) {
          regnodes.push(RegExp('^'+departs[k].department));
        }
      }

      // сведения о договоре
      db.collection('contracts')
      .find({"_id.contract": req.params.contract})
      .toArray(function (err, contracts) {
        if (err) { return next(err); }
        // договор, подразделение, руководитель, видДеятельности договора
        var node = '', steward = '', sourceName = '';
        if (contracts.length) {
          node = contracts[0].parent;
          steward = contracts[0]._id.steward;
          for (var i = 0; i < res.locals.source_list.length; i++) {
            if (res.locals.source_list[i].code === contracts[0]._id.source) {
              sourceName = res.locals.source_list[i].name;
            }
          }
        }

        // path структура подразделения где выполняется договор
        db.collection('departments')
        .find({node: node})
        .toArray(function (err, departments) {
          if (err) { return next(err); }
          var dep_doc = [];
          if (departments.length) {
            dep_doc = departments[0];
          }

          // доходы по договору
          //.find({contract: contract})
          //.sort({date: -1})
          db.collection('incomes')
          .aggregate([ query, {$sort: {date: -1}} ])
          .toArray(function (err, list_incomes) {
            if (err) { return next(err); }
            client.close();
            res.render('report/detail', {
              title: contract,
              title1: titleKOSGU,
              //longTitle: longTitle(list_departments, contract._id.contract, contract._id.steward, sourceName),
              longTitle: pathTitle(dep_doc, regnodes, contract, steward, res.locals.userRole, sourceName),
              ecode: '',
              tabs: [
                { flag: false, href: "/report/contract/" + encodeURIComponent(contract)},
                { flag: true, href: "/report/incomes/contract/" + encodeURIComponent(contract)},
                { flag: false, href: "/report/outlays/contract/" + encodeURIComponent(contract)}
              ],
              record_list: [],
              income_list: list_incomes,
              outlay_list: []
            });
          });
        });
      });
    });
  });
}

exports.contract_outlay_list = function(req, res, next) {
  // /outlays/contract/:contract записи расхода по договору
  const contract = req.params.contract;
  const sourceCode = res.locals.source_code;
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName + res.locals.year);
    // пользователь руководит подразделениями
    client.db(config.dbName).collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {
/*
      var regnodes = [];
      if (res.locals.userRole != 'booker') {
        for (var k = 0; k < departs.length; k++) {
          regnodes.push(RegExp('^'+departs[k].department));
        }
      }
*/
      var regnodes = [];
      var query;
      if (res.locals.userRole == 'booker') {
        // выбрать записи по договору contract и финансирования sourceCode
        query = { $match: { 
          source: { $regex: '^' + sourceCode } ,
          contract: contract 
        } };
      } else {
        // выбрать записи по договору где res.locals.userName руководитель
        var scopeSteward = [ { steward: { $eq: res.locals.userName } } ];
          // и по договорам всех подразделений где res.locals.userName руководитель
        for (var i = 0; i < departs.length; i++) {
          scopeSteward.push({ parent: { $regex: '^' + departs[i].department } })
        }
        query = { $match:
          { $and: [
            { source: { $regex: '^' + sourceCode } },
            { contract: contract },
            { $or: scopeSteward }
          ] } 
        };
        // маски договоров в подчинении
        for (var k = 0; k < departs.length; k++) {
          regnodes.push(RegExp('^'+departs[k].department));
        }
      }
      // сведения о договоре
      db.collection('contracts')
      .find({"_id.contract": contract})
      .toArray(function (err, contracts) {
        if (err) { return next(err); }
        // договор, подразделение, руководитель, видДеятельности договора
        var node = '', steward = '', sourceName = '';
        if (contracts.length) {
          node = contracts[0].parent;
          steward = contracts[0]._id.steward;
          for (var i = 0; i < res.locals.source_list.length; i++) {
            if (res.locals.source_list[i].code === contracts[0]._id.source) {
              sourceName = res.locals.source_list[i].name;
            }
          }
        }
        // path структура подразделения где выполняется договор
        db.collection('departments')
        .find({node: node})
        .toArray(function (err, departments) {
          if (err) { return next(err); }
          var dep_doc = [];
          if (departments.length) {
            dep_doc = departments[0];
          }
          // записи расхода
          //.find({contract: contract})
          //.sort({date: -1, eCode: 1})
          db.collection('outlays' + res.locals.variant)
          .aggregate([ query, {$sort: {date: -1, eCode: 1}} ])
          .toArray(function (err, list_outlays) {
            if (err) { return next(err); }
            client.close();
            res.render('report/detail', {
              title: contract,
              title1: titleKOSGU,
              //longTitle: longTitle(list_departments, contract, steward, sourceName),
              longTitle: pathTitle(dep_doc, regnodes, contract, steward, res.locals.userRole, sourceName),
              ecode: '',
              tabs: [
                { flag: false, href: "/report/contract/" + encodeURIComponent(contract)},
                { flag: false, href: "/report/incomes/contract/" + encodeURIComponent(contract)},
                { flag: true, href: "/report/outlays/contract/" + encodeURIComponent(contract)}
              ],
              record_list: [],
              income_list: [],
              outlay_list: list_outlays
            });
          });
        });
      });
    });
  });
}

exports.contract_ecode_outlay_list = function(req, res, next) {
  // /outlays/contract/:contract/ecode/:ecode  записи расхода по договору по статье
  const ecode = req.params.ecode;
  const contract = req.params.contract;
  const sourceCode = res.locals.source_code;
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName + res.locals.year);
    // пользователь руководит подразделениями
    client.db(config.dbName).collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {
/*
      var regnodes = [];
      if (res.locals.userRole != 'booker') {
        for (var k = 0; k < departs.length; k++) {
          regnodes.push(RegExp('^'+departs[k].department));
        }
      }
*/
      var regnodes = [];
      var query;
      if (res.locals.userRole == 'booker') {
        // выбрать записи по договору contract и финансирования sourceCode
        query = { $match: { 
          source: { $regex: '^' + sourceCode } ,
          contract: contract,
          eCode: ecode
        } };
      } else {
        // выбрать записи по договору где res.locals.userName руководитель
        var scopeSteward = [ { steward: { $eq: res.locals.userName } } ];
          // и по договорам всех подразделений где res.locals.userName руководитель
        for (var i = 0; i < departs.length; i++) {
          scopeSteward.push({ parent: { $regex: '^' + departs[i].department } })
        }
        query = { $match:
          { $and: [
            { source: { $regex: '^' + sourceCode } },
            { contract: contract },
            { eCode: ecode },
            { $or: scopeSteward }
          ] } 
        };
        // маски договоров в подчинении
        for (var k = 0; k < departs.length; k++) {
          regnodes.push(RegExp('^'+departs[k].department));
        }
      }

      // сведения о договоре
      db.collection('contracts')
      .find({"_id.contract": contract})
      .toArray(function (err, contracts) {
        if (err) { return next(err); }
        // договор, подразделение, руководитель, видДеятельности договора
        var node = '', steward = '', sourceName = '';
        if (contracts.length) {
          node = contracts[0].parent;
          steward = contracts[0]._id.steward;
          for (var i = 0; i < res.locals.source_list.length; i++) {
            if (res.locals.source_list[i].code === contracts[0]._id.source) {
              sourceName = res.locals.source_list[i].name;
            }
          }
        }
        // path структура подразделения где выполняется договор
        db.collection('departments')
        .find({node: node})
        .toArray(function (err, departments) {
          if (err) { return next(err); }
          var dep_doc = [];
          if (departments.length) {
            dep_doc = departments[0];
          }
          // записи расхода
          //.find({contract: contract, eCode: ecode})
          //.sort({date: -1})
          db.collection('outlays' + res.locals.variant)
          .aggregate([ query, {$sort: {date: -1}} ])
          .toArray(function (err, list_outlays) {
            if (err) { return next(err); }
            client.close();
            res.render('report/detail', {
              title: contract,
              title1: titleKOSGU,
              //longTitle: longTitle(list_departments, contract, steward, sourceName),
              longTitle: pathTitle(dep_doc, regnodes, contract, steward, res.locals.userRole, sourceName),
              ecode: ecode,
              tabs: [
                { flag: false, href: "/report/contract/" + encodeURIComponent(contract)},
                { flag: false, href: "/report/incomes/contract/" + encodeURIComponent(contract)},
                { flag: true, href: "/report/outlays/contract/" + encodeURIComponent(contract)}
              ],
              record_list: [],
              income_list: [],
              outlay_list: list_outlays
            });
          });
        });
      });
    });
  });
}

function pathTitle(department, regnodes, contract, steward, role, sourceName) {
  var title = '&nbsp;Договор:&nbsp; ';
  if (department) {
  var node, name, scope;
  var isBooker = role == 'booker'
  title += ' <span style="color: #ccc">/</span> ';
  if (department.node != config.univ._id) {
    node = config.univ._id;
    name = config.univ.abbr;
    scope = isBooker;
    for (var k = 0; !scope && k < regnodes.length; k++) {
      if (node.match(regnodes[k])) scope = true;
    }
    if (scope) title += '<a href="/report/department/' + node + '">';
    title += name;
    if (scope) title += '</a>';
    title += ' <span style="color: #ccc">/</span> ';
    if (department.parent != config.univ._id) {
      // есть parent - факультет
      node = department.parent;
      name = department._id.depCode + ' ' + department.depAbbr
      scope = isBooker;
      for (var k = 0; !scope && k < regnodes.length; k++) {
        if (node.match(regnodes[k])) scope = true; 
      }
      if (scope) title += '<a href="/report/department/' + node + '">';
      title += name;
      if (scope) title += '</a>';
      title += ' <span style="color: #ccc">/</span> ';
      // department - кафедра
      name = department._id.divCode + ' ' + department.divAbbr
    } else {
      // parent - университет, а department - факультет
      name = department._id.depCode + ' ' + department.depAbbr
    }
  } else {
      // department - университет
      name = department._id.depCode + ' ' + department.depAbbr
  }
  // department
  node = department.node;
  scope = isBooker;
  for (var k = 0; !scope && k < regnodes.length; k++) {
    if (node.match(regnodes[k])) scope = true;
  }
  if (scope) title += '<a href="/report/department/' + node + '">';
  title += name;
  if (scope) title += '</a>';
  title += ' <span style="color: #ccc">/</span> ';
  }
  title += '&nbsp;&nbsp;<span style="font-weight: 700;">' + contract + '</span>; &nbsp;';
  title += 'вид деятельности:&nbsp; ' +  sourceName + '; &nbsp;ответственный:&nbsp; ';
  title += '<a href="/report/steward/' + encodeURIComponent(steward) + '">' + steward + '</a>';
  return title;
}
