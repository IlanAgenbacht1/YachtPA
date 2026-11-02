/**
 * The sea-service record as printable HTML (SCOPE §3.11). Pure: takes plain
 * data, returns a string; the PDF is made on the phone from this.
 *
 * Wording rule (SCOPE §12): the record states what was logged and how. It
 * never claims to be verified or to satisfy a qualification.
 */

export type RecordVessel = {
  name: string;
  propulsion: 'motor' | 'sail';
  loaM: number | null;
  gt: number | null;
  flag: string | null;
  position: string;
  startDate: string;
  endDate: string | null;
  captain: string | null;
  company: string | null;
  daysAboard: number;
  seaDays: number;
  nm: number;
};

export type RecordVoyage = {
  date: string;
  vessel: string;
  from: string;
  to: string;
  nm: number;
  underwayMin: number;
  nightMin: number;
  kind: 'Day' | 'Night' | 'Overnight';
  source: 'gps' | 'sim' | 'manual';
};

export type RecordLog = { date: string; vessel: string; activities: string[]; duties: string[] };

export type RecordData = {
  name: string;
  nationality: string | null;
  generatedAt: string;
  totals: { nm: number; underwayHours: number; nightHours: number; seaDays: number; voyages: number; overnight: number };
  vessels: RecordVessel[];
  voyages: RecordVoyage[];
  logs: RecordLog[];
};

const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const n1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
const hm = (min: number) => `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, '0')}m`;

function isoNice(iso: string | null): string {
  if (!iso) return 'present';
  const [y, m, d] = iso.split('-').map(Number);
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${M[m - 1]} ${y}`;
}

export function renderRecordHtml(r: RecordData): string {
  const vesselRows = r.vessels
    .map(
      (v) => `<tr>
        <td><b>${esc(v.name)}</b><br><span class="m">${v.propulsion === 'sail' ? 'Sailing' : 'Motor'} yacht${v.loaM ? ` · ${n1(v.loaM)} m` : ''}${v.gt ? ` · ${v.gt} GT` : ''}${v.flag ? ` · ${esc(v.flag)}` : ''}</span></td>
        <td>${esc(v.position)}</td>
        <td>${isoNice(v.startDate)} – ${isoNice(v.endDate)}</td>
        <td class="r">${v.daysAboard}</td>
        <td class="r">${v.seaDays}</td>
        <td class="r">${n1(v.nm)}</td>
        <td>${esc(v.captain) || '<span class="m">—</span>'}${v.company ? `<br><span class="m">${esc(v.company)}</span>` : ''}</td>
      </tr>`,
    )
    .join('');

  const voyageRows = r.voyages
    .map(
      (v) => `<tr>
        <td>${isoNice(v.date)}</td>
        <td>${esc(v.vessel)}</td>
        <td>${esc(v.from)} → ${esc(v.to)}</td>
        <td class="r">${n1(v.nm)}</td>
        <td class="r">${hm(v.underwayMin)}</td>
        <td class="r">${hm(v.nightMin)}</td>
        <td>${v.kind}</td>
        <td>${v.source === 'gps' ? 'GPS' : v.source === 'manual' ? 'Manual' : 'Simulated'}</td>
      </tr>`,
    )
    .join('');

  const logRows = r.logs
    .map(
      (l) => `<tr>
        <td>${isoNice(l.date)}</td>
        <td>${esc(l.vessel)}</td>
        <td>${l.activities.map(esc).join(', ')}</td>
        <td>${l.duties.map(esc).join('<br>')}</td>
      </tr>`,
    )
    .join('');

  const signBlocks = r.vessels
    .map(
      (v) => `<div class="sign">
        <div><b>${esc(v.name)}</b> · ${isoNice(v.startDate)} – ${isoNice(v.endDate)}</div>
        <div class="line">Master's name</div><div class="line">Signature</div><div class="line">Date</div>
      </div>`,
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8">
<style>
  @page { margin: 18mm 14mm; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #0E1D31; font-size: 10.5px; line-height: 1.4; }
  h1 { font-size: 22px; margin: 0 0 2px; }
  h2 { font-size: 13px; margin: 22px 0 8px; text-transform: uppercase; letter-spacing: 1px; color: #5A6A7A; }
  .m { color: #5A6A7A; }
  .r { text-align: right; font-variant-numeric: tabular-nums; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .6px; color: #5A6A7A; border-bottom: 1px solid #C9D2DB; padding: 4px 6px; }
  td { border-bottom: 1px solid #E0E6EC; padding: 5px 6px; vertical-align: top; }
  tr { page-break-inside: avoid; }
  .totals { display: flex; gap: 10px; margin-top: 14px; }
  .totals div { flex: 1; border: 1px solid #E0E6EC; border-radius: 8px; padding: 8px 10px; }
  .totals b { display: block; font-size: 18px; }
  .sign { border: 1px solid #E0E6EC; border-radius: 8px; padding: 10px; margin-bottom: 10px; page-break-inside: avoid; }
  .line { border-bottom: 1px solid #9FB0C0; height: 26px; margin-top: 6px; color: #5A6A7A; font-size: 9px; padding-top: 14px; }
  .note { margin-top: 18px; font-size: 9.5px; color: #5A6A7A; }
</style></head><body>
  <h1>Sea service record</h1>
  <div><b>${esc(r.name)}</b>${r.nationality ? ` · ${esc(r.nationality)}` : ''}</div>
  <div class="m">Generated ${esc(r.generatedAt)} with YachtPA</div>

  <div class="totals">
    <div><b>${n1(r.totals.nm)}</b>NM logged</div>
    <div><b>${n1(r.totals.underwayHours)}</b>hours underway</div>
    <div><b>${n1(r.totals.nightHours)}</b>night hours</div>
    <div><b>${r.totals.seaDays}</b>sea days</div>
    <div><b>${r.totals.voyages}</b>voyages · ${r.totals.overnight} overnight</div>
  </div>

  <h2>Vessels</h2>
  <table><thead><tr><th>Vessel</th><th>Position</th><th>Dates</th><th class="r">Days aboard</th><th class="r">Sea days</th><th class="r">NM</th><th>Master · company</th></tr></thead>
  <tbody>${vesselRows || '<tr><td colspan="7" class="m">No vessels</td></tr>'}</tbody></table>

  <h2>Voyages</h2>
  <table><thead><tr><th>Date</th><th>Vessel</th><th>Passage</th><th class="r">NM</th><th class="r">Underway</th><th class="r">Night</th><th>Type</th><th>Source</th></tr></thead>
  <tbody>${voyageRows || '<tr><td colspan="8" class="m">No confirmed voyages</td></tr>'}</tbody></table>

  <h2>Daily log</h2>
  <table><thead><tr><th>Date</th><th>Vessel</th><th>Activities</th><th>Duties</th></tr></thead>
  <tbody>${logRows || '<tr><td colspan="4" class="m">No log entries</td></tr>'}</tbody></table>

  <h2>Master's confirmation</h2>
  ${signBlocks}

  <p class="note">Distances, hours underway and night hours are calculated from the phone's GPS track: fixes worse than 50 m are discarded, and only time moving at 1 kn or more counts as underway. Night is sunset to sunrise at the vessel's position. Days aboard count every day of the engagement; a sea day is a day with time underway. Entries are the crew member's own and are not verified by YachtPA. Check the definitions used by the relevant authority before submitting.</p>
</body></html>`;
}
