const fs = require("fs");
const async = require('async');
const crypto = require('crypto');
const router = require('express').Router();
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');

router.get('/importdata', function(req, res) {
  var importData = require('../lib/tbImport').importData;
  var reformData = require('../lib/tbReform').reformData;
  importData(res.locals.year, function (err) {
    if (err) throw new Error(err);
    reformData(res.locals.year, function (err) {
      if (err) throw new Error(err);
      console.log('OK import done');
      if (res.locals.userRole == 'admin') {
        //res.redirect('/admin/diff');
        diffRashod(req, res)
      } else {
        res.redirect('/');
      }
      //res.redirect('/admin/diff');
    });
  });
/*
  async.series([
    importData(res.locals.year, function (err) {if (err) throw new Error(err);}),
    reformData(res.locals.year, function (err) {if (err) throw new Error(err);})
  ], 
  function(err) {
    if (err) console.log('Opss Error while import data');
    else console.log('OK import done');
    res.redirect('/admin/diff');
  });
*/
});

router.get('/departments', function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('departments')
    .aggregate([
      { $project: { name: 1, parent: 1, node: 1 } },
      { $lookup: {
          from: "chiefs",
          localField: "node",
          foreignField: "department",
          as: "chiefs"
      } }, 
      { $sort: { node: 1} }
    ])
    .toArray(function (err, list_departments) {
      client.close();
      if (err) { console.log(err); return next(err); }

      var list_records = [];
      for (var i = 0; i < list_departments.length; i++) {
        var chiefs = '';
        if (list_departments[i].chiefs.length) {
          var a = [];
          for (var j =0; j < list_departments[i].chiefs.length; j++) {
            a.push(list_departments[i].chiefs[j].steward)
          }
          a.sort();
          for (var j =0; j < a.length; j++) {
            if (j) chiefs += ', ';
            chiefs += a[j];
          }
        }
        var trClass = 'treegrid-'.concat(list_departments[i].node);
        if (list_departments[i].parent) {
          trClass = trClass + ' treegrid-parent-'.concat(list_departments[i].parent);
        } else {
          chiefs = 'экономисты';
          trClass = 'treegrid-' + config.univ._id;
          url = '/admin/bookers';
        }
        list_records.push({
          name: list_departments[i].name,
          chiefs: chiefs,
          trClass: trClass,
          url: "/admin/department/" + list_departments[i].node
        });
      }
      res.render('admin/department_tree', {
        record_list: list_records
      });
    });
  });
});

router.get('/department/:id', function(req, res, next) {
  // вывести полный список руководителей 
  // отмечая птичкой кто данным подразделением :id руководит
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('stewards')
    .aggregate([
      { $group : { _id: { name: "$name"} } },
      { $lookup:
        {
          from: "chiefs",
          localField: "_id.name",
          foreignField: "steward",
          as: "chiefs"
        }
      }, 
      { $sort: { "_id.name": 1} }
    ])
    .toArray(function (err, list_chiefs) {
      if (err) { client.close(); return next(err); }
      var chiefs = [];
      for (var i = 0; i < list_chiefs.length; i++) {
        list_chiefs[i].flag = list_chiefs[i].chiefs.some( (x) => x.department == req.params.id)
        if (list_chiefs[i].flag) {
          chiefs.push(list_chiefs[i]._id.name)
        }
      }
      var n = Math.ceil(list_chiefs.length / 3);
      list_chiefs_1 = list_chiefs.slice(0, n);
      list_chiefs_2 = list_chiefs.slice(n, n*2);
      list_chiefs_3 = list_chiefs.slice(n*2);

      longTitle = '';
      var node = req.params.id;
      var depsId = [];
      var nl = 5;
      while (nl <= node.length) {
        depsId.push(node.slice(0, nl));
        nl += 5;
      }
      var list_departments = [];
      async.eachSeries(depsId, 
        function(dep_id, callback) {
          db.collection('departments')
          .find({node: dep_id})
          .toArray(function (err, departments) {
            if (err) { return next(err); }
            list_departments.push({ 
              name: departments[0].name
            });
            callback(null);
          });
        }, 
        function() {
          client.close();
          var longTitle = '&nbsp;Подразделение&nbsp; ';
          if (list_departments.length) 
            longTitle += ' <span style="color: #ccc">/</span> &nbsp;' + list_departments[0].name;
          longTitle += ' <span style="color: #ccc">/</span>&nbsp; деятельность <span style="font-weight: 700;">' + 
                        config.scope_list[req.params.id.charAt(0)] + '</span>';
          for (var i = 1; i < list_departments.length - 1; i++) {
            longTitle += ' <span style="color: #ccc">/</span> &nbsp;' + list_departments[i].name;
          }
          if (list_departments.length > 1) {
            longTitle += ' <span style="color: #ccc">/</span> &nbsp;<span style="font-weight: 700;">' + 
              list_departments[list_departments.length-1].name + '</span>';
          }
          //longTitle += ', &nbsp;вид деятельности:&nbsp;<span style="font-weight: 700;"> ' + config.scope_list[req.params.id.charAt(0)] + '</span>';
          res.render('admin/chief_list', {
            title: longTitle,
            longTitle: longTitle,
            oldChiefs: JSON.stringify(chiefs),
            chief_list_1: list_chiefs.slice(0, n),
            chief_list_2: list_chiefs.slice(n, n*2),
            chief_list_3: list_chiefs.slice(n*2)
          });
        }
      );
    });
  });
});

