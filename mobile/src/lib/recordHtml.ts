/**
 * The professional sea-service record (PRD §11) as one self-contained HTML
 * page, printed to PDF on the phone. Pure function so it can be tested and,
 * later, rendered server-side from the same template (SCOPE §5).
 */
import { dayKey } from '@/domain/dates';
import { currentDocs, docTypeLabel } from '@/domain/documents';
import type { Experience, VesselHistory } from '@/domain/experience';
import type { QualProgress } from '@/domain/qualifications';
import type { Doc, Engagement, Profile, Vessel, Voyage } from '@/domain/types';

import { fmtDay, fmtDur, fmtInt, fmtTime } from './format';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export type RecordInput = {
  profile: Profile;
  exp: Experience;
  history: VesselHistory[];
  voyages: Voyage[];
  engagements: Engagement[];
  vessels: Vessel[];
  docs: Doc[];
  quals: QualProgress[];
  generatedAt: number;
};

const STATUS = { draft: 'Draft', confirmed: 'Self-recorded', requested: 'Sign-off requested', signed: 'Verified' } as const;

export function recordHtml(r: RecordInput): string {
  const vesselOf = (engagementId: string) => {
    const e = r.engagements.find((x) => x.id === engagementId);
    return { e, v: r.vessels.find((x) => x.id === e?.vesselId) };
  };
  const voyages = r.voyages.filter((v) => v.endedAt !== null && v.status !== 'draft').sort((a, b) => a.startedAt - b.startedAt);
  const current = r.history.find((h) => h.engagement.endDate === null);

  const stat = (label: string, value: string) => `<div class="stat"><div class="v">${esc(value)}</div><div class="l">${esc(label)}</div></div>`;

  const vesselRows = r.history
    .map(
      (h) => `<tr>
        <td><b>${esc(h.vessel?.name ?? '—')}</b><br><span class="m">${esc(
          [h.vessel?.propulsion === 'sail' ? 'Sailing yacht' : 'Motor yacht', h.vessel?.loaM ? `${h.vessel.loaM} m` : '', h.vessel?.gt ? `${h.vessel.gt} GT` : '', h.vessel?.flag ?? '']
            .filter(Boolean)
            .join(' · '),
        )}</span></td>
        <td>${esc(h.engagement.position)}${h.engagement.captain ? `<br><span class="m">Capt. ${esc(h.engagement.captain)}</span>` : ''}</td>
        <td>${esc(fmtDay(h.engagement.startDate))} – ${h.engagement.endDate ? esc(fmtDay(h.engagement.endDate)) : 'present'}</td>
        <td class="n">${fmtInt(h.nm)}</td>
        <td class="n">${h.seaDays}</td>
        <td>${h.verified ? 'Verified ✓' : 'Self-recorded'}</td>
      </tr>`,
    )
    .join('');

  const voyageRows = voyages
    .map((v) => {
      const { e, v: ves } = vesselOf(v.engagementId);
      return `<tr>
        <td>${esc(fmtDay(dayKey(v.startedAt)))}<br><span class="m">${fmtTime(v.startedAt)}–${fmtTime(v.endedAt!)}</span></td>
        <td>${esc(v.startPlace || '—')} → ${esc(v.endPlace || '—')}<br><span class="m">${esc(ves?.name ?? '')} · ${esc(e?.position ?? '')}${v.asSkipper ? ' · skipper' : ''}</span></td>
        <td class="n">${v.distanceNm.toFixed(1)}</td>
        <td class="n">${fmtDur(v.underwayMin)}</td>
        <td class="n">${fmtDur(v.nightMin)}</td>
        <td>${v.passageType === 'overnight' ? 'Overnight' : v.passageType === 'night' ? 'Night' : 'Day'}${v.source === 'manual' ? ' · manual' : ' · GPS'}</td>
        <td>${STATUS[v.status]}</td>
      </tr>`;
    })
    .join('');

  const docRows = currentDocs(r.docs)
    .map(
      (d) => `<tr><td><b>${esc(d.name)}</b><br><span class="m">${esc(docTypeLabel(d.type))}</span></td><td>${esc(d.issuer)}</td><td>${esc(d.number)}</td>
      <td>${d.issueDate ? esc(fmtDay(d.issueDate)) : ''}</td><td>${d.expiryDate ? esc(fmtDay(d.expiryDate)) : 'No expiry'}</td></tr>`,
    )
    .join('');

  const qualBlocks = r.quals
    .map(
      (q) => `<div class="qual"><b>${esc(q.def.authority)} ${esc(q.def.name)}</b> (${q.discipline === 'sail' ? 'sail' : 'power'}) — ${Math.round(q.pct * 100)}% of logged requirements
      <ul>${q.results
        .filter((x) => x.met !== null)
        .map((x) => `<li>${x.met ? '✓' : '○'} ${esc(x.rule.label)}: ${esc(x.display)}</li>`)
        .join('')}</ul>
      <span class="m">Source: ${esc(q.def.sourceUrl)} (checked ${esc(fmtDay(q.def.verifiedOn))})</span></div>`,
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Sea service record · ${esc(r.profile.name)}</title>
<style>
  @page { margin: 18mm 14mm; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #0b1b2b; font-size: 10.5pt; }
  h1 { font-size: 20pt; margin: 0 0 2px; letter-spacing: -0.01em; }
  h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: 0.12em; color: #5a6b7b; margin: 22px 0 8px; border-bottom: 1px solid #d5dde5; padding-bottom: 4px; }
  .m { color: #5a6b7b; font-size: 9pt; }
  .stats { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
  .stat { border: 1px solid #d5dde5; border-radius: 8px; padding: 8px 12px; min-width: 92px; }
  .stat .v { font-size: 15pt; font-weight: 700; font-variant-numeric: tabular-nums; }
  .stat .l { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.1em; color: #5a6b7b; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.08em; color: #5a6b7b; border-bottom: 1px solid #d5dde5; padding: 4px 6px; }
  td { border-bottom: 1px solid #eef2f5; padding: 6px; vertical-align: top; }
  td.n { text-align: right; font-variant-numeric: tabular-nums; }
  tr { page-break-inside: avoid; }
  .qual { margin-bottom: 10px; } .qual ul { margin: 4px 0; padding-left: 18px; }
  .foot { margin-top: 24px; font-size: 8.5pt; color: #5a6b7b; border-top: 1px solid #d5dde5; padding-top: 8px; }
</style></head><body>
  <div class="m">PROFESSIONAL SEA SERVICE RECORD</div>
  <h1>${esc(r.profile.name || 'Crew member')}</h1>
  <div class="m">${esc([current?.engagement.position, current?.vessel?.name, r.profile.nationality].filter(Boolean).join(' · '))}</div>
  <div class="stats">
    ${stat('Sea miles', fmtInt(r.exp.nm))}
    ${stat('Sea days', fmtInt(r.exp.seaDays))}
    ${stat('Days aboard', fmtInt(r.exp.daysAboard))}
    ${stat('Hours underway', fmtInt(r.exp.underwayHours))}
    ${stat('Night hours', fmtInt(r.exp.nightHours))}
    ${stat('Vessels', String(r.exp.vessels))}
  </div>

  <h2>Vessel history</h2>
  <table><thead><tr><th>Vessel</th><th>Position</th><th>Dates</th><th style="text-align:right">NM</th><th style="text-align:right">Sea days</th><th>Status</th></tr></thead>
  <tbody>${vesselRows || '<tr><td colspan="6" class="m">No vessels recorded.</td></tr>'}</tbody></table>

  <h2>Voyages</h2>
  <table><thead><tr><th>Date</th><th>Passage</th><th style="text-align:right">NM</th><th style="text-align:right">Underway</th><th style="text-align:right">Night</th><th>Type</th><th>Status</th></tr></thead>
  <tbody>${voyageRows || '<tr><td colspan="7" class="m">No confirmed voyages.</td></tr>'}</tbody></table>

  ${docRows ? `<h2>Certificates and documents</h2><table><thead><tr><th>Document</th><th>Issuer</th><th>Number</th><th>Issued</th><th>Expires</th></tr></thead><tbody>${docRows}</tbody></table>` : ''}

  ${qualBlocks ? `<h2>Qualification progress</h2>${qualBlocks}` : ''}

  <div class="foot">
    Generated ${esc(fmtDay(dayKey(r.generatedAt)))} with YachtPA. Distances and times are computed from GPS tracks recorded on the crew member's phone unless marked manual.
    Entries marked "Self-recorded" have not been verified by a captain or employer. YachtPA does not issue or approve qualifications;
    qualification progress shows whether the logged experience appears to meet the published requirements. Check with the issuing authority.
  </div>
</body></html>`;
}
