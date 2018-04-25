// форматирование стоимости в ячейке таблицы, 
// добавление в tfoot итоговых сумм
function cost() {
  var tables = document.body.getElementsByTagName('TABLE');
  for (var i = 0; i < tables.length; i++) {
    var total = [];
    var totalLength = tables[i].tHead.rows[0].cells.length;
    for (var k = 0; k < totalLength; k++) {
      total[k] = { "cost": 0, "total": 0};
    }
    var rows = tables[i].tBodies[0].rows;
    var rowsLength = rows.length;
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
          rows[j].setAttribute("data-month", date.getMonth());
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

function monthFilter(month, title) {
  document.getElementById("outlaysmenu").innerHTML = title + '<span class="caret" style="margin-left: 5px;"></span>';
  var total = [];
  var table = document.getElementById("outlaystable");
  var columnCount = table.tHead.rows[0].cells.length;
  for (var k = 0; k < columnCount; k++) {
    total[k] = { "cost": 0, "total": 0};
  }
  var rows = table.tBodies[0].rows;
  for (var j = 0; j < rows.length; j++) {
    if (!month || rows[j].getAttribute("data-month") == month) {
      rows[j].style.display = "table-row";
      var cells = rows[j].cells;
      for (var k = 0; k < cells.length && k < 10; k++) {
        var cell = cells[k];
        if (cell.matches('.cost')) {
          var cost = Number(cell.innerHTML.replace(/&nbsp;/g, ''));
console.log(cell.innerHTML);
console.log(cost);
          total[k]["cost"] = 1;
          total[k].total += cost;
        }
      }
    } else {
      rows[j].style.display = "none";
    }
  }
  var tfoot = table.tFoot;
  if (tfoot && tfoot.matches('#total')) {
    var footCells = tfoot.rows[0].cells;
    for (var n = 0; n < columnCount && n < footCells.length; n++) {
      if (total[n].cost) {
        footCells[n].innerHTML = rouble(total[n].total);
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", cost);
