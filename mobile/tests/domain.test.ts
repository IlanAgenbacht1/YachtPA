/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addDays, daysBetween, dayKey, isDayKey } from '../src/domain/dates';
import { docStatus, reminderDays, remainingLabel, history } from '../src/domain/documents';
import { draftFrom, watches } from '../src/domain/draft';
import { experience } from '../src/domain/experience';
import { distanceNm, filterFixes } from '../src/domain/geo';
import { placeName } from '../src/domain/places';
import { QUALIFICATIONS } from '../src/domain/qualData';
import { evaluate, verdict } from '../src/domain/qualifications';
import { missedDays, voyageFlags } from '../src/domain/sanity';
import { nextTransition } from '../src/domain/sun';
import type { Doc, Engagement, LogEntry, Vessel } from '../src/domain/types';
import { summarizeTrack } from '../src/domain/voyage';

import { BLACK_RIVER, jitter, PORT_LOUIS, run, voyageFrom } from './helpers';

const T0 = Date.UTC(2026, 10, 21, 5, 0); // 09:00 Mauritius, daylight

describe('geo', () => {
  it('measures one degree of latitude as 60 NM', () => {
    assert.ok(Math.abs(distanceNm(0, 0, 1, 0) - 60.04) < 0.1);
  });
  it('drops inaccurate fixes and impossible jumps', () => {
    const fixes = [
      { ts: 0, lat: 0, lon: 0, accuracy: 5, speed: null },
      { ts: 60_000, lat: 0, lon: 0.001, accuracy: 200, speed: null },
      { ts: 120_000, lat: 1, lon: 0, accuracy: 5, speed: null }, // 60 NM in 2 min
      { ts: 180_000, lat: 0, lon: 0.002, accuracy: 5, speed: null },
    ];
    assert.equal(filterFixes(fixes).length, 2);
  });
});

describe('voyage summary', () => {
  const track = [...jitter(PORT_LOUIS, T0, 30), ...run(PORT_LOUIS, BLACK_RIVER, T0 + 31 * 60_000, 10), ...jitter(BLACK_RIVER, T0 + 31 * 60_000 + 84 * 60_000, 30)];
  const s = summarizeTrack(track, track[0].ts, track[track.length - 1].ts);

  it('counts the passage distance and ignores anchor jitter', () => {
    const straight = distanceNm(...PORT_LOUIS, ...BLACK_RIVER);
    assert.equal(s.segments.length, 1);
    assert.ok(Math.abs(s.distanceNm - straight) < 0.3, `${s.distanceNm} vs ${straight}`);
  });
  it('reports underway time, speeds and a day passage', () => {
    assert.ok(Math.abs(s.underwayMin - 83) < 4, `${s.underwayMin}`);
    assert.ok(Math.abs(s.avgKn - 10) < 0.6, `${s.avgKn}`);
    assert.ok(s.maxKn > 9 && s.maxKn < 11);
    assert.equal(s.nightMin, 0);
    assert.equal(s.passageType, 'day');
  });
  it('gives zero miles for a track that never moves', () => {
    const still = jitter(PORT_LOUIS, T0, 180, 25);
    assert.equal(summarizeTrack(still, still[0].ts, still[still.length - 1].ts).distanceNm, 0);
  });
  it('finds night minutes and an overnight passage', () => {
    // 12:00 UTC (16:00 local) heading south for 16 h at 8 kn: through sunset and sunrise.
    const start = Date.UTC(2026, 10, 21, 12, 0);
    const far: [number, number] = [-20.16 - (8 * 16) / 60, 57.498];
    const t = run(PORT_LOUIS, far, start, 8, 60);
    const o = summarizeTrack(t, t[0].ts, t[t.length - 1].ts);
    assert.equal(o.passageType, 'overnight');
    assert.ok(o.nightMin > 9 * 60 && o.nightMin < 12 * 60, `${o.nightMin}`);
    assert.ok(o.segments[0].directNm > 120);
  });
});

describe('sun', () => {
  it('puts sunset in Port Louis around 18:30 local in November', () => {
    const t = nextTransition(Date.UTC(2026, 10, 21, 8, 0), -20.16, 57.498, 'sunset');
    assert.ok(t !== null);
    const h = new Date(t!).getUTCHours() + new Date(t!).getUTCMinutes() / 60;
    assert.ok(h > 14.2 && h < 15, `${h}`);
  });
  it('puts midsummer sunset in London around 21:21 BST', () => {
    const t = nextTransition(Date.UTC(2026, 5, 21, 12, 0), 51.5, -0.13, 'sunset');
    const h = new Date(t!).getUTCHours() + new Date(t!).getUTCMinutes() / 60;
    assert.ok(Math.abs(h - 20.35) < 0.15, `${h}`);
  });
});

