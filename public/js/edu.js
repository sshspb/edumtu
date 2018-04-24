// форматирование стоимости в ячейке таблицы, 
// добавление в tfoot итоговых сумм
function cost() {
  var tables = document.body.getElementsByTagName('TABLE');
  for (var i = 0; i < tables.length; i++) {
    var rows = tables[i].tBodies[0].rows;
    var rowsLength = rows.length;
    var total = [];
    var totalLength = tables[i].tHead.rows[0].cells.length;
    for (var k = 0; k < totalLength; k++) {
      total[k] = { "cost": 0, "total": 0};
    }
    for (var j = 0; j < rowsLength; j++) {
      var cells = rows[j].cells;
      var cellsLength = cells.length;
      for (var k = 0; k < cellsLength && k < 10; k++) {
        var cell = cells[k];
        if (cell.matches('.cost')) {
          var cost = Number(cell.innerHTML);
          total[k]["cost"] = 1;
          total[k].total += cost;
          cell.innerHTML = rouble(cost);
        }
        if (cell.matches('.date')) {
          var date = new Date(cell.innerHTML);
          cell.innerHTML = date.toLocaleDateString();
        }
      }
    }
    var tfoot = tables[i].tFoot;
    if (tfoot && tfoot.matches('#total')) {
      var footCells = tfoot.rows[0].cells;
      for (var n = 0; n < totalLength && n < footCells.length; n++) {
        if (total[n].cost) {
          footCells[n].innerHTML = rouble(total[n].total);
        }
      }
    }
  }
}

function rouble(n) {
  var x = n.toFixed(2).split('.');
  var x1 = x[0];
  var x2 = x.length > 1 ? ',' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + '&nbsp;' + '$2');
  }
  return x1;
//  return x1 + x2;
}

function eCodeFilter(self) {
  var eCode = self.innerHTML.split(' ')[0];
  console.log('eCode = ' + eCode);
  document.getElementsByTagName("A")[2].click();
  document.addEventListener("DOMContentLoaded", function() {
    var rows = document.getElementById("outlaysBody").rows;
    var rowsLength = rows.length;
    for (var j = 0; j < rowsLength; j++) {
      //var roweCode = rows[j].cells[1].innerHTML.split(' ')[0];
      var roweCode = rows[j].cells[1].innerHTML;
      console.log("roweCode = " + roweCode);
      console.log(roweCode == eCode )
      if (roweCode == eCode) {
        rows[j].style.display = "table-row";
      } else {
        rows[j].style.display = "none";
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", cost);
