// HTML for the admin page (the public reveal page is reveal/index.html on the shop site). Plain DOM building with textContent: nothing from the
// server is ever inserted as HTML. (Client code avoids backticks so it can live inside String.raw.)

const HEAD = String.raw`<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@500&display=swap">
<style>
:root{--bg:#1B0F3A;--surface:#25174D;--line:#5A4A8B;--text:#FFF6E5;--muted:#D9D0F2;--pink:#FF4F9A;--cyan:#22D3EE}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:'DM Sans',system-ui,sans-serif;line-height:1.5}
a{color:var(--cyan)}a:hover{color:var(--text)}
.wrap{max-width:1200px;margin:0 auto;padding:0 16px}
nav.top{display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;justify-content:space-between;padding:20px 0}
.logo{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:26px;color:var(--text);text-decoration:none;letter-spacing:-.5px}
.logo span{color:var(--pink)}
h1,h2{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;margin:0;letter-spacing:-1px}
h1{font-size:clamp(2.4rem,6vw,4rem);line-height:1}
h2{font-size:clamp(1.6rem,3.5vw,2rem)}
.muted{color:var(--muted)}
.pill{display:inline-block;border-radius:999px;padding:4px 12px;font-weight:800;font-size:13px;letter-spacing:.5px}
.pill.cyan{background:var(--cyan);color:var(--bg)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border:0;border-radius:999px;padding:12px 22px;font:inherit;font-weight:800;cursor:pointer;text-decoration:none}
.btn.pink{background:var(--pink);color:var(--bg)}
.btn.ghost{background:transparent;color:var(--text);border:2px solid var(--text)}
.btn.link{background:transparent;color:var(--muted);text-decoration:underline;padding:12px 8px}
.btn:disabled{opacity:.6;cursor:wait}
input,select,textarea{font:inherit;color:var(--text);background:var(--surface);border:2px solid var(--line);border-radius:14px;padding:12px 14px;width:100%}
input:focus,select:focus,textarea:focus,.btn:focus-visible{outline:3px solid var(--cyan);outline-offset:2px}
label{font-weight:800;font-size:14px;letter-spacing:1px;color:var(--muted)}
.mono{font-family:'JetBrains Mono',monospace}
.band{background:var(--surface);padding:48px 0}
.card{background:var(--bg);border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:10px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:20px}
.bar{height:10px;border-radius:999px;background:var(--line);overflow:hidden}.bar>div{height:100%;background:var(--pink);border-radius:999px}
.tablebox{overflow-x:auto;border:1px solid var(--line);border-radius:16px;min-width:0;max-width:100%;position:relative}
table{width:100%;border-collapse:collapse;min-width:520px}
th,td{padding:12px 16px;text-align:left;vertical-align:top}th{background:var(--surface)}tr+tr td,tbody tr td{border-top:1px solid var(--line)}
.err{color:#FFB3CF;font-weight:700;min-height:1.5em}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
</style>`;

