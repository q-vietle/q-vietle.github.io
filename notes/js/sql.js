/* SQL notes: small in-browser pictures of how a database runs a query.
   Every widget works on the same two tables (customers, orders) and is guarded
   by its root id, so a page can load this file with only some of the figures. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }
  function segBind(root, attr, fn) {
    var btns = root.querySelectorAll('[' + attr + ']');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        fn(b.getAttribute(attr));
      });
    });
  }

  /* ---------------- sample data ---------------- */
  var CUSTOMERS = [
    { customer_id: 1, name: 'An', city: 'Hanoi', joined: 2021 },
    { customer_id: 2, name: 'Binh', city: 'HCMC', joined: 2022 },
    { customer_id: 3, name: 'Chi', city: 'Da Nang', joined: 2022 },
    { customer_id: 4, name: 'Dung', city: 'HCMC', joined: 2023 },
    { customer_id: 5, name: 'Emma', city: null, joined: 2023 },
    { customer_id: 6, name: 'Minh', city: 'Hue', joined: 2024 }
  ];
  var ORDERS = [
    { order_id: 101, customer_id: 1, product: 'Coffee', category: 'Drinks', amount: 12, order_date: '2024-01-05' },
    { order_id: 102, customer_id: 1, product: 'Laptop', category: 'Tech', amount: 950, order_date: '2024-01-18' },
    { order_id: 103, customer_id: 2, product: 'Tea', category: 'Drinks', amount: 8, order_date: '2024-02-02' },
    { order_id: 104, customer_id: 2, product: 'Headphones', category: 'Tech', amount: 120, order_date: '2024-02-14' },
    { order_id: 105, customer_id: 2, product: 'Coffee', category: 'Drinks', amount: 12, order_date: '2024-03-01' },
    { order_id: 106, customer_id: 3, product: 'Notebook', category: 'Office', amount: 5, order_date: '2024-03-09' },
    { order_id: 107, customer_id: 3, product: 'Monitor', category: 'Tech', amount: 240, order_date: '2024-03-22' },
    { order_id: 108, customer_id: 4, product: 'Pens', category: 'Office', amount: 7, order_date: '2024-04-03' },
    { order_id: 109, customer_id: 4, product: 'Coffee', category: 'Drinks', amount: 12, order_date: '2024-04-11' },
    { order_id: 110, customer_id: 5, product: 'Desk', category: 'Office', amount: 180, order_date: '2024-04-20' },
    { order_id: 111, customer_id: null, product: 'Tea', category: 'Drinks', amount: 8, order_date: '2024-05-02' },
    { order_id: 112, customer_id: 3, product: 'Keyboard', category: 'Tech', amount: null, order_date: '2024-05-15' }
  ];
  var TABLES = {
    customers: { rows: CUSTOMERS, cols: ['customer_id', 'name', 'city', 'joined'], pk: 'customer_id',
                 types: { customer_id: 'INTEGER', name: 'TEXT', city: 'TEXT', joined: 'INTEGER' } },
    orders: { rows: ORDERS, cols: ['order_id', 'customer_id', 'product', 'category', 'amount', 'order_date'], pk: 'order_id',
              types: { order_id: 'INTEGER', customer_id: 'INTEGER', product: 'TEXT', category: 'TEXT', amount: 'NUMERIC', order_date: 'DATE' } }
  };
  var NUMERIC = { customer_id: 1, joined: 1, order_id: 1, amount: 1 };

  /* ---------------- rendering helpers ---------------- */
  function val(v) {
    if (v === null || v === undefined) return '<span class="null">NULL</span>';
    return esc(typeof v === 'number' ? String(Math.round(v * 100) / 100) : v);
  }
  function lit(v) { return v === null ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'"; }
  // table(cols, rows, {rowCls, cellCls, attrs, extra:{label, cell}, caption, cls})
  function table(cols, rows, o) {
    o = o || {};
    var h = '<div class="table-wrap"><table class="sqltab' + (o.cls ? ' ' + o.cls : '') + '">';
    if (o.caption) h += '<caption>' + o.caption + '</caption>';
    h += '<thead><tr>' + cols.map(function (c) {
      var k = typeof c === 'string' ? c : c.k, lab = typeof c === 'string' ? c : c.label;
      return '<th' + (o.headCls ? ' class="' + (o.headCls(k) || '') + '"' : '') + '>' + esc(lab) + '</th>';
    }).join('') + (o.extra ? '<th class="xcol">' + o.extra.label + '</th>' : '') + '</tr></thead><tbody>';
    if (!rows.length) h += '<tr class="empty"><td colspan="' + (cols.length + (o.extra ? 1 : 0)) + '">(no rows)</td></tr>';
    rows.forEach(function (r, i) {
      h += '<tr class="' + (o.rowCls ? o.rowCls(r, i) || '' : '') + '"' + (o.attrs ? ' ' + o.attrs(r, i) : '') + '>';
      cols.forEach(function (c) {
        var k = typeof c === 'string' ? c : c.k;
        var v = typeof c === 'object' && c.get ? c.get(r) : r[k];
        h += '<td class="' + (NUMERIC[k] || typeof v === 'number' ? 'n ' : '') + (o.cellCls ? o.cellCls(k, r, i) || '' : '') + '" data-c="' + esc(k) + '">' + val(v) + '</td>';
      });
      if (o.extra) h += '<td class="xcol">' + o.extra.cell(r, i) + '</td>';
      h += '</tr>';
    });
    return h + '</tbody></table></div>';
  }

  var KW = ('SELECT FROM WHERE AND OR NOT IN IS NULL AS ON JOIN INNER LEFT RIGHT FULL OUTER CROSS GROUP BY HAVING ORDER ASC DESC LIMIT OFFSET ' +
            'DISTINCT BETWEEN LIKE EXISTS WITH INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE PRIMARY KEY REFERENCES INDEX OVER PARTITION ' +
            'BEGIN COMMIT ROLLBACK TRANSACTION ISOLATION LEVEL READ COMMITTED REPEATABLE CASE WHEN THEN ELSE END UNION ALL NULLS LAST FIRST ' +
            'EXPLAIN QUERY PLAN FOR TRUE FALSE').split(' ');
  var FN = 'COUNT SUM AVG MIN MAX ROW_NUMBER RANK DENSE_RANK LAG LEAD COALESCE LOWER UPPER ROUND LENGTH'.split(' ');
  function hl(sql) {
    var out = '', re = /('(?:[^']|'')*')|(--[^\n]*)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z_0-9]*)|([\s\S])/g, m;
    while ((m = re.exec(sql))) {
      if (m[1]) out += '<span class="str">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="cm">' + esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="num">' + m[3] + '</span>';
      else if (m[4]) {
        var u = m[4].toUpperCase();
        if (FN.indexOf(u) >= 0 && sql.charAt(re.lastIndex) === '(') out += '<span class="fn">' + esc(m[4]) + '</span>';
        else if (KW.indexOf(u) >= 0) out += '<span class="kw">' + esc(m[4]) + '</span>';
        else out += esc(m[4]);
      } else out += esc(m[5]);
    }
    return out;
  }
  // SQL made of clauses; each clause can be highlighted by index
  function sqlBlock(parts, active) {
    return parts.map(function (p, i) {
      return '<span class="clause' + (active === i ? ' on' : active != null && active > i ? ' done' : '') + '" data-i="' + i + '">' + hl(p) + '</span>';
    }).join('\n');
  }

  /* ---------------- three-valued logic ---------------- */
  function tv(v) { return v === true ? 'TRUE' : v === false ? 'FALSE' : 'UNKNOWN'; }
  function badge(v) { return '<span class="tv tv-' + tv(v).toLowerCase() + '">' + tv(v) + '</span>'; }
  function and3(a, b) { return a === false || b === false ? false : a === null || b === null ? null : true; }
  function or3(a, b) { return a === true || b === true ? true : a === null || b === null ? null : false; }
  function not3(a) { return a === null ? null : !a; }
  function cmp(a, op, b) {
    if (a === null || a === undefined || b === null || b === undefined) return null;
    switch (op) {
      case '=': return a === b; case '<>': return a !== b;
      case '<': return a < b; case '<=': return a <= b; case '>': return a > b; case '>=': return a >= b;
    }
  }
  function likeRe(p) { return new RegExp('^' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$'); }

  // condition trees: {op:'cmp',col,cmp,v} {op:'and'|'or',a,b} {op:'not',a} {op:'in',col,list,neg}
  // {op:'between',col,lo,hi} {op:'like',col,pat} {op:'isnull',col,neg}
  function evalC(t, r) {
    switch (t.op) {
      case 'cmp': return cmp(r[t.col], t.cmp, t.v);
      case 'and': return and3(evalC(t.a, r), evalC(t.b, r));
      case 'or': return or3(evalC(t.a, r), evalC(t.b, r));
      case 'not': return not3(evalC(t.a, r));
      case 'in':
        var x = r[t.col], res;
        if (x === null) res = null;
        else if (t.list.indexOf(x) >= 0) res = true;
        else res = t.list.indexOf(null) >= 0 ? null : false;
        return t.neg ? not3(res) : res;
      case 'between': return and3(cmp(r[t.col], '>=', t.lo), cmp(r[t.col], '<=', t.hi));
      case 'like': return r[t.col] === null ? null : likeRe(t.pat).test(r[t.col]);
      case 'isnull': return t.neg ? r[t.col] !== null : r[t.col] === null;
    }
  }
  function sqlC(t) {
    switch (t.op) {
      case 'cmp': return t.col + ' ' + t.cmp + ' ' + lit(t.v);
      case 'and': case 'or': return sqlC(t.a) + ' ' + t.op.toUpperCase() + ' ' + sqlC(t.b);
      case 'not': return 'NOT ' + sqlC(t.a);
      case 'in': return t.col + (t.neg ? ' NOT IN (' : ' IN (') + t.list.map(lit).join(', ') + ')';
      case 'between': return t.col + ' BETWEEN ' + lit(t.lo) + ' AND ' + lit(t.hi);
      case 'like': return t.col + ' LIKE ' + lit(t.pat);
      case 'isnull': return t.col + (t.neg ? ' IS NOT NULL' : ' IS NULL');
    }
  }
  // "12 > 100 → FALSE" with the row's values filled in
  function explainC(t, r) {
    switch (t.op) {
      case 'cmp': return val(r[t.col]) + ' ' + esc(t.cmp) + ' ' + esc(lit(t.v));
      case 'and': case 'or': return tv(evalC(t.a, r)) + ' ' + t.op.toUpperCase() + ' ' + tv(evalC(t.b, r));
      case 'not': return 'NOT ' + tv(evalC(t.a, r));
      case 'in': return val(r[t.col]) + (t.neg ? ' NOT IN' : ' IN') + ' (…)';
      case 'between': return val(r[t.col]) + ' BETWEEN ' + esc(lit(t.lo)) + ' AND ' + esc(lit(t.hi));
      case 'like': return val(r[t.col]) + ' LIKE ' + esc(lit(t.pat));
      case 'isnull': return val(r[t.col]) + (t.neg ? ' IS NOT NULL' : ' IS NULL');
    }
  }

  // PostgreSQL ordering: NULLs count as larger than every value (last in ASC, first in DESC)
  function sortRows(rows, keys) {
    return rows.slice().sort(function (a, b) {
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i], x = a[k.col], y = b[k.col], d;
        if (x === y) continue;
        if (x === null) d = 1; else if (y === null) d = -1; else d = x < y ? -1 : 1;
        if (k.nullsLast && (x === null || y === null)) return x === null ? 1 : -1;
        return k.desc ? -d : d;
      }
      return 0;
    });
  }
  function nums(rows, col) { return rows.map(function (r) { return r[col]; }).filter(function (v) { return v !== null && v !== undefined; }); }
  var AGG = {
    'COUNT(*)': function (rows) { return rows.length; },
    'COUNT(amount)': function (rows) { return nums(rows, 'amount').length; },
    'SUM(amount)': function (rows) { var v = nums(rows, 'amount'); return v.length ? v.reduce(function (a, b) { return a + b; }, 0) : null; },
    'AVG(amount)': function (rows) { var v = nums(rows, 'amount'); return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null; },
    'MIN(amount)': function (rows) { var v = nums(rows, 'amount'); return v.length ? Math.min.apply(null, v) : null; },
    'MAX(amount)': function (rows) { var v = nums(rows, 'amount'); return v.length ? Math.max.apply(null, v) : null; },
    'COUNT(DISTINCT category)': function (rows) { var s = {}; rows.forEach(function (r) { if (r.category !== null) s[r.category] = 1; }); return Object.keys(s).length; }
  };
  function groupRows(rows, col) {
    var groups = [], idx = {};
    rows.forEach(function (r) {
      var k = JSON.stringify(r[col]);
      if (!(k in idx)) { idx[k] = groups.length; groups.push({ key: r[col], rows: [] }); }
      groups[idx[k]].rows.push(r);
    });
    return groups;
  }

  /* ================================================================
     1. Anatomy of a table: rows, columns, cells, keys
     ================================================================ */
  (function anatomy() {
    var root = $('fig-anatomy'); if (!root) return;
    var box = $('an-tables'), read = $('an-read'), mode = 'row';
    var custCols = TABLES.customers.cols, ordCols = ['order_id', 'customer_id', 'product', 'amount'];
    function attrs(t) { return function (r, i) { return 'data-t="' + t + '" data-r="' + i + '"'; }; }
    box.innerHTML = '<div class="sql-pair"><div>' + table(custCols, CUSTOMERS, { caption: 'customers', attrs: attrs('c'), headCls: function (k) { return k === 'customer_id' ? 'pk' : ''; } }) + '</div>' +
      '<div>' + table(ordCols, ORDERS, { caption: 'orders', attrs: attrs('o'), headCls: function (k) { return k === 'order_id' ? 'pk' : k === 'customer_id' ? 'fk' : ''; } }) + '</div></div>';
    var HELP = {
      row: 'Hover a row. A <b>row</b> (or record) describes one thing: one customer, one order.',
      col: 'Hover a column. A <b>column</b> is one attribute that every row has, and all its values share one data type.',
      cell: 'Hover a cell. A <b>cell</b> holds exactly one value, or NULL when the value is missing.',
      pk: 'Hover a row. The <b>primary key</b> identifies each row: it is unique and never NULL.',
      fk: 'Hover a row in either table. A <b>foreign key</b> points from a row in one table to a row in another.'
    };
    function clear() { box.querySelectorAll('.hl, .hl2').forEach(function (e) { e.classList.remove('hl', 'hl2'); }); }
    function rowsOf(t) { return box.querySelectorAll('tr[data-t="' + t + '"]'); }
    function show(td) {
      clear();
      var tr = td.closest('tr[data-t]'); if (!tr) return;
      var t = tr.getAttribute('data-t'), i = +tr.getAttribute('data-r'), c = td.getAttribute('data-c');
      var name = t === 'c' ? 'customers' : 'orders', row = (t === 'c' ? CUSTOMERS : ORDERS)[i];
      var pk = t === 'c' ? 'customer_id' : 'order_id';
      if (mode === 'row') {
        tr.classList.add('hl');
        read.innerHTML = 'One row of <code>' + name + '</code>: ' + (t === 'c' ? 'customer ' + row.customer_id + ' is ' + esc(row.name) + ' from ' + val(row.city) + ', joined in ' + row.joined :
          'order ' + row.order_id + ': ' + esc(row.product) + ' for ' + val(row.amount)) + '.';
      } else if (mode === 'col') {
        rowsOf(t).forEach(function (r) { var cell = r.querySelector('[data-c="' + c + '"]'); if (cell) cell.classList.add('hl'); });
        read.innerHTML = 'Column <code>' + esc(c) + '</code> of <code>' + name + '</code>, type <b>' + TABLES[name].types[c] + '</b>. Every row has a value here (or NULL).';
      } else if (mode === 'cell') {
        td.classList.add('hl');
        read.innerHTML = 'Row with ' + pk + ' = ' + row[pk] + ', column <code>' + esc(c) + '</code>: the value is ' + val(row[c]) + '.';
      } else if (mode === 'pk') {
        rowsOf(t).forEach(function (r) { r.querySelector('[data-c="' + pk + '"]').classList.add('hl2'); });
        tr.querySelector('[data-c="' + pk + '"]').classList.add('hl');
        tr.classList.add('hl');
        read.innerHTML = '<code>' + pk + '</code> is the primary key of <code>' + name + '</code>. The value ' + row[pk] + ' appears in exactly one row, so it identifies this row.';
      } else {
        if (t === 'o') {
          tr.classList.add('hl'); tr.querySelector('[data-c="customer_id"]').classList.add('hl2');
          var ci = CUSTOMERS.findIndex(function (x) { return x.customer_id === row.customer_id; });
          if (ci >= 0) { rowsOf('c')[ci].classList.add('hl'); read.innerHTML = 'Order ' + row.order_id + ' has <code>customer_id = ' + row.customer_id + '</code>, which points to the customer ' + esc(CUSTOMERS[ci].name) + '.'; }
          else read.innerHTML = 'Order ' + row.order_id + ' has <code>customer_id = NULL</code>: a guest checkout, so it points to no customer.';
        } else {
          tr.classList.add('hl');
          var n = 0;
          rowsOf('o').forEach(function (r, j) { if (ORDERS[j].customer_id === row.customer_id) { r.classList.add('hl'); r.querySelector('[data-c="customer_id"]').classList.add('hl2'); n++; } });
          read.innerHTML = esc(row.name) + ' (customer_id = ' + row.customer_id + ') is referenced by <b>' + n + '</b> order' + (n === 1 ? '' : 's') + '.' + (n ? '' : ' No order points to this customer yet.');
        }
      }
    }
    box.addEventListener('mouseover', function (e) { var td = e.target.closest('td'); if (td) show(td); });
    box.addEventListener('click', function (e) { var td = e.target.closest('td'); if (td) show(td); });
    segBind(root, 'data-mode', function (m) { mode = m; clear(); read.innerHTML = HELP[m]; });
    read.innerHTML = HELP.row;
  })();

  /* ================================================================
     2. SELECT and FROM: choosing columns
     ================================================================ */
  (function selectCols() {
    var root = $('fig-select'); if (!root) return;
    var colsBox = $('ss-cols'), sqlEl = $('ss-sql'), srcEl = $('ss-src'), outEl = $('ss-out'), read = $('ss-read');
    var dist = $('ss-distinct'), alias = $('ss-alias'), expr = $('ss-expr');
    var tname = 'customers', chosen = { customers: ['name', 'city'], orders: ['product', 'amount'] };
    var ALIAS = { customers: ['name', 'customer'], orders: ['product', 'item'] };
    var EXPR = { customers: { sql: '2024 - joined AS years_as_customer', k: 'years_as_customer', f: function (r) { return 2024 - r.joined; } },
                 orders: { sql: 'amount * 1.1 AS amount_with_vat', k: 'amount_with_vat', f: function (r) { return r.amount === null ? null : Math.round(r.amount * 110) / 100; } } };
    function drawCols() {
      colsBox.innerHTML = TABLES[tname].cols.map(function (c) {
        return '<label class="chk"><input type="checkbox" value="' + c + '"' + (chosen[tname].indexOf(c) >= 0 ? ' checked' : '') + '> ' + c + '</label>';
      }).join('');
    }
    function render() {
      var T = TABLES[tname], cols = T.cols.filter(function (c) { return chosen[tname].indexOf(c) >= 0; });
      var all = cols.length === T.cols.length && !expr.checked && !alias.checked;
      var outCols = cols.map(function (c) { return alias.checked && c === ALIAS[tname][0] ? { k: c, label: ALIAS[tname][1] } : c; });
      if (expr.checked) outCols.push({ k: EXPR[tname].k, label: EXPR[tname].k, get: EXPR[tname].f });
      var list = all ? '*' : outCols.map(function (c) {
        if (typeof c === 'object' && c.get) return EXPR[tname].sql;
        if (typeof c === 'object') return c.k + ' AS ' + c.label;
        return c;
      }).join(', ');
      if (!outCols.length) list = '1';
      sqlEl.innerHTML = hl('SELECT ' + (dist.checked ? 'DISTINCT ' : '') + list + '\nFROM ' + tname + ';');
      srcEl.innerHTML = table(T.cols, T.rows, { caption: tname + ' (stored table)', headCls: function (k) { return cols.indexOf(k) >= 0 ? 'sel' : 'dim'; },
        cellCls: function (k) { return cols.indexOf(k) >= 0 ? 'sel' : 'dim'; } });
      var rows = T.rows.map(function (r) { var o = {}; outCols.forEach(function (c) { var k = typeof c === 'string' ? c : c.k; o[k] = typeof c === 'object' && c.get ? c.get(r) : r[k]; }); return o; });
      var removed = 0;
      if (dist.checked) {
        var seen = {}; rows = rows.filter(function (r) { var k = JSON.stringify(r); if (seen[k]) { removed++; return false; } seen[k] = 1; return true; });
      }
      outEl.innerHTML = outCols.length ? table(outCols.map(function (c) { return typeof c === 'string' ? c : { k: c.k, label: c.label }; }), rows, { caption: 'result' }) : '<p class="muted">Pick at least one column.</p>';
      read.innerHTML = 'The database reads every row of <code>' + tname + '</code> and keeps only the listed columns: <b>' + rows.length + '</b> rows × <b>' + outCols.length + '</b> columns.' +
        (dist.checked ? ' <code>DISTINCT</code> removed <b>' + removed + '</b> duplicate row' + (removed === 1 ? '' : 's') + '.' : '') +
        (expr.checked ? ' The computed column is calculated for each row; it is not stored in the table.' : '') +
        (alias.checked ? ' <code>AS</code> only renames the column in the result.' : '');
    }
    segBind(root, 'data-t', function (t) { tname = t; drawCols(); render(); });
    colsBox.addEventListener('change', function () {
      chosen[tname] = [].slice.call(colsBox.querySelectorAll('input:checked')).map(function (i) { return i.value; });
      render();
    });
    [dist, alias, expr].forEach(function (el) { on(el, 'change', render); });
    drawCols(); render();
  })();

  /* ================================================================
     3 and 4. WHERE: one condition per row, three possible answers
     ================================================================ */
  function whereWidget(p, presets, builder) {
    var root = $('fig-' + p); if (!root) return;
    var sel = $(p + '-preset'), sqlEl = $(p + '-sql'), tblEl = $(p + '-rows'), outEl = $(p + '-out'), read = $(p + '-read');
    var bRow = builder ? $(p + '-builder') : null;
    sel.innerHTML = presets.map(function (q, i) { return '<option value="' + i + '">' + esc(q.label || sqlC(q.c)) + '</option>'; }).join('') +
      (builder ? '<option value="custom">Build your own…</option>' : '');
    function custom() {
      var col = $(p + '-bcol').value, op = $(p + '-bop').value, raw = $(p + '-bval').value.trim();
      var T = col === 'city' || col === 'joined' || col === 'name' ? 'customers' : 'orders';
      if (op === 'IS NULL' || op === 'IS NOT NULL') return { t: T, c: { op: 'isnull', col: col, neg: op === 'IS NOT NULL' } };
      var v = NUMERIC[col] ? (raw === '' || isNaN(+raw) ? null : +raw) : raw.replace(/^'|'$/g, '');
      if (op === 'LIKE') return { t: T, c: { op: 'like', col: col, pat: String(v) } };
      return { t: T, c: { op: 'cmp', col: col, cmp: op, v: v } };
    }
    function render() {
      var isCustom = sel.value === 'custom';
      if (bRow) bRow.hidden = !isCustom;
      var q = isCustom ? custom() : presets[+sel.value], T = TABLES[q.t];
      var res = T.rows.map(function (r) { return evalC(q.c, r); });
      var kept = T.rows.filter(function (r, i) { return res[i] === true; });
      sqlEl.innerHTML = hl('SELECT *\nFROM ' + q.t + '\nWHERE ' + sqlC(q.c) + ';');
      tblEl.innerHTML = table(T.cols, T.rows, {
        caption: q.t + ': the condition is checked on every row',
        rowCls: function (r, i) { return res[i] === true ? 'keep' : 'drop'; },
        extra: { label: 'condition', cell: function (r, i) { return '<span class="expl">' + explainC(q.c, r) + '</span> ' + badge(res[i]); } }
      });
      outEl.innerHTML = table(T.cols, kept, { caption: 'result' });
      var unk = res.filter(function (v) { return v === null; }).length;
      read.innerHTML = '<b>' + kept.length + '</b> of ' + T.rows.length + ' rows kept. Only rows where the condition is <b>TRUE</b> survive; ' +
        (unk ? '<b>' + unk + '</b> row' + (unk === 1 ? ' gives' : 's give') + ' UNKNOWN (a NULL is involved) and ' + (unk === 1 ? 'is' : 'are') + ' dropped too.' : 'FALSE rows are dropped.') +
        (q.note ? ' ' + q.note : '');
    }
    on(sel, 'change', render);
    if (builder) ['bcol', 'bop', 'bval'].forEach(function (k) { on($(p + '-' + k), 'input', render); on($(p + '-' + k), 'change', render); });
    render();
  }
  var C = function (col, op, v) { return { op: 'cmp', col: col, cmp: op, v: v }; };
  whereWidget('where', [
    { t: 'orders', c: C('amount', '>', 100) },
    { t: 'orders', c: C('category', '=', 'Drinks') },
    { t: 'orders', c: { op: 'and', a: C('category', '=', 'Drinks'), b: C('amount', '>', 10) }, note: 'AND needs both sides to be TRUE.' },
    { t: 'orders', c: { op: 'or', a: C('category', '=', 'Office'), b: C('amount', '>', 500) }, note: 'OR needs at least one side to be TRUE.' },
    { t: 'orders', c: { op: 'not', a: C('category', '=', 'Tech') } },
    { t: 'orders', c: { op: 'in', col: 'product', list: ['Coffee', 'Tea'] }, note: 'IN is a short way to write several = tests joined by OR.' },
    { t: 'orders', c: { op: 'between', col: 'amount', lo: 10, hi: 200 }, note: 'BETWEEN includes both ends.' },
    { t: 'orders', c: { op: 'like', col: 'product', pat: 'C%' }, note: 'In LIKE, % matches any text and _ matches one character.' },
    { t: 'customers', c: C('city', '=', 'HCMC') },
    { t: 'customers', c: C('joined', '>=', 2023) }
  ], true);
  whereWidget('nullw', [
    { t: 'customers', c: C('city', '=', 'HCMC') },
    { t: 'customers', c: C('city', '<>', 'HCMC'), note: 'Emma has no city, so she is in neither this result nor the "= \'HCMC\'" one.' },
    { t: 'customers', c: C('city', '=', null), label: "city = NULL   (a common mistake)", note: 'Comparing with NULL using = is always UNKNOWN, so no row is ever returned. Use IS NULL.' },
    { t: 'customers', c: { op: 'isnull', col: 'city' }, note: 'IS NULL is the only reliable test for a missing value; it is always TRUE or FALSE.' },
    { t: 'customers', c: { op: 'isnull', col: 'city', neg: true } },
    { t: 'orders', c: { op: 'or', a: C('amount', '>', 100), b: C('amount', '<=', 100) }, label: 'amount > 100 OR amount <= 100', note: 'This looks like it should keep every row, but the Keyboard order has no amount.' }
  ], false);

  (function truthTable() {
    var root = $('fig-3vl'); if (!root) return;
    var out = $('tt-out'), a = true, b = null, V = [true, false, null];
    function grid(op, f) {
      var h = '<table class="sqltab tt"><caption>' + op + '</caption><thead><tr><th>' + (op === 'NOT' ? '' : 'A \\ B') + '</th>' +
        (op === 'NOT' ? '<th>NOT A</th>' : V.map(function (y) { return '<th>' + tv(y) + '</th>'; }).join('')) + '</tr></thead><tbody>';
      V.forEach(function (x) {
        h += '<tr><th>' + tv(x) + '</th>';
        if (op === 'NOT') h += '<td class="' + (x === a ? 'hl' : '') + '">' + badge(not3(x)) + '</td>';
        else V.forEach(function (y) { h += '<td class="' + (x === a && y === b ? 'hl' : '') + '">' + badge(f(x, y)) + '</td>'; });
        h += '</tr>';
      });
      return h + '</tbody></table>';
    }
    function render() {
      out.innerHTML = '<div class="tt-row">' + grid('AND', and3) + grid('OR', or3) + grid('NOT', null) + '</div>' +
        '<p class="readout">A = ' + tv(a) + ', B = ' + tv(b) + ':  A AND B = <b>' + tv(and3(a, b)) + '</b>,  A OR B = <b>' + tv(or3(a, b)) + '</b>,  NOT A = <b>' + tv(not3(a)) + '</b></p>';
    }
    var map = { T: true, F: false, U: null };
    segBind(root, 'data-a', function (v) { a = map[v]; render(); });
    segBind(root, 'data-b', function (v) { b = map[v]; render(); });
    render();
  })();

  /* ================================================================
     5. ORDER BY, LIMIT and OFFSET (rows slide into place)
     ================================================================ */
  (function orderBy() {
    var root = $('fig-order'); if (!root) return;
    var k1 = $('so-k1'), k2 = $('so-k2'), lim = $('so-limit'), off = $('so-offset'), sqlEl = $('so-sql'), box = $('so-rows'), read = $('so-read');
    var d1 = false, d2 = false, cols = ['order_id', 'product', 'category', 'amount', 'order_date'];
    function render() {
      var keys = [{ col: k1.value, desc: d1 }];
      if (k2.value) keys.push({ col: k2.value, desc: d2 });
      var rows = sortRows(ORDERS, keys), L = +lim.value, O = +off.value;
      $('so-limito').textContent = L ? L : 'none'; $('so-offseto').textContent = O;
      var ob = keys.map(function (k) { return k.col + (k.desc ? ' DESC' : ''); }).join(', ');
      sqlEl.innerHTML = hl('SELECT order_id, product, category, amount, order_date\nFROM orders\nORDER BY ' + ob + (L ? '\nLIMIT ' + L : '') + (O ? (L ? ' ' : '\n') + 'OFFSET ' + O : '') + ';');
      // FLIP: remember where each row was, re-render, then slide from the old place
      var before = {};
      box.querySelectorAll('tr[data-id]').forEach(function (tr) { before[tr.getAttribute('data-id')] = tr.getBoundingClientRect().top; });
      box.innerHTML = table(cols, rows, {
        caption: 'orders, sorted',
        attrs: function (r) { return 'data-id="' + r.order_id + '"'; },
        rowCls: function (r, i) { return i < O ? 'drop skip' : L && i >= O + L ? 'drop cut' : 'keep'; },
        cellCls: function (k) { return k === k1.value ? 'key1' : k === k2.value ? 'key2' : ''; },
        extra: { label: 'position', cell: function (r, i) { return (i + 1) + (i < O ? ' · skipped' : L && i >= O + L ? ' · cut' : ''); } }
      });
      if (!(window.Viz && window.Viz.reduceMotion)) {
        box.querySelectorAll('tr[data-id]').forEach(function (tr) {
          var id = tr.getAttribute('data-id'); if (!(id in before)) return;
          var dy = before[id] - tr.getBoundingClientRect().top; if (!dy) return;
          tr.style.transform = 'translateY(' + dy + 'px)'; tr.style.transition = 'none';
          requestAnimationFrame(function () { requestAnimationFrame(function () { tr.style.transition = 'transform .45s ease'; tr.style.transform = ''; }); });
        });
      }
      var shown = rows.length - O < 0 ? 0 : L ? Math.min(L, rows.length - O) : rows.length - O;
      var hasNull = keys.some(function (k) { return k.col === 'amount'; });
      read.innerHTML = 'Result: <b>' + Math.max(0, shown) + '</b> rows.' + (keys.length > 1 ? ' The second key only breaks ties in the first.' : '') +
        (hasNull ? ' The Keyboard order has no amount: PostgreSQL puts NULLs <b>last</b> in ascending order and first in descending order (add NULLS FIRST / NULLS LAST to choose).' : '') +
        (!keys.some(function (k) { return k.col === 'order_id'; }) && L ? ' Without a unique sort key, rows that tie can come back in any order, so LIMIT may pick different rows each time.' : '');
    }
    segBind(root, 'data-d1', function (v) { d1 = v === 'desc'; render(); });
    segBind(root, 'data-d2', function (v) { d2 = v === 'desc'; render(); });
    [k1, k2, lim, off].forEach(function (el) { on(el, 'input', render); });
    render();
  })();

  /* ================================================================
     6. INSERT, UPDATE, DELETE on a live copy of the table
     ================================================================ */
  (function modify() {
    var root = $('fig-modify'); if (!root) return;
    var sel = $('sm-stmt'), sqlEl = $('sm-sql'), box = $('sm-rows'), read = $('sm-read');
    var rows = clone(CUSTOMERS), cols = TABLES.customers.cols;
    var STM = [
      { sql: "INSERT INTO customers (customer_id, name, city, joined)\nVALUES (7, 'Lan', 'Hanoi', 2024);", ins: { customer_id: 7, name: 'Lan', city: 'Hanoi', joined: 2024 } },
      { sql: "UPDATE customers\nSET city = 'Hanoi'\nWHERE customer_id = 5;", where: function (r) { return r.customer_id === 5; }, set: function (r) { r.city = 'Hanoi'; }, cols: ['city'] },
      { sql: "UPDATE customers\nSET joined = joined + 1\nWHERE city = 'HCMC';", where: function (r) { return r.city === 'HCMC'; }, set: function (r) { r.joined += 1; }, cols: ['joined'] },
      { sql: 'DELETE FROM customers\nWHERE customer_id = 6;', where: function (r) { return r.customer_id === 6; }, del: true },
      { sql: "INSERT INTO customers (customer_id, name, city, joined)\nVALUES (2, 'Duc', 'Hue', 2024);", ins: { customer_id: 2, name: 'Duc', city: 'Hue', joined: 2024 } },
      { sql: "UPDATE customers\nSET city = 'Hue';   -- no WHERE!", where: function () { return true; }, set: function (r) { r.city = 'Hue'; }, cols: ['city'] },
      { sql: 'DELETE FROM customers;   -- no WHERE!', where: function () { return true; }, del: true }
    ];
    sel.innerHTML = STM.map(function (s, i) { return '<option value="' + i + '">' + esc(s.sql.split('\n')[0] + (s.sql.split('\n')[2] ? ' … ' + s.sql.split('\n')[2].replace(';', '') : '')) + '</option>'; }).join('');
    function draw(mark) {
      mark = mark || {};
      box.innerHTML = table(cols, rows, {
        caption: 'customers (live copy)',
        rowCls: function (r) { return mark.rows && mark.rows[r.customer_id] || ''; },
        cellCls: function (k, r) { return mark.cells && mark.cells[r.customer_id + ':' + k] ? 'changed' : ''; }
      });
    }
    function preview() {
      var s = STM[+sel.value], m = { rows: {} };
      sqlEl.innerHTML = hl(s.sql);
      if (s.where) {
        var n = 0; rows.forEach(function (r) { if (s.where(r)) { m.rows[r.customer_id] = 'target'; n++; } });
        read.innerHTML = 'Before running: the <code>WHERE</code> clause picks <b>' + n + '</b> row' + (n === 1 ? '' : 's') + ' (outlined). Press <b>Run</b> to apply the change.';
      } else read.innerHTML = 'An <code>INSERT</code> adds a new row. Press <b>Run</b>.';
      draw(m);
    }
    function run() {
      var s = STM[+sel.value], m = { rows: {}, cells: {} };
      if (s.ins) {
        if (rows.some(function (r) { return r.customer_id === s.ins.customer_id; })) {
          read.innerHTML = '<span class="err">ERROR: duplicate key value violates unique constraint "customers_pkey"</span><br>customer_id ' + s.ins.customer_id + ' already exists, so the database refuses the row and the table does not change.';
          draw(); return;
        }
        rows.push(clone(s.ins)); m.rows[s.ins.customer_id] = 'added';
        read.innerHTML = '<code>INSERT 0 1</code>: one row added.';
        draw(m); return;
      }
      var hit = rows.filter(s.where);
      if (s.del) {
        hit.forEach(function (r) { m.rows[r.customer_id] = 'deleted'; });
        draw(m);
        read.innerHTML = '<code>DELETE ' + hit.length + '</code>: ' + hit.length + ' row' + (hit.length === 1 ? '' : 's') + ' removed.' + (hit.length === rows.length && hit.length > 1 ? ' <b>Every row is gone</b>: a DELETE without WHERE empties the table.' : '');
        setTimeout(function () { rows = rows.filter(function (r) { return !s.where(r); }); draw(); }, 900);
        return;
      }
      hit.forEach(function (r) { s.set(r); s.cols.forEach(function (c) { m.cells[r.customer_id + ':' + c] = 1; }); });
      draw(m);
      read.innerHTML = '<code>UPDATE ' + hit.length + '</code>: ' + hit.length + ' row' + (hit.length === 1 ? '' : 's') + ' changed.' +
        (hit.length === rows.length && hit.length > 1 ? ' <b>Every row changed</b>: an UPDATE without WHERE touches the whole table. Inside a transaction you could still ROLLBACK (note 14).' : '');
    }
    on(sel, 'change', preview);
    on($('sm-run'), 'click', run);
    on($('sm-reset'), 'click', function () { rows = clone(CUSTOMERS); preview(); });
    preview();
  })();

  /* ================================================================
     7. Aggregate functions: many values in, one value out
     ================================================================ */
  (function aggregates() {
    var root = $('fig-agg'); if (!root) return;
    var fnSel = $('sx-fn'), sqlEl = $('sx-sql'), flow = $('sx-flow'), read = $('sx-read'), cat = '';
    function render() {
      var fn = fnSel.value, rows = ORDERS.filter(function (r) { return !cat || r.category === cat; });
      sqlEl.innerHTML = hl('SELECT ' + fn + '\nFROM orders' + (cat ? "\nWHERE category = '" + cat + "'" : '') + ';');
      var col = fn.indexOf('category') >= 0 ? 'category' : fn === 'COUNT(*)' ? null : 'amount';
      var seen = {};
      var chips = rows.map(function (r) {
        var v = col ? r[col] : '*', used = col ? v !== null : true, dup = false;
        if (fn === 'COUNT(DISTINCT category)' && used) { dup = !!seen[v]; seen[v] = 1; }
        return '<span class="chip' + (used && !dup ? '' : ' off') + '" title="order ' + r.order_id + '"><small>#' + r.order_id + '</small>' + (col ? val(v) : 'row') +
          (!used ? '<em>skipped</em>' : dup ? '<em>duplicate</em>' : '') + '</span>';
      }).join('');
      var res = AGG[fn](rows);
      flow.innerHTML = '<div class="chips-in">' + chips + '</div><div class="agg-arrow">→ ' + esc(fn) + ' →</div><div class="agg-out">' + val(res === null ? null : Math.round(res * 100) / 100) + '</div>';
      var v = nums(rows, 'amount'), nNull = rows.length - v.length, txt;
      if (fn === 'COUNT(*)') txt = 'COUNT(*) counts rows, whatever they contain: <b>' + rows.length + '</b>.';
      else if (fn === 'COUNT(amount)') txt = 'COUNT(amount) counts only the rows where amount is not NULL: <b>' + v.length + '</b>' + (nNull ? ' (' + nNull + ' NULL skipped)' : '') + '.';
      else if (fn === 'COUNT(DISTINCT category)') txt = 'COUNT(DISTINCT …) counts different values: <b>' + res + '</b>.';
      else if (fn === 'SUM(amount)') txt = 'SUM adds the non-NULL values: ' + v.join(' + ') + ' = <b>' + res + '</b>.';
      else if (fn === 'AVG(amount)') txt = 'AVG = SUM ÷ number of non-NULL values = ' + v.reduce(function (a, b) { return a + b; }, 0) + ' ÷ ' + v.length + ' = <b>' + (Math.round(res * 100) / 100) + '</b>' + (nNull ? '. The NULL row is not counted as 0.' : '.');
      else txt = fn.slice(0, 3) + ' ignores NULLs and returns <b>' + res + '</b>.';
      read.innerHTML = txt + ' However many rows go in, one row comes out.';
    }
    on(fnSel, 'change', render);
    segBind(root, 'data-cat', function (v) { cat = v; render(); });
    render();
  })();

  /* ================================================================
     8. GROUP BY and HAVING: rows fall into buckets
     ================================================================ */
  (function groupBy() {
    var root = $('fig-group'); if (!root) return;
    var bySel = $('sg-by'), fnSel = $('sg-fn'), hav = $('sg-having'), thr = $('sg-thr'), sqlEl = $('sg-sql'), cards = $('sg-groups'), outEl = $('sg-out'), read = $('sg-read');
    function range() {
      var fn = fnSel.value, count = fn === 'COUNT(*)';
      thr.min = count ? 1 : 0; thr.max = count ? 5 : 1000; thr.step = count ? 1 : 10;
      if (+thr.value > +thr.max) thr.value = count ? 2 : 100;
    }
    function render() {
      var by = bySel.value, fn = fnSel.value, T = +thr.value, useH = hav.checked;
      $('sg-thro').textContent = T;
      var groups = groupRows(ORDERS, by);
      groups.forEach(function (g, i) { g.i = i; g.v = AGG[fn](g.rows); g.pass = !useH || (g.v !== null && g.v >= T); });
      sqlEl.innerHTML = hl('SELECT ' + by + ', ' + fn + '\nFROM orders\nGROUP BY ' + by + (useH ? '\nHAVING ' + fn + ' >= ' + T : '') + ';');
      cards.innerHTML = groups.map(function (g) {
        return '<div class="gcard g' + (g.i % 6) + (g.pass ? '' : ' out') + '"><div class="ghead">' + esc(by) + ' = ' + val(g.key) + '</div><div class="gchips">' +
          g.rows.map(function (r) { return '<span class="chip"><small>#' + r.order_id + '</small>' + val(r.amount) + '</span>'; }).join('') +
          '</div><div class="gval">' + esc(fn) + ' = <b>' + val(g.v === null ? null : Math.round(g.v * 100) / 100) + '</b></div>' + (g.pass ? '' : '<div class="gnote">removed by HAVING</div>') + '</div>';
      }).join('');
      var res = groups.filter(function (g) { return g.pass; }).map(function (g) { var o = {}; o[by] = g.key; o[fn] = g.v === null ? null : Math.round(g.v * 100) / 100; return o; });
      outEl.innerHTML = table([by, fn], res, { caption: 'result: one row per group' });
      var removed = groups.length - res.length;
      read.innerHTML = '12 rows fall into <b>' + groups.length + '</b> groups, and each group becomes <b>one</b> result row.' +
        (useH ? ' HAVING then removed <b>' + removed + '</b> group' + (removed === 1 ? '' : 's') + '. WHERE filters rows before grouping; HAVING filters groups after.' : '') +
        (groups.some(function (g) { return g.key === null; }) ? ' All NULL keys land in one group of their own.' : '');
    }
    [bySel, fnSel].forEach(function (el) { on(el, 'change', function () { range(); render(); }); });
    [hav, thr].forEach(function (el) { on(el, 'input', render); });
    range(); render();
  })();

  /* ================================================================
     9. The order a query really runs in
     ================================================================ */
  (function pipeline() {
    var root = $('fig-pipe'); if (!root) return;
    var sqlEl = $('sp-sql'), stage = $('sp-stage'), read = $('sp-read'), stepsEl = $('sp-steps'), step = 0;
    var PARTS = ['SELECT category, COUNT(*) AS n, SUM(amount) AS revenue', 'FROM orders', 'WHERE amount >= 10', 'GROUP BY category',
                 'HAVING COUNT(*) >= 2', 'ORDER BY revenue DESC', 'LIMIT 1;'];
    // running order: FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT
    var RUN = [1, 2, 3, 4, 0, 5, 6], NAMES = ['FROM', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY', 'LIMIT'];
    var cols = ['order_id', 'product', 'category', 'amount'];
    var where = ORDERS.map(function (r) { return cmp(r.amount, '>=', 10); });
    var kept = ORDERS.filter(function (r, i) { return where[i] === true; });
    var groups = groupRows(kept, 'category');
    groups.forEach(function (g, i) { g.i = i; g.n = g.rows.length; g.rev = AGG['SUM(amount)'](g.rows); g.pass = g.n >= 2; });
    var sel = groups.filter(function (g) { return g.pass; }).map(function (g) { return { category: g.key, n: g.n, revenue: g.rev }; });
    var sorted = sortRows(sel, [{ col: 'revenue', desc: true }]);
    function gcards(showHaving) {
      return '<div class="gcards">' + groups.map(function (g) {
        var out = showHaving && !g.pass;
        return '<div class="gcard g' + g.i + (out ? ' out' : '') + '"><div class="ghead">category = ' + val(g.key) + '</div><div class="gchips">' +
          g.rows.map(function (r) { return '<span class="chip"><small>#' + r.order_id + '</small>' + val(r.amount) + '</span>'; }).join('') + '</div>' +
          (showHaving ? '<div class="gval">COUNT(*) = <b>' + g.n + '</b>' + (out ? ' &lt; 2' : ' ≥ 2') + '</div>' + (out ? '<div class="gnote">removed by HAVING</div>' : '') : '') + '</div>';
      }).join('') + '</div>';
    }
    var STAGES = [
      function () { return { h: table(cols, ORDERS, { caption: 'FROM orders: all 12 rows' }), t: '<b>FROM</b> runs first: it decides where rows come from (a table, or several joined together).' }; },
      function () {
        return { h: table(cols, ORDERS, { caption: 'WHERE amount >= 10', rowCls: function (r, i) { return where[i] === true ? 'keep' : 'drop'; }, extra: { label: 'amount >= 10', cell: function (r, i) { return badge(where[i]); } } }),
                 t: '<b>WHERE</b> checks each row: ' + kept.length + ' rows stay. The Keyboard (amount NULL) gives UNKNOWN and is dropped.' };
      },
      function () { return { h: gcards(false), t: '<b>GROUP BY</b> puts the remaining rows into ' + groups.length + ' groups, one per category.' }; },
      function () { return { h: gcards(true), t: '<b>HAVING</b> checks each group. Office has only one row, so it is removed.' }; },
      function () { return { h: table(['category', 'n', 'revenue'], sel, { caption: 'SELECT: one row per group, columns computed' }), t: '<b>SELECT</b> now computes the output columns, including the aliases <code>n</code> and <code>revenue</code>. This is why WHERE cannot use <code>revenue</code>: it did not exist yet.' }; },
      function () { return { h: table(['category', 'n', 'revenue'], sorted, { caption: 'ORDER BY revenue DESC' }), t: '<b>ORDER BY</b> sorts the result. It runs after SELECT, so it <i>can</i> use the alias <code>revenue</code>.' }; },
      function () { return { h: table(['category', 'n', 'revenue'], sorted, { caption: 'LIMIT 1', rowCls: function (r, i) { return i < 1 ? 'keep' : 'drop cut'; } }), t: '<b>LIMIT</b> runs last and keeps the first row: <b>' + esc(sorted[0].category) + '</b>, with revenue ' + sorted[0].revenue + '.' }; }
    ];
    stepsEl.innerHTML = NAMES.map(function (n, i) { return '<button type="button" data-step="' + i + '">' + (i + 1) + ' ' + n + '</button>'; }).join('');
    function render() {
      sqlEl.innerHTML = sqlBlock(PARTS, null);
      var active = RUN[step], done = RUN.slice(0, step);
      sqlEl.querySelectorAll('.clause').forEach(function (el) {
        var i = +el.getAttribute('data-i');
        el.className = 'clause' + (i === active ? ' on' : done.indexOf(i) >= 0 ? ' done' : '');
      });
      var s = STAGES[step]();
      stage.innerHTML = s.h; read.innerHTML = s.t;
      stepsEl.querySelectorAll('button').forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === step)); });
      $('sp-prev').disabled = step === 0; $('sp-next').disabled = step === STAGES.length - 1;
    }
    stepsEl.addEventListener('click', function (e) { var b = e.target.closest('[data-step]'); if (b) { step = +b.getAttribute('data-step'); render(); } });
    on($('sp-prev'), 'click', function () { if (step > 0) { step--; render(); } });
    on($('sp-next'), 'click', function () { if (step < STAGES.length - 1) { step++; render(); } });
    render();
  })();

  /* ================================================================
     10. JOINs: matching rows across two tables
     ================================================================ */
  function joinRows(type) {
    var out = [], usedO = {};
    CUSTOMERS.forEach(function (c, ci) {
      var m = 0;
      ORDERS.forEach(function (o, oi) {
        if (cmp(o.customer_id, '=', c.customer_id) === true) { out.push({ c: c, o: o, ci: ci, oi: oi, kind: 'match' }); usedO[oi] = 1; m++; }
      });
      if (!m && (type === 'left' || type === 'full' || type === 'anti')) out.push({ c: c, o: null, ci: ci, oi: -1, kind: 'left' });
    });
    if (type === 'right' || type === 'full') ORDERS.forEach(function (o, oi) { if (!usedO[oi]) out.push({ c: null, o: o, ci: -1, oi: oi, kind: 'right' }); });
    if (type === 'anti') out = out.filter(function (r) { return r.kind === 'left'; });
    if (type === 'right') out.sort(function (a, b) { return a.oi - b.oi; });
    return out;
  }
  (function joins() {
    var root = $('fig-join'); if (!root) return;
    var wrap = $('sj-wrap'), L = $('sj-left'), R = $('sj-right'), svg = $('sj-svg'), outEl = $('sj-out'), sqlEl = $('sj-sql'), read = $('sj-read'), type = 'inner';
    var SQL = {
      inner: 'SELECT c.customer_id, c.name, o.order_id, o.product, o.amount\nFROM customers c\nINNER JOIN orders o ON o.customer_id = c.customer_id;',
      left: 'SELECT c.customer_id, c.name, o.order_id, o.product, o.amount\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.customer_id;',
      right: 'SELECT c.customer_id, c.name, o.order_id, o.product, o.amount\nFROM customers c\nRIGHT JOIN orders o ON o.customer_id = c.customer_id;',
      full: 'SELECT c.customer_id, c.name, o.order_id, o.product, o.amount\nFROM customers c\nFULL JOIN orders o ON o.customer_id = c.customer_id;',
      anti: '-- customers who never ordered\nSELECT c.customer_id, c.name\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.customer_id\nWHERE o.order_id IS NULL;'
    };
    var TXT = {
      inner: 'INNER JOIN keeps only pairs that match. Binh has 3 orders, so he appears 3 times. Minh (no orders) and order 111 (no customer) disappear.',
      left: 'LEFT JOIN keeps every customer. Minh has no match, so his order columns are filled with NULL.',
      right: 'RIGHT JOIN keeps every order. Order 111 has no customer, so the customer columns are NULL.',
      full: 'FULL JOIN keeps unmatched rows from both sides.',
      anti: 'An anti-join: LEFT JOIN, then keep only the rows where the order side is NULL. The result is the customers with no orders.'
    };
    L.innerHTML = table(['customer_id', 'name', 'city'], CUSTOMERS, { caption: 'customers c', attrs: function (r, i) { return 'data-ci="' + i + '"'; } });
    R.innerHTML = table(['order_id', 'customer_id', 'product', 'amount'], ORDERS, { caption: 'orders o', attrs: function (r, i) { return 'data-oi="' + i + '"'; } });
    var rows = [];
    function lines() {
      var box = wrap.getBoundingClientRect(), sb = svg.getBoundingClientRect(), h = '';
      svg.setAttribute('viewBox', '0 0 ' + sb.width + ' ' + sb.height);
      var lTr = L.querySelectorAll('tr[data-ci]'), rTr = R.querySelectorAll('tr[data-oi]');
      ORDERS.forEach(function (o, oi) {
        var ci = CUSTOMERS.findIndex(function (c) { return cmp(o.customer_id, '=', c.customer_id) === true; });
        if (ci < 0) return;
        var a = lTr[ci].getBoundingClientRect(), b = rTr[oi].getBoundingClientRect();
        var y1 = a.top + a.height / 2 - sb.top, y2 = b.top + b.height / 2 - sb.top;
        var used = type !== 'anti';
        h += '<path data-ci="' + ci + '" data-oi="' + oi + '" class="jl' + (used ? '' : ' off') + '" d="M0 ' + y1 + ' C ' + sb.width / 2 + ' ' + y1 + ', ' + sb.width / 2 + ' ' + y2 + ', ' + sb.width + ' ' + y2 + '"/>';
      });
      svg.innerHTML = h;
      void box;
    }
    function mark() {
      var keepL = {}, keepR = {};
      rows.forEach(function (r) { if (r.ci >= 0) keepL[r.ci] = r.kind; if (r.oi >= 0) keepR[r.oi] = r.kind; });
      L.querySelectorAll('tr[data-ci]').forEach(function (tr) { var k = keepL[tr.getAttribute('data-ci')]; tr.className = k === 'left' ? 'only' : k ? 'keep' : 'drop'; });
      R.querySelectorAll('tr[data-oi]').forEach(function (tr) { var k = keepR[tr.getAttribute('data-oi')]; tr.className = k === 'right' ? 'only' : k ? 'keep' : 'drop'; });
    }
    function render() {
      rows = joinRows(type);
      sqlEl.innerHTML = hl(SQL[type]);
      var cols = type === 'anti' ? [{ k: 'cid', label: 'customer_id' }, { k: 'name', label: 'name' }] :
        [{ k: 'cid', label: 'c.customer_id' }, { k: 'name', label: 'c.name' }, { k: 'oid', label: 'o.order_id' }, { k: 'product', label: 'o.product' }, { k: 'amount', label: 'o.amount' }];
      var flat = rows.map(function (r) { return { cid: r.c ? r.c.customer_id : null, name: r.c ? r.c.name : null, oid: r.o ? r.o.order_id : null, product: r.o ? r.o.product : null, amount: r.o ? r.o.amount : null }; });
      outEl.innerHTML = table(cols, flat, { caption: 'result: ' + rows.length + ' rows', attrs: function (r, i) { return 'data-k="' + i + '"'; }, rowCls: function (r, i) { return 'j-' + rows[i].kind; } });
      mark(); lines();
      var nL = rows.filter(function (r) { return r.kind === 'left'; }).length, nR = rows.filter(function (r) { return r.kind === 'right'; }).length;
      read.innerHTML = TXT[type] + ' <br><b>' + rows.length + '</b> rows: ' + rows.filter(function (r) { return r.kind === 'match'; }).length + ' matched pairs' +
        (nL ? ', ' + nL + ' customer' + (nL === 1 ? '' : 's') + ' with no order' : '') + (nR ? ', ' + nR + ' order' + (nR === 1 ? '' : 's') + ' with no customer' : '') + '.';
    }
    outEl.addEventListener('mouseover', function (e) {
      var tr = e.target.closest('tr[data-k]'); if (!tr) return;
      var r = rows[+tr.getAttribute('data-k')];
      root.querySelectorAll('.focus').forEach(function (x) { x.classList.remove('focus'); });
      tr.classList.add('focus');
      if (r.ci >= 0) L.querySelector('tr[data-ci="' + r.ci + '"]').classList.add('focus');
      if (r.oi >= 0) R.querySelector('tr[data-oi="' + r.oi + '"]').classList.add('focus');
      var p = svg.querySelector('path[data-ci="' + r.ci + '"][data-oi="' + r.oi + '"]'); if (p) p.classList.add('focus');
    });
    outEl.addEventListener('mouseleave', function () { root.querySelectorAll('.focus').forEach(function (x) { x.classList.remove('focus'); }); });
    segBind(root, 'data-join', function (t) { type = t; render(); });
    if (window.ResizeObserver) new ResizeObserver(function () { requestAnimationFrame(lines); }).observe(wrap);
    render();
  })();

  (function onVsWhere() {
    var root = $('fig-onwhere'); if (!root) return;
    var sqlEl = $('sow-sql'), outEl = $('sow-out'), read = $('sow-read');
    function render(mode) {
      var inOn = mode === 'on';
      sqlEl.innerHTML = hl('SELECT c.name, o.product, o.amount\nFROM customers c\nLEFT JOIN orders o\n  ON o.customer_id = c.customer_id' + (inOn ? ' AND o.amount > 100' : '') + (inOn ? ';' : '\nWHERE o.amount > 100;'));
      var rows = [];
      CUSTOMERS.forEach(function (c) {
        var ms = ORDERS.filter(function (o) { return cmp(o.customer_id, '=', c.customer_id) === true && (!inOn || cmp(o.amount, '>', 100) === true); });
        if (ms.length) ms.forEach(function (o) { rows.push({ name: c.name, product: o.product, amount: o.amount, k: 'match' }); });
        else rows.push({ name: c.name, product: null, amount: null, k: 'left' });
      });
      var res = inOn ? rows : rows.filter(function (r) { return cmp(r.amount, '>', 100) === true; });
      outEl.innerHTML = table(['name', 'product', 'amount'], res, { caption: 'result: ' + res.length + ' rows', rowCls: function (r) { return 'j-' + r.k; } });
      read.innerHTML = inOn
        ? 'The condition is part of the <b>matching</b>: every customer is kept, and only orders over 100 are attached. Customers with no big order get NULLs.'
        : 'The condition runs <b>after</b> the join, on the joined rows. Rows with a NULL amount give UNKNOWN and are dropped, so the customers without a big order vanish: the LEFT JOIN silently acts like an INNER JOIN.';
    }
    segBind(root, 'data-where', render);
    render('on');
  })();

  /* ================================================================
     11. Subqueries and CTEs, step by step
     ================================================================ */
  (function subqueries() {
    var root = $('fig-sub'); if (!root) return;
    var sel = $('sq-preset'), sqlEl = $('sq-sql'), stage = $('sq-stage'), read = $('sq-read'), step = 0;
    var avg = AGG['AVG(amount)'](ORDERS);
    var techIds = ORDERS.filter(function (o) { return o.category === 'Tech'; }).map(function (o) { return o.customer_id; });
    var allIds = ORDERS.map(function (o) { return o.customer_id; });
    var spend = groupRows(ORDERS, 'customer_id').map(function (g) { return { customer_id: g.key, total: AGG['SUM(amount)'](g.rows) }; });
    function listChips(list) { return '<div class="gchips">' + list.map(function (v) { return '<span class="chip' + (v === null ? ' warn' : '') + '">' + val(v) + '</span>'; }).join('') + '</div>'; }
    function box(title, inner, cls) { return '<div class="qbox ' + (cls || '') + '"><div class="qtitle">' + title + '</div>' + inner + '</div>'; }
    var P = [
      { name: 'Scalar subquery: orders above the average',
        parts: ['SELECT order_id, product, amount\nFROM orders\nWHERE amount >', '(SELECT AVG(amount) FROM orders)', ';'],
        steps: [
          function () { return { on: 1, h: box('inner query runs first', '<div class="agg-out">' + (Math.round(avg * 100) / 100) + '</div>', 'inner'), t: 'The subquery in brackets runs once and returns a single value: the average amount, ' + (Math.round(avg * 100) / 100) + ' (the NULL amount is skipped).' }; },
          function () {
            var c = C('amount', '>', Math.round(avg * 100) / 100);
            return { on: 0, h: table(['order_id', 'product', 'amount'], ORDERS, { caption: 'outer query: WHERE amount > ' + (Math.round(avg * 100) / 100), rowCls: function (r) { return evalC(c, r) === true ? 'keep' : 'drop'; }, extra: { label: 'test', cell: function (r) { return badge(evalC(c, r)); } } }),
                     t: 'The outer query then uses that value like a constant. Three orders are above the average.' };
          }
        ] },
      { name: 'IN (subquery): customers who bought Tech',
        parts: ['SELECT name\nFROM customers\nWHERE customer_id IN', "(SELECT customer_id FROM orders WHERE category = 'Tech')", ';'],
        steps: [
          function () { return { on: 1, h: box('inner query returns a list', listChips(techIds), 'inner'), t: 'The subquery returns one column with ' + techIds.length + ' values. Duplicates (customer 3 twice) do not matter for IN.' }; },
          function () {
            var c = { op: 'in', col: 'customer_id', list: techIds };
            return { on: 0, h: table(['customer_id', 'name'], CUSTOMERS, { caption: 'outer query', rowCls: function (r) { return evalC(c, r) === true ? 'keep' : 'drop'; }, extra: { label: 'customer_id IN (…)', cell: function (r) { return badge(evalC(c, r)); } } }),
                     t: 'Each customer is kept if its id is in the list: An, Binh and Chi.' };
          }
        ] },
      { name: 'EXISTS: a correlated subquery, run once per customer',
        parts: ['SELECT name\nFROM customers c\nWHERE EXISTS', '(SELECT 1 FROM orders o\n  WHERE o.customer_id = c.customer_id AND o.amount > 100)', ';'],
        steps: CUSTOMERS.map(function (c, k) {
          return function () {
            var found = ORDERS.filter(function (o) { return o.customer_id === c.customer_id && cmp(o.amount, '>', 100) === true; });
            return { on: 1, h: table(['customer_id', 'name'], CUSTOMERS, { caption: 'outer rows', rowCls: function (r, i) { return i === k ? 'focus' : i < k ? (ORDERS.some(function (o) { return o.customer_id === r.customer_id && cmp(o.amount, '>', 100) === true; }) ? 'keep' : 'drop') : ''; } }) +
                box('inner query for c.customer_id = ' + c.customer_id, found.length ? table(['order_id', 'product', 'amount'], found) : '<p class="muted">no rows</p>', 'inner'),
                t: 'The subquery mentions <code>c.customer_id</code>, so it is re-run for every customer. For ' + esc(c.name) + ' it finds ' + found.length + ' row' + (found.length === 1 ? '' : 's') + ', so EXISTS is ' + badge(found.length > 0) + '.' + (k === CUSTOMERS.length - 1 ? ' Result: An, Binh, Chi and Emma.' : '') };
          };
        }) },
      { name: 'NOT IN with a NULL: the classic trap',
        parts: ['SELECT name\nFROM customers\nWHERE customer_id NOT IN', '(SELECT customer_id FROM orders)', ';'],
        steps: [
          function () { return { on: 1, h: box('inner query returns a list', listChips(allIds), 'inner'), t: 'The list contains a <b>NULL</b>: order 111 was a guest checkout.' }; },
          function () {
            var c = { op: 'in', col: 'customer_id', list: allIds, neg: true };
            return { on: 0, h: table(['customer_id', 'name'], CUSTOMERS, { caption: 'outer query', rowCls: function (r) { return evalC(c, r) === true ? 'keep' : 'drop'; }, extra: { label: 'NOT IN (…, NULL)', cell: function (r) { return badge(evalC(c, r)); } } }),
                     t: 'Minh (6) is not in the list, yet the answer is UNKNOWN: "6 NOT IN (1, …, NULL)" means 6 &lt;&gt; 1 AND … AND 6 &lt;&gt; NULL, and the last part is UNKNOWN. <b>The result is empty.</b>' };
          },
          function () {
            var ok = CUSTOMERS.filter(function (c) { return !ORDERS.some(function (o) { return o.customer_id === c.customer_id; }); });
            return { on: null, h: '<pre class="sqlcode">' + hl('SELECT name\nFROM customers c\nWHERE NOT EXISTS (SELECT 1 FROM orders o\n                  WHERE o.customer_id = c.customer_id);') + '</pre>' + table(['customer_id', 'name'], ok, { caption: 'fixed: NOT EXISTS' }),
                     t: 'The fix: use NOT EXISTS (or filter out NULLs inside the subquery). Now Minh is found.' };
          }
        ] },
      { name: 'CTE: name a step with WITH',
        parts: ['WITH spend AS (\n  SELECT customer_id, SUM(amount) AS total\n  FROM orders\n  GROUP BY customer_id\n)', 'SELECT c.name, s.total\nFROM customers c\nJOIN spend s ON s.customer_id = c.customer_id\nWHERE s.total > 100;'],
        steps: [
          function () { return { on: 0, h: box('spend: a temporary, named result', table(['customer_id', 'total'], spend), 'inner'), t: 'The WITH part is computed first and given a name, <code>spend</code>. It lives only for this one query.' }; },
          function () {
            var rows = [];
            CUSTOMERS.forEach(function (c) { spend.forEach(function (s) { if (s.customer_id === c.customer_id && cmp(s.total, '>', 100) === true) rows.push({ name: c.name, total: s.total }); }); });
            return { on: 1, h: table(['name', 'total'], rows, { caption: 'main query uses spend like a table' }), t: 'The main query reads <code>spend</code> as if it were a table. CTEs make long queries readable: each step has a name and can be checked on its own.' };
          }
        ] }
    ];
    sel.innerHTML = P.map(function (p, i) { return '<option value="' + i + '">' + esc(p.name) + '</option>'; }).join('');
    function render() {
      var p = P[+sel.value], s = p.steps[step]();
      sqlEl.innerHTML = sqlBlock(p.parts, null);
      sqlEl.querySelectorAll('.clause').forEach(function (el) { if (+el.getAttribute('data-i') === s.on) el.classList.add('on'); });
      stage.innerHTML = s.h; read.innerHTML = s.t;
      $('sq-count').textContent = 'step ' + (step + 1) + ' of ' + p.steps.length;
      $('sq-prev').disabled = step === 0; $('sq-next').disabled = step === p.steps.length - 1;
    }
    on(sel, 'change', function () { step = 0; render(); });
    on($('sq-prev'), 'click', function () { if (step > 0) { step--; render(); } });
    on($('sq-next'), 'click', function () { if (step < P[+sel.value].steps.length - 1) { step++; render(); } });
    render();
  })();

  /* ================================================================
     12. Window functions: a value per row, computed over a window
     ================================================================ */
  (function windows() {
    var root = $('fig-window'); if (!root) return;
    var fnSel = $('sw-fn'), partSel = $('sw-part'), ordSel = $('sw-ord'), sqlEl = $('sw-sql'), box = $('sw-rows'), read = $('sw-read'), pick = null;
    var FN = {
      row_number: { sql: 'ROW_NUMBER()', ord: true }, rank: { sql: 'RANK()', ord: true }, dense_rank: { sql: 'DENSE_RANK()', ord: true },
      running: { sql: 'SUM(amount)', ord: true }, total: { sql: 'SUM(amount)', ord: false }, avg: { sql: 'AVG(amount)', ord: false }, lag: { sql: 'LAG(amount)', ord: true }
    };
    function keyOf(r, col) { return col ? r[col] : null; }
    function render() {
      var f = FN[fnSel.value], part = partSel.value, ordCol = ordSel.value === 'date' ? 'order_date' : 'amount', desc = ordSel.value !== 'date';
      var ordKey = { col: ordCol, desc: desc, nullsLast: true };
      var over = (part ? 'PARTITION BY ' + part : '') + (f.ord ? (part ? ' ' : '') + 'ORDER BY ' + ordCol + (desc ? ' DESC NULLS LAST' : '') : '');
      var alias = fnSel.value === 'running' ? 'running_total' : fnSel.value === 'total' ? 'group_total' : fnSel.value === 'avg' ? 'group_avg' : fnSel.value === 'lag' ? 'previous_amount' : fnSel.value;
      sqlEl.innerHTML = hl('SELECT order_id, category, customer_id, amount, order_date,\n       ' + f.sql + ' OVER (' + over + ') AS ' + alias + '\nFROM orders;');
      var keys = part ? [{ col: part, desc: false }] : [];
      var rows = sortRows(ORDERS, keys.concat([ordKey, { col: 'order_id' }]));
      var parts = groupRows(rows, part || '__none'), out = [];
      parts.forEach(function (g, gi) {
        var rs = g.rows;
        rs.forEach(function (r, i) {
          var peers = function (x) { return x[ordCol] === r[ordCol]; };
          var v, frame = [];
          if (fnSel.value === 'row_number') { v = i + 1; frame = [r]; }
          else if (fnSel.value === 'rank') { var first = rs.findIndex(peers); v = first + 1; frame = rs.filter(peers); }
          else if (fnSel.value === 'dense_rank') {
            var seen = [], d = 0; rs.slice(0, i + 1).forEach(function (x) { if (seen.indexOf(JSON.stringify(x[ordCol])) < 0) { seen.push(JSON.stringify(x[ordCol])); d++; } });
            v = d; frame = rs.filter(peers);
          } else if (fnSel.value === 'running') {
            var last = i; while (last + 1 < rs.length && peers(rs[last + 1])) last++;
            frame = rs.slice(0, last + 1); v = AGG['SUM(amount)'](frame);
          } else if (fnSel.value === 'total') { frame = rs; v = AGG['SUM(amount)'](rs); }
          else if (fnSel.value === 'avg') { frame = rs; v = AGG['AVG(amount)'](rs); v = v === null ? null : Math.round(v * 100) / 100; }
          else { frame = i ? [rs[i - 1]] : []; v = i ? rs[i - 1].amount : null; }
          out.push({ r: r, v: v, g: gi, frame: frame });
        });
      });
      var cols = ['order_id', 'category', 'customer_id', 'amount', 'order_date'];
      var P = pick !== null ? out.find(function (o) { return o.r.order_id === pick; }) : null;
      box.innerHTML = table(cols.concat([{ k: '__v', label: alias, get: function (r) { return r.__v; } }]), out.map(function (o) { var x = clone(o.r); x.__v = o.v; return x; }), {
        caption: 'every input row stays; one new column is added',
        attrs: function (r, i) { return 'data-id="' + out[i].r.order_id + '"'; },
        rowCls: function (r, i) {
          var o = out[i], c = 'band' + (o.g % 2) + ' pg' + (o.g % 6);
          if (P) c += o.r.order_id === P.r.order_id ? ' focus' : P.frame.indexOf(o.r) >= 0 ? ' inframe' : P.g === o.g ? '' : ' faded';
          return c;
        },
        cellCls: function (k) { return k === '__v' ? 'newcol' : k === part ? 'key1' : k === ordCol && f.ord ? 'key2' : ''; }
      });
      var nParts = parts.length;
      read.innerHTML = (part ? '<b>' + nParts + '</b> partitions (one per ' + part + '). ' : 'No PARTITION BY: the whole table is one window. ') +
        'Unlike GROUP BY, no rows are merged: all 12 rows come out. ' +
        (P ? 'Row ' + P.r.order_id + ': its value is computed from the <b>outlined</b> rows. ' : 'Click a row to see which rows its value is computed from. ') +
        ({ rank: 'Ties get the same rank, and the next rank is skipped (1, 1, 1, 4).', dense_rank: 'Ties share a rank, with no gaps (1, 1, 1, 2).', row_number: 'ROW_NUMBER numbers rows 1, 2, 3… even when they tie.',
           running: 'With ORDER BY, SUM becomes a running total. Rows that tie on the sort key are added together (the default frame includes "peers").', total: 'Without ORDER BY, each row sees its whole partition.',
           avg: 'Each row is compared with the average of its partition.', lag: 'LAG looks one row back in the window order; the first row has nothing before it (NULL).' }[fnSel.value]);
    }
    box.addEventListener('click', function (e) { var tr = e.target.closest('tr[data-id]'); if (!tr) return; var id = +tr.getAttribute('data-id'); pick = pick === id ? null : id; render(); });
    [fnSel, partSel, ordSel].forEach(function (el) { on(el, 'change', function () { render(); }); });
    render();
  })();

  /* ================================================================
     13. Indexes: full scan vs B-tree lookup
     ================================================================ */
  (function indexes() {
    var root = $('fig-index'); if (!root) return;
    var sel = $('si-q'), nIn = $('si-n'), sqlEl = $('si-sql'), svg = $('si-svg'), read = $('si-read'), stats = $('si-stats'), timer = null;
    var Q = [
      { sql: 'SELECT * FROM users WHERE user_id = 48213;', idx: 'users_pkey (user_id)', frac: function (N) { return 1 / N; }, usable: true, why: 'The primary key always has an index. The database walks down the B-tree and reads one row.' },
      { sql: "SELECT * FROM users WHERE email = 'lan.tran@example.com';", idx: 'users_email_idx (email)', frac: function (N) { return 1 / N; }, usable: true, why: 'An index on email turns the search into a short walk down the tree.' },
      { sql: "SELECT * FROM users\nWHERE signup_date BETWEEN '2024-03-01' AND '2024-03-07';", idx: 'users_signup_idx (signup_date)', frac: function () { return 7 / 1100; }, usable: true, range: true, why: 'A range search: find the first matching entry, then read the leaves in order until the range ends.' },
      { sql: "SELECT * FROM users WHERE city = 'HCMC';", idx: 'users_city_idx (city)', frac: function () { return 0.4; }, usable: true, low: true, why: 'About 40% of users live in HCMC. Jumping around the table for that many rows is slower than one straight read, so the planner chooses a full scan even though an index exists.' },
      { sql: "SELECT * FROM users\nWHERE LOWER(email) = 'lan.tran@example.com';", idx: 'users_email_idx (email)', frac: function (N) { return 1 / N; }, usable: false, why: 'The index is sorted by email, not by LOWER(email), so it cannot be used. Fix: CREATE INDEX ON users (LOWER(email)).' },
      { sql: "SELECT * FROM users WHERE email LIKE '%@gmail.com';", idx: 'users_email_idx (email)', frac: function () { return 0.3; }, usable: false, why: 'A B-tree is sorted from the first character. A pattern that starts with % could match anywhere, so the index cannot narrow the search.' }
    ];
    sel.innerHTML = Q.map(function (q, i) { return '<option value="' + i + '">' + esc(q.sql.replace(/\s+/g, ' ')) + '</option>'; }).join('');
    function fmtN(n) { return n >= 1e9 ? (n / 1e9) + ' billion' : n >= 1e6 ? (n / 1e6) + ' million' : n >= 1e3 ? (n / 1e3) + ' thousand' : String(n); }
    function render() {
      clearInterval(timer);
      var q = Q[+sel.value], N = Math.pow(10, +nIn.value), perPage = 100, pages = Math.ceil(N / perPage);
      $('si-no').textContent = fmtN(N) + ' rows';
      var matches = Math.max(1, Math.round(q.frac(N) * N));
      var height = Math.max(1, Math.ceil(Math.log(N) / Math.log(300)));
      var idxPages = height + (q.range ? Math.ceil(matches / 300) : 0), heapIdx = Math.min(pages, matches);
      var useIdx = q.usable && !q.low;
      var cost = useIdx ? idxPages + heapIdx : pages;
      sqlEl.innerHTML = hl((useIdx ? '' : '') + q.sql);
      stats.innerHTML = '<div class="stat"><span>Plan</span><b>' + (useIdx ? (q.range ? 'Index range scan' : 'Index scan') + ' using ' + esc(q.idx) : 'Sequential (full) scan') + '</b></div>' +
        '<div class="stat"><span>Matching rows</span><b>' + matches.toLocaleString('en-US') + '</b></div>' +
        '<div class="stat"><span>Pages read</span><b>' + cost.toLocaleString('en-US') + ' <small>of ' + pages.toLocaleString('en-US') + '</small></b></div>' +
        '<div class="stat"><span>Rows checked</span><b>' + (useIdx ? matches : N).toLocaleString('en-US') + '</b></div>';
      read.innerHTML = q.why + (useIdx ? ' The tree is only <b>' + height + '</b> level' + (height === 1 ? '' : 's') + ' deep, even with ' + fmtN(N) + ' rows: each level multiplies the reach by about 300.' : ' A full scan reads every page: its cost grows in step with the table.');
      // picture: B-tree on the left, table pages as a grid on the right
      var W = 640, H = 230, G = 100, cols = 20, cell = 12, gx = 300, gy = 30, h = '';
      var tree = [[{ x: 130, y: 30 }], [{ x: 50, y: 95 }, { x: 130, y: 95 }, { x: 210, y: 95 }], []];
      for (var i = 0; i < 9; i++) tree[2].push({ x: 20 + i * 27.5, y: 160 });
      var path = useIdx ? [0, q.range ? 1 : 2, q.range ? 3 : 7] : null;
      tree[1].forEach(function (n, j) { h += '<line class="tl' + (path && path[1] === j ? ' on' : '') + '" x1="130" y1="44" x2="' + n.x + '" y2="' + (n.y - 12) + '"/>'; });
      tree[2].forEach(function (n, j) { var p = Math.floor(j / 3); h += '<line class="tl' + (path && path[1] === p && (path[2] === j || (q.range && j >= path[2] && j <= path[2] + 1)) ? ' on' : '') + '" x1="' + tree[1][p].x + '" y1="107" x2="' + n.x + '" y2="' + (n.y - 9) + '"/>'; });
      tree.forEach(function (lvl, li) { lvl.forEach(function (n, j) {
        var onN = path && (li === 0 || path[li] === j || (li === 2 && q.range && j >= path[2] && j <= path[2] + 1));
        h += '<rect class="tn' + (onN ? ' on' : '') + (q.usable ? '' : ' unusable') + '" x="' + (n.x - (li === 2 ? 11 : 22)) + '" y="' + (n.y - (li === 2 ? 9 : 12)) + '" width="' + (li === 2 ? 22 : 44) + '" height="' + (li === 2 ? 18 : 24) + '" rx="4"/>';
      }); });
      h += '<text x="130" y="205" class="tlab">index (B-tree)' + (q.usable ? '' : ': cannot be used') + '</text>';
      var lit = useIdx ? Math.max(1, Math.min(G, Math.round(G * Math.min(1, heapIdx / pages)))) : G;
      var litSet = {};
      if (useIdx) { var step = q.range ? 1 : 0, start = q.range ? 41 : 67; for (var k = 0; k < lit; k++) litSet[(start + k * (step || 37)) % G] = 1; }
      for (var c = 0; c < G; c++) h += '<rect class="pg" data-p="' + c + '" x="' + (gx + (c % cols) * (cell + 3)) + '" y="' + (gy + Math.floor(c / cols) * (cell + 3)) + '" width="' + cell + '" height="' + cell + '" rx="2"/>';
      h += '<text x="' + (gx + 150) + '" y="' + (gy + 5 * (cell + 3) + 20) + '" class="tlab">table pages (each square ≈ ' + Math.ceil(pages / G).toLocaleString('en-US') + ' page' + (pages > G ? 's' : '') + ')</text>';
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.innerHTML = h;
      var pgs = svg.querySelectorAll('rect.pg'), n = 0;
      var order = useIdx ? Object.keys(litSet).map(Number) : Array.apply(null, Array(G)).map(function (_, i) { return i; });
      timer = setInterval(function () {
        if (n >= order.length) { clearInterval(timer); return; }
        pgs[order[n]].classList.add(useIdx ? 'hit' : 'scan'); n++;
      }, useIdx ? 180 : 22);
    }
    [sel, nIn].forEach(function (el) { on(el, 'input', render); });
    render();
  })();

  /* ================================================================
     14. Transactions: two sessions, one database
     ================================================================ */
  (function transactions() {
    var root = $('fig-tx'); if (!root) return;
    var sel = $('st-scn'), tl = $('st-timeline'), views = $('st-views'), read = $('st-read'), step = 0;
    function S(who, sql, com, a, b, note) { return { who: who, sql: sql, com: com, a: a, b: b, note: note }; }
    var X = [500, 300];
    var SC = [
      { name: 'COMMIT: changes become visible together', steps: [
        S('', '', X, X, X, 'Two accounts: An has 500, Binh has 300. Session A will move 100 from An to Binh.'),
        S('A', 'BEGIN;', X, X, X, 'A starts a transaction.'),
        S('A', 'UPDATE accounts SET balance = balance - 100 WHERE id = 1;', X, [400, 300], X, 'A sees its own change. Nobody else does: it is not committed.'),
        S('A', 'UPDATE accounts SET balance = balance + 100 WHERE id = 2;', X, [400, 400], X, 'Still invisible to others.'),
        S('B', 'SELECT * FROM accounts;', X, [400, 400], X, 'B reads the last committed data: 500 and 300. It never sees half a transfer.'),
        S('A', 'COMMIT;', [400, 400], [400, 400], [400, 400], 'COMMIT makes both changes permanent at the same moment.'),
        S('B', 'SELECT * FROM accounts;', [400, 400], [400, 400], [400, 400], 'Now everyone sees 400 and 400. The total is still 800.')] },
      { name: 'ROLLBACK: undo everything since BEGIN', steps: [
        S('', '', X, X, X, 'Same transfer, but A changes its mind.'),
        S('A', 'BEGIN;', X, X, X, ''),
        S('A', 'UPDATE accounts SET balance = balance - 100 WHERE id = 1;', X, [400, 300], X, ''),
        S('A', 'UPDATE accounts SET balance = balance + 100 WHERE id = 2;', X, [400, 400], X, ''),
        S('A', 'ROLLBACK;', X, X, X, 'ROLLBACK throws away every change of the transaction. The data is exactly as before.')] },
      { name: 'Crash in the middle: atomicity', steps: [
        S('', '', X, X, X, 'A transfer is interrupted by a crash.'),
        S('A', 'BEGIN;', X, X, X, ''),
        S('A', 'UPDATE accounts SET balance = balance - 100 WHERE id = 1;', X, [400, 300], X, 'The money has left An\'s account, but has not reached Binh.'),
        S('A', '-- power failure: the server stops', X, null, X, 'The transaction never committed.'),
        S('B', 'SELECT * FROM accounts;   -- after restart', X, null, X, 'On restart the database undoes unfinished work (using its log). The 100 is not lost: it is all or nothing.')] },
      { name: 'Non-repeatable read (READ COMMITTED)', steps: [
        S('', '', X, X, X, 'READ COMMITTED is the default level in PostgreSQL.'),
        S('B', 'BEGIN;', X, X, X, ''),
        S('B', 'SELECT balance FROM accounts WHERE id = 1;', X, X, X, 'B reads 500.'),
        S('A', 'UPDATE accounts SET balance = 400 WHERE id = 1;  -- auto-commit', [400, 300], [400, 300], X, 'A changes the balance and commits straight away.'),
        S('B', 'SELECT balance FROM accounts WHERE id = 1;', [400, 300], [400, 300], [400, 300], 'Inside the same transaction, B now reads 400. Each statement sees the latest committed data, so the same query can give a different answer.'),
        S('B', 'COMMIT;', [400, 300], [400, 300], [400, 300], '')] },
      { name: 'Same, with REPEATABLE READ', steps: [
        S('', '', X, X, X, 'Now B asks for a stronger isolation level.'),
        S('B', 'BEGIN ISOLATION LEVEL REPEATABLE READ;', X, X, X, ''),
        S('B', 'SELECT balance FROM accounts WHERE id = 1;', X, X, X, 'B reads 500. From its first query, B works on a snapshot of the data.'),
        S('A', 'UPDATE accounts SET balance = 400 WHERE id = 1;  -- auto-commit', [400, 300], [400, 300], X, 'A commits a change.'),
        S('B', 'SELECT balance FROM accounts WHERE id = 1;', [400, 300], [400, 300], X, 'B still reads 500: its snapshot does not change during the transaction.'),
        S('B', 'COMMIT;', [400, 300], [400, 300], [400, 300], 'After COMMIT, B\'s next query sees the new value.')] },
      { name: 'Lost update: read, compute, write', steps: [
        S('', '', X, X, X, 'Two apps each withdraw 100 from An by reading the balance, subtracting in the app, and writing the new number.'),
        S('A', 'BEGIN;', X, X, X, ''), S('B', 'BEGIN;', X, X, X, ''),
        S('A', 'SELECT balance FROM accounts WHERE id = 1;   -- 500', X, X, X, 'A reads 500.'),
        S('B', 'SELECT balance FROM accounts WHERE id = 1;   -- 500', X, X, X, 'B also reads 500.'),
        S('A', 'UPDATE accounts SET balance = 400 WHERE id = 1;', X, [400, 300], X, 'A writes 500 − 100 = 400.'),
        S('A', 'COMMIT;', [400, 300], [400, 300], [400, 300], ''),
        S('B', 'UPDATE accounts SET balance = 400 WHERE id = 1;', [400, 300], [400, 300], [400, 300], 'B also writes 500 − 100 = 400, from its old read.'),
        S('B', 'COMMIT;', [400, 300], [400, 300], [400, 300], 'Two withdrawals of 100, but the balance only fell by 100: <b>one update was lost</b>. Fix: let the database do the maths (SET balance = balance - 100), or lock the row with SELECT … FOR UPDATE.')] }
    ];
    sel.innerHTML = SC.map(function (s, i) { return '<option value="' + i + '">' + esc(s.name) + '</option>'; }).join('');
    function acc(v, title, cls) {
      if (!v) return '<div class="txv ' + (cls || '') + '"><div class="qtitle">' + title + '</div><p class="muted">(session gone)</p></div>';
      return '<div class="txv ' + (cls || '') + '"><div class="qtitle">' + title + '</div>' + table(['id', 'owner', 'balance'], [{ id: 1, owner: 'An', balance: v[0] }, { id: 2, owner: 'Binh', balance: v[1] }]) + '</div>';
    }
    function render() {
      var sc = SC[+sel.value], s = sc.steps[step];
      tl.innerHTML = '<div class="txh"><span>Session A</span><span>Session B</span></div>' + sc.steps.map(function (x, i) {
        if (!x.who) return '';
        var cell = '<code>' + hl(x.sql) + '</code>';
        return '<div class="txr' + (i === step ? ' on' : i > step ? ' later' : '') + '"><span>' + (x.who === 'A' ? cell : '') + '</span><span>' + (x.who === 'B' ? cell : '') + '</span></div>';
      }).join('');
      views.innerHTML = acc(s.com, 'committed data', 'com') + acc(s.a, 'what A sees', 'a') + acc(s.b, 'what B sees', 'b');
      read.innerHTML = s.note || '';
      $('st-count').textContent = 'step ' + (step + 1) + ' of ' + sc.steps.length;
      $('st-prev').disabled = step === 0; $('st-next').disabled = step === sc.steps.length - 1;
    }
    on(sel, 'change', function () { step = 0; render(); });
    on($('st-prev'), 'click', function () { if (step > 0) { step--; render(); } });
    on($('st-next'), 'click', function () { if (step < SC[+sel.value].steps.length - 1) { step++; render(); } });
    render();
  })();

  // code blocks in the article text
  document.querySelectorAll('pre.sqlcode.static').forEach(function (p) { p.innerHTML = hl(p.textContent); });

  /* ================================================================
     Run SQL yourself: SQLite compiled to WebAssembly (sql.js)
     ================================================================ */
  var SQLJS = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/';
  var loading = null;
  function loadSql() {
    if (loading) return loading;
    loading = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = SQLJS + 'sql-wasm.js';
      s.onload = function () { window.initSqlJs({ locateFile: function (f) { return SQLJS + f; } }).then(res, rej); };
      s.onerror = function () { rej(new Error('could not load the SQL engine')); };
      document.head.appendChild(s);
    });
    return loading;
  }
  function seedSql() {
    var s = 'CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT, joined INTEGER);\n' +
      'CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers (customer_id), product TEXT, category TEXT, amount NUMERIC, order_date TEXT);\n';
    CUSTOMERS.forEach(function (r) { s += 'INSERT INTO customers VALUES (' + [r.customer_id, r.name, r.city, r.joined].map(lit).join(', ') + ');\n'; });
    ORDERS.forEach(function (r) { s += 'INSERT INTO orders VALUES (' + [r.order_id, r.customer_id, r.product, r.category, r.amount, r.order_date].map(lit).join(', ') + ');\n'; });
    return s;
  }
  document.querySelectorAll('.sqlc').forEach(function (root) {
    var presets = JSON.parse(root.getAttribute('data-presets') || '[]'), init = root.getAttribute('data-init') || '';
    var ta = root.querySelector('textarea'), out = root.querySelector('.sqlc-out'), btns = root.querySelector('.sqlc-presets'), db = null;
    btns.innerHTML = presets.map(function (p, i) { return '<button type="button" class="vbtn sm" data-i="' + i + '">' + esc(p[0]) + '</button>'; }).join('');
    if (presets.length) ta.value = presets[0][1];
    function fresh(SQL) { db = new SQL.Database(); db.run(seedSql() + init); }
    function run() {
      out.innerHTML = '<p class="muted">Loading the SQL engine…</p>';
      loadSql().then(function (SQL) {
        if (!db) fresh(SQL);
        var t0 = performance.now(), res;
        try { res = db.exec(ta.value); } catch (e) { out.innerHTML = '<p class="err">Error: ' + esc(e.message) + '</p>'; return; }
        var ms = performance.now() - t0, changed = db.getRowsModified();
        if (!res.length) { out.innerHTML = '<p class="muted">OK' + (changed ? ', ' + changed + ' row' + (changed === 1 ? '' : 's') + ' changed' : '') + ' (' + ms.toFixed(1) + ' ms).</p>'; return; }
        var last = res[res.length - 1], rows = last.values.map(function (v) { var o = {}; last.columns.forEach(function (c, i) { o['c' + i] = v[i]; }); return o; });
        out.innerHTML = table(last.columns.map(function (c, i) { return { k: 'c' + i, label: c }; }), rows.slice(0, 200), { caption: last.values.length + ' row' + (last.values.length === 1 ? '' : 's') + (last.values.length > 200 ? ' (first 200 shown)' : '') + ' · ' + ms.toFixed(1) + ' ms' });
      }, function (e) { out.innerHTML = '<p class="err">' + esc(e.message) + '. Check your internet connection.</p>'; });
    }
    btns.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (!b) return; ta.value = presets[+b.getAttribute('data-i')][1]; run(); });
    on(root.querySelector('.sqlc-run'), 'click', run);
    on(root.querySelector('.sqlc-reset'), 'click', function () { db = null; out.innerHTML = '<p class="muted">Database reset to the original data.</p>'; });
    ta.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); } });
  });
})();