describe('draft', () => {
  it('splits the PRD example into five duties without inventing any', () => {
    const d = draftFrom(
      'Today we washed down the exterior, polished the stainless, checked the tender, changed the fuel filters on the generator and then did a safety inspection before departure.',
    );
    assert.deepEqual(
      d.duties.map((x) => x.text),
      ['Washed down the exterior', 'Polished the stainless', 'Checked the tender', 'Changed the fuel filters on the generator', 'Did a safety inspection before departure'],
    );
    for (const x of d.duties) assert.ok(x.source && x.source.length > 0);
    assert.deepEqual([...d.activities].sort(), ['Maintenance', 'Safety drills', 'Tender driving', 'Washdown']);
  });
  it('reads the concept example: passage, activities, night watch', () => {
    const d = draftFrom('I was on Shadow from Port Louis to Black River. I did the dock lines, helped with the tender and did a night watch from 9 to 11.');
    assert.deepEqual(d.passage, { from: 'Port Louis', to: 'Black River' });
    assert.deepEqual(d.watches, [{ type: 'night', start: '21:00', end: '23:00' }]);
    assert.ok(d.activities.includes('Line handling'));
    assert.ok(d.activities.includes('Tender driving'));
    assert.ok(d.activities.includes('Night watch'));
    assert.ok(!d.duties.some((x) => /Shadow/.test(x.text)));
  });
  it('parses 24 h watch times', () => {
    assert.deepEqual(watches('anchor watch 0200 to 0400'), [{ type: 'anchor', start: '02:00', end: '04:00' }]);
  });
});

describe('dates', () => {
  it('handles month ends and validation', () => {
    assert.equal(addDays('2026-02-28', 1), '2026-03-01');
    assert.equal(daysBetween('2026-01-01', '2027-01-01'), 365);
    assert.ok(isDayKey('2026-11-21'));
    assert.ok(!isDayKey('2026-02-30'));
  });
});

describe('documents', () => {
  const today = '2026-09-24';
  it('traffic-lights by days left', () => {
    assert.equal(docStatus({ expiryDate: '2026-12-08' }, today), 'warn');
    assert.equal(docStatus({ expiryDate: '2026-10-10' }, today), 'danger');
    assert.equal(docStatus({ expiryDate: '2028-03-01' }, today), 'ok');
    assert.equal(docStatus({ expiryDate: null }, today), 'ok');
    assert.equal(remainingLabel({ expiryDate: '2026-12-08' }, today), '75 days');
  });
  it('schedules 90/60/30, weekly, then daily reminders, future only', () => {
    const r = reminderDays('2026-12-08', today, 30);
    assert.deepEqual(r.slice(0, 3).map((x) => x.daysLeft), [60, 30, 23]);
    assert.ok(r.every((x) => daysBetween(today, x.day) > 0));
  });
  it('walks the renewal history', () => {
    const base = { type: 'radio' as const, name: 'VHF', issuer: '', number: '', issueDate: null, expiryDate: null, fileUri: null, fileMime: null, createdAt: 0 };
    const docs: Doc[] = [
      { ...base, id: 'a', supersededBy: 'b' },
      { ...base, id: 'b', supersededBy: 'c' },
      { ...base, id: 'c', supersededBy: null },
    ];
    assert.deepEqual(history(docs[2], docs).map((d) => d.id), ['b', 'a']);
  });
});

describe('sanity', () => {
  it('flags long, fast and jumped voyages', () => {
    const f = voyageFlags({ source: 'gps', durationMin: 31 * 60, avgKn: 45, fixes: 10, start: { lat: 0, lon: 0 }, previousEnd: { lat: 5, lon: 0 } });
    assert.deepEqual(f.map((x) => x.kind), ['long', 'fast', 'jump']);
  });
  it('prompts after three silent days while engaged', () => {
    const eng: Engagement = { id: 'e', vesselId: 'v', position: 'Deckhand', startDate: '2026-09-01', endDate: null, captain: '', company: '', createdAt: 0 };
    const entry = (date: string): LogEntry => ({ id: date, engagementId: 'e', date, location: '', activities: [], duties: [], watches: [], notes: '', voiceUri: null, transcript: '', status: 'confirmed', updatedAt: 0 });
    assert.equal(missedDays(eng, [entry('2026-09-20')], [], '2026-09-24'), 3);
    assert.equal(missedDays(eng, [entry('2026-09-22')], [], '2026-09-24'), 0);
  });
});

describe('places', () => {
  it('names nearby harbours and falls back to lat/lon at sea', () => {
    assert.equal(placeName(-20.161, 57.5), 'Port Louis');
    assert.match(placeName(-25, 60), /°.*S .*E/);
  });
});

