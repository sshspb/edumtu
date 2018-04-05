var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

var HttpError = require('./lib/error').HttpError;
var checkAuth = require('./lib/checkAuth');
var config = require('./config');

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'diPbj7LV0V6KBL0kL3F0N',
  saveUninitialized: false, // don't create session until something stored
  resave: false, //don't save session if unmodified
  store: new MongoStore({ url: config.dbUrl + '/' +  config.dbName })
}));

app.use(require('./lib/sendHttpError'));
app.use(require('./lib/loadUser'));

app.use('/', require('./routes/index'));
app.use('/report', checkAuth, require('./routes/reports'));

app.use(function(req, res, next) {
  var err = new HttpError(404, req.originalUrl + ' not found');
  next(err);
});

app.use(function(err, req, res, next) {
  if (typeof err == 'number') {
    err = new HttpError(err);
  }
  if (err instanceof HttpError) {
    res.sendHttpError(err);
  } else {
    err = new HttpError(500);
    res.sendHttpError(err);
  }
});

module.exports = app;
