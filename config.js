const config_local = require('./config_local');
module.exports = {
  "version": "edumtu v1.12.5 30.06.2018",
  "scope_list": ["Основная", "Наука"],
  "variant_list": ["Вариант: План", "Вариант: Факт"],
  "estimate_index": [
      [
        { header: "Ост. на начало", value: "remains"},
        { header: "Плановая сумма", value: "plan"},
        { header: "Затраты с планом", value: "outlayO"},
        { header: "Остаток по смете", value: "balanceE"},
        { header: "Кассовые затраты", value: "outlay"},
        { header: "Остаток/месяц", value: "balanceEM"}
      ],
      [
        { header: "Ост. на начало", value: "remains"},
        { header: "Поступление денеж.срв.", value: "income"},
        { header: "Кассовые затраты", value: "outlay"},
        { header: "Остаток денеж.срв", value: "balance"}
      ],
    ],
    "univ": { _id: "00000", code : "000", abbr : "СПбГМТУ" },
    "tbPath": config_local.tbPath,
    "tbPrefix": "Inet_",
    "mongoDB": config_local.mongoDB || "mongodb://127.0.0.1:27017/edu",
    "dbUrl":  config_local.dbUrl || "mongodb://127.0.0.1:27017",
    "dbName": config_local.dbName || "edu",
    "httpPort": config_local.httpPort || 3000,
    "ssl": config_local.ssl || 0,
    "sslKey": config_local.sslKey || "./bin/key.pem",
    "sslCert": config_local.sslCert || "./bin/cert.pem"
  }

/*
               Inet_MUSmetaLSAll   "Вариант: Смета",        "Вариант: Факт"

1 "remains",   "Вх_Остаток",       "Ост. на начало",        "Ост. на начало"
2 "plan",      "Сумма_назначения", "Плановая сумма на год", 
3 "income",    "Доход_по_статье",                           "Поступление денеж срв."
4 "outlayO",   "Затраты_с_обяз",   "Затраты с планом",
5 "outlay",    "Затраты_факт",     "Кассовые затраты",       "Кассовые затраты"
6 "balance",   "Остаток_ден",                                "Остаток денеж. средств" 
7 "balanceE",  "Остаток_по_смете", "Остаток по смете"
8 "balanceWO", "Остаток_смета_БО" 

Смета, Вариант: Смета
1  Ост. на начало	        Smeta       remains   smeta
2  Плановая сумма на год	Smeta       plan      smeta
4  Затраты с планом	      Rashod      outlayO   outlays0
7  Остаток по смете	      1+2-4       balanceE            = remains + plan - outlayO
5  Кассовые затраты       RashodFakt  outlay    outlays1

Смета, Вариант: Факт
1  Ост. на начало	        Smeta       remains   smeta
3  Поступление денеж срв.	Smeta       income    smeta
5  Кассовые затраты       RashodFakt  outlay    outlays1
6  Остаток денеж. средств 1+3-5       balance             = remains + income - outlay

*/
