#!/usr/bin/env node
/**
 * Build screenshots/index.html — a single contact sheet over the FLAT
 * screenshots/ folder, so a whole run reviews in one browser tab. Filenames are
 * <phase>__<spec>__<test>__<NN>-<label>.png; we parse those four segments to
 * group by phase → spec → test. Run from tests/e2e:  node make-contact-sheet.js
 */
const fs = require('fs');
const path = require('path');

const DIR = 'screenshots';
const OUT = path.join(DIR, 'index.html');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const human = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

if (!fs.existsSync(DIR)) { console.error(`No ${DIR}/ dir`); process.exit(0); }

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.png')).sort();
const tree = {}; // phase -> spec -> test -> [ {seq,label,file} ]
for (const f of files) {
    const m = f.replace(/\.png$/, '').split('__');
    if (m.length < 4) continue;
    const [phase, spec, testName, stepPart] = m;
    const seq = (stepPart.match(/^(\d+)/) || [])[1] || '';
    const label = stepPart.replace(/^\d+-/, '');
    ((tree[phase] ??= {})[spec] ??= {})[testName] ??= [];
    tree[phase][spec][testName].push({ seq, label, file: f });
}

let html = `<!doctype html><meta charset="utf-8"><title>E2E screenshots</title>
<style>
 body{font:14px/1.5 system-ui,sans-serif;margin:0;background:#0d1117;color:#e6edf3}
 header{position:sticky;top:0;background:#161b22;padding:12px 20px;border-bottom:1px solid #30363d;z-index:5}
 h2{margin:24px 20px 4px;color:#58a6ff} h3{margin:16px 20px 4px;color:#7ee787;font-size:15px}
 h4{margin:12px 20px 4px;color:#d2a8ff;font-size:13px;font-weight:600}
 .row{display:flex;flex-wrap:wrap;gap:12px;padding:4px 20px 12px}
 figure{margin:0;width:280px} img{width:280px;border:1px solid #30363d;border-radius:6px;cursor:zoom-in;background:#fff}
 figcaption{font-size:11px;color:#8b949e;margin-top:4px;word-break:break-word}
 .phase-pro h2{color:#f0883e} dialog{border:none;background:transparent;max-width:95vw}
 dialog img{width:auto;max-width:92vw;max-height:92vh}
</style>
<header><b>E2E Screenshots</b> — ${files.length} shots across ${Object.keys(tree).length} phase(s). Click any image to zoom.</header>
<dialog id="zoom"><img></dialog>`;

for (const phase of Object.keys(tree).sort()) {
    html += `<section class="phase-${esc(phase)}"><h2>Phase: ${esc(phase.toUpperCase())}</h2>`;
    for (const spec of Object.keys(tree[phase]).sort()) {
        html += `<h3>${esc(human(spec))}</h3>`;
        for (const testName of Object.keys(tree[phase][spec]).sort()) {
            html += `<h4>${esc(human(testName))}</h4><div class="row">`;
            for (const s of tree[phase][spec][testName]) {
                html += `<figure><img loading="lazy" src="${esc(s.file)}">`
                     + `<figcaption>${esc(s.seq)} — ${esc(human(s.label))}</figcaption></figure>`;
            }
            html += `</div>`;
        }
    }
    html += `</section>`;
}
html += `<script>
 const dlg=document.getElementById('zoom'),big=dlg.querySelector('img');
 document.querySelectorAll('.row img').forEach(i=>i.onclick=()=>{big.src=i.src;dlg.showModal()});
 dlg.onclick=()=>dlg.close();
</script>`;

fs.writeFileSync(OUT, html);
console.log(`Wrote ${OUT} (${files.length} screenshots)`);
