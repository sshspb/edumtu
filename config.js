const config_local = require('./config_local');
module.exports = {
    "tbPath": config_local.tbPath,
    "httpPort": config_local.httpPort || 3000,
    "mongoDB": config_local.mongoDB || "mongodb://127.0.0.1:27017/edu",
    "dbUrl":  config_local.dbUrl || "mongodb://127.0.0.1:27017",
    "dbName": config_local.dbName || "edu",
    "version": "edumtu v1.5.2 05.04.2018"
}
