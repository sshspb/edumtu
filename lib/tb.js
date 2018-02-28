var fs = require("fs");
var path = require('path');
var windows1251 = require('windows-1251'); 
var mongoose = require('mongoose');
var options = "mongodb://localhost/tb";
mongoose.connect(options, {
  useMongoClient: true
});
var db = mongoose.connection;
var tbPath = "D:/data/edu/data20180221";
var tbTables = [
  "Inet_ClearDLS.txt", 
  "Inet_Naklad.txt", 
  "Inet_NakladCF.txt", 
  "Inet_PerevodLS.txt", 
  "Inet_Oplata_All.txt", 
  "Inet_RashodLS.txt", 
  "Inet_SmetaLSV.txt", 
  "Inet_LS_AllFin.txt", 
  "Inet_PolzNew.txt"
];
var j = 0;
db.dropDatabase( function () {
  console.log('start');
  for (var i = 0; i < tbTables.length; i++) {
    console.log('i = ' + i);
    var content = fs.readFileSync(path.join(tbPath, tbTables[i])).toString('binary');
      content = windows1251.decode(content);    // cp1251 --> utf8
      content = content.split(/[\n\r]+/ig);     // строка --> массив строк
      var headers = content.shift();                          // заголовки в первой строке
      headers = headers.replace(/^~|~~$/g, '').split('~~');
      console.log(headers);
      var hashData = [ ];
      content.forEach(function(item){
        if(item){
          // отбросить (replace) символы '~' в начале и в конце строки,
          // после чего строку разбить (split) на массив подстрок
          item = item.replace(/^~|~~$/g, '').split('~~');
          var hashItem = { };
          headers.forEach(function(headerItem, index){
            if (headerItem.trim()) {
              hashItem[headerItem.trim()] = item[index].trim();
            }
          });
          hashData.push(hashItem);
        }
      });
      var cName = tbTables[i].substr(5).replace(/\.txt/,'');
      console.log('cName = ' + cName);
      db.collection(cName).insert(hashData);
      console.log(headers);
    }
  }
);
console.log('finished');
