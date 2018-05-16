const crypto = require('crypto');
const router = require('express').Router();
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
var docsQty = {
  departments: 0,
  contracts: 0,
  stewards: 0,
  sources: 0,
  eclasss: 0,
  incomes: 0,
  outlays: 0,
  species: 0,
  version: 'Данные не загружены'
}; 

router.get('/departments', function(req, res, next) {
    MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('departments')
    .find({})
    .sort({_id: 1})
    .toArray(function (err, list_departments) {
      if (err) { 
        console.log(err);  
        return next(err); 
      }
      db.collection('quantitys')
      .find({})
      .toArray(function(err, quantitys) {
        client.close();
        if (err) { return next(err); }
        if (quantitys.length) {
          docsQty = quantitys[0];
          docsQty.version = config.version;
        } 
        var list_objects = []
        for (var i = 0; i < list_departments.length; i++) {
          var trClass = 'treegrid-'.concat(list_departments[i]._id);
          if (list_departments[i].parent) 
            trClass += ' treegrid-parent-'.concat(list_departments[i].parent);
          list_objects.push({
            trClass: trClass,
            name: list_departments[i].name
          });
        }
        res.render('admin/department_tree', {
          record_list: list_objects,
          data: docsQty
        });
      });
    });
  });
});

router.get('/bookers', function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('users')
    .find({role: 'booker'})
    .sort({name: 1})
    .toArray(function (err, list_bookers) {
      if (err) { client.close(); return next(err); }
      db.collection('quantitys')
      .find({})
      .toArray(function(err, quantitys) {
        client.close();
        if (err) { return next(err); }
        if (quantitys.length) {
          docsQty = quantitys[0];
          docsQty.version = config.version;
        } 
        res.render('admin/booker_list', {
          booker_list: list_bookers,
          data: docsQty
        });
      });
    });
  });
});

router.get('/stewards', function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('stewards')
    .aggregate([
      { $group : { _id: { name: "$name", url: "$url"} } },
      { $lookup:
        {
          from: "users",
          localField: "_id.name",
          foreignField: "name",
          as: "users"
        }
      }, 
      { $project: {
          url: { $concat: [ "/admin/steward/", "$_id.url" ] },
          name: "$_id.name",
          login: "$users.login",
          role: "$users.role"
        }
      },
      { $sort: { "_id.name": 1} }
    ])
    .toArray(function (err, list_stewards) {
      if (err) { client.close(); return next(err); }
      db.collection('quantitys')
      .find({})
      .toArray(function(err, quantitys) {
        client.close();
        if (err) { return next(err); }
        if (quantitys.length) {
          docsQty = quantitys[0];
          docsQty.version = config.version;
        } 
        res.render('admin/steward_list', {
          steward_list: list_stewards,
          data: docsQty
        });
      });
    });
  });
});

router.get('/steward/:id', function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('users').find({name: req.params.id, role: "master"})
    .toArray(function(err, documents) { 
      if (err) { client.close(); return next(err); }
      var user;
      if (documents.length) user = documents[0];
      else  user = {name: req.params.id, login: ''};
      db.collection('quantitys').find({})
      .toArray(function(err, quantitys) {
        client.close();
        if (err) { return next(err); }
        if (quantitys.length) {
          docsQty = quantitys[0];
          docsQty.version = config.version;
        } 
        res.render('admin/steward_detail', {
          steward: user,
          data: docsQty
        });
      })
    });
  });
});
 
router.post('/steward/:id', function(req, res, next) {
  var role = 'master';
  var oldLogin = req.body.oldlogin;
  var login = req.body.username;
  var password = req.body.password;
  var update = null;
  if (oldLogin && !login) {
    // Пустое поле Login - пользователя "удалить"
    update = { login: 'delete' }
  } else if (oldLogin && login && oldLogin != login && !password) { 
    // Пустое поле Password - пароль не менять
    update = {
      login: login
    }
  } else if (login && password) {
    // новые данные
    var salt = Math.random() + '';
    var hashedPassword = crypto.createHmac('sha1', salt).update(password).digest('hex');
    update = {
      login: login,
      salt: salt,
      hashedPassword: hashedPassword
    }
  }
  if (!update) res.redirect('/admin/stewards');
  else if (update.login == 'delete') {
    MongoClient.connect(config.dbUrl, function(err, client) {
      db = client.db(config.dbName);
      db.collection('users')
      .deleteOne(
        {name: req.params.id, role: "master"}, 
        function (err, deletedUser) {
          client.close();
          if (err) { return next(err); }
          res.redirect('/admin/stewards');
        }
      );
    });
  } else {
    MongoClient.connect(config.dbUrl, function(err, client) {
      db = client.db(config.dbName);
      db.collection('users')
      .updateOne(
        {name: req.params.id, role: "master"}, 
        { $set: update }, 
        { upsert: true }, 
        function (err, updatedUser) {
          client.close();
          if (err) { return next(err); }
          res.redirect('/admin/stewards');
        }
      );
    });
  }
});

router.get('/departments', function(req, res, next) {
/*
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
    res.render('admin_department_list', { 
      title: 'Подразделения', 
      department_list: rows
    });
  });
*/
});

router.get('/department/:id', function(req, res, next) {
/*
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
    res.render('admin_department_detail', { 
      title: results.department.name,
      department: results.department, 
      stewards: results.stewards
    });
  });
*/
});

router.post('/department/:id', function(req, res, next) {
/*
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
*/
});

module.exports = router;
