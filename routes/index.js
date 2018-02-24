var fs = require('fs');
var path = require('path');
var util = require('util');
var moment = require('moment');
var express = require('express');
var router = express.Router();
var config = require('../config');
var config_local = require('../config_local');
var Contract = require('../models/contract');
var Department = require('../models/department');
var Eclass = require('../models/eclass');
var Outlay = require('../models/outlay');
var Source = require('../models/source');
var Species = require('../models/species');
var Steward = require('../models/steward');
var async = require('async');

var count_list = {
  tbtime: function(callback) { tbStat('SME', callback); },
  contract_count: function(callback) { Contract.count(callback); },
  department_count: function(callback) { Department.count(callback); },
  eclass_count: function(callback) { Eclass.count(callback); },
  outlay_count: function(callback) { Outlay.count(callback); },
  source_count: function(callback) { Source.count(callback); },
  species_count: function(callback) { Species.count(callback); },
  steward_count: function(callback) { Steward.count(callback); }
};

router.get('/', function(req, res) {   
  async.parallel(count_list, function(err, results) {
    res.render(req.user ? (req.user.role == 'admin' ? 'admin/index' : 'report/index') : 'home', { 
      version: config.version,
      basehref: req.url,
      title: 'Оперативно-финансовый отдел', 
      subtitle: 'учёта образовательной деятельности', 
      error: err, 
      data: results 
    });
  });
});

router.get('/importdata', function(req, res) {
  var importData = require('../lib/importDataM');
  importData(function(err) {
    var title = '';
    if (err) {
      res.render('home', { 
        basehref: req.url,
        title:'Ошибка загрузки', 
          subtitle: '', error: err 
      });
    } else {
      async.parallel(count_list, function(err, results) {
        res.render('home', { 
          version: config.version,
          basehref: req.url,
          title: 'Данные загружены', 
          subtitle: '', 
          error: err, 
          data: results 
        });
      });
    }
  });
});

module.exports = router;

/**
 * дата создания файла данных ТБ
 */
function tbStat(tableName, callback) {
    var tbTable = config.tbTables[tableName];
    var stat = fs.statSync(path.join(config_local.tbPath, tbTable.filename));
    var tbtime = {
      atime: moment(stat.atime).format("LLL"),
      mtime: moment(stat.mtime).format("LLL"),
      ctime: moment(stat.ctime).format("LLL"),
      birthtime: moment(stat.birthtime).format("LLL")
    };
    return callback(null, tbtime);
}
