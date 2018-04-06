const config_local = require('./config_local');
module.exports = {
    "tbPath": config_local.tbPath,
    "httpPort": config_local.httpPort || 3000,
    "mongoDB": config_local.mongoDB || "mongodb://127.0.0.1:27017/edu",
    "dbUrl":  config_local.dbUrl || "mongodb://127.0.0.1:27017",
    "dbName": config_local.dbName || "edu",
    "variant_list": ["Вариант 1", "Вариант 2", "Вар: План", "Вар: Финансы"],
    "scope_list": ["Основная", "Наука"],
    "version": "edumtu v1.6.1 05.04.2018"
}
