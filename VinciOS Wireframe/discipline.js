/* 訓導紀錄分析 wireframe logic. Data: discipline-data.js (counts + Excel row numbers only, no student data).
   Uses helpers exposed by wireframe.js as window.WF. Everything runs in the browser; nothing is uploaded. */
(function () {
  'use strict';
  var D = window.DC_DATA, WF = window.WF; if (!D || !WF) return;
  var $ = WF.$, $$ = WF.$$, h = WF.h, esc = WF.esc, toast = WF.toast, modal = WF.modal;
  var YEARS = Object.keys(D.years).sort(), LATEST = YEARS[YEARS.length - 1], ME = 'v1.0.0 Admin';   // years come from the data, none are hard-coded
  function shortLabel(y) { var m = /(\d{4})\D+(\d{2})(\d{2})/.exec(D.years[y].label); return m ? m[1] + '-' + m[3] : D.years[y].label; }   // "2024 - 2025" -> "2024-25"

  function store(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  function ymd(s) { return s; }

  var ZH = { D001: '三次欠交功課', D002: '沒帶課本／用品', D003: '課堂或集會不專心／談話', D005: '無故缺席集會', D007: '進入禁區', D008: '沒有家長簽名', D009: '未經許可離開課室', D010: '學習態度欠佳', D011: '抄襲功課', D012: '未經許可踢足球', D013: '不服從風紀指示', D014: '在禁止地方飲食', D015: '亂拋垃圾', D016: '不負責任', D017: '說謊／不誠實', D018: '違反課室規則', D019: '說粗言穢語', D020: '取笑他人', D021: '未經許可帶／用手機或影音器材', D022: '對老師不禮貌', D023: '不當使用電腦／電子器材',
    D102: '三次校服儀容不當', D103: '留堂課遲到', D104: '沒有出席留堂課', D106: '3 次沒有拍學生證點名', D107: '缺席沒有通知學校', D108: '未經許可早退', D109: '遲到 5 次', D110: '遲到 9 次', D111: '遲到 12 次', D112: '遲到 30 分鐘', D113: '慣性欠交功課', D114: '不尊重老師', D115: '惡作劇', D117: '危險行為', D118: '攜帶違禁品', D121: '侮辱老師', D122: '欺凌同學', D124: '違反測驗／考試規則', D125: '飲酒', D126: '偷竊', D127: '賭博', D128: '傷害他人身體', D131: '測驗／考試作弊', D132: '偽造家長簽名', D134: '惡意破壞校物', D135: '曠課', D140: '行為不當', D141: '誹謗或侮辱他人' };
  var state = { year: LATEST, years: [LATEST], type: 'D', mode: 'code', sel: null, loaded: {}, files: {} };   // years = selected range (default: current year only); year = latest selected
  var YCOL = ['#0f766e', '#6366f1', '#f59e0b', '#e11d48', '#0ea5e9', '#84cc16'];                  // one colour per year, stable by position in the data
  function yColor(y) { return YCOL[YEARS.indexOf(y) % YCOL.length]; }
  function setYears(arr) { state.years = YEARS.filter(function (y) { return arr.indexOf(y) >= 0; }); if (!state.years.length) state.years = [LATEST]; state.year = state.years[state.years.length - 1]; }
  function yearsText(sep) { return state.years.map(function (y) { return D.years[y].label.replace(/ /g, ''); }).join(sep || '、'); }
  YEARS.forEach(function (y) { state.loaded[y] = true; state.files[y] = D.years[y].file; });
  var cfg = store('wf.dc.cfg', null);            // { map:{code:catId}, names:{catId:name}, order:[catId...] }
  function defaultCfg() {
    var map = {}, names = {}, order = [];
    D.cats.forEach(function (c) { names[c.id] = c.name; order.push(c.id); c.codes.forEach(function (k) { map[k] = c.id; }); });
    return { map: map, names: names, order: order };
  }
  if (!cfg || !cfg.order) cfg = defaultCfg();

  /* ---------- audit log ---------- */
  var auditList = store('wf.dc.audit', []);
  function audit(action, detail) {
    var d = new Date(), p = WF.pad;
    auditList.unshift({ t: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()), who: ME, action: action, detail: detail || '' });
    auditList = auditList.slice(0, 60); save('wf.dc.audit', auditList); renderAudit();
  }
  function renderAudit() {
    var body = $('[data-dc=audit-body]'); if (!body) return;
    body.innerHTML = auditList.slice(0, 8).map(function (a) { return '<tr><td>' + a.t + '</td><td>' + esc(a.who) + '</td><td>' + esc(a.action) + '</td><td class="dc-muted">' + esc(a.detail) + '</td></tr>'; }).join('') || '<tr><td colspan="4" class="dc-muted">暫無紀錄。</td></tr>';
  }

  /* ---------- data helpers ---------- */
  function dCodes() { return Object.keys(D.codes).filter(function (c) { return c.charAt(0) === 'D'; }).sort(); }
  function n(code, y) { return (D.codes[code] && D.codes[code].n[y]) || 0; }
  function totalOf(type, y) { return Object.keys(D.codes).filter(function (c) { return c.charAt(0) === type; }).reduce(function (s, c) { return s + n(c, y); }, 0); }
  function catItems(y) {   // violation categories, using the school-editable mapping
    var items = cfg.order.map(function (id) { return { key: id, label: cfg.names[id] || '（未命名）', codes: [] }; });
    var none = { key: 'none', label: '未分類', codes: [] };
    dCodes().forEach(function (c) {
      var id = cfg.map[c], it = items.filter(function (x) { return x.key === id; })[0] || none;
      if (n(c, y)) it.codes.push({ code: c, n: n(c, y) });
    });
    if (none.codes.length) items.push(none);
    items.forEach(function (it) { it.n = it.codes.reduce(function (s, c) { return s + c.n; }, 0); });
    return items;
  }
  function codeItems(type, y) {   // A / S: one bar per code
    return Object.keys(D.codes).filter(function (c) { return c.charAt(0) === type && n(c, y); }).sort().map(function (c) { return { key: c, label: c, n: n(c, y), codes: [{ code: c, n: n(c, y) }] }; });
  }
  var TOPN = 5;   // 按代碼：取前 5 項，其餘歸入「其他」
  function zh(code) { return ZH[code] || (D.codes[code] ? D.codes[code].d : code); }
  function sumBy(it) { return state.years.reduce(function (s, y) { return s + it.by[y]; }, 0); }
  function buildItems(type) {   // one entry per bar / table row, with a count for every selected year (by) and its codes per year; sorted high → low, 其他 last
    var map = {}, order = [], ys = state.years, byCode = type === 'D' && state.mode === 'cat' ? false : true;
    ys.forEach(function (y) {
      (byCode ? codeItems(type, y) : catItems(y)).forEach(function (it) {
        if (!map[it.key]) { map[it.key] = { key: it.key, label: it.label, by: {}, codes: {} }; order.push(it.key); }
        map[it.key].by[y] = it.n; map[it.key].codes[y] = it.codes;
      });
    });
    var list = order.map(function (k) { var it = map[k]; ys.forEach(function (y) { if (it.by[y] == null) { it.by[y] = 0; it.codes[y] = []; } }); return it; });
    list.sort(function (a, b) { return sumBy(b) - sumBy(a) || (a.key < b.key ? -1 : 1); });
    if (byCode) list.forEach(function (it) { it.desc = zh(it.key); });
    else list.forEach(function (it) { var cs = {}; ys.forEach(function (y) { it.codes[y].forEach(function (c) { cs[c.code] = 1; }); }); it.desc = Object.keys(cs).sort().join('、'); });
    if (type === 'D' && state.mode === 'code' && list.length > TOPN) {
      var rest = list.slice(TOPN), other = { key: 'other', label: '其他', by: {}, codes: {} }, cs = {};
      ys.forEach(function (y) { other.by[y] = 0; other.codes[y] = []; rest.forEach(function (it) { other.by[y] += it.by[y]; other.codes[y] = other.codes[y].concat(it.codes[y]); it.codes[y].forEach(function (c) { cs[c.code] = 1; }); }); });
      other.desc = '共 ' + Object.keys(cs).length + ' 個代碼：' + Object.keys(cs).sort().join('、');
      list = list.slice(0, TOPN).concat([other]);
    } else if (!byCode) {   // 未分類 / 其他-named categories go last
      var tail = list.filter(function (it) { return it.key === 'none' || it.label === '其他'; });
      list = list.filter(function (it) { return tail.indexOf(it) < 0; }).concat(tail);
    }
    list.forEach(function (it) { it.n = it.by[state.year]; });
    return list;
  }
  function items() { return buildItems(state.type); }
  function titleFor() {
    var y = state.years.length > 1 ? '' : ' ' + D.years[state.year].label.replace(/ /g, '');   // no year in the title when comparing a range
    return state.type === 'D' ? 'Discipline Committee Records: Comprehensive Analysis' + y : state.type === 'A' ? 'Merit Records by Code' + y : 'Awards & Posts by Code' + y;
  }

  /* ---------- KPI ---------- */
  function renderKpi() {
    var box = $('[data-dc=kpi]'); if (!box) return;
    var ys = state.years.filter(function (y) { return state.loaded[y]; });   // totals over the selected range
    if (!ys.length) { box.innerHTML = '<div class="dc-empty">' + D.years[state.year].label + ' 學年尚未上傳檔案。</div>'; return; }
    var sum = function (f) { return ys.reduce(function (s, y) { return s + f(y); }, 0); };
    var rows = sum(function (y) { return D.years[y].rows; }), a = sum(function (y) { return D.years[y].a; }), s2 = sum(function (y) { return D.years[y].s; }), d = sum(function (y) { return D.years[y].d; }),
      d112 = sum(function (y) { return n('D112', y); }), cum = sum(function (y) { return n('D109', y) + n('D110', y) + n('D111', y); }),
      from = ys.map(function (y) { return D.years[y].from; }).sort()[0], to = ys.map(function (y) { return D.years[y].to; }).sort().pop();
    box.innerHTML =
      '<div class="dc-kpi"><span>總記錄行數</span><b>' + fmt(rows) + '</b><i>' + from + ' 至 ' + to + '<br>加分 ' + fmt(a) + ' · 獎項 ' + fmt(s2) + ' · 扣分 ' + fmt(d) + '</i></div>' +
      '<div class="dc-kpi"><span>違規宗數</span><b>' + fmt(d) + '</b><i>不用「負分」計，因為訓導組的調整也是負分</i></div>' +
      '<div class="dc-kpi"><span>遲到 · 單次（D112）</span><b>' + fmt(d112) + '</b><i>單次遲到 30 分鐘</i></div>' +
      '<div class="dc-kpi"><span>遲到 · 累計（D109／D110／D111）</span><b>' + fmt(cum) + '</b><i>累計 5／9／12 次後才記一筆；與單次分開，不可相加</i></div>';
  }

  /* ---------- chart ---------- */
  function niceMax(v) { var s = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1)))), m = Math.ceil(v / s); m = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10; return m * s; }
  function renderChart() {
    var card = $('[data-dc=chart]'); if (!card) return;
    var y = state.year, ys = state.years, ny = ys.length, multi = ny > 1, on = ys.every(function (k) { return state.loaded[k]; }), its = items();
    var total = function (k) { return its.reduce(function (s, i) { return s + i.by[k]; }, 0); };
    $('[data-dc=chart-title]').textContent = titleFor();
    var svgBox = $('[data-dc=chart-svg]'), foot = $('[data-dc=chart-foot]'), note = $('[data-dc=chart-note]');
    $$('[data-dc-export]').forEach(function (b) { b.disabled = !on; });
    if (!on) { svgBox.innerHTML = '<div class="dc-empty">請先上傳 ' + D.years[y].label + ' 學年的檔案。</div>'; foot.textContent = ''; return; }
    note.textContent = state.type === 'D' ? '預設只計違規；加分和獎項不納入此圖。點擊任一直條可看包含的代碼和次數。' : state.type === 'A' ? '加分項按代碼統計，預設不納入違規圖。' : '獎項／職位按代碼統計，預設不納入違規圖。';
    var W = 920, H = 360, L = 56, R = 16, T = multi ? 40 : 24, B = state.type === 'D' ? 64 : 56, iw = W - L - R, ih = H - T - B, step, gw = iw / Math.max(its.length, 1), bw = Math.min(multi ? 42 : 70, gw * (multi ? 0.78 : 0.6) / ny),
      max = niceMax(Math.max.apply(null, [1].concat.apply([], its.map(function (i) { return ys.map(function (k) { return i.by[k]; }); }))));
    step = max / 5;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(titleFor()) + '" font-family="Inter, system-ui, sans-serif">';
    s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#fff"/>';
    for (var k = 0; k <= 5; k++) { var yy = T + ih - ih * k / 5; s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '" stroke="#e2e8f0"/><text x="' + (L - 8) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="11" fill="#64748b">' + fmt(step * k) + '</text>'; }
    s += '<text x="14" y="' + (T + ih / 2) + '" font-size="11" fill="#64748b" transform="rotate(-90 14 ' + (T + ih / 2) + ')" text-anchor="middle">次數 Count</text>';
    its.forEach(function (it, i) {
      var cx = L + iw * (i + 0.5) / its.length, sel = state.sel === it.key, gap = multi ? 3 : 0, x0 = cx - (ny * bw + (ny - 1) * gap) / 2;
      var tip = it.label + (it.desc && state.mode === 'code' ? ' ' + it.desc : '') + '：' + ys.map(function (k) { return (multi ? shortLabel(k) + ' ' : '') + fmt(it.by[k]); }).join('　');
      s += '<g class="dc-bar' + (sel ? ' sel' : '') + '" data-key="' + esc(it.key) + '" role="button" tabindex="0" aria-label="' + esc(tip) + '"><title>' + esc(tip) + '</title><rect x="' + (cx - gw / 2) + '" y="' + T + '" width="' + gw + '" height="' + ih + '" fill="transparent"/>';
      ys.forEach(function (k, j) {
        var v = it.by[k], bh = ih * v / max, x = x0 + j * (bw + gap), yb = T + ih - bh;
        s += '<rect class="b" x="' + x + '" y="' + yb + '" width="' + bw + '" height="' + Math.max(bh, 0) + '" rx="3"' + (multi ? ' style="fill:' + yColor(k) + '"' + (sel ? ' stroke="#4f46e5" stroke-width="2"' : '') : '') + '/><text x="' + (x + bw / 2) + '" y="' + (yb - 5) + '" text-anchor="middle" font-size="' + (multi ? 11 : 12) + '" font-weight="600" fill="#0f172a">' + fmt(v) + '</text>';
      });
      s += '</g>';
      var lbl = it.label, lines = lbl.length > 6 && state.type === 'D' ? [lbl.slice(0, Math.ceil(lbl.length / 2)), lbl.slice(Math.ceil(lbl.length / 2))] : [lbl];
      s += '<text x="' + cx + '" y="' + (T + ih + 18) + '" text-anchor="middle" font-size="11" fill="#334155"' + (state.type !== 'D' ? ' transform="rotate(-40 ' + cx + ' ' + (T + ih + 14) + ')" text-anchor="end"' : '') + '>' + lines.map(function (ln, j) { return '<tspan x="' + cx + '" dy="' + (j ? 13 : 0) + '">' + esc(ln) + '</tspan>'; }).join('') + '</text>';
    });
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (T + ih) + '" y2="' + (T + ih) + '" stroke="#94a3b8"/>';
    if (multi) ys.forEach(function (k, j) { var lx = L + j * 130; s += '<rect x="' + lx + '" y="10" width="12" height="12" rx="3" fill="' + yColor(k) + '"/><text x="' + (lx + 18) + '" y="20" font-size="12" fill="#334155">' + esc(D.years[k].label.replace(/ /g, '')) + '</text>'; });
    s += '</svg>';
    svgBox.innerHTML = s;
    $$('.dc-bar', svgBox).forEach(function (g) {
      function go() { state.sel = g.getAttribute('data-key'); renderChart(); renderDrill(); var d = $('[data-dc=drill]'); if (d && d.scrollIntoView) d.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
      g.addEventListener('click', go); g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    foot.textContent = multi ? 'Data based on ' + ys.map(function (k) { return shortLabel(k) + ': ' + fmt(total(k)); }).join(' · ') + ' records' : 'Data based on ' + fmt(total(y)) + ' records';
  }

  /* ---------- drill-down ---------- */
  function renderDrill() {
    var box = $('[data-dc=drill]'); if (!box) return;
    var y = state.year, it = items().filter(function (i) { return i.key === state.sel; })[0];
    if (!it || !state.loaded[y]) { box.innerHTML = '<div class="dc-empty">點擊上方圖表的直條，查看該類別包含的代碼和次數。</div>'; return; }
    var ys = state.years, multi = ys.length > 1, codeSet = {};
    ys.forEach(function (k) { it.codes[k].forEach(function (c) { codeSet[c.code] = (codeSet[c.code] || 0) + c.n; }); });
    var codes = Object.keys(codeSet).sort(function (a, b) { return n(b, y) - n(a, y) || codeSet[b] - codeSet[a]; });
    var rowsHtml = codes.map(function (code) {
      var info = D.codes[code], m = info.m ? (info.m[0] === info.m[1] ? info.m[0] : info.m[0] + ' 至 ' + info.m[1]) : '';
      return '<tr><td><b>' + code + '</b></td><td>' + esc(zh(code)) + '<div class="dc-muted">' + esc(info.d) + '</div></td><td>' + m + '</td>' + ys.map(function (k) { return '<td class="num">' + fmt(n(code, k)) + '</td>'; }).join('') + '<td class="num">' + (it.n ? (n(code, y) / it.n * 100).toFixed(1) : 0) + '%</td><td>' +
        ys.map(function (k) { return '<button type="button" class="dc-btn sm" style="margin-right:4px"' + (n(code, k) ? '' : ' disabled') + ' data-trace="' + code + '" data-year="' + k + '">' + (multi ? esc(shortLabel(k)) + ' ' : '') + '檢視原始行</button>'; }).join('') + '</td></tr>';
    }).join('');
    var extra = '';
    if (it.key === 'late') extra = ys.map(function (k) { return '<div class="dc-note">' + (multi ? esc(D.years[k].label) + ' · ' : '') + '遲到分開計：單次遲到 D112 = <b>' + fmt(n('D112', k)) + '</b>；累計遲到 D109／D110／D111 = <b>' + fmt(n('D109', k) + n('D110', k) + n('D111', k)) + '</b>（兩者不可相加）。</div>'; }).join('');
    if (codes.indexOf('D140') >= 0) extra += '<div class="dc-note">D140「行為不當」是概括代碼，扣分 -2 至 -18，請按 REMARK 分輕重（見下方「D140 輕重」）。</div>';
    box.innerHTML = '<div class="dc-head"><span>' + esc(it.label) + ' — 包含代碼</span><span class="sub">' + ys.map(function (k) { return D.years[k].label + ' 共 ' + fmt(it.by[k]) + ' 宗'; }).join(' · ') + ' · ' + codes.length + ' 個代碼</span><button type="button" class="dc-btn ghost sm" style="margin-left:auto" data-act="close">收起</button></div><div class="dc-body"><div class="dc-scroll"><table class="dc-table"><thead><tr><th>代碼</th><th>說明</th><th>扣分／分數</th>' + ys.map(function (k) { return '<th class="num">次數' + (multi ? ' ' + esc(shortLabel(k)) : '') + '</th>'; }).join('') + '<th class="num">佔比' + (multi ? '（' + esc(shortLabel(y)) + '）' : '') + '</th><th>追溯</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div>' + extra + '<div class="dc-muted" style="margin-top:8px">每個數字都可追溯回原始 Excel 行；預設不列出個別學生。</div></div>';
    $('[data-act=close]', box).addEventListener('click', function () { state.sel = null; renderChart(); renderDrill(); });
    $$('[data-trace]', box).forEach(function (b) { b.addEventListener('click', function () { trace(b.getAttribute('data-trace'), b.getAttribute('data-year')); }); });
  }
  function trace(code, yr) {
    var y = yr || state.year, rows = (D.rows[code] || {})[y], total = n(code, y);
    var body = rows ? '<p class="dc-muted">來源檔案：' + esc(state.files[y]) + '（第 1 列為標題）。以下是 Excel 行號，不含學生資料。</p><div class="dc-rows">' + rows.join(', ') + '</div>' : '<p class="dc-muted">加分／獎項的行數很多（' + fmt(total) + ' 行），請用「匯出 Excel」取得完整清單。</p>';
    modal(code + ' · ' + D.codes[code].d, '<p>' + D.years[y].label + ' 學年共 <b>' + fmt(total) + '</b> 行。</p>' + body, [{ text: '關閉', cls: 'pri' }]);
    audit('檢視原始行', code + '（' + D.years[y].label + '，' + fmt(total) + ' 行）');
  }

  /* ---------- statistics tables (one column per year found in the data) ---------- */
  function yearCols() { return state.years.filter(function (y) { return state.loaded[y]; }); }
  function setHead(sel, first, cols, extra) {
    var el = $(sel); if (!el) return;
    el.innerHTML = '<th>' + first + '</th>' + cols.map(function (y) { return '<th class="num">' + esc(shortLabel(y)) + '</th>'; }).join('') + (extra || '');
  }
  function statData() {   // the table on screen, the chart and the Excel 統計表 all use these same rows
    var cols = yearCols(), multi = cols.length > 1, last = cols[cols.length - 1], prev = cols[cols.length - 2], its = buildItems('D'), code = state.mode === 'code', sgn = function (v) { return (v > 0 ? '+' : '') + fmt(v); };
    var head = [code ? '代碼' : '類別', code ? '說明' : '包含代碼'].concat(cols.map(shortLabel)); if (multi) head.push('變化（' + shortLabel(last) + ' 對 ' + shortLabel(prev) + '）');
    var rows = its.map(function (it) { var r = [it.label, it.desc || ''].concat(cols.map(function (y) { return it.by[y] || 0; })); if (multi) r.push((it.by[last] || 0) - (it.by[prev] || 0)); return r; });
    var tot = ['合計（違規）', ''].concat(cols.map(function (y) { return its.reduce(function (s, it) { return s + (it.by[y] || 0); }, 0); })); if (multi) tot.push(tot[tot.length - 1] - tot[tot.length - 2]);
    return { cols: cols, multi: multi, head: head, rows: rows, total: tot, sgn: sgn };
  }
  function renderTable() {
    var body = $('[data-dc=stat-body]'), hd = $('[data-dc=stat-head]'); if (!body) return;
    var d = statData(); if (!d.cols.length) { body.innerHTML = '<tr><td class="dc-muted">尚無資料。</td></tr>'; return; }
    hd.innerHTML = d.head.map(function (x, i) { return '<th' + (i > 1 ? ' class="num"' : '') + '>' + esc(x) + '</th>'; }).join('');
    function row(r, cls) {
      return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>' + r.map(function (v, i) {
        if (i === 0) return '<td>' + esc(v) + '</td>';
        if (i === 1) return '<td class="dc-muted" style="white-space:normal;min-width:160px">' + esc(v) + '</td>';
        var diff = d.multi && i === r.length - 1;
        return '<td class="num' + (diff ? (v > 0 ? ' up' : v < 0 ? ' down' : '') : '') + '">' + (diff ? d.sgn(v) : fmt(v)) + '</td>';
      }).join('') + '</tr>';
    }
    body.innerHTML = d.rows.map(function (r) { return row(r); }).join('') + row(d.total, 'total');
  }
  function renderLevels() {   // 按級統計: level taken from the CLASS column of each record (not the current roster)
    var body = $('[data-dc=level-body]'), hd = $('[data-dc=level-head]'); if (!body) return;
    var d = levelData(); hd.innerHTML = d.head.map(function (x, i) { return '<th' + (i ? ' class="num"' : '') + '>' + esc(x) + '</th>'; }).join('');
    function row(r, cls) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>' + r.map(function (v, i) { var diff = d.multi && i === r.length - 1 && i > 0; return i === 0 ? '<td>' + esc(v) + '</td>' : '<td class="num' + (diff ? (v > 0 ? ' up' : v < 0 ? ' down' : '') : '') + '">' + (diff ? (v > 0 ? '+' : '') + fmt(v) : fmt(v)) + '</td>'; }).join('') + '</tr>'; }
    body.innerHTML = d.rows.map(function (r) { return row(r); }).join('') + row(d.total, 'total');
  }
  var LEVELS = [['F1', '中一'], ['F2', '中二'], ['F3', '中三'], ['F4', '中四'], ['F5', '中五'], ['F6', '中六']];
  function levelData() {
    var cols = yearCols(), multi = cols.length > 1, last = cols[cols.length - 1], prev = cols[cols.length - 2];
    var head = ['級別'].concat(cols.map(shortLabel)); if (multi) head.push('變化（' + shortLabel(last) + ' 對 ' + shortLabel(prev) + '）');
    var rows = LEVELS.map(function (l) { var r = [l[1]].concat(cols.map(function (y) { return (D.years[y].levels || {})[l[0]] || 0; })); if (multi) r.push(r[r.length - 1] - r[r.length - 2]); return r; });
    var tot = ['合計（違規）'].concat(cols.map(function (y, i) { return rows.reduce(function (s, r) { return s + r[i + 1]; }, 0); })); if (multi) tot.push(tot[tot.length - 1] - tot[tot.length - 2]);
    return { cols: cols, multi: multi, head: head, rows: rows, total: tot };
  }  function renderLate() {
    var body = $('[data-dc=late-body]'); if (!body) return;
    var cols = yearCols(); setHead('[data-dc=late-head]', '項目', cols);
    var lines = [
      ['單次遲到 D112（30 分鐘）', function (y) { return n('D112', y); }, ''],
      ['累計遲到 D109（5 次）', function (y) { return n('D109', y); }, ''],
      ['累計遲到 D110（9 次）', function (y) { return n('D110', y); }, ''],
      ['累計遲到 D111（12 次）', function (y) { return n('D111', y); }, ''],
      ['累計遲到 小計', function (y) { return n('D109', y) + n('D110', y) + n('D111', y); }, 'sub']
    ];
    body.innerHTML = lines.map(function (l) { return '<tr class="' + l[2] + '"><td>' + l[0] + '</td>' + cols.map(function (y) { return '<td class="num">' + fmt(l[1](y)) + '</td>'; }).join('') + '</tr>'; }).join('');
  }
  function renderD140() {
    var body = $('[data-dc=d140-body]'); if (!body) return;
    var cols = yearCols(); setHead('[data-dc=d140-head]', 'REMARK', cols);
    body.innerHTML = [['BM（懲罰）', 'BM'], ['ID（懲罰）', 'ID'], ['MD（懲罰）', 'MD'], ['未填 REMARK', '-']].map(function (l) { return '<tr><td>' + l[0] + '</td>' + cols.map(function (y) { return '<td class="num">' + fmt((D.years[y].d140 || {})[l[1]] || 0) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '<tr class="sub"><td>D140 合計</td>' + cols.map(function (y) { return '<td class="num">' + fmt(n('D140', y)) + '</td>'; }).join('') + '</tr>';
    var r = $('[data-dc=remark-line]');
    if (r) r.innerHTML = cols.map(function (k) { var q = D.years[k].remark; return q ? '全檔 REMARK（' + esc(D.years[k].label) + '）：懲罰 BM ' + (q.BM || 0) + '、ID ' + (q.ID || 0) + '、MD ' + (q.MD || 0) + '；獎勵 MT ' + (q.MT || 0) + '、CR ' + (q.CR || 0) + '、MC ' + (q.MC || 0) + '。' : ''; }).join('<br>');
  }

  /* ---------- exports ---------- */
  function download(name, blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  function exportImage() {
    var svg = $('[data-dc=chart-svg] svg'); if (!svg) return;
    var xml = new XMLSerializer().serializeToString(svg), img = new Image(), c = document.createElement('canvas'); c.width = 1840; c.height = 720;
    img.onload = function () {
      var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#0f172a'; g.font = 'bold 30px sans-serif'; g.fillText(titleFor(), 40, 44); g.drawImage(img, 0, 60, 1840, 640);
      g.fillStyle = '#475569'; g.font = '22px sans-serif'; g.fillText($('[data-dc=chart-foot]').textContent, 40, 712);
      c.toBlob(function (b) { download('discipline-' + state.year + '-' + state.type + '.png', b); toast('已匯出圖片（PNG）', true); }, 'image/png');
    };
    img.onerror = function () { toast('此瀏覽器無法匯出圖片，請改用 PDF 或截圖'); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    audit('匯出圖片', titleFor());
  }
  function exportPdf() {
    document.body.classList.add('dc-print'); audit('匯出 PDF', titleFor());
    var done = function () { document.body.classList.remove('dc-print'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done); setTimeout(function () { window.print(); }, 50);
    toast('請在列印視窗選擇「另存為 PDF」');
  }
  function exportExcel() {   // 4 sheets: 統計表 / 按級統計 / 條件與來源 / 另列清單 (no per-student detail)
    var d = statData(), lv = levelData(), cols = d.cols; if (!cols.length) return;
    var code = state.mode === 'code', now = new Date(), p = WF.pad, stamp = now.getFullYear() + '-' + p(now.getMonth() + 1) + '-' + p(now.getDate()) + ' ' + p(now.getHours()) + ':' + p(now.getMinutes());
    var each = function (f) { return cols.map(f); };
    var src = [['項目'].concat(each(function (y) { return D.years[y].label; })),
      ['來源檔案'].concat(each(function (y) { return state.files[y]; })),
      ['日期範圍'].concat(each(function (y) { return D.years[y].from + ' 至 ' + D.years[y].to; })),
      ['讀入行數'].concat(each(function (y) { return D.years[y].rows; })),
      ['條件：代碼以 D 開首（違規）後剩餘行數'].concat(each(function (y) { return D.years[y].d; })),
      ['（不計入）加分 A 碼行數'].concat(each(function (y) { return D.years[y].a; })),
      ['（不計入）獎項 S 碼行數'].concat(each(function (y) { return D.years[y].s; })),
      ['Data based on（宗）'].concat(each(function (y) { return D.years[y].d; })),
      [], ['統計方式', code ? '按代碼' : '按類別（類別設定：' + cfg.order.length + ' 類）'], ['取前 N 項', code ? TOPN + '（其餘歸入「其他」）' : '不適用'],
      ['排序', '宗數由高至低；「其他」放最後'], ['匯出時間', stamp], ['匯出者', ME]];
    var unm = [['學年', '配對不上的 D 碼紀錄（宗）', '涉及學生（人）', '原因', '備註']].concat(each(function (y) {
      var u = D.years[y].unmatched || { rows: 0, students: 0 };
      return [D.years[y].label, u.rows, u.students, u.rows ? '名冊無此學生編號' : '全部配對得上', u.rows ? '多為已離校學生；只列學號和代碼，不列姓名（逐列清單於配對名冊後產生）' : ''];
    }));
    var blob = WF.makeXlsx([{ name: '統計表', rows: [d.head].concat(d.rows, [d.total]) }, { name: '按級統計', rows: [lv.head].concat(lv.rows, [lv.total]) }, { name: '條件與來源', rows: src }, { name: '另列清單', rows: unm }]);
    download('discipline-statistics.xlsx', blob); toast('已匯出統計表（Excel，共 4 個工作表）', true); audit('匯出統計表', 'discipline-statistics.xlsx（' + yearsText() + '）');
  }
  /* ---------- 類別設定 ---------- */
  function openSettings() {
    var work = JSON.parse(JSON.stringify(cfg)), seq = work.order.length;
    var m = modal('類別設定', '<div class="dc-set"><p class="dc-muted">類別劃分可由校方自行調整：改名稱、新增類別、把代碼移到另一類。儲存後圖表和統計表即時更新。</p><div data-set=cats></div><button type="button" class="dc-btn sm" data-set=add>＋ 新增類別</button><div class="dc-scroll" style="max-height:300px;margin-top:12px"><table class="dc-table"><thead><tr><th>代碼</th><th>說明</th><th>類別</th></tr></thead><tbody data-set=codes></tbody></table></div></div>',
      [{ text: '還原預設', cls: 'l', fn: function () { cfg = defaultCfg(); save('wf.dc.cfg', cfg); audit('還原類別設定', '預設七類'); renderAll(); toast('已還原預設類別', true); } }, { text: '取消' }, { text: '儲存', cls: 'pri', fn: function () {
        var bad = work.order.some(function (id) { return !String(work.names[id] || '').trim(); }); if (bad) { toast('類別名稱不可留空'); return false; }
        cfg = work; save('wf.dc.cfg', cfg); audit('調整類別設定', work.order.length + ' 個類別'); renderAll(); toast('類別設定已儲存', true);
      } }]).el;
    m.querySelector('.wf-modal').style.maxWidth = '760px';
    function paint() {
      var box = $('[data-set=cats]', m); box.innerHTML = '';
      work.order.forEach(function (id) {
        var row = h('<div class="dc-setrow"><input value="' + esc(work.names[id] || '') + '" placeholder="類別名稱"><span class="dc-muted">' + Object.keys(work.map).filter(function (c) { return work.map[c] === id; }).length + ' 個代碼</span><button type="button" class="dc-btn sm ghost">刪除</button></div>');
        $('input', row).addEventListener('input', function (e) { work.names[id] = e.target.value; refreshSelects(); });
        $('button', row).addEventListener('click', function () { work.order = work.order.filter(function (x) { return x !== id; }); Object.keys(work.map).forEach(function (c) { if (work.map[c] === id) delete work.map[c]; }); paint(); });
        box.appendChild(row);
      });
      var tb = $('[data-set=codes]', m); tb.innerHTML = '';
      dCodes().forEach(function (c) {
        var tr = h('<tr><td><b>' + c + '</b></td><td>' + esc(D.codes[c].d) + '</td><td><select></select></td></tr>'), sel = $('select', tr);
        sel.innerHTML = '<option value="">未分類</option>' + work.order.map(function (id) { return '<option value="' + id + '"' + (work.map[c] === id ? ' selected' : '') + '>' + esc(work.names[id] || '（未命名）') + '</option>'; }).join('');
        sel.addEventListener('change', function () { if (sel.value) work.map[c] = sel.value; else delete work.map[c]; paint(); });
        tb.appendChild(tr);
      });
    }
    function refreshSelects() { $$('[data-set=codes] select', m).forEach(function (sel, i) { var c = dCodes()[i]; Array.prototype.forEach.call(sel.options, function (o) { if (o.value) o.textContent = work.names[o.value] || '（未命名）'; }); }); }
    $('[data-set=add]', m).addEventListener('click', function () { var id = 'c' + (++seq) + Date.now() % 1000; work.order.push(id); work.names[id] = ''; paint(); var ins = $$('[data-set=cats] input', m); ins[ins.length - 1].focus(); });
    paint();
  }

  /* ---------- wiring ---------- */
  function renderAll() { renderKpi(); renderChart(); renderDrill(); renderTable(); renderLevels(); renderLate(); renderD140(); }
  /* 年度 filter: multi-select dropdown (tick several years to compare them; default is the current year only) */
  var yearPick = null;
  function setYearCombo() {
    if (!yearPick) {
      var old = $('[data-testid=discipline-year]'); if (!old) return;
      var cb = old.parentElement, wrap = h('<div style="position:relative;display:inline-block"><button type="button" data-testid="discipline-year" aria-haspopup="listbox" class="shadow-sm outline-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-9 text-sm text-slate-800" style="min-width:150px;text-align:left;cursor:pointer;position:relative"><span data-yr-text></span><span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:10px;color:#64748b">&#9660;</span></button></div>');
      cb.replaceWith(wrap); yearPick = wrap;
      var btn = $('button', wrap), pop = null;
      function close() { if (pop) { pop.remove(); pop = null; } }
      btn.addEventListener('click', function (e) {
        e.stopPropagation(); if (pop) return close();
        pop = h('<div class="wf-pop wf-list" role="listbox" style="min-width:210px;padding:8px"></div>');
        pop.addEventListener('click', function (ev) { ev.stopPropagation(); });
        YEARS.forEach(function (k) {
          var row = h('<label class="wf-opt" style="display:flex;align-items:center;gap:8px"><input type="checkbox"' + (state.years.indexOf(k) >= 0 ? ' checked' : '') + '><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:' + yColor(k) + '"></span>' + esc(D.years[k].label) + '</label>');
          $('input', row).addEventListener('change', function (ev) {
            var sel = YEARS.filter(function (z) { return z === k ? ev.target.checked : state.years.indexOf(z) >= 0; });
            if (!sel.length) { ev.target.checked = true; return toast('至少需選擇一個學年'); }
            setYears(sel); state.sel = null; setYearCombo(); audit('切換學年', yearsText()); renderAll();
          });
          pop.appendChild(row);
        });
        wrap.appendChild(pop);
      });
      document.addEventListener('click', close);
    }
    $('[data-yr-text]', yearPick).textContent = state.years.length > 1 ? state.years.map(shortLabel).join('、') + '（' + state.years.length + ' 學年）' : D.years[state.year].label;
  }
  function init() {
    var tc = $('[data-testid=discipline-category]');
    setYearCombo();
    if (tc) tc.parentElement.addEventListener('wf:change', function (e) { state.type = ['A', 'D', 'S'][+e.detail]; state.sel = null; audit('切換類別', ['加分項', '減分項', '獎項'][+e.detail]); renderAll(); });
    var reset = $('[data-dc=reset]'); if (reset) reset.addEventListener('click', function () {
      setYears([LATEST]); state.type = 'D'; state.mode = 'code'; state.sel = null; setYearCombo(); if (md) md.value = 'code'; if (mw) mw.style.display = 'flex';
      var cs = $('[data-testid=discipline-category]'); if (cs) { cs.value = '1'; cs.parentElement.setAttribute('data-value', '1'); $('input', cs.parentElement).value = '減分項'; }
      renderAll();
    });
    var md = $('[data-dc=mode]'), mw = $('[data-dc=mode-wrap]');
    function syncMode() { if (mw) mw.style.display = state.type === 'D' ? 'flex' : 'none'; if (md) md.value = state.mode; }
    if (md) md.addEventListener('change', function () { state.mode = md.value; state.sel = null; audit('切換統計方式', md.options[md.selectedIndex].text); renderAll(); });
    if (tc) tc.parentElement.addEventListener('wf:change', syncMode);
    syncMode();
    var set = $('[data-dc=settings]'); if (set) set.addEventListener('click', openSettings);
    $$('[data-dc-export]').forEach(function (b) { b.addEventListener('click', function () { ({ image: exportImage, pdf: exportPdf, excel: exportExcel })[b.getAttribute('data-dc-export')](); }); });
    var ex2 = $('[data-dc=export-table]'); if (ex2) ex2.addEventListener('click', exportExcel);
    audit('開啟訓導紀錄分析', '角色：訓導主任');
    renderAll(); renderAudit();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
