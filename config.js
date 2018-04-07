const config_local = require('./config_local');
module.exports = {
  "version": "edumtu v1.6.2 07.04.2018",
  "scope_list": ["Основная", "Наука"],
  "variant_list": ["Вариант 1", "Вар: Смета", "Вар: Факт", "Вар: План", "Вар: Финансы"],
  "estimate_index": [
      [
        { header: "Остаток на начало", value: "remains" },
        { header: "Поступление денеж ср-в", value: "income"},
        { header: "Кассовые затраты", value: "outlay"},
        { header: "Остаток денеж. средств", value: "balance"},
        { header: "Затраты с планом", value: "outlayO"},
        { header: "Остаток  с учетом обяз", value: "balanceO"}
      ],
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
      [
        { header: "Задание", value: "plan"},
        { header: "Исполнено", value: "outlayO"},
        { header: "Остаток", value: "balanceE"}
      ],
      [
        { header: "ОстНачало", value: "remains"},
        { header: "Доходы", value: "income"},
        { header: "Расходы", value: "outlay"},
        { header: "Остаток", value: "balance"}
      ]
    ],
    "tbPath": config_local.tbPath,
    "httpPort": config_local.httpPort || 3000,
    "mongoDB": config_local.mongoDB || "mongodb://127.0.0.1:27017/edu",
    "dbUrl":  config_local.dbUrl || "mongodb://127.0.0.1:27017",
    "dbName": config_local.dbName || "edu"  
  }