router.post('/department/:id', function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);

    var oldChiefs = JSON.parse(req.body.oldChiefs);
    var newChiefs = req.body.chiefs;
    if (!(newChiefs instanceof Array)) {
      if(typeof newChiefs === 'undefined')
        newChiefs = [];
      else
        newChiefs = new Array(newChiefs);
    }

    // новые к вставке, если нет в списке старом
    for (var i = 0; i < newChiefs.length; i++) {
      if (oldChiefs.indexOf(newChiefs[i]) < 0) {
        if (isSteward({steward: newChiefs[i] })) {
          insertChief({ department: req.params.id, steward: newChiefs[i] });
        }
      } 
    }
    // старые к удалению, если нет в списке новом
    for (var i = 0; i < oldChiefs.length; i++) {
      if (newChiefs.indexOf(oldChiefs[i]) < 0) {
        deleteChief({ department: req.params.id, steward: oldChiefs[i] });
      }
    }
  
    client.close();
    res.redirect('/admin/departments');

    async function isSteward(name) {
      return await db.collection('stewards').count({name: name});
    }

    async function insertChief(doc) {
      await db.collection('chiefs').insertOne(doc);
    }

    async function deleteChief(query) {
      await db.collection('chiefs').deleteOne(query);
    }

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
      if (list_bookers.length > 20) {
        var n = Math.ceil(list_bookers.length / 3);
        list_bookers_1 = list_bookers.slice(0, n);
        list_bookers_2 = list_bookers.slice(n, n*2);
        list_bookers_3 = list_bookers.slice(n*2);
      } else {
        list_bookers_1 = null;
        list_bookers_2 = null;
        list_bookers_3 = list_bookers;
      }
      list_bookers_3.push({
        name: "___новая запись___",
        role: "booker",
        login: "",
        url: "/admin/steward/booker/new"
      });
      res.render('admin/steward_list', {
        title: 'Экономист',
        record_list_1: list_bookers_1,
        record_list_2: list_bookers_2,
        record_list_3: list_bookers_3
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
      var n = Math.ceil(list_stewards.length / 3);
      list_stewards_1 = list_stewards.slice(0, n);
      list_stewards_2 = list_stewards.slice(n, n*2);
      list_stewards_3 = list_stewards.slice(n*2);
      res.render('admin/steward_list', {
        title: 'Руководитель',
        record_list_1: list_stewards_1,
        record_list_2: list_stewards_2,
        record_list_3: list_stewards_3
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

router.get('/passwd', function(req, res, next) {
  res.render('admin/passwd', {});
});

router.post('/passwd', function(req, res, next) {
  // смена пароля admin
  var salt = Math.random() + '';
  var hashedPassword = crypto.createHmac('sha1', salt).update(req.body.password).digest('hex');
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('users')
    .updateOne(
      {"role" : "admin", "login" : "admin"}, 
      { $set: {
        "name" : "Администратор",
        "salt" : salt,
        "hashedPassword" : hashedPassword
      } }, 
      { upsert: true }, 
      function (err, updatedUser) {
        client.close();
        if (err) { return next(err); }
        res.redirect('/');
      }
    );
  });
});

router.get('/diff', diffRashod);

/*
router.get('/diff', function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName + res.locals.year);
    
    db.collection('smeta').find({})
    .toArray(function (err, list_smeta) {
      client.close();
      if (err) { return next(err); }

      var eCode;
      var list_eCode = [];
      for (var i = 0; i < list_smeta.length; i++) {
        eCode = list_smeta[i]._id.eCode.substring(0,3);
        if (list_eCode.indexOf(eCode) < 0) {
          list_eCode.push(eCode);
        }
      }
      list_eCode.sort();

      var planTotal = { trClass: 'treegrid-1', contract: 'План' };
      var factTotal = { trClass: 'treegrid-2', contract: 'Факт' };
      for (var j = 0; j < list_eCode.length; j++) {
        planTotal[list_eCode[j]] = 0.0;
        factTotal[list_eCode[j]] = 0.0;
      }

      var next = '@@@';
      var plan_diff = [], fact_diff = [];
      var plan = {}, fact = {};
      var planInsert = false, factInsert = false;
      for (var i = 0; i < list_smeta.length; i++) {
        if (next != list_smeta[i]._id.contract) {
          next = list_smeta[i]._id.contract;
          if (i) {
            if (planInsert) {
              plan_diff.push(plan);
              planInsert = false;
            }
            if (factInsert) {
              fact_diff.push(fact);
              factInsert = false;
            }
          }
          plan = { trClass: 'treegrid-1' + i + ' treegrid-parent-1', contract: list_smeta[i].contract };
          fact = { trClass: 'treegrid-2' + i + ' treegrid-parent-2', contract: list_smeta[i].contract };
          for (var j = 0; j < list_eCode.length; j++) {
            plan[list_eCode[j]] = 0.0;
            fact[list_eCode[j]] = 0.0;
          }
        }
        eCode = list_smeta[i]._id.eCode.substring(0,3);
        if (list_smeta[i].diffPlan) {
          planInsert = true;
          plan[eCode] = list_smeta[i].diffPlan;
          planTotal[eCode] += list_smeta[i].diffPlan;
        }
        if (list_smeta[i].diffFact) {
          factInsert = true;
          fact[eCode] = list_smeta[i].diffFact;
          factTotal[eCode] += list_smeta[i].diffFact;
        }
      }
      
      var list_diff = [];
      list_diff.push(planTotal);
      for (var k = 0; k < plan_diff.length; k++) {
        list_diff.push(plan_diff[k]);
      }
      list_diff.push(factTotal);
      for (var k = 0; k < fact_diff.length; k++) {
        list_diff.push(fact_diff[k]);
      }

      var logimport = fs.readFileSync("doc/importlog.log")

      res.render('admin/diff', {
        eCode_list: list_eCode,
        diff_list: list_diff,
        logimport: logimport
      });
    });
  });
});
*/

function diffRashod(req, res) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName + res.locals.year);
    
    db.collection('smeta').find({})
    .toArray(function (err, list_smeta) {
      client.close();
      if (err) { return next(err); }

      var eCode;
      var list_eCode = [];
      for (var i = 0; i < list_smeta.length; i++) {
        eCode = list_smeta[i]._id.eCode.substring(0,3);
        if (list_eCode.indexOf(eCode) < 0) {
          list_eCode.push(eCode);
        }
      }
      list_eCode.sort();

      var planTotal = { trClass: 'treegrid-1', contract: 'План' };
      var factTotal = { trClass: 'treegrid-2', contract: 'Факт' };
      for (var j = 0; j < list_eCode.length; j++) {
        planTotal[list_eCode[j]] = 0.0;
        factTotal[list_eCode[j]] = 0.0;
      }

      var next = '@@@';
      var plan_diff = [], fact_diff = [];
      var plan = {}, fact = {};
      var planInsert = false, factInsert = false;
      for (var i = 0; i < list_smeta.length; i++) {
        if (next != list_smeta[i]._id.contract) {
          next = list_smeta[i]._id.contract;
          if (i) {
            if (planInsert) {
              plan_diff.push(plan);
              planInsert = false;
            }
            if (factInsert) {
              fact_diff.push(fact);
              factInsert = false;
            }
          }
          plan = { trClass: 'treegrid-1' + i + ' treegrid-parent-1', contract: list_smeta[i].contract };
          fact = { trClass: 'treegrid-2' + i + ' treegrid-parent-2', contract: list_smeta[i].contract };
          for (var j = 0; j < list_eCode.length; j++) {
            plan[list_eCode[j]] = 0.0;
            fact[list_eCode[j]] = 0.0;
          }
        }
        eCode = list_smeta[i]._id.eCode.substring(0,3);
        if (list_smeta[i].diffPlan) {
          planInsert = true;
          plan[eCode] = list_smeta[i].diffPlan;
          planTotal[eCode] += list_smeta[i].diffPlan;
        }
        if (list_smeta[i].diffFact) {
          factInsert = true;
          fact[eCode] = list_smeta[i].diffFact;
          factTotal[eCode] += list_smeta[i].diffFact;
        }
      }
      
      var list_diff = [];
      list_diff.push(planTotal);
      for (var k = 0; k < plan_diff.length; k++) {
        list_diff.push(plan_diff[k]);
      }
      list_diff.push(factTotal);
      for (var k = 0; k < fact_diff.length; k++) {
        list_diff.push(fact_diff[k]);
      }

      var logimport = fs.readFileSync("doc/importlog.log")

      res.render('admin/diff', {
        eCode_list: list_eCode,
        diff_list: list_diff,
        logimport: logimport
      });
    });
  });
}

module.exports = router;
