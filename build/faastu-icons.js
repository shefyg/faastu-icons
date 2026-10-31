/* FaastU Icons — עוזר לצרכן. נוצר על ידי tools/build.js, לא לערוך ביד. */
(function (g) {
  'use strict';
  var BASE = '';

  function load(base) {
    BASE = String(base || '').replace(/\/?$/, '/');
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
