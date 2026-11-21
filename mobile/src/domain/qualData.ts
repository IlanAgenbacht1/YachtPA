/**
 * Qualification requirements as data (SCOPE §4.4, §12). Every figure here is
 * taken from the official page in `sourceUrl` on `verifiedOn`; never from
 * memory or examples. When the source changes, bump `version` and re-verify.
 *
 * Not modelled yet (shown as "check yourself"): the reduced-sea-time routes for
 * holders of another CoC or a Coastal Skipper practical certificate, minimum
 * age, and the tidal-waters share (the app cannot tell tidal from non-tidal).
 */
import type { QualDef } from './qualifications';

const RYA_PASSAGES = 'https://www.rya.org.uk/training/certificates-of-competence/qualifying-passages/';

export const QUALIFICATIONS: QualDef[] = [
  {
    id: 'rya-ym-coastal',
    authority: 'RYA / MCA',
    name: 'Yachtmaster Coastal',
    version: 1,
    sourceUrl: 'https://www.rya.org.uk/training/certificates-of-competence/yachtmaster-coastal-exam/',
    extraSources: [RYA_PASSAGES],
    verifiedOn: '2026-11-21',
    windowYears: 10,
    rules: [
      { id: 'days', type: 'days_at_sea', min: 30, maxLoaM: 24, label: 'Days at sea (under 24 m)' },
      { id: 'skipper', type: 'days_as_skipper', min: 2, maxLoaM: 24, label: 'Days as skipper (under 24 m)' },
      { id: 'miles', type: 'miles', min: 800, maxLoaM: 24, label: 'Miles (under 24 m)' },
      { id: 'night', type: 'night_hours', min: 12, label: 'Night hours' },
      { id: 'tidal', type: 'manual', label: 'At least half in tidal waters', note: 'The app cannot tell tidal from non-tidal water. Check this yourself.' },
      { id: 'radio', type: 'certificate', docTypes: ['radio'], label: 'Radio certificate (SRC or higher)' },
      { id: 'firstaid', type: 'certificate', docTypes: ['first_aid'], label: 'First aid certificate, valid' },
      { id: 'id', type: 'certificate', docTypes: ['passport'], label: 'Photo ID' },
    ],
  },
  {
    id: 'rya-ym-offshore',
    authority: 'RYA / MCA',
    name: 'Yachtmaster Offshore',
    version: 1,
    sourceUrl: 'https://www.rya.org.uk/training/certificates-of-competence/yachtmaster-offshore-exam/',
    extraSources: [RYA_PASSAGES],
    verifiedOn: '2026-11-21',
    windowYears: 10,
    rules: [
      { id: 'days', type: 'days_at_sea', min: 50, maxGt: 500, label: 'Days at sea (up to 500 GT)' },
      { id: 'skipper', type: 'days_as_skipper', min: 5, maxLoaM: 24, label: 'Days as skipper (under 24 m)' },
      { id: 'miles', type: 'miles', min: 2500, maxGt: 500, label: 'Miles (up to 500 GT)' },
      { id: 'passages', type: 'passages', count: 5, minNm: 60, label: 'Passages over 60 NM' },
      { id: 'overnight', type: 'passages', count: 2, minNm: 60, overnight: true, label: '…of which overnight' },
      { id: 'asskipper', type: 'passages', count: 2, minNm: 60, asSkipper: true, label: '…of which as skipper' },
      { id: 'small', type: 'share_small', share: 0.5, maxLoaM: 24, label: 'Half of sea time under 24 m' },
      { id: 'tidal', type: 'manual', label: 'At least half in tidal waters', note: 'The app cannot tell tidal from non-tidal water. Check this yourself.' },
      { id: 'radio', type: 'certificate', docTypes: ['radio'], label: 'Radio certificate (SRC or higher)' },
      { id: 'firstaid', type: 'certificate', docTypes: ['first_aid'], label: 'First aid certificate, valid' },
      { id: 'id', type: 'certificate', docTypes: ['passport'], label: 'Photo ID' },
    ],
  },
];
