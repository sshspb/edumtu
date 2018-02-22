var Contract = require('../models/contract');
var Department = require('../models/department');
var Steward = require('../models/steward');

exports.contract_list = function(req, res, next) {
  // Список договоров данного ответственного если его role == 'master'
  var match = {};
  if (req.user.role == 'master') {
    match = { _steward: req.user._id };
  }
  Contract.aggregate([
    { $match: match},
    { $lookup:
      { from: "sources",
        localField: "_source",
        foreignField: "_id",
        as: "source"
      }
    },
    { $lookup:
      { from: "stewards",
        localField: "_steward",
        foreignField: "_id",
        as: "steward"
      }
    },
    { $unwind:"$estimate" },
    { $group: { 
        _id: {
          url: "$_id", 
          name: "$name", 
          _steward: "$_steward", 
          steward: "$steward.name", 
          source: "$source.name"
        }, 
        remains: {$sum: "$estimate.remains"}, 
        income: {$sum: "$estimate.income"}, 
        outlay: {$sum: "$estimate.outlay"}, 
        balance: { $sum: "$estimate.balance"}
      }
    },
    { $sort: { "_id.name": 1} }
  ],
  function(err, list_contracts) {
    if (err) { return next(err); }
    var listLength = list_contracts.length;
    for (var i = 0; i < listLength; i++) {
      list_contracts[i]._id.url = '/catalog/contract/' + list_contracts[i]._id.url.toString();
      list_contracts[i]._id.steward_url = '/catalog/steward/' + list_contracts[i]._id._steward.toString();
    }
    res.render('contract_list', { 
      basehref: req.url,
      title: 'Договора', 
      contract_list: list_contracts
    });
  });
};

exports.contract_detail = function(req, res, next) {
  Contract.findById(req.params.id)
  .populate('_source')
  .populate('_steward')
  .select({ 
    name: 1, 
    department: 1,
    _source: 1,
    _steward: 1,
    estimate: 1
  })
  .exec(function (err, contract) {
    if (err) { return next(err); }
    Department.findById(contract.department)
    .exec(function (err, department) {
      if (err) { return next(err); }
      Department.findById(department.parent)
      .exec(function (err, parent) {
        if (err) { return next(err); }
        for (var i = 0; i < contract.estimate.length; i++) {
          contract.estimate[i].url = '/catalog/outlays/'+req.params.id+'/'+encodeURI(contract.estimate[i].code);
        }
        var isBossD = (department._steward && (department._steward.toString() == req.user._id.toString())) 
          ? true : false;
        var allowedDepartment = department.node != '000000' && 
          ( req.user.role == 'booker' || req.user.role == 'master' && isBossD );
        var isBossP = (parent._steward && (parent._steward.toString() == req.user._id.toString())) 
          ? true : false;
        var allowedParent = parent.node != '000000' && 
          ( req.user.role == 'booker' || req.user.role == 'master' && isBossP );
        res.render('contract_detail', {
          allowedDepartment: allowedDepartment,
          allowedParent: allowedParent,
          basehref: req.url,
          contract: contract, 
          estimate_list: contract.estimate,
          department: department,  
          parent: parent
        });
      });
    });
  });
}
