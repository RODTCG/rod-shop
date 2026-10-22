// HTML for the public reveal page and the admin page. Plain DOM building with textContent: nothing from the
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

export const REVEAL_HTML = String.raw`<!doctype html><html lang="en"><head>${HEAD}
<title>Reveal your card · ROD TCG</title>
<style>
.hero{display:flex;flex-wrap:wrap;gap:40px;align-items:center;padding:24px 0 56px}
.hero>.copy{flex:1 1 420px;display:flex;flex-direction:column;gap:18px}
.hero>.stage{flex:1 1 300px;display:flex;justify-content:center}
.flip{width:240px;aspect-ratio:3/5;perspective:1200px}
.flip-in{position:relative;width:100%;height:100%;transition:transform .9s cubic-bezier(.2,.8,.2,1);transform-style:preserve-3d}
.flip.on .flip-in{transform:rotateY(180deg)}
.face{position:absolute;inset:0;border-radius:18px;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden;display:flex;flex-direction:column;background:var(--surface)}
.face.front{border:3px solid var(--line)}
.face.front .hd{background:var(--line);font-weight:800;font-size:13px;padding:10px 12px;letter-spacing:1px}
.face.front .q{flex:1;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:120px;color:var(--line)}
.flip.shake .flip-in{animation:shake .5s ease-in-out 2}
@keyframes shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-4deg)}75%{transform:rotate(4deg)}}
.face.back{transform:rotateY(180deg);border:3px solid var(--pink)}
.face.back .hd{background:var(--pink);color:var(--bg);font-weight:800;font-size:13px;padding:10px 12px;display:flex;justify-content:space-between;gap:8px}
.face.back .ph{flex:1;margin:12px;border-radius:10px;background:var(--bg);display:flex;align-items:center;justify-content:center;text-align:center;padding:12px;font-weight:800;overflow:hidden}
.face.back img{width:100%;height:100%;object-fit:contain}
form.code{display:flex;flex-direction:column;gap:10px;max-width:460px}
form.code input{font-family:'JetBrains Mono',monospace;font-size:22px;letter-spacing:2px;text-transform:uppercase}
.result{display:none;flex-direction:column;gap:14px}
.result.on{display:flex}
.row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
@media (prefers-reduced-motion:reduce){.flip-in{transition:none}.flip.shake .flip-in{animation:none}}
</style></head><body>
<div class="wrap">
<nav class="top"><a class="logo" href="https://rod-tcg.com/">ROD <span>TCG</span></a><a href="https://www.ebay.com/usr/rodtcg" style="font-weight:700;text-decoration:none">ROD TCG on eBay →</a></nav>
<section class="hero">
  <div class="copy">
    <div id="enter" style="display:flex;flex-direction:column;gap:18px">
      <h1>Reveal your <span style="color:var(--pink)">card</span></h1>
      <p class="muted" style="margin:0;font-size:17px;max-width:460px">Enter the code from your eBay messages. Each code works once and reveals the next card in your pool.</p>
      <form class="code" id="form">
        <label for="code">REVEAL CODE</label>
        <input id="code" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ROD-XXXX-XXXX" required>
        <button class="btn pink" id="go" type="submit" style="font-size:18px">Reveal my card</button>
        <div class="err" id="err" role="alert"></div>
      </form>
      <span class="muted" style="font-size:14px">No code yet? It arrives in eBay messages after checkout.</span>
    </div>
    <div class="result" id="result" aria-live="polite">
      <span class="pill cyan" id="r-tag"></span>
      <h1 style="font-size:clamp(2.1rem,5vw,3.4rem);line-height:1.05">You pulled<br><span style="color:var(--pink)" id="r-name"></span></h1>
      <span class="muted" style="font-size:18px" id="r-meta"></span>
      <span class="muted" id="r-note"></span>
      <div class="row">
        <button class="btn pink" type="button" id="share">Share my pull</button>
        <a class="btn ghost" href="https://www.ebay.com/usr/rodtcg">Buy another</a>
        <button class="btn link" type="button" id="again">Enter another code</button>
      </div>
    </div>
  </div>
  <div class="stage">
    <div class="flip" id="flip" aria-hidden="true"><div class="flip-in">
      <div class="face front"><div class="hd">ROD TCG · MYSTERY</div><div class="q">?</div></div>
      <div class="face back"><div class="hd"><span id="b-grader"></span><span id="b-grade"></span></div><div class="ph" id="b-ph"></div></div>
    </div></div>
  </div>
</section>
</div>
<section class="band"><div class="wrap"><div class="grid" id="pools"></div></div></section>
<section class="wrap" style="padding:48px 16px 72px;display:flex;flex-direction:column;gap:16px">
  <h2>Reveal log</h2>
  <div class="tablebox"><table><thead><tr><th scope="col">When</th><th scope="col">Order</th><th scope="col">Type</th><th scope="col">Card</th></tr></thead><tbody id="log"></tbody></table></div>
  <p class="muted" style="margin:0;font-size:14px">Every pool is shuffled once and its fingerprint is posted before the first sale. When a pool sells out we publish its full order and secret, and anyone can check it here with the Verify button.</p>
</section>
<script>
(function(){
  var $ = function(id){ return document.getElementById(id); };
  function el(tag, props, kids){
    var n = document.createElement(tag); props = props || {};
    for (var k in props) { if (k === 'text') n.textContent = props[k]; else if (k === 'style') n.style.cssText = props[k]; else n.setAttribute(k, props[k]); }
    (kids || []).forEach(function(c){ if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function when(iso){ try { return new Date(iso).toLocaleString([], {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}); } catch(e){ return ''; } }
  function grade(c){ return [c.grader, c.grade].filter(Boolean).join(' '); }
  function meta(c){ return [c.set, c.number, grade(c)].filter(Boolean).join(' · '); }
  function sha256(t){ return crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)).then(function(b){ return Array.prototype.map.call(new Uint8Array(b), function(x){ return ('0'+x.toString(16)).slice(-2); }).join(''); }); }

  function verify(pool, out){
    out.textContent = 'Checking…';
    fetch('/api/proof/' + pool.id).then(function(r){ return r.json(); }).then(function(p){
      if (!p.salt) { out.textContent = 'Not available yet.'; return; }
      return sha256(p.salt + '|' + JSON.stringify(p.order)).then(function(h){
        out.textContent = h === pool.hash ? '✓ The published order matches the fingerprint.' : '✗ The order does not match the fingerprint.';
      });
    }).catch(function(){ out.textContent = 'Could not load the proof.'; });
  }

  function load(){
    fetch('/api/status').then(function(r){ return r.json(); }).then(function(s){
      var box = $('pools'); box.textContent = '';
      var shown = s.pools.filter(function(p){ return p.status === 'open'; });
      var done = s.pools.filter(function(p){ return p.status === 'sold_out'; }).slice(-4);
      if (!shown.length && !done.length) box.appendChild(el('p', {class:'muted', text:'New pools are being loaded. Check back soon.'}));
      shown.concat(done).forEach(function(p){
        var pct = Math.round(100 * p.left / p.total);
        var out = el('span', {class:'muted', style:'font-size:14px'});
        var kids = [
          el('div', {style:'display:flex;justify-content:space-between;gap:12px;align-items:baseline'}, [el('span', {style:'font-weight:800;font-size:20px', text: p.tierName + (p.price ? ' · $' + p.price : '')}), el('span', {class:'muted', style:'font-size:14px', text:'Pool #' + p.no})]),
          el('span', {style:"font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:40px", text: p.status === 'open' ? String(p.left) : 'Sold out'}, [p.status === 'open' ? el('span', {class:'muted', style:"font-size:18px;font-family:'DM Sans',sans-serif", text:' of ' + p.total + ' left'}) : null]),
          el('div', {class:'bar', role:'img', 'aria-label': p.left + ' of ' + p.total + ' left'}, [el('div', {style:'width:' + pct + '%'})]),
          el('span', {class:'muted', style:'font-size:13px;font-weight:700;letter-spacing:1px;margin-top:6px', text:'LOCKED SHUFFLE FINGERPRINT (SHA-256)'}),
          el('code', {class:'mono', style:'font-size:13px;color:var(--cyan);word-break:break-all', text:p.hash})
        ];
        if (p.status === 'sold_out') {
          var b = el('button', {class:'btn ghost', type:'button', style:'align-self:flex-start;min-height:44px;padding:8px 16px', text:'Verify this pool'});
          b.addEventListener('click', function(){ verify(p, out); });
          kids.push(el('div', {class:'row'}, [b, out]));
        }
        box.appendChild(el('div', {class:'card'}, kids));
      });
      var tb = $('log'); tb.textContent = '';
      if (!s.log.length) tb.appendChild(el('tr', {}, [el('td', {colspan:'4', class:'muted', text:'No reveals yet. Yours could be first.'})]));
      s.log.forEach(function(c){
        tb.appendChild(el('tr', {}, [el('td', {class:'muted', text: when(c.revealedAt)}), el('td', {class:'mono', text: c.order || ''}), el('td', {text: c.tierName}),
          el('td', {}, [el('strong', {text: c.name}), meta(c) ? el('span', {class:'muted', text: ' · ' + meta(c)}) : null])]));
      });
    }).catch(function(){});
  }

  var last = null;
  function show(card, already){
    last = card;
    $('r-tag').textContent = card.tierName.toUpperCase() + (card.order ? ' · ORDER ' + card.order : '');
    $('r-name').textContent = card.name;
    $('r-meta').textContent = meta(card);
    $('r-note').textContent = already ? 'You already revealed this code. Here is your card again.' : 'It ships tracked the next business day. Your reveal is now in the public log below.';
    $('b-grader').textContent = card.grader || card.tierName; $('b-grade').textContent = card.grade ? 'GRADE ' + card.grade : '';
    var ph = $('b-ph'); ph.textContent = '';
    if (card.photo) ph.appendChild(el('img', {src: card.photo, alt: card.name})); else ph.textContent = card.name;
    $('enter').style.display = 'none'; $('result').classList.add('on');
    $('flip').classList.add('on');
  }
  $('form').addEventListener('submit', function(e){
    e.preventDefault();
    var btn = $('go'), err = $('err'); err.textContent = ''; btn.disabled = true; btn.textContent = 'Shuffling…';
    var flip = $('flip'); flip.classList.add('shake');
    fetch('/api/redeem', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({code: $('code').value})})
      .then(function(r){ return r.json().then(function(d){ return {ok:r.ok, d:d}; }); })
      .then(function(x){
        setTimeout(function(){
          flip.classList.remove('shake'); btn.disabled = false; btn.textContent = 'Reveal my card';
          if (x.ok) { show(x.d.card, x.d.already); load(); return; }
          var m = {invalid_code:"That code didn't work. Check it against your eBay message (codes look like ROD-7KQ2-M9XD).",
                   sold_out:'This pool just ran out. Your code is still good: we are loading the next pool, so try again soon or message us on eBay.',
                   too_many_tries:'Too many tries. Wait a few minutes, then try again.'};
          err.textContent = m[x.d.error] || 'Something went wrong. Please try again.';
        }, x.ok ? 1000 : 300);
      })
      .catch(function(){ flip.classList.remove('shake'); btn.disabled = false; btn.textContent = 'Reveal my card'; err.textContent = 'Could not reach the server. Check your connection and try again.'; });
  });
  $('again').addEventListener('click', function(){ $('flip').classList.remove('on'); $('result').classList.remove('on'); $('enter').style.display = 'flex'; $('code').value = ''; $('code').focus(); });
  $('share').addEventListener('click', function(){
    if (!last) return;
    var text = 'I pulled ' + last.name + (grade(last) ? ' (' + grade(last) + ')' : '') + ' from a ROD TCG ' + last.tierName + '! @rodtcg_';
    if (navigator.share) navigator.share({text: text, url: location.origin}).catch(function(){});
    else if (navigator.clipboard) navigator.clipboard.writeText(text + ' ' + location.origin).then(function(){ $('share').textContent = 'Copied!'; });
  });
  var q = new URLSearchParams(location.search).get('code'); if (q) $('code').value = q;
  load();
})();
</script>
</body></html>`;

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
<nav class="top"><a class="logo" href="/">ROD <span>TCG</span> · mystery admin</a><a href="/">Public reveal page →</a></nav>

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
