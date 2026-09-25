// Dynamic check of a .dc.html logic class without the renderer.
// Usage: node check_logic.js FILE
const fs = require('fs');
const path = process.argv[2];
const src = fs.readFileSync(path, 'utf8');
const idx = src.indexOf('<script type="text/x-dc"');
const markup = src.slice(0, idx);
const scriptStart = src.indexOf('>', idx) + 1;
const scriptEnd = src.indexOf('</script>', scriptStart);
const script = src.slice(scriptStart, scriptEnd);
let problems = [], notes = [];

// fake timers
const timers = [], intervals = [];
global.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
global.clearTimeout = () => {};
global.setInterval = (fn, ms) => { intervals.push({ fn, ms, on: true }); return intervals.length; };
global.clearInterval = (id) => { if (intervals[id - 1]) intervals[id - 1].on = false; };
global.requestAnimationFrame = (fn) => { timers.push({ fn, ms: 16 }); return 1; };
global.cancelAnimationFrame = () => {};
global.window = global; global.navigator = { vibrate: () => {} };
function runTimers(n) {
  for (let k = 0; k < n; k++) {
    intervals.filter(i => i.on).forEach(i => { try { i.fn(); } catch (e) { problems.push('interval threw: ' + e.message); i.on = false; } });
    const t = timers.splice(0); t.forEach(x => { try { x.fn(); } catch (e) { problems.push('timeout threw: ' + e.message); } });
  }
}

class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; }
  setState(p, cb) { Object.assign(this.state, typeof p === 'function' ? p(this.state, this.props) : p); if (cb) cb(); }
  forceUpdate() {}
}
let Component;
try { Component = new Function('DCLogic', script + '\n;return Component;')(DCLogic); }
catch (e) { console.log('SCRIPT SYNTAX ERROR: ' + e.message); process.exit(1); }

const c = new Component({});
try { if (c.componentDidMount) c.componentDidMount(); } catch (e) { problems.push('componentDidMount threw: ' + e.message); }
let vals;
function rv(label) { try { vals = c.renderVals(); return vals; } catch (e) { problems.push('renderVals threw after ' + label + ': ' + e.message); return vals || {}; } }
rv('mount');

// --- hole resolution against renderVals output, with sc-for scopes ---
// Build a simple tokenizer of markup tags to track sc-for scopes.
const tagRe = /<(\/?)(sc-for|sc-if)\b([^>]*)>|\{\{([^}]*)\}\}/g;
const scope = []; // stack of {as, list}
let m; const seen = new Set();
function resolve(pathStr) {
  const parts = pathStr.trim().split('.');
  const head = parts[0];
  if (/^(true|false|null|-?\d)/.test(head) || /^['"]/.test(head)) return true;
  if (head === '$index') return true;
  // loop var?
  for (let i = scope.length - 1; i >= 0; i--) {
    if (scope[i].as === head) {
      const list = resolve_value(scope[i].list);
      if (!Array.isArray(list)) { return 'list `' + scope[i].list + '` is not an array (' + typeof list + ')'; }
      if (list.length === 0) return true; // can't check
      let v = list[0];
      for (const p of parts.slice(1)) { if (v == null || !(p in Object(v))) return 'loop item lacks `' + parts.slice(1).join('.') + '` (as=' + head + ')'; v = v[p]; }
      return true;
    }
  }
  let v = vals;
  for (const p of parts) { if (v == null || !(p in Object(v))) return 'renderVals() has no `' + pathStr.trim() + '`'; v = v[p]; }
  return true;
}
function resolve_value(pathStr) {
  const parts = pathStr.trim().split('.');
  const head = parts[0];
  for (let i = scope.length - 1; i >= 0; i--) if (scope[i].as === head) { const l = resolve_value(scope[i].list); const it = Array.isArray(l) && l[0]; let v = it; for (const p of parts.slice(1)) v = v == null ? undefined : v[p]; return v; }
  let v = vals; for (const p of parts) v = v == null ? undefined : v[p]; return v;
}
const holeProblems = new Set();
while ((m = tagRe.exec(markup))) {
  if (m[4] !== undefined) { const r = resolve(m[4]); if (r !== true) holeProblems.add(r); continue; }
  const closing = m[1] === '/', tag = m[2], attrs = m[3] || '';
  if (tag === 'sc-for') {
    if (!closing) { const as = (attrs.match(/\bas="([^"]+)"/) || [])[1]; const list = (attrs.match(/\blist="\{\{([^}]+)\}\}"/) || [])[1]; scope.push({ as, list: (list || '').trim() }); const r = resolve(list || ''); if (r !== true) holeProblems.add(r); }
    else scope.pop();
  }
}
holeProblems.forEach(p => problems.push('hole: ' + p));

// --- handler exercise ---
const handlers = [...new Set([...markup.matchAll(/onClick="\{\{([^}.]+)\}\}"/g)].map(x => x[1].trim()))];
const loopHandlers = [...new Set([...markup.matchAll(/onClick="\{\{([^}]+\.[^}]+)\}\}"/g)].map(x => x[1].trim()))];
notes.push('handlers: ' + handlers.join(', '));
notes.push('loop handlers: ' + loopHandlers.join(', ') || 'none');
for (const h of handlers) {
  const fn = vals[h];
  if (typeof fn !== 'function') { problems.push('handler `' + h + '` is not a function in renderVals()'); continue; }
  try { fn(); } catch (e) { problems.push('handler `' + h + '` threw: ' + e.message); }
  runTimers(3); rv('handler ' + h);
}
// loop handlers: call first item's
for (const lh of loopHandlers) {
  const [as, ...rest] = lh.split('.');
  const listName = (markup.match(new RegExp('<sc-for[^>]*list="\\{\\{([^}]+)\\}\\}"[^>]*as="' + as + '"')) || markup.match(new RegExp('<sc-for[^>]*as="' + as + '"[^>]*list="\\{\\{([^}]+)\\}\\}"')) || [])[1];
  const list = listName && vals[listName.trim()];
  if (Array.isArray(list) && list[0]) { let fn = list[0]; for (const p of rest) fn = fn && fn[p]; if (typeof fn !== 'function') problems.push('loop handler `' + lh + '` not a function'); else { try { fn(); } catch (e) { problems.push('loop handler `' + lh + '` threw: ' + e.message); } rv('loop handler ' + lh); } }
}
// long run: exercise timers a lot (transcript etc.)
runTimers(200); rv('after 200 ticks');
// theme classes
const themeHandlers = handlers.filter(h => /^set(Day|Dusk|Dawn|Night|Paper|Slate)$/.test(h));
for (const h of themeHandlers) { try { vals[h](); } catch (e) {} rv(h); notes.push(h + ' → themeClass="' + vals.themeClass + '"' + (vals.thumbClass ? ' thumbClass=' + vals.thumbClass : '')); }
// booleans sanity: flags that are undefined
const flagNames = [...new Set([...markup.matchAll(/<sc-if value="\{\{([^}]+)\}\}"/g)].map(x => x[1].trim()))].filter(f => !f.includes('.'));
for (const f of flagNames) if (!(f in vals)) problems.push('sc-if flag `' + f + '` missing from renderVals()');
if (c.componentWillUnmount) { try { c.componentWillUnmount(); } catch (e) { problems.push('componentWillUnmount threw: ' + e.message); } }

console.log(path);
notes.forEach(n => console.log('  note: ' + n));
[...new Set(problems)].forEach(p => console.log('  PROBLEM: ' + p));
console.log('  LOGIC RESULT: ' + (problems.length ? problems.length + ' problem(s)' : 'CLEAN'));
process.exit(problems.length ? 1 : 0);
