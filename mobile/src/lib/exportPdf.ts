/** Builds the sea-service record PDF on the phone and opens the share sheet. */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { getCurrent, listAllLogs, listEngagements, listVoyages, localDate } from '@/db/repo';
import { renderRecordHtml, type RecordData } from '@/domain/recordHtml';

import { daysUntil } from './docs';

export async function buildRecord(): Promise<RecordData> {
  const [current, engagements, allVoyages, logs] = await Promise.all([getCurrent(), listEngagements(), listVoyages(100000), listAllLogs()]);
  // Simulated voyages are test data: never on a record someone might submit.
  const voyages = allVoyages.filter((v) => v.source !== 'sim').sort((a, b) => a.startedAt - b.startedAt);
  const today = localDate();
  const seaDays = new Set<string>();
  const vessels = engagements.map((e) => {
    const mine = voyages.filter((v) => v.engagementId === e.id);
    const days = new Set(mine.filter((v) => v.underwayMin > 0).map((v) => localDate(new Date(v.startedAt))));
    days.forEach((d) => seaDays.add(d));
    return {
      name: e.vessel.name,
      propulsion: e.vessel.propulsion,
      loaM: e.vessel.loaM,
      gt: e.vessel.gt,
      flag: e.vessel.flag,
      position: e.position,
      startDate: e.startDate,
      endDate: e.endDate,
      captain: e.captain,
      company: e.company,
      daysAboard: Math.max(0, -daysUntil(e.startDate, new Date(`${e.endDate ?? today}T12:00:00`)) + 1),
      seaDays: days.size,
      nm: mine.reduce((s, v) => s + v.distanceNm, 0),
    };
  });
  return {
    name: current?.profile.name ?? '',
    nationality: current?.profile.nationality ?? null,
    generatedAt: new Date().toLocaleString(),
    totals: {
      nm: voyages.reduce((s, v) => s + v.distanceNm, 0),
      underwayHours: voyages.reduce((s, v) => s + v.underwayMin, 0) / 60,
      nightHours: voyages.reduce((s, v) => s + v.nightMin, 0) / 60,
      seaDays: seaDays.size,
      voyages: voyages.length,
      overnight: voyages.filter((v) => v.overnight).length,
    },
    vessels,
    voyages: voyages.map((v) => ({
      date: localDate(new Date(v.startedAt)),
      vessel: v.vesselName,
      from: v.fromName ?? '',
      to: v.toName ?? '',
      nm: v.distanceNm,
      underwayMin: v.underwayMin,
      nightMin: v.nightMin,
      kind: v.overnight ? 'Overnight' : v.nightMin > 0 ? 'Night' : 'Day',
      source: v.source,
    })),
    logs: [...logs].reverse().map((l) => ({ date: l.date, vessel: l.vesselName ?? '', activities: l.activities, duties: l.duties })),
  };
}

export async function exportRecordPdf(): Promise<void> {
  const html = renderRecordHtml(await buildRecord());
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html, margins: { left: 40, right: 40, top: 50, bottom: 50 } });
  await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Sea service record' });
}
