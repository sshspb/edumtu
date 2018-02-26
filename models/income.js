var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var IncomeSchema = new Schema({
  contract: {type: String, ref: 'Contract'},
  date: { type: Date, default: Date.now },
  sum: { type: Number, default: 0 },
  note: String
});

module.exports = mongoose.model('Income', IncomeSchema);

/*
PRI  Inet_Oplata_All

LACC~Лицевой_счет~ 
DEB ~Код_дохода~
DAT ~дата_операции~
PRI ~Сумма~
PLP ~Номер_пл_пор~
FIO ~Плательщик~
DOG ~дог_обучения~
CRE ~Контрагент~
COM ~примечание~
~
    "PRI": { 
      filename: "Inet_Oplata_All.txt", 
      headers: "LACC,DEB,DAT,PRI,PLP,FIO,DOG,CRE,COM" },
      headers: "contract,,date,sum,,,,,note" },
*/