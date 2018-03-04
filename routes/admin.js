var express = require('express');
var router = express.Router();
var async = require('async'); 
var ObjectID = require('mongodb').ObjectID;
var crypto = require('crypto');
var Department = require('../models/department');
var Contract = require('../models/contract');
var Steward = require('../models/steward');

router.get('/stewards', function(req, res, next) {
  Steward.find({})
  .select({ name: 1, role: 1, login: 1})
  .sort({name: 1})
  .exec(function (err, list_stewards) {
    if (err) { return next(err); }
    res.render('admin/admin_steward_list', {
      steward_list: list_stewards
    });
  });
});

router.get('/steward/:id', function(req, res, next) {
  Steward.find({ _id: ObjectID(req.params.id) })
  .select({ name: 1, role: 1, login: 1})
  .exec(function (err, steward) {
    if (err) { return next(err); }
//    console.log(steward[0]);
//    res.locals.helloworld = 'Hello world';
    res.render('admin/admin_steward_detail', {
      selectedMaster: steward[0].role == 'master',
      selectedBooker: steward[0].role == 'booker',
      selectedAdmin: steward[0].role == 'admin',
      steward: steward[0]
    });
  });
});
 
router.post('/steward/:id', function(req, res, next) {
  var hasOld = req.body.oldlogin ? true : false;
  var role = req.body.role;
  var login = req.body.username.toUpperCase();
  var password = req.body.password;
  var options = null;
  if (hasOld && !req.body.username) {
    // Пустое поле Login - пользователя "удалить"
    options = { 
      role: null, 
      login: null, 
      hashedPassword: null, 
      salt: null 
    }
  } else if (hasOld && !req.body.password) { 
    // Пустое поле Password - пароль не менять
    options = {
      role: role,
      login: login
    }
  } else if (req.body.username && req.body.password) {
    // новые данные
    var salt = Math.random() + '';
    var hashedPassword = crypto.createHmac('sha1', salt).update(password).digest('hex');
    options = {
      role: role,
      login: login,
      salt: salt,
      hashedPassword: hashedPassword
    }
  }
  if (!options) res.redirect('/admin/stewards');
  else {
    Steward.findByIdAndUpdate( 
      req.params.id, 
      options,
      function (err, updatedSteward) {
        if (err) { return next(err); }
        res.redirect('/admin/stewards');
      }
    );
  }
});

router.get('/departments', function(req, res, next) {
  rows = [];
  Department.find()
  .populate('_steward', 'name')
  .sort({_id: 1})
  .exec(function (err, list_departments) {
    if (err) { return next(err); }
    var totalSaldo = 0;
    for (var i = 0; i < list_departments.length; i++) {
      var department = list_departments[i];
      var allowedDepartment = department._steward === req.user._id;
      var trClass;
      if (department.node == '000000') {
        trClass = ''; 
        totalSaldo = department.saldo;
      } else if (department.parent == '000000') {
        trClass = 'treegrid-' + department.node
      } else {
        trClass = 'treegrid-' + department.node + ' treegrid-parent-' + department.parent
      }
      rows.push({ 
        "stewardName": department._steward ? department._steward.name : 'не указан' ,
        "name": department.code + ' ' + department.name, 
        "url": '/admin/department/' + department._id,
        "trClass": trClass
      });
    }
    res.render('admin/admin_department_list', { 
      title: 'Подразделения', 
      department_list: rows
    });
  });
});

router.get('/department/:id', function(req, res, next) {
  // Данное подразделение и список ответственных лиц
  async.parallel({
    department: function(callback) {
      Department.findById(req.params.id, callback);
    },
    stewards: function(callback) {
      Steward.find({}, callback);
    }
  }, function(err, results) {
    if (err) { return next(err); }
    res.render('admin/admin_department_detail', { 
      title: results.department.name,
      department: results.department, 
      stewards: results.stewards
    });
  });
});

router.post('/department/:id', function(req, res, next) {
  var departmentId = req.params.id;
  var stewardId = req.body.steward;
  Department.findByIdAndUpdate(
    departmentId, 
    { _steward: ObjectID(stewardId) }, 
    function (err, updatedDepartment) {
      if (err) return handleError(err);
      res.redirect('/admin/departments');
    }
  );
});

module.exports = router;
