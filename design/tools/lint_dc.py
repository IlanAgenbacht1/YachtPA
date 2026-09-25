#!/usr/bin/env python3
"""Static checks for a .dc.html artboard. Usage: python3 lint_dc.py FILE"""
import sys, re, json, html
from html.parser import HTMLParser

path = sys.argv[1]
src = open(path, encoding='utf-8').read()
errors, warns = [], []

VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}

# 1. required lines
if '<script src="./support.js"></script>' not in src: errors.append('missing exact line <script src="./support.js"></script>')
if '<x-dc>' not in src or '</x-dc>' not in src: errors.append('missing <x-dc>…</x-dc>')
if '<helmet>' not in src: errors.append('missing <helmet>')
if 'class Component extends DCLogic' not in src: errors.append('missing `class Component extends DCLogic`')
if 'body{margin:0' not in src.replace(' ', ''): warns.append('helmet style should contain body{margin:0;…}')
for bad in ['<iframe', '<object', '<embed', 'innerHTML', 'appendChild', 'document.createElement', 'addEventListener(\'keydown', 'addEventListener("keydown']:
    if bad in src: errors.append('forbidden: ' + bad)
if re.search(r'^\s*(import|export)\s', src, re.M): errors.append('import/export in script')
if re.search(r'xlink:href', src): warns.append('xlink:href found; use plain href')

# 2. data-props JSON
m = re.search(r"data-props='([^']*)'", src)
if not m:
    errors.append("missing single-quoted data-props='…' on the x-dc script tag")
else:
    try:
        props = json.loads(html.unescape(m.group(1)))
        pv = props.get('$preview', {})
        if pv.get('width') != 390 or pv.get('height') != 844: errors.append('$preview must be {"width":390,"height":844}')
    except Exception as e:
        errors.append('data-props JSON does not parse: %s' % e)

# 3. holes: dotted lookups or literals only
markup = src.split('<script type="text/x-dc"')[0]
script = src[len(markup):]
hole_re = re.compile(r'\{\{(.*?)\}\}', re.S)
ok_hole = re.compile(r"^\s*(\$?[A-Za-z_][\w$]*(\.[\w$]+)*|true|false|null|-?\d+(\.\d+)?|'[^']*'|\"[^\"]*\")\s*$")
first_segments = set()
for h in hole_re.findall(markup):
    if not ok_hole.match(h): errors.append('hole is not a dotted lookup: {{%s}}' % h.strip())
    else:
        seg = h.strip().split('.')[0]
        if re.match(r'^[A-Za-z_$]', seg): first_segments.add(seg)

# loop vars declared by sc-for as="…"
loop_vars = set(re.findall(r'<sc-for[^>]*\bas="([^"]+)"', markup)) | {'$index'}
for seg in sorted(first_segments):
    if seg in loop_vars or seg in ('true','false','null'): continue
    if not re.search(r'\b' + re.escape(seg) + r'\b', script):
        warns.append('hole `%s` used in markup but the identifier never appears in the script' % seg)

# 4. sc-if / sc-for hints
for tag in re.findall(r'<sc-if\b[^>]*>', markup):
    if 'hint-placeholder-val' not in tag: errors.append('sc-if without hint-placeholder-val: ' + tag[:80])
    if 'value="{{' not in tag: errors.append('sc-if without value="{{…}}": ' + tag[:80])
for tag in re.findall(r'<sc-for\b[^>]*>', markup):
    if 'hint-placeholder-count' not in tag: errors.append('sc-for without hint-placeholder-count: ' + tag[:80])
    if ' as="' not in tag: errors.append('sc-for without as="…": ' + tag[:80])

# 5. unquoted attributes (rough)
for tag in re.findall(r'<[a-zA-Z][^>]*>', markup):
    if re.search(r'\s[\w:-]+=(?!["\'])', tag): errors.append('unquoted attribute in: ' + tag[:100])

# 6. emoji
if re.search('[\U0001F300-\U0001FAFF☀-➿\U0001F000-\U0001F2FF]', markup): errors.append('emoji found in markup')

# 7. tag balance
class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False); self.stack=[]; self.errs=[]
    def handle_starttag(self, tag, attrs):
        if tag in VOID: return
        self.stack.append((tag, self.getpos()[0]))
    def handle_startendtag(self, tag, attrs):
        pass
    def handle_endtag(self, tag):
        if tag in VOID: return
        if not self.stack: self.errs.append('stray </%s> at line %d' % (tag, self.getpos()[0])); return
        t, ln = self.stack[-1]
        if t == tag: self.stack.pop(); return
        # try to find it deeper
        names = [s[0] for s in self.stack]
        if tag in names:
            idx = len(names) - 1 - names[::-1].index(tag)
            for s in self.stack[idx+1:]: self.errs.append('unclosed <%s> opened at line %d (closed by </%s> at line %d)' % (s[0], s[1], tag, self.getpos()[0]))
            del self.stack[idx:]
        else:
            self.errs.append('stray </%s> at line %d (open: %s)' % (tag, self.getpos()[0], t))
p = P(); p.feed(src); p.close()
for s in p.stack:
    if s[0] not in ('html','body','head'): p.errs.append('never closed <%s> opened at line %d' % s)
errors += p.errs

# 8. root size
root = re.search(r'</helmet>\s*<div([^>]*)>', markup)
if not root: errors.append('first element after </helmet> must be the root <div>')
else:
    st = root.group(1).replace(' ', '')
    if 'width:390px' not in st or 'height:844px' not in st: errors.append('root div must have inline width:390px;height:844px')
    if 'overflow:hidden' not in st: warns.append('root div should have overflow:hidden')

# 9. style holes report
sh = re.findall(r'style="[^"]*\{\{[^"]*"', markup)
if sh: warns.append('%d style attributes contain holes (fine only for state-driven values): e.g. %s' % (len(sh), sh[0][:90]))

size = len(src.encode('utf-8'))
print('%s: %d bytes' % (path, size))
for e in errors: print('ERROR:', e)
for w in warns: print('warn:', w)
print('RESULT:', 'CLEAN' if not errors else '%d error(s)' % len(errors))
sys.exit(1 if errors else 0)
