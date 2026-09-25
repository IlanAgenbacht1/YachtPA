const { chromium } = require(process.env.PW_ROOT + '/playwright');
const fs = require('fs'), path = require('path');
const here = __dirname;
const plans = JSON.parse(fs.readFileSync(path.join(here, 'plans.json'), 'utf8'));
const only = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  for (const [name, steps] of Object.entries(plans)) {
    if (only && only !== name) continue;
    const outDir = path.join(here, 'shots', name); fs.mkdirSync(outDir, { recursive: true });
    for (const f of fs.readdirSync(outDir)) fs.unlinkSync(path.join(outDir, f));
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto('file://' + path.join(here, 'render.html'));
    const src = fs.readFileSync(path.join(here, '..', 'project', name + '.dc.html'), 'utf8');
    await page.evaluate(([s, f]) => window.mountDC(s, f), [src, './fonts/' + name + '.css']);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    let n = 0;
    for (const step of steps) {
      const [op, arg] = step;
      if (op === 'call') { try { await page.evaluate(h => window.callDC(h), arg); } catch (e) { errors.push('call ' + arg + ': ' + e.message); } }
      else if (op === 'wait') await page.waitForTimeout(arg);
      else if (op === 'shot' || op === 'shotscroll') {
        await page.evaluate(() => window.renderDC());
        await page.waitForTimeout(arg && arg.settle || 1400);
        if (op === 'shotscroll') await page.evaluate(() => { document.querySelectorAll('#stage *').forEach(el => { const cs = getComputedStyle(el); if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight; }); });
        n++; const file = path.join(outDir, String(n).padStart(2, '0') + '-' + (typeof arg === 'string' ? arg : arg.name) + '.png');
        await page.screenshot({ path: file });
        // overflow report: elements wider than the stage or text overflowing horizontally
        const over = await page.evaluate(() => { const r = []; document.querySelectorAll('#stage *').forEach(el => { const b = el.getBoundingClientRect(); if (b.width > 0 && (b.right > 391 || b.left < -1) && getComputedStyle(el).position !== 'absolute' && !el.closest('svg')) r.push(el.tagName.toLowerCase() + '.' + (el.className && el.className.baseVal === undefined ? String(el.className).split(' ')[0] : '') + ' right=' + Math.round(b.right) + ' text=' + (el.textContent || '').trim().slice(0, 30)); }); return r.slice(0, 6); });
        if (over.length) errors.push('overflow @' + path.basename(file) + ': ' + over.join(' | '));
      }
    }
    fs.writeFileSync(path.join(outDir, 'log.txt'), errors.join('\n'));
    console.log(name + ': ' + n + ' shots, ' + errors.length + ' notes');
    errors.forEach(e => console.log('  ' + e));
    await page.close();
  }
  await browser.close();
})();
