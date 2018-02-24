var async = require('async');
var Department = require('../models/department');
var Contract = require('../models/contract');
var Steward = require('../models/steward');

exports.department_list = function(req, res, next) {
  rows = [];
  Department.find()
  .populate('_steward', 'name')
  .sort({_id: 1})
  .exec(function (err, list_departments) {
    if (err) { return next(err); }
    var totalSaldo = 0;
    for (var i = 0; i < list_departments.length; i++) {
      var department = list_departments[i];
      // var allowedDepartment = department._steward === req.user._id;
      var trClass;
      if (department.node == '000000') {
        trClass = ''; 
        totalSaldo = department.saldo;
      } else if (department.parent == '000000') {
        trClass = 'treegrid-' + department.node
      } else {
        trClass = 'treegrid-' + department.node + ' treegrid-parent-' + department.parent
      }
      var isBoss = (department._steward 
        && (department._steward._id.toString() == req.user._id.toString())) 
        ? true : false;
      rows.push({ 
        "allowed": department.node != '000000' && 
          ( req.user.role == 'booker' || 
            req.user.role == 'master' && isBoss ),
        "name": department.code + ' ' + department.name, 
        "stewardName": department._steward ? department._steward.name : 'не указан',
        "saldo": department.saldo,
        "url": department.url,
        "trClass": trClass
      });
    }
    res.render('report/department_list', { 
//      userName: req.userName,
      basehref: req.url,
      title: 'Подразделения', 
      department_list: rows,
      footer: { saldo: rouble(totalSaldo) }
    });
  });
};

exports.department_detail = function(req, res, next) {
  var like = RegExp('^' + req.params.id);
  Department.findById(req.params.id)
  .exec(function (err, department) {
    if (err) { return next(err); }
    Contract.aggregate([
      { $match: {_id: like}},
      { $lookup: {from: "sources", localField: "_source", foreignField: "_id", as: "source"}},
      { $unwind:"$estimate" },
      { $group: { 
          _id: { 
            url: {$concat: ["/catalog/contract/", "$_id"]}, 
            name: "$name", 
            source: { $arrayElemAt: [ "$source", 0 ] } 
          }, 
          remains: {$sum: "$estimate.remains"}, 
          income: {$sum: "$estimate.income"}, 
          outlay: {$sum: "$estimate.outlay"}, 
          balance: {$sum: "$estimate.balance"}
        }
      },
      { $project: { 
        "url": "$_id.url",
        "name": "$_id.name",
        "source": "$_id.source.name",
        "remains": 1,
        "income": 1,
        "outlay": 1,
        "balance": 1,
        "_id": 0 }
      },
      { $sort: { "name": 1} }
    ])
    .exec(function(err, list_contracts) {
        if (err) { return next(err); }
        res.render('report/department_detail', { 
          basehref: req.url,
          title: department.name, 
          contract_list: list_contracts
        });
    });
  });
};

function rouble(n) {
  var x = n.toFixed(2).split('.');
  var x1 = x[0];
  var x2 = x.length > 1 ? ',' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ' ' + '$2');
  }
  return x1 + x2;
}