describe('experience and qualifications', () => {
  const small: Vessel = { id: 's', name: 'S/Y Small', category: '', propulsion: 'motor', loaM: 15, gt: null, flag: '', imo: '', officialNumber: '', homePort: '', createdAt: 0 };
  const big: Vessel = { ...small, id: 'b', name: 'M/Y Big', loaM: 45, gt: 480 };
  const engagements: Engagement[] = [
    { id: 'es', vesselId: 's', position: 'Skipper', startDate: '2026-01-01', endDate: '2026-03-31', captain: '', company: '', createdAt: 0 },
    { id: 'eb', vesselId: 'b', position: 'Deckhand', startDate: '2026-04-01', endDate: null, captain: '', company: '', createdAt: 0 },
  ];
  // Two 8-hour 64 NM passages on the small boat as skipper, one on the big boat.
  const leg = (day: number, eng: string, skipper: boolean) => {
    const start = Date.UTC(2026, 1, day, 4, 0);
    const to: [number, number] = [PORT_LOUIS[0] - 64 / 60, PORT_LOUIS[1]];
    return voyageFrom(run(PORT_LOUIS, to, start, 8, 60), eng, { asSkipper: skipper });
  };
  const voyages = [leg(1, 'es', true), leg(3, 'es', true), { ...leg(5, 'eb', false), startedAt: Date.UTC(2026, 4, 5, 4) }];
  const ctx = { vessels: [small, big], engagements, voyages, entries: [] as LogEntry[] };

  it('totals miles, days and breakdowns', () => {
    const e = experience(ctx, '2026-06-01');
    assert.ok(Math.abs(e.nm - 192) < 3, `${e.nm}`);
    assert.equal(e.seaDays, 3);
    assert.equal(e.vessels, 2);
    assert.equal(e.largestVesselM, 45);
    assert.ok(e.commandNm > 120);
  });

  it('applies the RYA vessel limits and passage rules', () => {
    const off = evaluate(QUALIFICATIONS[1], 'motor', ctx, [], '2026-06-01');
    const r = Object.fromEntries(off.results.map((x) => [x.rule.id, x]));
    assert.equal(r.days.current, 3); // big boat is under 500 GT, counts
    assert.equal(r.skipper.current, 2); // only the small boat counts for skipper days
    assert.equal(r.passages.current, 3);
    assert.equal(r.asskipper.current, 2);
    assert.equal(r.overnight.current, 0);
    assert.equal(r.tidal.met, null);
    assert.equal(off.appearsToMeet, false);
    assert.equal(verdict(off), 'Not there yet.');

    const coastal = evaluate(QUALIFICATIONS[0], 'motor', ctx, [], '2026-06-01');
    const miles = coastal.results.find((x) => x.rule.id === 'miles')!;
    assert.ok(miles.current > 120 && miles.current < 135, `${miles.current}`); // big boat excluded: over 24 m
  });

  it('only counts sea time in the exam discipline', () => {
    const sail = evaluate(QUALIFICATIONS[1], 'sail', ctx, [], '2026-06-01');
    assert.equal(sail.results.find((x) => x.rule.id === 'miles')!.current, 0);
  });
});

describe('dayKey', () => {
  it('uses local time', () => {
    assert.equal(dayKey(new Date(2026, 0, 2, 23, 59)), '2026-01-02');
  });
});

describe('sea-service record', () => {
  it('renders totals, vessels and the no-certification footer, escaping user text', async () => {
    const { recordHtml } = await import('../src/lib/recordHtml');
    const vessel: Vessel = { id: 'v', name: 'M/Y <Shadow>', category: '', propulsion: 'motor', loaM: 27, gt: null, flag: '', imo: '', officialNumber: '', homePort: '', createdAt: 0 };
    const eng: Engagement = { id: 'e', vesselId: 'v', position: 'Deckhand', startDate: '2026-01-01', endDate: null, captain: '', company: '', createdAt: 0 };
    const v = voyageFrom(run(PORT_LOUIS, BLACK_RIVER, T0, 10), 'e');
    const ctx = { vessels: [vessel], engagements: [eng], voyages: [v], entries: [] as LogEntry[] };
    const { vesselHistory } = await import('../src/domain/experience');
    const html = recordHtml({
      profile: { name: 'Trystin', nationality: '', homeCountry: '', email: '', phone: '', onboardedAt: 1 },
      exp: experience(ctx, '2026-11-21'),
      history: vesselHistory(ctx),
      voyages: [v],
      engagements: [eng],
      vessels: [vessel],
      docs: [],
      quals: [],
      generatedAt: T0,
    });
    assert.match(html, /M\/Y &lt;Shadow&gt;/);
    assert.doesNotMatch(html, /<Shadow>/);
    assert.match(html, /does not issue or approve qualifications/);
    assert.match(html, /Self-recorded/);
  });
});
