// Minimal .dc.html runtime for screenshots: renders the template against renderVals() on demand.
(function () {
  const litRe = /^\s*(true|false|null|-?\d+(\.\d+)?|'[^']*'|"[^"]*")\s*$/;
  function resolve(expr, scope) {
    const e = expr.trim();
    if (litRe.test(e)) { try { return Function('return (' + e + ')')(); } catch (_) { return e; } }
    const parts = e.split('.');
    let v;
    if (parts[0] in scope.locals) v = scope.locals[parts[0]];
    else v = scope.vals[parts[0]];
    for (let i = 1; i < parts.length; i++) v = v == null ? undefined : v[parts[i]];
    return v;
  }
  function interpolate(str, scope) {
    return str.replace(/\{\{([^}]*)\}\}/g, (_, p) => { const v = resolve(p, scope); return v == null ? '' : String(v); });
  }
  function build(node, scope, out) {
    if (node.nodeType === 3) { out.appendChild(document.createTextNode(node.data.includes('{{') ? interpolate(node.data, scope) : node.data)); return; }
    if (node.nodeType !== 1) return;
    const tag = node.localName;
    if (tag === 'sc-if') {
      const v = resolve((node.getAttribute('value') || '').replace(/[{}]/g, ''), scope);
      if (v) for (const c of node.childNodes) build(c, scope, out);
      return;
    }
    if (tag === 'sc-for') {
      const list = resolve((node.getAttribute('list') || '').replace(/[{}]/g, ''), scope) || [];
      const as = node.getAttribute('as');
      list.forEach((item, i) => { const s = { vals: scope.vals, locals: Object.assign({}, scope.locals, { [as]: item, $index: i }) }; for (const c of node.childNodes) build(c, s, out); });
      return;
    }
    const el = document.createElementNS(node.namespaceURI, tag);
    for (const a of node.attributes) {
      if (a.name.startsWith('hint-')) continue;
      const whole = /^\s*\{\{([^}]*)\}\}\s*$/.exec(a.value);
      if (a.name === 'onclick') { const fn = whole && resolve(whole[1], scope); if (typeof fn === 'function') el.addEventListener('click', fn); continue; }
      let val = a.value;
      if (whole) { const v = resolve(whole[1], scope); val = v == null ? '' : String(v); }
      else if (val.includes('{{')) val = interpolate(val, scope);
      try { el.setAttribute(a.name, val); } catch (_) {}
    }
    for (const c of node.childNodes) build(c, scope, el);
    out.appendChild(el);
  }
  window.mountDC = function (src, fontCss) {
    const doc = new DOMParser().parseFromString(src, 'text/html');
    const helmet = doc.querySelector('helmet');
    if (helmet) for (const c of Array.from(helmet.children)) { const n = document.importNode(c, true); if (fontCss && n.tagName === 'LINK' && /fonts\.googleapis/.test(n.getAttribute('href') || '')) n.setAttribute('href', fontCss); document.head.appendChild(n); }
    let root = helmet ? helmet.nextElementSibling : doc.querySelector('x-dc').firstElementChild;
    const scriptEl = doc.querySelector('script[type="text/x-dc"]');
    let propsSpec = {}; try { propsSpec = JSON.parse(scriptEl.getAttribute('data-props') || '{}'); } catch (e) { console.error('data-props parse', e); }
    const props = {}; for (const k in propsSpec) if (k !== '$preview' && propsSpec[k] && 'default' in propsSpec[k]) props[k] = propsSpec[k].default;
    class DCLogic { constructor(p) { this.props = p || {}; this.state = {}; } setState(p, cb) { Object.assign(this.state, typeof p === 'function' ? p(this.state, this.props) : p); if (cb) cb(); } forceUpdate() {} }
    const Component = new Function('DCLogic', scriptEl.textContent + '\n;return Component;')(DCLogic);
    const inst = new Component(props);
    if (inst.componentDidMount) inst.componentDidMount();
    const container = document.getElementById('stage');
    window.inst = inst;
    window.renderDC = function () { const vals = inst.renderVals(); const frag = document.createDocumentFragment(); build(root, { vals, locals: {} }, frag); container.replaceChildren(frag); return Object.keys(vals).length; };
    window.callDC = function (name) { const vals = inst.renderVals(); if (typeof vals[name] !== 'function') throw new Error('no handler ' + name); vals[name](); };
    return window.renderDC();
  };
})();
