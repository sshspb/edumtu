const crypto = require('crypto');
const router = require('express').Router();
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');

router.get('/departments', function(req, res, next) {
    MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('departments')
    .find({})
    .sort({_id: 1})
    .toArray(function (err, list_departments) {
      client.close();
      if (err) { 
        console.log(err);  
        return next(err); 
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
        record_list: list_objects
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
      client.close();
      for (var i = 0; i < list_bookers.length; i++) {
        list_bookers[i].url = '/admin/steward/booker/' + encodeURIComponent(list_bookers[i].name);
      }
      list_bookers.push({
        name: "___новая запись___",
        role: "booker",
        login: "",
        url: "/admin/steward/booker/new"
      });
      res.render('admin/steward_list', {
        title: 'Руководители',
        steward_list: list_bookers
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
          url: { $concat: [ "/admin/steward/master/", "$_id.url" ] },
          name: "$_id.name",
          login: "$users.login",
          role: "$users.role"
        }
      },
      { $sort: { "_id.name": 1} }
    ])
    .toArray(function (err, list_stewards) {
      client.close();
      if (err) { client.close(); return next(err); }
      res.render('admin/steward_list', {
        title: 'Ответственные',
        steward_list: list_stewards
      });
    });
  });
});

router.get('/steward/:role/:name', function(req, res, next) {
  const role = req.params.role;
  const name = req.params.name;
  if (role == 'booker' && name == 'new') {
    res.render('admin/steward_detail', {
      title: 'Экономист',
      steward: {name: '', login: '', role: role}
    });
  } else {
    MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
      db.collection('users').find({name: name, role: role})
      .toArray(function(err, documents) { 
        client.close();
        if (err) { client.close(); return next(err); }
        var user;
        if (documents.length) user = documents[0];
        else  user = {name: name, login: '', role: role};
        res.render('admin/steward_detail', {
          title: role == 'booker' ? 'Экономист' : 'Руководитель',
          steward: user
        });
      })
    });
  }
});

router.post('/steward', function(req, res, next) {
  var name = req.body.name;
  var role = req.body.role;
  var oldLogin = req.body.oldlogin;
  var login = req.body.username;
  var password = req.body.password;
  var url = role == 'booker' ? '/admin/bookers' : '/admin/stewards';
  var update = null;
  if (oldLogin && !login) {
    // Пустое поле Login - пользователя "удалить"
    update = { login: 'delete' }
  } else if (name && role && login && password) {
    // новые данные
    var salt = Math.random() + '';
    var hashedPassword = crypto.createHmac('sha1', salt).update(password).digest('hex');
    update = {
      login: login,
      salt: salt,
      hashedPassword: hashedPassword
    }
  }
  if (!update) res.redirect(url);
  else if (update.login == 'delete') {
    MongoClient.connect(config.dbUrl, function(err, client) {
      db = client.db(config.dbName);
      db.collection('users')
      .deleteOne(
        {name: name, role: role}, 
        function (err, deletedUser) {
          client.close();
          if (err) { return next(err); }
          res.redirect(url);
        }
      );
    });
  } else {
    MongoClient.connect(config.dbUrl, function(err, client) {
      db = client.db(config.dbName);
      db.collection('users')
      .updateOne(
        {name: name, role: role}, 
        { $set: update }, 
        { upsert: true }, 
        function (err, updatedUser) {
          client.close();
          if (err) { return next(err); }
          res.redirect(url);
        }
      );
    });
  }
});

module.exports = router;
