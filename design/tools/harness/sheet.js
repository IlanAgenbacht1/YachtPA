// Compose contact sheets: 4 shots per row at 50% (195x422), with labels.
const { chromium } = require(process.env.PW_ROOT + '/playwright');
const fs = require('fs'), path = require('path');
const here = __dirname; const only = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  for (const name of fs.readdirSync(path.join(here, 'shots'))) {
    if (only && only !== name) continue;
    const dir = path.join(here, 'shots', name);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.png') && !f.startsWith('sheet')).sort();
    const per = 4;
    for (let i = 0; i < files.length; i += per) {
      const chunk = files.slice(i, i + per);
      const html = '<html><body style="margin:0;background:#333;display:flex;gap:12px;padding:12px;font:12px monospace;color:#eee">' + chunk.map(f => '<div><div style="margin-bottom:4px">' + f.replace('.png', '') + '</div><img src="file://' + path.join(dir, f) + '" style="width:390px;height:844px;display:block"></div>').join('') + '</body></html>';
      const page = await browser.newPage({ viewport: { width: 12 + chunk.length * 402, height: 884 }, deviceScaleFactor: 1 });
      const hf = path.join(dir, 'sheet-' + String(i / per + 1).padStart(2, '0') + '.html'); fs.writeFileSync(hf, html.replace(/file:\/\/[^"]*\//g, './'));
      await page.goto('file://' + hf); await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(dir, 'sheet-' + String(i / per + 1).padStart(2, '0') + '.png') });
      await page.close();
    }
    console.log(name + ': ' + Math.ceil(files.length / per) + ' sheets');
  }
  await browser.close();
})();
