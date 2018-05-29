const config_local = require('./config_local');
module.exports = {
  "version": "edumtu v1.9.7 29.05.2018",
  "scope_list": ["Основная", "Наука"],
  "variant_list": ["Вариант: Смета", "Вариант: Факт"],
  "estimate_index": [
      [
        { header: "Ост. на начало", value: "remains"},
        { header: "Плановая сумма на год", value: "plan"},
        { header: "Затраты с планом", value: "outlayO"},
        { header: "Остаток по смете", value: "balanceE"},
        { header: "Кассовые затраты", value: "outlay"}
      ],
      [
        { header: "Ост. на начало", value: "remains"},
        { header: "Поступление денеж срв.", value: "income"},
        { header: "Кассовые затраты", value: "outlay"},
        { header: "Остаток денеж. средств", value: "balance"}
      ],
    ],
    "univ": { _id: "00000", code : "000", abbr : "СПбГМТУ" },
    "tbPath": config_local.tbPath,
    "mongoDB": config_local.mongoDB || "mongodb://127.0.0.1:27017/edu",
    "dbUrl":  config_local.dbUrl || "mongodb://127.0.0.1:27017",
    "dbName": config_local.dbName || "edu",
    "httpPort": config_local.httpPort || 3000,
    "ssl": config_local.ssl || 0,
    "sslKey": config_local.sslKey || "./bin/key.pem",
    "sslCert": config_local.sslCert || "./bin/cert.pem"
  }
