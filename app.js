var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
//var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
//var expressValidator = require('express-validator');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

var HttpError = require('./lib/error').HttpError;
var checkAuth = require('./lib/checkAuth');
var index = require('./routes/index');
var users = require('./routes/users');
var catalog = require('./routes/catalog');
var admin = require('./routes/admin');
var config_local = require('./config_local');

var app = express();

//Set up mongoose connection
var mongoose = require('mongoose');
mongoose.connect(config_local.mongoDB);
//var options = config_local.mongoDB;
//mongoose.connect(options, { useMongoClient: true });
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
//app.use(expressValidator());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'node_modules')));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'diPbj7LV0V6KBL0kL3F0N',
  saveUninitialized: false, // don't create session until something stored
  resave: false, //don't save session if unmodified
  store: new MongoStore({ mongooseConnection: db })
}));

app.use(require('./lib/sendHttpError'));
app.use(require('./lib/loadUser'));

app.use('/', index);
app.use('/users', users);
app.use('/catalog', checkAuth, catalog);
app.use('/admin', admin);

/*
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});
*/

// error handler
app.use(function(err, req, res, next) {
  if (typeof err == 'number') {
    err = new HttpError(err);
  }

  if (err instanceof HttpError) {
    res.sendHttpError(err);
  } else {
    console.log(err);
    err = new HttpError(500);
    res.sendHttpError(err);
  }
/*
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', { message: res.locals.message, error: res.locals.error});
*/
});

module.exports = app;
