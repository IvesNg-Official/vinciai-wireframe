/* VinciOS wireframe interactions — static, no backend. Edit freely.
   Loaded by every page together with wf-icons.js. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var ICONS = window.WF_ICONS || {};

  /* ---------- routing ---------- */
  var ROUTES = {
    '/': 'home.html',
    '/management/timeslots': 'management-timeslots.html',
    '/calendar/day-system': 'calendar-day-system.html',
    '/calendar/new': 'calendar-new.html',
    '/lms/timetable': 'lms-timetable.html',
    '/management/import-center': 'management-import-center.html'
  };
  var file = decodeURIComponent(location.pathname.split('/').pop() || '');
  var PAGE = { 'home.html': 'home', 'management-timeslots.html': 'timeslots', 'calendar-day-system.html': 'daysystem', 'calendar-new.html': 'newevent', 'calendar-edit.html': 'editevent', 'lms-timetable.html': 'timetable', 'management-import-center.html': 'importcenter' }[file] || '';

  /* ---------- helpers ---------- */
  function h(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseISO(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function fmtDate(s) { var d = parseISO(s); return d ? pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() : ''; }
  function parseDMY(s) { var m = /^\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\s*$/.exec(s || ''); if (!m) return ''; var d = new Date(+m[3], +m[2] - 1, +m[1]); return d.getMonth() === +m[2] - 1 ? iso(d) : ''; }
  function fmtTime(v) { var m = /^(\d{1,2}):(\d{2})$/.exec(v || ''); if (!m) return ''; var hh = +m[1]; return (hh < 12 ? '上午' : '下午') + (hh % 12 || 12) + ':' + m[2]; }
  function parseTime(s) {
    var m = /(\d{1,2})\s*[:：]\s*(\d{2})/.exec(s || ''); if (!m) return '';
    var hh = +m[1], mm = +m[2]; if (/下午|pm/i.test(s) && hh < 12) hh += 12; if (/上午|am/i.test(s) && hh === 12) hh = 0;
    return hh < 24 && mm < 60 ? pad(hh) + ':' + pad(mm) : '';
  }
  var WD = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  function store(key, def) { try { return JSON.parse(localStorage.getItem(key)) || def; } catch (e) { return def; } }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { } }
  function excText(x) { return x.mode === 'day' ? '指定日序：Day ' + x.day : x.mode === 'suspend' ? '停課' + (x.count === 'count' ? '（計入循環）' : x.count === 'skip' ? '（不計入循環）' : '') : '不計循環'; }

  var css = document.createElement('style');
  css.textContent =
    '.wf-pop{position:absolute;z-index:1000;background:#fff;border:1px solid #e0e7ff;border-radius:12px;box-shadow:0 10px 25px rgba(30,41,59,.15);font-size:14px;color:#0f172a;text-align:left}' +
    '.wf-list{top:100%;left:0;margin-top:4px;min-width:100%;max-height:240px;overflow:auto;padding:4px}' +
    '.wf-opt{padding:7px 12px;border-radius:8px;cursor:pointer;white-space:nowrap}.wf-opt:hover,.wf-opt.on{background:#eef2ff}.wf-opt.on{font-weight:600;color:#4338ca}' +
    '.wf-toast{pointer-events:auto;background:#1e293b;color:#fff;border-radius:12px;padding:10px 16px;font-size:14px;box-shadow:0 10px 25px rgba(0,0,0,.2);max-width:360px}.wf-toast.ok{background:#047857}' +
    '.wf-mask{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px}' +
    '.wf-modal{background:#fff;border-radius:16px;width:100%;max-width:440px;box-shadow:0 20px 50px rgba(0,0,0,.25);padding:20px;max-height:90vh;overflow:auto;color:#0f172a;font-size:14px}' +
    '.wf-modal h3{font-size:16px;font-weight:700;margin:0 0 14px}.wf-f{margin-bottom:12px}.wf-f label{display:block;font-size:13px;font-weight:500;color:#334155;margin-bottom:4px}' +
    '.wf-f input,.wf-f select{width:100%;border:1px solid #e2e8f0;background:#f8fafc;border-radius:12px;padding:9px 12px;font-size:14px;outline:none}.wf-f input:focus,.wf-f select:focus{border-color:#818cf8;box-shadow:0 0 0 2px #e0e7ff}' +
    '.wf-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.wf-acts{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}' +
    '.wf-btn{border:1px solid #e2e8f0;background:#fff;color:#475569;border-radius:12px;padding:8px 16px;font-size:14px;cursor:pointer}.wf-btn:hover{background:#f8fafc}' +
    '.wf-btn.pri{background:#4f46e5;border-color:#4f46e5;color:#fff}.wf-btn.pri:hover{background:#4338ca}.wf-btn.dng{background:#dc2626;border-color:#dc2626;color:#fff}.wf-btn.l{margin-right:auto;color:#b91c1c;border-color:#fecaca}' +
    '.wf-chip{display:inline-flex;align-items:center;gap:4px;background:#e0e7ff;color:#3730a3;border-radius:999px;padding:2px 4px 2px 10px;font-size:12px}.wf-chip b{cursor:pointer;font-weight:400;padding:0 4px;border-radius:999px}.wf-chip b:hover{background:#c7d2fe}' +
    '.wf-err{color:#dc2626;font-size:12px;margin-top:4px}.wf-info{background:#eef2ff;border:1px solid #c7d2fe;color:#3730a3;border-radius:12px;padding:10px 16px;font-size:14px;margin-bottom:16px}' +
    '.wf-day{border-radius:8px;padding:6px 0;font-size:14px;cursor:pointer;border:0;background:transparent}.wf-day:hover{background:#eef2ff}.wf-day.sel{background:#4f46e5;color:#fff;font-weight:600}.wf-day.today{outline:1px solid #818cf8}' +
    '.wf-msg{max-width:85%;border-radius:16px;padding:10px 14px;font-size:14px;line-height:1.55;white-space:pre-wrap}.wf-msg.u{align-self:flex-end;background:linear-gradient(90deg,#4f46e5,#7c3aed);color:#fff}.wf-msg.a{align-self:flex-start;background:#fff;border:1px solid #e0e7ff;color:#1e293b}' +
    'a.wf-active,button.wf-active{background:rgba(255,255,255,.15)!important;color:#fff!important}';
  document.head.appendChild(css);

  function toast(msg, ok) {
    var box = $('div.fixed.right-4.top-4') || document.body.appendChild(h('<div style="position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px"></div>'));
    var t = h('<div class="wf-toast' + (ok ? ' ok' : '') + '">' + esc(msg) + '</div>'); box.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }
  function modal(title, body, buttons) {
    var mask = h('<div class="wf-mask"><div class="wf-modal" role="dialog" aria-modal="true"><h3>' + esc(title) + '</h3><div class="wf-body">' + body + '</div><div class="wf-acts"></div></div></div>');
    var acts = $('.wf-acts', mask);
    function close() { mask.remove(); }
    (buttons || [{ text: '關閉' }]).forEach(function (b) {
      var btn = h('<button type="button" class="wf-btn ' + (b.cls || '') + '">' + esc(b.text) + '</button>');
      btn.onclick = function () { if (!b.fn || b.fn(mask) !== false) close(); };
      acts.appendChild(btn);
    });
    mask.addEventListener('mousedown', function (e) { if (e.target === mask) close(); });
    document.body.appendChild(mask);
    var first = $('input,select', mask); if (first) first.focus();
    return { el: mask, close: close };
  }
  function confirmBox(title, text, okText, fn) { modal(title, '<p style="color:#475569">' + esc(text) + '</p>', [{ text: '取消' }, { text: okText || '確定', cls: 'dng', fn: fn }]); }
  function val(root, name) { var e = $('[name=' + name + ']', root); return e ? e.value.trim() : ''; }

  /* ---------- popups: close on outside click / Esc ---------- */
  var openPop = null;
  function closePop() { if (openPop) { if (openPop.owner) openPop.owner.setAttribute('aria-expanded', 'false'); openPop.el.remove(); openPop = null; } }
  function showPop(el, host, owner) { closePop(); host.appendChild(el); openPop = { el: el, host: host, owner: owner }; if (owner) owner.setAttribute('aria-expanded', 'true'); }
  document.addEventListener('mousedown', function (e) { if (openPop && !openPop.el.contains(e.target) && !openPop.host.contains(e.target)) closePop(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closePop(); var m = $('.wf-mask'); if (m) m.remove(); } });

  /* ---------- sidebar ---------- */
  var GROUPS = {
    '人員': [['/management/students', '學生', 'student'], ['/management/teachers', '教職員', 'staff'], ['/management/classes', '班別', 'class'], ['/management/roles', '角色與權限', 'staff']],
    '課程內容': [['/management/subjects', '科目', 'category'], ['/management/courses', '課程', 'store']],
    '營運': [['/management/expenses', '支出', 'expenses'], ['/management/expenses/pools', '預算池', 'data hub'], ['/management/adminsmart', '校政', 'data hub'], ['/management/admin-documents', '校政文件庫', 'data hub'], ['/management/audit-log', '審計日誌', 'history'], ['/management/welfare-access', '輔導個案權限', 'admin'], ['/management/case-event-categories', '訓導事件類別', 'admin'], ['/management/roadmap', '產品藍圖', 'data hub']],
    '時間表編排': [['/management/timetables', '時間表', 'history'], ['/management/timeslots', '時段', 'data hub'], ['/management/rooms', '課室', 'data hub'], ['/management/academic-years', '學年', 'data hub']],
    'AI 應用': [['/faculty/config', '商店', 'store'], ['/management/faculty-categories', '類別', 'category']],
    '工具': [['/management/import-center', '數據導入中心', 'import'], ['/management/data-export', '資料匯出', 'export'], ['/management/data-view', '資料檢視', 'data hub'], ['/management/system-update', '系統更新', 'setting'], ['/management/system-backup', '系統備份', 'data hub'], ['/management/settings/ai-paper-reading', 'AI 讀卷', 'ai']]
  };
  var LINK_CLS = 'flex w-full items-center space-x-3 rounded-xl p-2 text-sm text-indigo-100/80 transition hover:bg-white/10 hover:text-white';
  function maskStyle(name) {
    var u = 'url(' + (ICONS[name] || '') + ')';
    return '-webkit-mask-image:' + u + ';mask-image:' + u + ';-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;-webkit-mask-size:contain;mask-size:contain';
  }
  function currentRoute() { return { timeslots: '/management/timeslots', importcenter: '/management/import-center' }[PAGE] || ''; }
  function setGroup(btn, open) {
    var wrap = btn.parentElement, name = $('span.flex span:last-child', btn).textContent.trim(), sub = $('.wf-sub', wrap);
    $('.text-xs', btn).textContent = open ? '-' : '+';
    if (!open) { if (sub) sub.remove(); return; }
    if (sub) return;
    sub = h('<div class="wf-sub mt-2 space-y-1 border-l border-white/10 pl-3"></div>');
    (GROUPS[name] || []).forEach(function (g) {
      var a = h('<a class="' + LINK_CLS + '" href="' + g[0] + '"><span class="h-5 w-5 shrink-0 bg-current " aria-hidden="true" style="' + maskStyle(g[2]) + '"></span><span>' + esc(g[1]) + '</span></a>');
      if (g[0] === currentRoute()) a.classList.add('wf-active');
      sub.appendChild(a);
    });
    wrap.appendChild(sub);
  }
  function initChrome() {
    var aside = $('aside');
    if (aside) {
      $$('button', aside).forEach(function (b) {
        if (!/[+-]$/.test(b.textContent.trim())) return;
        var nativeSub = $(':scope > div.border-l', b.parentElement);
        if (nativeSub) { nativeSub.classList.add('wf-sub'); var na = $('a[href="' + currentRoute() + '"]', nativeSub); if (na) na.classList.add('wf-active'); }
        b.addEventListener('click', function () { setGroup(b, !$('.wf-sub', b.parentElement)); });
        var name = $('span.flex span:last-child', b).textContent.trim();
        if ((GROUPS[name] || []).some(function (g) { return g[0] === currentRoute(); })) setGroup(b, true);
      });
      var cal = $('a[href="/calendar"]', aside);
      if (cal && (PAGE === 'daysystem' || PAGE === 'newevent')) cal.classList.add('wf-active');
      var home = $('a[href="/"]', aside); if (home && PAGE === 'home') home.classList.add('wf-active');
      var tt = $('[data-testid=nav-timetable]', aside); if (tt && PAGE === 'timetable') tt.classList.add('wf-active');
    }
    var toggle = $('[data-testid=nav-toggle]');
    if (toggle && aside) toggle.addEventListener('click', function () {
      var open = aside.getAttribute('data-open') === 'true'; aside.setAttribute('data-open', open ? 'false' : 'true');
      [['position', 'fixed'], ['top', '0'], ['bottom', '0'], ['left', '0'], ['z-index', '60'], ['display', 'flex']].forEach(function (p) { if (open) aside.style.removeProperty(p[0]); else aside.style.setProperty(p[0], p[1]); });
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
    var bell = $('button[aria-label=通知]');
    if (bell) bell.addEventListener('click', function () {
      if (openPop && openPop.owner === bell) return closePop();
      showPop(h('<div role="menu" class="wf-pop" style="right:0;top:100%;margin-top:8px;width:260px;padding:16px;color:#64748b">暫無新通知。</div>'), bell.parentElement, bell);
    });
    var um = $('button[aria-label=使用者選單]');
    if (um) um.addEventListener('click', function () {
      if (openPop && openPop.owner === um) return closePop();
      var m = h('<div role="menu" class="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-indigo-100 bg-white/95 shadow-lg" style="z-index:1000"><a role="menuitem" class="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href="/settings">設定</a><button type="button" role="menuitem" class="block w-full px-4 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50" data-wf-logout>登出</button></div>');
      showPop(m, um.parentElement, um);
    });
  }

  /* ---------- comboboxes (native-select mirror) ---------- */
  function initComboboxes() { $$('[data-combobox]').forEach(initCombobox); }
  function initCombobox(cb) {
    {
      var input = $('input', cb), btn = $('button', cb), sel = $('select', cb);
      if (!input || !sel) return;
      input.readOnly = true; input.style.cursor = 'pointer';
      function toggle() {
        if (openPop && openPop.owner === input) return closePop();
        var list = h('<div class="wf-pop wf-list" role="listbox"></div>');
        $$('option', sel).forEach(function (o) {
          var label = o.textContent.replace(/\s+/g, ' ').trim();
          var on = o.value === sel.value, item = h('<div class="wf-opt' + (on ? ' on' : '') + '" role="option">' + esc(label) + (on ? '<span style="float:right;margin-left:16px;color:#4f46e5">✓</span>' : '') + '</div>');
          item.onmousedown = function (e) {
            e.preventDefault(); sel.value = o.value; cb.setAttribute('data-value', o.value);
            input.value = o.value === '' ? '' : label; closePop();
            cb.dispatchEvent(new CustomEvent('wf:change', { bubbles: true, detail: o.value }));
          };
          list.appendChild(item);
        });
        showPop(list, cb, input);
      }
      input.addEventListener('click', toggle); if (btn) btn.addEventListener('click', toggle);
      if (input.getAttribute('aria-label') === '語言') cb.addEventListener('wf:change', function () {
        toast('線框圖僅提供繁體中文介面'); sel.value = 'zh-Hant'; cb.setAttribute('data-value', 'zh-Hant'); input.value = '🇭🇰 繁體中文';
      });
    }
  }

  /* ---------- date / time fields ---------- */
  function initDateTime() {
    $$('[data-datefield]').forEach(function (f) {
      var input = $('input[type=text]', f), mirror = $('[data-datefield-mirror]', f), btn = $('button', f);
      function set(v) { f.setAttribute('data-value', v); mirror.value = v; input.value = fmtDate(v); f.dispatchEvent(new CustomEvent('wf:change', { bubbles: true })); }
      input.addEventListener('blur', function () { set(parseDMY(input.value)); });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') set(parseDMY(input.value)); });
      function open() {
        if (openPop && openPop.owner === input) return closePop();
        var cur = parseISO(f.getAttribute('data-value')) || new Date(), y = cur.getFullYear(), m = cur.getMonth();
        var pop = h('<div class="wf-pop" role="dialog" aria-label="開啟日曆" style="top:100%;left:0;margin-top:4px;width:17.5rem;padding:12px"></div>');
        function draw() {
          var first = new Date(y, m, 1), lead = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(), sel = f.getAttribute('data-value'), today = iso(new Date());
          var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><button type="button" class="wf-btn" data-nav="-1" style="padding:2px 10px" aria-label="上一個月">‹</button><div style="font-weight:500">' + y + '年' + (m + 1) + '月</div><button type="button" class="wf-btn" data-nav="1" style="padding:2px 10px" aria-label="下一個月">›</button></div>';
          html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center;font-size:12px;color:#64748b">' + ['週一', '週二', '週三', '週四', '週五', '週六', '週日'].map(function (d) { return '<div style="padding:4px 0">' + d + '</div>'; }).join('') + '</div>';
          html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center">';
          for (var i = 0; i < lead; i++) html += '<div></div>';
          for (var d = 1; d <= days; d++) { var id = y + '-' + pad(m + 1) + '-' + pad(d); html += '<button type="button" class="wf-day' + (id === sel ? ' sel' : '') + (id === today ? ' today' : '') + '" data-iso="' + id + '">' + d + '</button>'; }
          pop.innerHTML = html + '</div>';
          $$('[data-nav]', pop).forEach(function (b) { b.onmousedown = function (e) { e.preventDefault(); m += +b.getAttribute('data-nav'); if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } draw(); }; });
          $$('[data-iso]', pop).forEach(function (b) { b.onmousedown = function (e) { e.preventDefault(); set(b.getAttribute('data-iso')); closePop(); }; });
        }
        draw(); showPop(pop, f, input);
      }
      input.addEventListener('click', open); btn.addEventListener('click', open);
    });
    $$('[data-timefield]').forEach(function (f) {
      var input = $('input[type=text]', f), mirror = $('[data-timefield-mirror]', f), btn = $('button', f);
      function set(v) { f.setAttribute('data-value', v); mirror.value = v; input.value = fmtTime(v); f.dispatchEvent(new CustomEvent('wf:change', { bubbles: true })); }
      input.addEventListener('blur', function () { set(parseTime(input.value)); });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') set(parseTime(input.value)); });
      function open() {
        if (openPop && openPop.owner === input) return closePop();
        var list = h('<div class="wf-pop wf-list" role="listbox"></div>'), cur = f.getAttribute('data-value');
        for (var mins = 0; mins < 1440; mins += 30) {
          (function (v) {
            var it = h('<div class="wf-opt' + (v === cur ? ' on' : '') + '" role="option">' + fmtTime(v) + '</div>');
            it.onmousedown = function (e) { e.preventDefault(); set(v); closePop(); }; list.appendChild(it);
          })(pad(Math.floor(mins / 60)) + ':' + pad(mins % 60));
        }
        showPop(list, f, input);
        var on = $('.on', list); if (on) list.scrollTop = on.offsetTop - 80;
      }
      input.addEventListener('click', open); btn.addEventListener('click', open);
    });
  }

  /* ---------- chips (tags / people) ---------- */
  function chips(inputEl, max, maxLen) {
    var box = inputEl.parentElement, items = [];
    function render() {
      $$('.wf-chip', box).forEach(function (c) { c.remove(); });
      items.forEach(function (t, i) {
        var c = h('<span class="wf-chip">' + esc(t) + '<b title="移除">×</b></span>');
        $('b', c).onclick = function () { items.splice(i, 1); render(); };
        box.insertBefore(c, inputEl);
      });
    }
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault(); var t = inputEl.value.trim().slice(0, maxLen);
        if (!t) return; if (items.indexOf(t) >= 0) { inputEl.value = ''; return; }
        if (items.length >= max) return toast('最多 ' + max + ' 個');
        items.push(t); inputEl.value = ''; render();
      } else if (e.key === 'Backspace' && !inputEl.value && items.length) { items.pop(); render(); }
    });
    return { get: function () { return items.slice(); }, reset: function () { items = []; inputEl.value = ''; render(); } };
  }

  /* ---------- page: new event ---------- */
  function initNewEvent() {
    var EDIT = PAGE === 'editevent';
    var title = $$('label').filter(function (l) { return l.textContent.trim() === '標題'; })[0].parentElement.querySelector('input'), desc = $('textarea'), type = $('#combobox-_r_0_').parentElement.querySelector('select'),
      scope = $('[data-testid=event-scope]'), tags = chips($('[data-testid=event-tags-input]'), 10, 40);
    var radios = $$('input[name=event-scope-scope]');
    var panel = h('<div style="margin-top:4px"></div>'); scope.appendChild(panel);
    var people = null, classSel = null;
    function paintScope() {
      var v = radios.filter(function (r) { return r.checked; })[0].value;
      radios.forEach(function (r) {
        r.parentElement.className = r.parentElement.className.replace(/border-indigo-400 bg-indigo-50 text-indigo-800|border-slate-200 bg-white text-slate-700/, r.checked ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-700');
      });
      panel.innerHTML = '';
      if (v === 'class') {
        panel.innerHTML = '<div class="wf-f" style="margin:0"><select name="cls" style="width:100%;border:1px solid #e2e8f0;background:#f8fafc;border-radius:12px;padding:10px 14px;font-size:14px"><option value="">選擇班別…</option>' + ['1A', '1B', '1C', '2A', '2B', '2C', '3A', '3B', '3C', '4A', '4B', '5A', '5B', '6A', '6B'].map(function (c) { return '<option>中' + c.replace(/^(\d)/, function (d) { return '一二三四五六'[d - 1]; }) + '</option>'; }).join('') + '</select></div>';
        classSel = $('select', panel);
      } else if (v === 'people') {
        panel.innerHTML = '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:12px;padding:6px 12px;min-height:44px"><input placeholder="輸入姓名後按 Enter" style="flex:1;min-width:10rem;background:transparent;outline:none;font-size:14px;padding:4px 0"></div>';
        people = chips($('input', panel), 50, 40);
      }
    }
    radios.forEach(function (r) { r.addEventListener('change', paintScope); });
    function paintToggle(label, on) {
      var k = $('div.relative', label), d = $('div', k);
      k.className = k.className.replace(/bg-slate-200|bg-indigo-600/, on ? 'bg-indigo-600' : 'bg-slate-200');
      d.style.transform = on ? 'translateX(1.25rem)' : '';
    }
    var toggleLabel = $$('label').filter(function (l) { return l.textContent.trim() === '全日'; })[0], allDay = false;
    var timeFields = $$('[data-timefield]');
    toggleLabel.addEventListener('click', function (e) {
      e.preventDefault(); allDay = !allDay; paintToggle(toggleLabel, allDay);
      timeFields.forEach(function (f) { f.parentElement.style.display = allDay ? 'none' : ''; });
    });

    /* 加入例外 toggle + 例外 section (mirrors /calendar/day-system/37/exceptions/new) */
    var excLabel = toggleLabel.cloneNode(true), excOn = false, excMode = 'none', excReason = '', excDay = '1', excCount = 'default';
    $('span', excLabel).textContent = '加入例外';
    toggleLabel.parentElement.insertBefore(excLabel, toggleLabel);
    var excSec = h('<div class="grid grid-cols-1 gap-4 sm:grid-cols-2" style="display:none"><div><label class="mb-1 block text-sm font-medium text-slate-700">例外</label><div data-exc-left></div></div><div class="flex flex-col gap-4" data-exc-right></div></div>');
    toggleLabel.parentElement.insertBefore(excSec, toggleLabel);
    var typeCbEl = $('#combobox-_r_0_').parentElement;
    function makeCombobox(id, opts, value) {
      var cb = typeCbEl.cloneNode(true), inp = $('input', cb), sel = $('select', cb), cur = opts.filter(function (o) { return o[0] === value; })[0];
      inp.id = id; sel.innerHTML = opts.map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + '</option>'; }).join(''); sel.value = value;
      cb.setAttribute('data-value', value); inp.value = cur[1]; $('span', cb).textContent = opts.slice().sort(function (a, b) { return b[1].length - a[1].length; })[0][1];
      initCombobox(cb); return cb;
    }
    var FIELD = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';
    var excCb = makeCombobox('combobox-exception', [['none', '不計循環'], ['day', '指定日序'], ['suspend', '停課']], 'none');
    $('[data-exc-left]', excSec).appendChild(excCb);
    function paintExc() {
      var right = $('[data-exc-right]', excSec);
      right.innerHTML = '<div><label class="mb-1 block text-sm font-medium text-slate-700">原因（可留空）</label><input data-exc-reason placeholder="例如：陸運會、颱風停課" class="' + FIELD + '" type="text"></div>';
      var reason = $('[data-exc-reason]', right); reason.value = excReason; reason.addEventListener('input', function () { excReason = reason.value; });
      if (excMode === 'day') {
        right.appendChild(h('<div><label class="mb-1 block text-sm font-medium text-slate-700">Day</label><input data-exc-day class="' + FIELD + '" type="number" min="1" max="6" step="1"></div>'));
        var d = $('[data-exc-day]', right); d.value = excDay; d.addEventListener('input', function () { excDay = d.value; err(d, ''); });
      } else if (excMode === 'suspend') {
        var wrap = h('<div><label class="mb-1 block text-sm font-medium text-slate-700">是否計入循環</label></div>');
        var c = makeCombobox('combobox-exception-count', [['default', '依學校預設 — 停課（不計循環）'], ['count', '計入循環'], ['skip', '不計入循環']], excCount);
        c.addEventListener('wf:change', function (e) { excCount = e.detail; }); wrap.appendChild(c); right.appendChild(wrap);
      }
    }
    excCb.addEventListener('wf:change', function (e) { excMode = e.detail; paintExc(); });
    excLabel.addEventListener('click', function (e) {
      e.preventDefault(); excOn = !excOn; paintToggle(excLabel, excOn); excSec.style.display = excOn ? '' : 'none'; if (excOn) paintExc();
    });
    function err(el, msg) { var old = el.parentElement.querySelector('.wf-err'); if (old) old.remove(); if (msg) { el.parentElement.appendChild(h('<p class="wf-err">' + esc(msg) + '</p>')); } return !msg; }
    var startD = $$('[data-datefield]')[0], endD = $$('[data-datefield]')[1];
    $$('button').filter(function (b) { return /^(建立活動|儲存變更)$/.test(b.textContent.trim()); })[0].addEventListener('click', function () {
      var ok = true, s = startD.getAttribute('data-value'), e = endD.getAttribute('data-value'), st = timeFields[0].getAttribute('data-value'), et = timeFields[1].getAttribute('data-value');
      ok = err(title, title.value.trim() ? '' : '請輸入活動標題') && ok;
      ok = err(startD, s ? '' : '請選擇開始日期') && ok;
      if (e && s && e < s) ok = err(endD, '結束日期不可早於開始日期') && ok; else err(endD, '');
      if (!allDay && (!e || e === s) && st && et && et <= st) ok = err(timeFields[1], '結束時間須遲於開始時間') && ok; else err(timeFields[1], '');
      var sc = radios.filter(function (r) { return r.checked; })[0].value;
      if (sc === 'class' && !classSel.value) { toast('請選擇班別'); ok = false; }
      if (sc === 'people' && !people.get().length) { toast('請至少加入一位人員'); ok = false; }
      if (excOn && excMode === 'day') { var dn = +excDay; if (!(dn >= 1 && dn <= 6 && dn % 1 === 0)) ok = err($('[data-exc-day]'), '請輸入 1–6 的日序') && ok; }
      if (!ok) return;
      if (EDIT) { // 編輯逐日例外所屬活動：寫回 wf.exceptions，然後回到校曆日制
        var recs = store('wf.exceptions', []), cur = recs.filter(function (r) { return String(r.id) === excId; })[0];
        if (cur && excOn) {
          Object.assign(cur, { title: title.value.trim(), description: desc.value.trim(), type: type.value, allDay: allDay, startTime: allDay ? '' : st, endTime: allDay ? '' : et,
            date: s, mode: excMode, day: excMode === 'day' ? +excDay : null, count: excMode === 'suspend' ? excCount : null, reason: excReason.trim() });
          toast('已儲存變更', true);
        } else if (cur) { recs = recs.filter(function (r) { return r !== cur; }); toast('已儲存變更；「加入例外」已關閉，逐日例外已移除', true); }
        else toast('已儲存變更（線框圖）', true);
        save('wf.exceptions', recs);
        if (cur) setTimeout(function () { location.href = 'calendar-day-system.html'; }, 900);
        return;
      }
      var ev = { title: title.value.trim(), description: desc.value.trim(), type: type.value, scope: sc, tags: tags.get(), allDay: allDay, start: s, startTime: allDay ? '' : st, end: e || s, endTime: allDay ? '' : et,
        exception: excOn ? { mode: excMode, reason: excReason.trim(), day: excMode === 'day' ? +excDay : null, count: excMode === 'suspend' ? excCount : null } : null };
      try { var all = JSON.parse(localStorage.getItem('wf.events') || '[]'); all.push(ev); localStorage.setItem('wf.events', JSON.stringify(all)); } catch (x) { }
      var added = 0;
      if (ev.exception) { // one 逐日例外 row per date of the event; shown on calendar-day-system.html
        var list = store('wf.exceptions', []), d = ev.start, stop = ev.end;
        for (var n = 0; d <= stop && n < 62; n++) {
          list.push({ id: Date.now() + '-' + n, date: d, mode: ev.exception.mode, day: ev.exception.day, count: ev.exception.count, reason: ev.exception.reason,
            title: ev.title, description: ev.description, type: ev.type, allDay: ev.allDay, startTime: ev.startTime, endTime: ev.endTime });
          var nx = parseISO(d); nx.setDate(nx.getDate() + 1); d = iso(nx); added++;
        }
        save('wf.exceptions', list);
      }
      toast('活動「' + ev.title + '」已建立' + (added ? '，並加入 ' + added + ' 筆逐日例外' : '') + '（線框圖：僅示範，不會儲存到伺服器）', true);
      title.value = ''; desc.value = ''; tags.reset();
    });
    title.addEventListener('input', function () { err(title, ''); });
    paintScope();

    /* edit page: opened from 逐日例外 → 編輯 (calendar-edit.html?exc=<id>) */
    var excId = new URLSearchParams(location.search).get('exc') || '';
    if (EDIT) {
      var recAll = store('wf.exceptions', []), rec = recAll.filter(function (r) { return String(r.id) === excId; })[0];
      var cancel = $$('a').filter(function (a) { return a.textContent.trim() === '取消'; })[0]; if (cancel) cancel.setAttribute('href', 'calendar-day-system.html');
      var delBtn = $$('button').filter(function (b) { return b.textContent.trim() === '刪除'; })[0];
      if (delBtn) delBtn.addEventListener('click', function () {
        confirmBox('刪除活動', '確定要刪除此活動嗎？', '刪除', function () {
          if (rec) save('wf.exceptions', store('wf.exceptions', []).filter(function (r) { return String(r.id) !== excId; }));
          toast('活動已刪除', true); setTimeout(function () { location.href = 'calendar-day-system.html'; }, 700);
        });
      });
      if (rec) {
        var clash = $('[data-testid=clash-warning]'); if (clash) clash.remove();
        function setCombo(cb, v) { var sel = $('select', cb), o = $$('option', sel).filter(function (x) { return x.value === v; })[0]; if (!o) return; sel.value = v; cb.setAttribute('data-value', v); $('input', cb).value = o.textContent.replace(/\s+/g, ' ').trim(); }
        function setText(field, text) { var i = $('input[type=text]', field); i.value = text; i.dispatchEvent(new Event('blur')); }
        title.value = rec.title || rec.reason || ''; desc.value = rec.description || '';
        setCombo(typeCbEl, rec.type || 'general');
        setText(startD, fmtDate(rec.date)); setText(endD, '');
        if (rec.allDay) toggleLabel.click(); else if (rec.startTime) { setText(timeFields[0], fmtTime(rec.startTime)); setText(timeFields[1], fmtTime(rec.endTime)); }
        excLabel.click(); // 加入例外 → 自動開啟
        excMode = rec.mode || 'none'; excReason = rec.reason || ''; excDay = String(rec.day || 1); excCount = rec.count || 'default';
        setCombo(excCb, excMode); paintExc();
      }
    }
  }

  /* ---------- page: timeslots (shows the 日序表 in place of the weekly timetable) ---------- */
  function initTimeslots() {
    var sec = $('[data-wf-dayseq]'), body = $('[data-testid=days-table] tbody', sec), WDN = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    var countEl = $$('span').filter(function (s) { return /個時段$/.test(s.textContent.trim()) && s.className.indexOf('text-xs') >= 0; })[0];
    var filterCb = $('[data-combobox]', countEl.parentElement), filterVal = '';
    var fromEl = $('[data-testid=days-from]'), toEl = $('[data-testid=days-to]'), weekdays = $('[data-testid=days-weekdays-only]');
    var model = $$('tr', body).map(function (r) { var c = $$('td', r); return { date: c[0].textContent.trim(), wd: c[1].textContent.trim(), result: c[2].textContent.trim(), bell: c[3].textContent.trim() }; });
    function addDays(s, n) { var d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); }
    // continue the Day cycle after the last captured row so the range can be extended
    var last = model[model.length - 1], mm = /Day (\d)／第 (\d+) 循環/.exec(model.slice().reverse().map(function (r) { return r.result; }).filter(function (x) { return /^Day /.test(x); })[0] || '');
    var dayNo = mm ? +mm[1] : 0, cycle = mm ? +mm[2] : 1;
    function extend(to) {
      var d = addDays(last.date, 1);
      while (d <= to) {
        var wd = parseISO(d).getDay();
        if (wd !== 0 && wd !== 6) { dayNo++; if (dayNo > 6) { dayNo = 1; cycle++; } model.push({ date: d, wd: WDN[wd], result: 'Day ' + dayNo + '／第 ' + cycle + ' 循環（' + (cycle % 2 ? '單' : '雙') + '）', bell: d <= '2026-12-31' ? '夏令' : '—' }); }
        last = model[model.length - 1] || last; d = addDays(d, 1);
      }
      last = model[model.length - 1];
    }
    function rowHTML(r) {
      return '<tr class="transition-colors hover:bg-blue-50/40" data-testid="day-row-' + r.date + '"><td class="px-5 py-3 font-medium text-slate-900">' + r.date + '</td><td class="px-5 py-3 text-slate-600">' + r.wd + '</td><td class="px-5 py-3 text-slate-800" data-testid="day-result">' + esc(r.result) + '</td><td class="px-5 py-3 text-slate-600" data-testid="day-bell">' + esc(r.bell) + '</td></tr>';
    }
    function rows() {
      var from = fromEl.value, to = toEl.value; if (!from || !to) { toast('請選擇日期範圍'); return null; }
      if (to < from) { toast('結束日期不可早於開始日期'); return null; }
      if (to > last.date) extend(to);
      var out = model.filter(function (r) { return r.date >= from && r.date <= to; });
      if (!weekdays.checked) {
        for (var d = from; d <= to; d = addDays(d, 1)) { var w = parseISO(d).getDay(); if ((w === 0 || w === 6) && !out.some(function (r) { return r.date === d; })) out.push({ date: d, wd: WDN[w], result: '不上課', bell: '—' }); }
        out.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      } else out = out.filter(function (r) { var w = parseISO(r.date).getDay(); return w !== 0 && w !== 6; });
      return out;
    }
    function render() {
      var out = rows(); if (!out) return;
      body.innerHTML = out.length ? out.map(rowHTML).join('') : '<tr><td class="px-5 py-6 text-slate-500" colspan="4">暫無資料。</td></tr>';
      applyFilter();
    }
    function applyFilter() {
      var n = 0; $$('tr[data-testid^=day-row]', body).forEach(function (r) {
        var show = !filterVal || new RegExp('^Day ' + filterVal + '／').test($('[data-testid=day-result]', r).textContent);
        r.style.display = show ? '' : 'none'; if (show) n++;
      });
      countEl.textContent = n + ' 日';
    }
    filterCb.addEventListener('wf:change', function (e) { filterVal = e.detail; applyFilter(); });
    $('[data-testid=days-show]').addEventListener('click', render);
    weekdays.addEventListener('change', render);
    $('[data-testid=days-download]').addEventListener('click', function () {
      var out = rows(); if (!out) return;
      var csv = '\ufeff日期,星期,日序,上課時間\n' + out.map(function (r) { return [r.date, r.wd, r.result, r.bell].map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'day-sequence_' + fromEl.value + '_' + toEl.value + '.csv';
      document.body.appendChild(a); a.click(); a.remove(); toast('已下載 CSV（' + out.length + ' 行）', true);
    });
    applyFilter();
  }
  /* ---------- page: day system ---------- */
  function initDaySystem() {
    var excBody = $('[data-testid=exceptions-table] tbody'), bellBody = $('[data-testid=bell-table] tbody'), notices = $('[data-testid=day-system-notices]');
    var excCount = $$('span').filter(function (s) { return /^逐日例外/.test(s.textContent.trim()); })[0], bellCount = $$('span').filter(function (s) { return /^上課時間/.test(s.textContent.trim()); })[0];
    var YEAR_END = '2027-08-31', bid = 100;
    function bellRows() { return $$('tr[data-testid^=bell-row]', bellBody); }
    function readBell(r) { var c = $$('td', r), range = c[1].textContent.split('至'), p = /(\d+)\s*節，(\S+)–(\S+)/.exec(c[2].textContent) || []; return { name: c[0].textContent.trim(), from: range[0].trim(), to: (range[1] || '').trim(), n: p[1] || '', s: p[2] || '', e: p[3] || '' }; }
    function bellHTML(id, b) {
      return '<tr class="transition-colors hover:bg-blue-50/40" data-testid="bell-row-' + id + '"><td class="px-5 py-3 font-medium text-slate-900">' + esc(b.name) + '</td><td class="px-5 py-3 text-slate-600">' + b.from + ' 至 ' + b.to + '</td><td class="px-5 py-3 text-slate-600">' + b.n + ' 節，' + b.s + '–' + b.e + '</td><td class="px-5 py-3"><div class="flex justify-end gap-2"><a class="rounded-lg border border-indigo-100 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50" data-testid="bell-edit" href="/calendar/day-system/37/bell-schedules/' + id + '/edit">編輯</a><button type="button" class="rounded-lg border border-red-100 px-3 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-50" data-testid="bell-delete">刪除</button></div></td></tr>';
    }
    function refreshBells() {
      var rows = bellRows(); bellCount.textContent = '上課時間（' + rows.length + '）';
      if (!rows.length) bellBody.innerHTML = '<tr><td class="px-5 py-6 text-slate-500" colspan="4">暫無上課時間。</td></tr>';
      var maxEnd = rows.map(function (r) { return readBell(r).to; }).sort().pop() || '', old = $('[data-testid=bell-gap-notice]', notices);
      if (old) old.remove();
      if (maxEnd < YEAR_END) {
        var d = parseISO(maxEnd || '2026-09-01'); if (maxEnd) d.setDate(d.getDate() + 1);
        notices.appendChild(h('<div class="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700" data-testid="bell-gap-notice">' + iso(d) + ' 起未有適用之上課時間</div>'));
      }
    }
    function bellForm(row) {
      var b = row ? readBell(row) : { name: '', from: '2027-01-04', to: YEAR_END, n: 5, s: '07:30', e: '11:05' };
      modal(row ? '編輯上課時間' : '新增上課時間',
        '<div class="wf-f"><label>名稱</label><input name="name" value="' + esc(b.name) + '"></div><div class="wf-row2"><div class="wf-f"><label>開始日期</label><input name="from" type="date" value="' + b.from + '"></div><div class="wf-f"><label>結束日期</label><input name="to" type="date" value="' + b.to + '"></div></div>' +
        '<div class="wf-row2"><div class="wf-f"><label>首節開始</label><input name="s" type="time" value="' + b.s + '"></div><div class="wf-f"><label>末節結束</label><input name="e" type="time" value="' + b.e + '"></div></div><div class="wf-f"><label>節數</label><input name="n" type="number" min="1" value="' + b.n + '"></div>',
        [{ text: '取消' }, {
          text: '儲存', cls: 'pri', fn: function (m) {
            var v = { name: val(m, 'name'), from: val(m, 'from'), to: val(m, 'to'), n: val(m, 'n'), s: val(m, 's'), e: val(m, 'e') }, er = $('.wf-err', m); if (er) er.remove();
            function bad(t) { $('.wf-body', m).appendChild(h('<p class="wf-err">' + t + '</p>')); return false; }
            if (!v.name) return bad('請輸入名稱'); if (!v.from || !v.to) return bad('請輸入適用日期'); if (v.to < v.from) return bad('結束日期不可早於開始日期'); if (!v.s || !v.e || v.e <= v.s) return bad('請輸入有效的上課時間');
            if (!bellRows().length) bellBody.innerHTML = '';
            var id = row ? /bell-row-(\d+)/.exec(row.getAttribute('data-testid'))[1] : ++bid, node = h('<table><tbody>' + bellHTML(id, v) + '</tbody></table>').querySelector('tr');
            if (row) row.replaceWith(node); else bellBody.appendChild(node);
            refreshBells(); toast(row ? '上課時間已更新' : '上課時間已新增', true);
          }
        }]);
    }
    function excStore() { return store('wf.exceptions', []); }
    function excRow(x) {
      return '<tr class="transition-colors hover:bg-blue-50/40" data-exc-id="' + x.id + '"><td class="px-5 py-3 font-medium text-slate-900">' + x.date + '</td><td class="px-5 py-3 text-slate-600">' + WD[parseISO(x.date).getDay()] + '</td><td class="px-5 py-3 text-slate-800">' + esc(excText(x)) + '</td><td class="px-5 py-3 text-slate-600">' + esc(x.reason || '—') + '</td><td class="px-5 py-3"><div class="flex justify-end gap-2"><button type="button" class="rounded-lg border border-indigo-100 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50" data-wf-exc-edit>編輯</button><button type="button" class="rounded-lg border border-red-100 px-3 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-50" data-wf-exc-del>刪除</button></div></td></tr>';
    }
    function renderExc() {
      excBody.innerHTML = excStore().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }).map(excRow).join('');
      refreshExc();
    }
    function refreshExc() {
      var n = $$('tr[data-exc-id]', excBody).length;
      excCount.textContent = '逐日例外（' + n + '）';
      if (!n) excBody.innerHTML = '<tr><td class="px-5 py-6 text-slate-500" colspan="5">暫無例外。</td></tr>';
    }    function settingsForm() {
      var g = function (id) { return $('[data-testid=' + id + ']').textContent.trim(); };
      var first = g('setting-first-day'), last = (/\d{4}-\d{2}-\d{2}/.exec(g('setting-last-day')) || [''])[0] === YEAR_END ? '' : (/\d{4}-\d{2}-\d{2}/.exec(g('setting-last-day')) || [''])[0];
      modal('編輯日制設定',
        '<div class="wf-f"><label>學年首個上課日（Day 1）</label><input name="first" type="date" value="' + first + '"></div><div class="wf-f"><label>學年最後一日（留空＝學年終結）</label><input name="last" type="date" value="' + last + '"></div>' +
        '<div class="wf-row2"><div class="wf-f"><label>週六</label><select name="sat"><option>不上課</option><option>上課</option></select></div><div class="wf-f"><label>停課日預設</label><select name="susp"><option>停課（不計循環）</option><option>照常計算循環</option></select></div></div>',
        [{ text: '取消' }, {
          text: '儲存', cls: 'pri', fn: function (m) {
            var f = val(m, 'first'), l = val(m, 'last'); if (!f) { toast('請輸入首個上課日'); return false; }
            $('[data-testid=setting-first-day]').textContent = f; $('[data-testid=setting-last-day]').textContent = l || '未設定（至 ' + YEAR_END + '）';
            $('[data-testid=setting-saturday]').textContent = val(m, 'sat'); $('[data-testid=setting-suspension]').textContent = val(m, 'susp'); toast('設定已更新', true);
          }
        }]);
    }
    function sequenceModal() {
      var d = parseISO($('[data-testid=setting-first-day]').textContent.trim()) || new Date(2026, 8, 1), sat = $('[data-testid=setting-saturday]').textContent.trim() === '上課', n = 0, rows = '', susp = {};
      $$('tr', excBody).forEach(function (r) { var c = $$('td', r); if (c.length > 1 && c[2].textContent.trim() === '停課') susp[c[0].textContent.trim()] = c[3].textContent.trim(); });
      while (n < 14) { var wd = d.getDay(), k = iso(d); if (wd !== 0 && (wd !== 6 || sat)) { if (susp[k]) rows += '<tr><td style="padding:4px 8px">' + k + '</td><td>' + WD[wd] + '</td><td style="color:#b91c1c">停課</td></tr>'; else rows += '<tr><td style="padding:4px 8px">' + k + '</td><td>' + WD[wd] + '</td><td>Day ' + (Math.floor(n++ % 6) + 1) + '</td></tr>'; } d.setDate(d.getDate() + 1); }
      modal('日序表', '<table style="width:100%;font-size:13px;text-align:left"><thead style="color:#64748b"><tr><th style="padding:4px 8px">日期</th><th>星期</th><th>日序</th></tr></thead><tbody>' + rows + '</tbody></table>', [{ text: '關閉', cls: 'pri' }]);
    }
    $('[data-combobox][data-value="704"]').addEventListener('wf:change', function () { toast('線框圖只含 2025-2026 學年資料'); });
    document.addEventListener('click', function (e) {
      var t = e.target, a = t.closest('a'), href = a ? (a.getAttribute('href') || '') : '', stop = function () { e.preventDefault(); e.stopImmediatePropagation(); };
      if (t.closest('[data-wf-exc-edit]')) { stop(); location.href = 'calendar-edit.html?exc=' + encodeURIComponent(t.closest('tr').getAttribute('data-exc-id')); }
      else if (t.closest('[data-wf-exc-del]')) { stop(); var r = t.closest('tr'), xid = r.getAttribute('data-exc-id'); confirmBox('刪除例外', '確定要刪除此日期例外嗎？', '刪除', function () { save('wf.exceptions', excStore().filter(function (e) { return String(e.id) !== xid; })); r.remove(); refreshExc(); toast('例外已刪除', true); }); }
      else if (t.closest('[data-testid=bell-delete]')) { stop(); var br = t.closest('tr'); confirmBox('刪除上課時間', '確定要刪除「' + readBell(br).name + '」嗎？', '刪除', function () { br.remove(); refreshBells(); toast('上課時間已刪除', true); }); }
      else if (t.closest('[data-testid=day-system-delete]')) { stop(); confirmBox('刪除日制', '刪除後此學年的日序、例外及上課時間將一併移除。確定嗎？', '刪除日制', function () { $('.space-y-6').innerHTML = '<div class="rounded-2xl border border-slate-100 bg-white/95 px-5 py-8 text-center text-sm text-slate-500 shadow-sm">此學年尚未設定日制。<br>（線框圖：重新整理頁面即可還原）</div>'; toast('日制已刪除', true); }); }
      else if (a && /bell-schedules\/new$/.test(href)) { stop(); bellForm(null); }
      else if (a && /bell-schedules\/\d+\/edit$/.test(href)) { stop(); bellForm(a.closest('tr')); }
      else if (a && /day-system\/37\/edit$/.test(href)) { stop(); settingsForm(); }
      else if (a && /day-system\/days/.test(href)) { stop(); sequenceModal(); }
      else if (a && /day-system\/import/.test(href)) { stop(); modal('從 CloudSAMS 匯入', '<p style="color:#475569">將從 CloudSAMS 讀取 2025-2026 學年的日序及上課時間。</p>', [{ text: '取消' }, { text: '開始匯入', cls: 'pri', fn: function () { toast('匯入完成（線框圖：未實際匯入）', true); } }]); }
    }, true);
    if (excStore().length) renderExc();
  }

  /* ---------- page: timetable (學生去向查詢 / 課表) ---------- */
  function initTimetable() {
    var tabW = $('[data-testid=tab-whereabouts]'), tabV = $('[data-testid=tab-view]'), pW = $('[data-wf-panel=whereabouts]'), pV = $('[data-wf-panel=view]');
    var ON = tabW.className, OFF = tabV.className;
    function showTab(w) {
      pW.classList.toggle('hidden', !w); pV.classList.toggle('hidden', w);
      tabW.className = w ? ON : OFF; tabV.className = w ? OFF : ON;
      tabW.setAttribute('aria-selected', w); tabV.setAttribute('aria-selected', !w);
    }
    tabW.addEventListener('click', function () { showTab(true); }); tabV.addEventListener('click', function () { showTab(false); });

    var form = $('[data-testid=whereabouts-form]'), ta = $('[data-testid=whereabouts-list]'), count = $('[data-testid=whereabouts-count]'),
      byCb = $('[data-testid=whereabouts-by]').parentElement, timeLabel = $('[data-testid=whereabouts-time-input]').closest('label'),
      namedCb = $('[data-testid=whereabouts-named-list]').parentElement;
    function lines() { return ta.value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean); }
    function btn(text) { return $$('button', form).filter(function (b) { return b.textContent.trim() === text; })[0]; }
    function recount() {
      var n = lines().length; count.textContent = n + ' 行';
      ['存為具名名單', '清除名單', '查詢'].forEach(function (t) { var b = btn(t); if (b) b.disabled = !n; });
    }
    ta.addEventListener('input', recount);
    // 按節次 / 按時間
    var periodLabel = h('<label class="block" style="display:none"><span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">節次</span><select style="width:100%;border:1px solid #c7d2fe;background:#fff;border-radius:12px;padding:9px 12px;font-size:14px">' + [1, 2, 3, 4, 5].map(function (n) { return '<option>第 ' + n + ' 節</option>'; }).join('') + '</select></label>');
    timeLabel.parentElement.appendChild(periodLabel);
    byCb.addEventListener('wf:change', function (e) { var p = e.detail === 'period'; timeLabel.style.display = p ? 'none' : ''; periodLabel.style.display = p ? '' : 'none'; });
    // buttons
    var file = $('[data-testid=whereabouts-upload]');
    btn('上載 Excel／CSV').addEventListener('click', function () { file.click(); });
    file.addEventListener('change', function () {
      var f = file.files[0]; if (!f) return;
      if (/\.xlsx$/i.test(f.name)) { toast('線框圖暫不解析 Excel，請改用 CSV 或 TXT'); file.value = ''; return; }
      var r = new FileReader(); r.onload = function () { ta.value = String(r.result).split(/\r?\n/).map(function (l) { return l.replace(/,/g, ' ').trim(); }).filter(Boolean).join('\n'); recount(); toast('已載入 ' + lines().length + ' 行', true); file.value = ''; }; r.readAsText(f);
    });
    btn('自班別／搜尋加入').addEventListener('click', function () {
      var classes = '1A 1B 1C 1D 2A 2B 2C 2D 3A 3B 3C 3D 4A 4B 4C 4D 5A 5B 5C 5D 6A 6B 6C 6D'.split(' ');
      modal('自班別／搜尋加入', '<div class="wf-f"><label>班別</label><select name="cls">' + classes.map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select></div><div class="wf-f"><label>學號範圍（每班 01–N）</label><input name="n" type="number" min="1" max="40" value="5"></div><div class="wf-f"><label>或搜尋學生姓名</label><input name="name" placeholder="例如：陳大文"></div>',
        [{ text: '取消' }, { text: '加入', cls: 'pri', fn: function (m) {
          var add = [], nm = val(m, 'name');
          if (nm) add.push(val(m, 'cls') + ' 01 ' + nm); else for (var i = 1; i <= +val(m, 'n'); i++) add.push(val(m, 'cls') + pad(i));
          ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + add.join('\n'); recount();
        } }]);
    });
    btn('存為具名名單').addEventListener('click', function () {
      if (!lines().length) return toast('名單是空的，請先輸入學生');
      modal('存為具名名單', '<div class="wf-f"><label>名單名稱</label><input name="nm" placeholder="例如：籃球隊"></div>', [{ text: '取消' }, { text: '儲存', cls: 'pri', fn: function (m) {
        var nm = val(m, 'nm'); if (!nm) { toast('請輸入名單名稱'); return false; }
        var sel = $('select', namedCb), snap = lines().join('\n'); var o = document.createElement('option'); o.value = nm; o.textContent = nm; o.setAttribute('data-list', snap); sel.appendChild(o);
        sel.value = nm; namedCb.setAttribute('data-value', nm); $('input', namedCb).value = nm; toast('已存為「' + nm + '」', true);
      } }]);
    });
    namedCb.addEventListener('wf:change', function (e) { var o = $$('option', $('select', namedCb)).filter(function (x) { return x.value === e.detail; })[0]; if (o && o.getAttribute('data-list')) { ta.value = o.getAttribute('data-list'); recount(); } });
    btn('清除名單').addEventListener('click', function () { ta.value = ''; recount(); var r = $('.wf-result'); if (r) r.remove(); });
    // 查詢
    var SUBJ = ['中文', '英文', '數學', '常識', '科學', '體育', '音樂', '視藝'], TEACH = ['陳老師', '李老師', '黃老師', '張老師', '何老師'], ROOM = ['101', '102', '203', '304', '音樂室', '操場', 'Lab 1'];
    function hash(s) { var x = 0; for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0; return x; }
    btn('查詢').addEventListener('click', function () {
      var old = $('.wf-result'); if (old) old.remove();
      var ls = lines(); if (!ls.length) return toast('請先輸入學生名單');
      var date = $('[data-testid=whereabouts-date]').value, byPeriod = byCb.getAttribute('data-value') === 'period';
      var when = byPeriod ? $('select', periodLabel).value : fmtTime($('[data-testid=whereabouts-time]').value);
      var rows = ls.map(function (l) { var k = hash(l + date + when); return '<tr><td style="padding:8px 12px">' + esc(l) + '</td><td>' + SUBJ[k % 8] + '</td><td>' + TEACH[(k >> 3) % 5] + '</td><td>' + ROOM[(k >> 5) % 7] + '</td></tr>'; }).join('');
      form.parentElement.insertBefore(h('<section class="wf-result" style="background:#fff;border:1px solid #e0e7ff;border-radius:16px;padding:16px;margin-bottom:24px"><div style="font-weight:600;margin-bottom:8px">查詢結果 — ' + fmtDate(date) + ' ' + esc(when) + '（示範資料）</div><table style="width:100%;font-size:14px;text-align:left"><thead style="color:#64748b;font-size:12px"><tr><th style="padding:8px 12px">學生</th><th>科目</th><th>老師</th><th>課室</th></tr></thead><tbody>' + rows + '</tbody></table></section>'), form.nextSibling);
    });
    // 課表 tab
    var sel = $$('select', pV)[0]; if (sel) sel.parentElement.addEventListener('wf:change', function () { toast('線框圖未包含課表資料'); });
    recount();
  }

  /* ---------- page: import center (Extra upload) ---------- */
  function initImportCenter() {
    var box = $('[data-wf-extra]'), btn = $('[data-wf-extra-upload]', box), input = $('[data-wf-extra-input]', box), name = $('[data-wf-extra-file]', box);
    btn.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () {
      var f = input.files[0]; if (!f) return;
      name.textContent = f.name + '（' + (f.size < 1024 ? f.size + ' B' : Math.round(f.size / 1024) + ' KB') + '）';
      toast('已選擇「' + f.name + '」（線框圖：不會真正上傳）', true);
    });
  }

  /* ---------- page: home (AI chat) ---------- */  function initHome() {
    var input = $('input[placeholder^=向助手]'), form = input.closest('form'), panel = $('div.w-72'), welcome = $$('div').filter(function (d) { return /max-w-2xl/.test(d.className) && d.textContent.indexOf('午安') >= 0; })[0],
      area = welcome.parentElement, thread = h('<div style="width:100%;max-width:42rem;display:none;flex-direction:column;gap:12px"></div>');
    area.appendChild(thread);
    var REPLIES = ['這是線框圖示範回覆。在正式系統中，AI 助手會根據校內資料（學生、班別、通告、校政文件等）作答，並附上資料來源。', '（示範）我已查閱相關文件，以下為摘要：\n1. 重點一\n2. 重點二\n3. 重點三\n\n如需更詳細的資料，請告訴我。'];
    var rIdx = 0, started = false;
    function showChat(on) {
      started = on; welcome.style.display = on ? 'none' : ''; thread.style.display = on ? 'flex' : 'none';
      $$(':scope > div', area).forEach(function (d) { if (d !== welcome && d !== thread && !d.children.length) d.style.display = on ? 'none' : ''; });
      area.style.justifyContent = on ? 'flex-start' : '';
      if (!on) thread.innerHTML = '';
    }
    function send(text) {
      text = (text || '').trim(); if (!text) return;
      showChat(true);
      thread.appendChild(h('<div class="wf-msg u">' + esc(text) + '</div>'));
      var a = h('<div class="wf-msg a" style="color:#94a3b8">思考中…</div>'); thread.appendChild(a); area.scrollTop = area.scrollHeight;
      input.value = '';
      setTimeout(function () { a.style.color = ''; a.textContent = REPLIES[rIdx++ % REPLIES.length]; area.scrollTop = area.scrollHeight; }, 700);
    }
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); send(input.value); } });
    var sendBtn = $$('button').filter(function (b) { return /gradient/.test(b.className) && !b.textContent.trim(); }).pop();
    if (sendBtn) sendBtn.addEventListener('click', function (e) { e.preventDefault(); send(input.value); });
    // suggestion chips + feature cards
    $$('button', area).forEach(function (b) {
      if (/rounded-full/.test(b.className) && b.textContent.trim()) b.addEventListener('click', function (e) { e.preventDefault(); send(b.textContent.trim()); });
      else if (/group rounded-2xl/.test(b.className)) b.addEventListener('click', function (e) { e.preventDefault(); input.focus(); input.value = b.innerText.trim().split('\n')[0] + '：'; });
    });
    // sidebar
    var search = $('input[placeholder^=搜尋]', panel), newBtn = $$('button', panel).filter(function (b) { return /新對話/.test(b.textContent); })[0], list = $('.overflow-y-auto', panel);
    newBtn.addEventListener('click', function (e) { e.preventDefault(); showChat(false); input.value = ''; });
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      $$('.group.relative', list).forEach(function (it) { it.style.display = it.textContent.toLowerCase().indexOf(q) >= 0 ? '' : 'none'; });
      $$(':scope > div', list).forEach(function (g) { g.style.display = $$('.group.relative', g).some(function (i) { return i.style.display !== 'none'; }) ? '' : 'none'; });
    });
    list.addEventListener('click', function (e) {
      var it = e.target.closest('.group.relative'); if (!it) return; var act = e.target.closest('[role=button]'), label = $('span.truncate', it);
      e.preventDefault();
      if (act && act.title === '重新命名') {
        modal('重新命名對話', '<div class="wf-f"><input name="t" value="' + esc(label.textContent) + '"></div>', [{ text: '取消' }, { text: '儲存', cls: 'pri', fn: function (m) { var v = val(m, 't'); if (v) label.textContent = v; } }]);
      } else if (act && act.title === '刪除') {
        confirmBox('刪除對話', '確定要刪除「' + label.textContent + '」嗎？', '刪除', function () { var g = it.parentElement; it.remove(); if (!$('.group.relative', g)) g.remove(); });
      } else {
        showChat(true); thread.innerHTML = ''; thread.appendChild(h('<div class="wf-msg u">' + esc(label.textContent) + '</div>'));
        thread.appendChild(h('<div class="wf-msg a">' + esc('（示範）這是過往對話的內容預覽。在正式系統中會載入完整的歷史訊息。') + '</div>'));
        $$('.group.relative', list).forEach(function (x) { x.style.background = ''; }); it.style.background = '#eef2ff';
      }
    });
    var collapse = $$('button', panel).filter(function (b) { return b.title === '收合側欄'; })[0];
    if (collapse) {
      var expand = h('<button type="button" title="展開側欄" style="position:absolute;left:8px;top:8px;z-index:20;display:none;border:1px solid #e0e7ff;background:#fff;border-radius:12px;padding:6px 10px;font-size:13px;color:#475569">☰</button>');
      panel.parentElement.style.position = 'relative'; panel.parentElement.appendChild(expand);
      collapse.addEventListener('click', function (e) { e.preventDefault(); panel.style.display = 'none'; expand.style.display = 'block'; });
      expand.addEventListener('click', function () { panel.style.display = ''; expand.style.display = 'none'; });
    }
  }

  /* ---------- global click: routing ---------- */
  document.addEventListener('click', function (e) {
    var lo = e.target.closest('[data-wf-logout]'); if (lo) { closePop(); return toast('登出（線框圖：不會真正登出）'); }
    var a = e.target.closest('a[href]'); if (!a || e.defaultPrevented) return;
    var href = a.getAttribute('href'); if (!href || href.charAt(0) === '#' || a.hasAttribute('download') || /^(https?:|mailto:|blob:|data:)/.test(href)) return;
    var path = href.split('?')[0].split('#')[0];
    if (/\.html$/.test(path)) return; // direct link to another wireframe page: navigate normally
    e.preventDefault(); closePop();
    if (ROUTES[path]) location.href = ROUTES[path];
    else toast('「' + (a.textContent.trim() || path) + '」頁面不在此線框圖範圍內');
  });

  /* ---------- boot ---------- */
  function boot() {
    initChrome(); initComboboxes(); initDateTime();
    try { ({ home: initHome, timeslots: initTimeslots, daysystem: initDaySystem, newevent: initNewEvent, editevent: initNewEvent, timetable: initTimetable, importcenter: initImportCenter }[PAGE] || function () { })(); } catch (err) { console.error('[wireframe]', err); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