export const ADMIN_HTML = String.raw`<!doctype html><html lang="en"><head>${HEAD}
<title>Mystery admin · ROD TCG</title>
<meta name="robots" content="noindex">
<style>
section.box{background:var(--surface);border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:14px;margin-bottom:20px}
.fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:12px}
.f{display:flex;flex-direction:column;gap:6px}
textarea{min-height:170px;font-family:'JetBrains Mono',monospace;font-size:13px}
.out{background:var(--bg);border-radius:12px;padding:14px;white-space:pre-wrap;word-break:break-word}
.btn.sm{min-height:44px;padding:8px 14px;font-size:14px}
td .btn{min-height:40px}
</style></head><body>
<div class="wrap" style="padding-bottom:64px">
<nav class="top"><a class="logo" href="/admin">ROD <span>TCG</span> · mystery admin</a><a href="/">Public reveal page →</a></nav>

<section class="box" id="login">
  <h2>Sign in</h2>
  <div class="f"><label for="secret">ADMIN PASSWORD</label><input id="secret" type="password" autocomplete="current-password"></div>
  <button class="btn pink" id="signin" type="button" style="align-self:flex-start">Sign in</button>
  <div class="err" id="login-err" role="alert"></div>
</section>

<div id="app" style="display:none">
<section class="box">
  <h2>1 · Make a code for a sale</h2>
  <div class="fields">
    <div class="f"><label for="c-tier">TYPE</label><select id="c-tier"><option value="slab">Mystery Slab ($50)</option><option value="hit">Mystery Hit ($15)</option></select></div>
    <div class="f"><label for="c-order">EBAY ORDER NUMBER</label><input id="c-order" placeholder="e.g. 12-34567-89012"></div>
    <div class="f"><label for="c-count">HOW MANY (QTY BOUGHT)</label><input id="c-count" type="number" min="1" max="50" value="1"></div>
    <div class="f"><label for="c-note">NOTE (OPTIONAL)</label><input id="c-note" placeholder="buyer username"></div>
  </div>
  <button class="btn pink" id="c-go" type="button" style="align-self:flex-start">Make code</button>
  <div class="err" id="c-err" role="alert"></div>
  <div id="c-out" style="display:none;flex-direction:column;gap:10px">
    <label>MESSAGE TO PASTE INTO EBAY MESSAGES</label>
    <div class="out" id="c-msg"></div>
    <button class="btn ghost sm" id="c-copy" type="button" style="align-self:flex-start">Copy message</button>
  </div>
</section>

<section class="box">
  <h2>2 · Ship these</h2>
  <div class="tablebox"><table><thead><tr><th scope="col">Revealed</th><th scope="col">Order</th><th scope="col">Type</th><th scope="col">Card</th><th scope="col"><span class="sr">Action</span></th></tr></thead><tbody id="ship"></tbody></table></div>
</section>

<section class="box">
  <h2>3 · Load a new pool</h2>
  <p class="muted" style="margin:0">One card per line: <span class="mono">name, set, number, grader, grade, photo URL</span>. Only the name is required; put quotes around a value that has a comma. The pool is shuffled and locked when you load it, and its fingerprint goes on the public page. A new pool starts after the current one for that type sells out.</p>
  <div class="fields"><div class="f"><label for="p-tier">TYPE</label><select id="p-tier"><option value="slab">Mystery Slab ($50)</option><option value="hit">Mystery Hit ($15)</option></select></div></div>
  <div class="f"><label for="p-csv">CARDS</label><textarea id="p-csv" placeholder="Gengar ex, 30th Celebration, 154/128, PSA, 9, https://i.ebayimg.com/..."></textarea></div>
  <div class="row" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center"><button class="btn ghost" id="p-check" type="button">Check list</button><button class="btn pink" id="p-go" type="button" disabled>Shuffle &amp; load pool</button><span class="muted" id="p-info"></span></div>
  <div class="err" id="p-err" role="alert"></div>
</section>

<section class="box">
  <h2>Pools</h2>
  <div id="pools" style="display:flex;flex-direction:column;gap:12px"></div>
</section>

<section class="box">
  <h2>Codes not used yet</h2>
  <div class="tablebox"><table><thead><tr><th scope="col">Code</th><th scope="col">Type</th><th scope="col">Order</th><th scope="col">Made</th></tr></thead><tbody id="unused"></tbody></table></div>
</section>

<section class="box">
  <h2>Shipped</h2>
  <details><summary style="cursor:pointer;font-weight:800">Show shipped cards</summary>
  <div class="tablebox" style="margin-top:12px"><table><thead><tr><th scope="col">Shipped</th><th scope="col">Order</th><th scope="col">Type</th><th scope="col">Card</th><th scope="col"><span class="sr">Action</span></th></tr></thead><tbody id="shipped"></tbody></table></div></details>
</section>
</div>
</div>
<script>
(function(){
  var $ = function(id){ return document.getElementById(id); };
  var NAMES = {slab:'Mystery Slab', hit:'Mystery Hit'};
  var secret = ''; try { secret = sessionStorage.getItem('rodAdmin') || ''; } catch(e){}
  function el(tag, props, kids){
    var n = document.createElement(tag); props = props || {};
    for (var k in props) { if (k === 'text') n.textContent = props[k]; else if (k === 'style') n.style.cssText = props[k]; else n.setAttribute(k, props[k]); }
    (kids || []).forEach(function(c){ if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function api(path, body){
    return fetch('/api/admin/' + path, {method: body ? 'POST' : 'GET', headers: {'authorization':'Bearer ' + secret, 'content-type':'application/json'}, body: body ? JSON.stringify(body) : undefined})
      .then(function(r){ return r.json().then(function(d){ if (!r.ok) { var e = new Error(d.error || 'error'); e.status = r.status; throw e; } return d; }); });
  }
  function when(iso){ try { return new Date(iso).toLocaleString([], {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}); } catch(e){ return ''; } }
  function card(c){ return [c.name, c.set_name, c.number, [c.grader, c.grade].filter(Boolean).join(' ')].filter(Boolean).join(' · '); }

  function refresh(){
    return api('overview').then(function(o){
      var ship = $('ship'), done = $('shipped'); ship.textContent = ''; done.textContent = '';
      o.revealed.forEach(function(r){
        var b = el('button', {class:'btn ghost sm', type:'button', text: r.shipped_at ? 'Undo' : 'Mark shipped'});
        b.addEventListener('click', function(){ b.disabled = true; api('shipped', {item_id: r.id, undo: !!r.shipped_at}).then(refresh); });
        var row = el('tr', {}, [el('td', {class:'muted', text: when(r.shipped_at || r.revealed_at)}), el('td', {class:'mono', text: r.order_ref || r.code}), el('td', {text: NAMES[r.tier] || r.tier}), el('td', {text: card(r)}), el('td', {}, [b])]);
        (r.shipped_at ? done : ship).appendChild(row);
      });
      if (!ship.children.length) ship.appendChild(el('tr', {}, [el('td', {colspan:'5', class:'muted', text:'Nothing to ship.'})]));
      var pools = $('pools'); pools.textContent = '';
      if (!o.pools.length) pools.appendChild(el('p', {class:'muted', style:'margin:0', text:'No pools yet. Load one above.'}));
      o.pools.slice().reverse().forEach(function(p){
        var list = el('ul', {style:'margin:8px 0 0;padding-left:20px'});
        p.remaining.forEach(function(c){ list.appendChild(el('li', {text: card(c)})); });
        var kids = [el('strong', {text: p.tierName + ' · pool #' + p.no + ' · ' + p.status.replace('_', ' ')}),
          el('span', {class:'muted', text: p.left + ' of ' + p.total + ' left'}),
          el('code', {class:'mono', style:'font-size:12px;color:var(--cyan);word-break:break-all', text: p.hash})];
        if (p.remaining.length) kids.push(el('details', {}, [el('summary', {style:'cursor:pointer;font-weight:700', text:'Cards still in the pool (A–Z, not draw order)'}), list]));
        if (p.left === p.total) {
          var d = el('button', {class:'btn ghost sm', type:'button', style:'align-self:flex-start', text:'Delete this pool'});
          d.addEventListener('click', function(){ if (confirm('Delete pool #' + p.no + '? Nothing has been revealed from it yet.')) api('pool/delete', {pool_id: p.id}).then(refresh).catch(function(e){ alert(e.message); }); });
          kids.push(d);
        }
        pools.appendChild(el('div', {class:'card'}, kids));
      });
      var un = $('unused'); un.textContent = '';
      if (!o.unused.length) un.appendChild(el('tr', {}, [el('td', {colspan:'4', class:'muted', text:'None.'})]));
      o.unused.forEach(function(c){ un.appendChild(el('tr', {}, [el('td', {class:'mono', text:c.code}), el('td', {text: NAMES[c.tier] || c.tier}), el('td', {text: (c.order_ref || '') + (c.note ? ' (' + c.note + ')' : '')}), el('td', {class:'muted', text: when(c.created_at)})])); });
    });
  }

  function start(){
    refresh().then(function(){ $('login').style.display = 'none'; $('app').style.display = 'block'; })
      .catch(function(e){ $('login-err').textContent = e.status === 401 ? 'Wrong password.' : 'Could not load: ' + e.message; });
  }
  $('signin').addEventListener('click', function(){ secret = $('secret').value; try { sessionStorage.setItem('rodAdmin', secret); } catch(e){} start(); });
  $('secret').addEventListener('keydown', function(e){ if (e.key === 'Enter') $('signin').click(); });
  if (secret) start();

  $('c-go').addEventListener('click', function(){
    $('c-err').textContent = '';
    api('codes', {tier: $('c-tier').value, order: $('c-order').value, count: $('c-count').value, note: $('c-note').value})
      .then(function(r){ $('c-msg').textContent = r.message; $('c-out').style.display = 'flex'; $('c-copy').textContent = 'Copy message'; refresh(); })
      .catch(function(e){ $('c-err').textContent = e.message; });
  });
  $('c-copy').addEventListener('click', function(){ navigator.clipboard.writeText($('c-msg').textContent).then(function(){ $('c-copy').textContent = 'Copied!'; }); });

  function parseCSV(text){
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) { if (ch === '"' && text[i+1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === ',' || ch === '\t') { row.push(cur.trim()); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i+1] === '\n') i++; row.push(cur.trim()); rows.push(row); row = []; cur = ''; }
      else cur += ch;
    }
    row.push(cur.trim()); rows.push(row);
    return rows.filter(function(r){ return r.some(function(x){ return x; }); });
  }
  var items = [];
  $('p-check').addEventListener('click', function(){
    $('p-err').textContent = '';
    var rows = parseCSV($('p-csv').value);
    if (rows.length && /^name$/i.test(rows[0][0])) rows.shift();
    items = rows.map(function(r){ return {name:r[0], set:r[1], number:r[2], grader:r[3], grade:r[4], photo:r[5]}; });
    var bad = items.filter(function(x){ return !x.name; }).length;
    if (!items.length || bad) { $('p-go').disabled = true; $('p-info').textContent = ''; $('p-err').textContent = items.length ? bad + ' line(s) have no name.' : 'Paste at least one card.'; return; }
    $('p-info').textContent = items.length + ' cards ready for a new ' + NAMES[$('p-tier').value] + ' pool.';
    $('p-go').disabled = false;
  });
  $('p-csv').addEventListener('input', function(){ $('p-go').disabled = true; $('p-info').textContent = ''; });
  $('p-go').addEventListener('click', function(){
    if (!confirm('Shuffle and lock ' + items.length + ' cards into a new ' + NAMES[$('p-tier').value] + ' pool? The order cannot be changed afterwards.')) return;
    $('p-go').disabled = true;
    api('pool', {tier: $('p-tier').value, items: items})
      .then(function(r){ $('p-info').textContent = 'Loaded pool #' + r.no + ' (' + r.total + ' cards).'; $('p-csv').value = ''; refresh(); })
      .catch(function(e){ $('p-err').textContent = e.message; $('p-go').disabled = false; });
  });
})();
</script>
</body></html>`;
