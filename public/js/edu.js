// форматирование стоимости в ячейке таблицы, 
// добавление в tfoot итоговых сумм
function cost() {
  var tables = document.body.getElementsByTagName('TABLE');
  for (var i = 0; i < tables.length; i++) {
    var total = [];
    var rows = tables[i].tBodies[0].rows;
    var rowsLength = rows.length;
    for (var j = 0; j < rowsLength; j++) {
      var cells = rows[j].cells;
      var cellsLength = cells.length;
      for (var k = 0; k < cellsLength; k++) {
        if (!j) total[k] = { "cost": 0, "total": 0};
        var cell = cells[k];
        if (cell.matches('.cost')) {
          var cost = Number(cell.innerHTML);
          total[k].cost = 1;
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
      for (var n = 0; n < total.length; n++) {
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

document.addEventListener("DOMContentLoaded", cost);
