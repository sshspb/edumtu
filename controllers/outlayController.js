var moment = require('moment');
var Contract = require('../models/contract');
var Eclass = require('../models/eclass');
var Outlay = require('../models/outlay');
moment.locale('ru');

exports.outlay_list = function(req, res, next) {
  var code = decodeURI(req.params.eclass);
  Eclass.findOne()
  .where("code").eq(code)
  .exec(function (err, eclass) {
    if (err) { return next(err); }
    Contract.findById(req.params.contract)
    .exec(function (err, contract) {
      if (err) { return next(err); }
      Outlay
      .where('contract').equals(req.params.contract)
      .where('eclass').equals(code)
      .sort({date: -1})
      .exec(function (err, list_outlays) {
        if (err) { return next(err); }
        for (var i = 0; i < list_outlays.length; i++) {
          list_outlays[i].datestr = moment(list_outlays[i].date).format("L");
        }
        res.render('report/outlay_list', {
          basehref: req.url,
          contract: contract, 
          eclass: eclass.code.concat(' ', eclass.name),
          outlay_list: list_outlays
        });
      });
    });
  });
};
