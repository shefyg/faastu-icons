/* ספריית האייקונים של FaastU — בנייה.
   קורא icons.json + icons/*.svg, ומייצר את build/.
   הרצה:  node tools/build.js      בדיקה בלבד:  node tools/build.js --check
   בלי תלויות. Node 18+. */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'build');
const CHECK_ONLY = process.argv.includes('--check');

const problems = [];
const fail = (m) => problems.push(m);

/* ---------- קריאה ואימות ---------- */

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'icons.json'), 'utf8'));
const icons = manifest.icons || [];

const REQUIRED = ['id', 'name', 'meaning', 'family', 'aria', 'tag_ids', 'version', 'status', 'file'];
const seenIds = new Map();

for (const ic of icons) {
  const where = `אייקון "${ic.id || '(בלי id)'}"`;

  for (const f of REQUIRED) {
    if (ic[f] === undefined || ic[f] === null || ic[f] === '') fail(`${where}: חסר שדה "${f}"`);
  }
  if (!Array.isArray(ic.tag_ids)) fail(`${where}: tag_ids חייב להיות רשימה`);
  if (!Number.isInteger(ic.version)) fail(`${where}: version חייב להיות מספר שלם`);
  if (!['active', 'deprecated'].includes(ic.status)) fail(`${where}: status חייב להיות active או deprecated`);
  if (ic.status === 'deprecated' && !ic.replacedBy) fail(`${where}: deprecated בלי replacedBy`);

  /* מזהה שהונפק תקף לנצח — ולכן חייב להיות ייחודי */
  if (seenIds.has(ic.id)) fail(`מזהה כפול: "${ic.id}"`);
  seenIds.set(ic.id, true);

  const file = path.join(ROOT, ic.file);
  if (!fs.existsSync(file)) { fail(`${where}: הקובץ ${ic.file} לא קיים`); continue; }

  const svg = fs.readFileSync(file, 'utf8');
  if (!svg.includes('currentColor')) fail(`${where}: הציור לא משתמש ב-currentColor`);
  if (/\bfill="(?!none)/.test(svg)) fail(`${where}: יש מילוי בציור — הסגנון הוא קו בלבד`);
  /* זה הבאג שנמצא ב-31.10: id זהה בכל הקבצים שובר קורא מסך כששניים על אותו עמוד */
  if (/<title\b/.test(svg)) fail(`${where}: יש <title> בתוך הציור — הנגישות מגיעה מהמניפסט`);
  if (/\sid="/.test(svg)) fail(`${where}: יש id בתוך הציור — הוא יתנגש בהטמעה`);

  ic._svg = svg;
}

/* קבצים שאין להם שורה במניפסט — לא ייכנסו ל-sprite, ועדיף לדעת */
for (const f of fs.readdirSync(path.join(ROOT, 'icons'))) {
  if (f.endsWith('.svg') && !icons.some((i) => i.file === `icons/${f}`)) {
    fail(`הקובץ icons/${f} אינו מופיע ב-icons.json`);
  }
}

if (problems.length) {
  console.error('❌ הבנייה נעצרה:\n' + problems.map((p) => '   · ' + p).join('\n'));
  process.exit(1);
}
if (CHECK_ONLY) { console.log(`✅ ${icons.length} אייקונים — המניפסט והציורים תקינים.`); process.exit(0); }

/* ---------- sprite ---------- */

const inner = (svg) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();

const symbols = icons.map((ic) =>
  `  <symbol id="icon-${ic.id}" viewBox="${manifest.style.viewBox}">\n    ${inner(ic._svg)}\n  </symbol>`
);

/* כשצרכן מבקש מזהה שלא קיים — ריבוע קו ריק, כדי שהעמוד לא ייפער */
symbols.push(
  `  <symbol id="icon-missing" viewBox="0 0 24 24">\n` +
  `    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">` +
  `<rect x="4" y="4" width="16" height="16" rx="3"/></g>\n  </symbol>`
);

const sprite =
  `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">\n` +
  `<!-- נוצר על ידי tools/build.js — לא לערוך ביד -->\n${symbols.join('\n')}\n</svg>\n`;

/* ---------- מניפסט לצרכנים ---------- */

const pub = {
  schema: manifest.schema,
  generated: new Date().toISOString().slice(0, 10),
  sprite: 'sprite.svg',
  style: manifest.style,
  icons: icons.map(({ _svg, ...rest }) => ({ ...rest, symbol: `icon-${rest.id}` })),
};

/* ---------- עוזר לצרכנים ----------
   בלי זה, מזהה שלא קיים פשוט לא מצייר כלום — ה-sprite לא יודע ליפול בחזרה לבד.
   נבדק 31.10: <use href="#icon-לא-קיים"> מחזיר ריק, ולא missing. */

const helper = `/* FaastU Icons — עוזר לצרכן. נוצר על ידי tools/build.js, לא לערוך ביד. */
(function (g) {
  'use strict';
  var BASE = '';

  function load(base) {
    BASE = String(base || '').replace(/\\/?$/, '/');
    return fetch(BASE + 'sprite.svg')
      .then(function (r) {
        if (!r.ok) throw new Error('sprite ' + r.status);
        return r.text();
      })
      .then(function (t) {
        var host = document.createElement('div');
        host.hidden = true;
        host.innerHTML = t;
        document.body.insertBefore(host, document.body.firstChild);
        return true;
      });
  }

  /* מזהה שלא קיים -> missing, כדי שהעמוד לא ייפער */
  function resolve(id) {
    return document.getElementById('icon-' + id) ? id : 'missing';
  }

  function svg(id, label, cls) {
    var real = resolve(id);
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('class', cls || 'icon');
    if (label) { s.setAttribute('role', 'img'); s.setAttribute('aria-label', label); }
    else { s.setAttribute('aria-hidden', 'true'); }
    var u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    u.setAttribute('href', '#icon-' + real);
    s.appendChild(u);
    return s;
  }

  g.FaastuIcons = { load: load, svg: svg, resolve: resolve };
})(window);
`;

/* ---------- דף קונטקט — בדיקת העין של שפי ---------- */

const cell = (ic) => `    <figure class="cell">
      <svg class="icon" aria-hidden="true"><use href="#icon-${ic.id}"></use></svg>
      <figcaption><b>${ic.name}</b><code>${ic.id}</code><span>${ic.meaning}</span></figcaption>
    </figure>`;

const sheet = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FaastU — דף קונטקט אייקונים</title>
<style>
  :root{--ink:#15202b;--line:#dde4ec;--icon:#5a6472;--bg:#f4f5f7}
  *{box-sizing:border-box}
  body{margin:0;padding:28px 20px 60px;background:var(--bg);color:var(--ink);
       font-family:"Segoe UI","Arial Hebrew",Arial,sans-serif;font-size:17px;line-height:1.6}
  .wrap{max-width:900px;margin:0 auto}
  h1{font-size:26px;margin:0 0 6px}
  p.sub{margin:0 0 22px;color:#4a5a6b}
  .bar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:22px}
  .bar button{font:inherit;font-size:15px;padding:8px 14px;border:1px solid var(--line);
              border-radius:9px;background:#fff;cursor:pointer}
  .bar button[aria-pressed="true"]{background:#15202b;color:#fff;border-color:#15202b}
  .grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(190px,1fr))}
  .cell{margin:0;background:#fff;border:1px solid var(--line);border-radius:12px;
        padding:18px 14px;display:flex;gap:14px;align-items:center}
  .icon{width:34px;height:34px;flex:0 0 auto;color:var(--icon)}
  figcaption{display:flex;flex-direction:column;font-size:14px;min-width:0}
  figcaption b{font-size:16px}
  figcaption code{color:#4a5a6b;font-size:12.5px}
  figcaption span{color:#4a5a6b;font-size:13px;margin-top:3px}
  body.grey{filter:grayscale(1)}
  body.big .icon{width:64px;height:64px}
  body.small .icon{width:18px;height:18px}
  footer{margin-top:30px;color:#4a5a6b;font-size:14px}
</style>
</head>
<body>
<div class="wrap">
  <h1>🔖 דף קונטקט — ${icons.length} אייקונים</h1>
  <p class="sub">בדיקת העין: אייקון שצריך לקרוא את הטקסט שלו כדי להבין — לא עבר.</p>

  <div class="bar">
    <button type="button" id="b-grey" aria-pressed="false">גווני אפור</button>
    <button type="button" id="b-big" aria-pressed="false">גדול</button>
    <button type="button" id="b-small" aria-pressed="false">קטן (18px)</button>
  </div>

  <div class="grid">
${icons.map(cell).join('\n')}
  </div>

  <footer>נוצר על ידי <code>tools/build.js</code> · אפיון 04 · ${pub.generated}</footer>
</div>

<script>
  fetch('sprite.svg').then(r => r.text()).then(t => {
    document.body.insertAdjacentHTML('afterbegin', t);
  });
  for (const [id, cls] of [['b-grey','grey'],['b-big','big'],['b-small','small']]) {
    document.getElementById(id).addEventListener('click', (e) => {
      const on = document.body.classList.toggle(cls);
      e.currentTarget.setAttribute('aria-pressed', String(on));
    });
  }
</script>
</body>
</html>
`;

/* ---------- כתיבה ---------- */

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'sprite.svg'), sprite, 'utf8');
fs.writeFileSync(path.join(OUT, 'icons.json'), JSON.stringify(pub, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(OUT, 'sheet.html'), sheet, 'utf8');
fs.writeFileSync(path.join(OUT, 'faastu-icons.js'), helper, 'utf8');

console.log(`✅ נבנו ${icons.length} אייקונים (+ missing) → build/sprite.svg · build/icons.json · build/sheet.html · build/faastu-icons.js`);
