/**
 * The background location task. It is defined at module scope and this module
 * is imported from the root layout so the task exists in the headless JS
 * context Android starts when the app has been killed. It knows nothing about
 * React: every batch of fixes goes straight to the database.
 */
import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { appendFixes, getLiveVoyage } from '@/db';
import type { Fix } from '@/domain';

export const VOYAGE_TASK = 'yachtpa-voyage-track';

const MS_TO_KN = 1.943844; // m/s → knots

export function toFix(loc: LocationObject): Fix {
  const c = loc.coords;
  return {
    ts: loc.timestamp,
    lat: c.latitude,
    lon: c.longitude,
    accuracy: c.accuracy ?? null,
    speedKn: c.speed !== null && c.speed >= 0 ? c.speed * MS_TO_KN : null,
    heading: c.heading !== null && c.heading >= 0 ? c.heading : null,
  };
}

type Body = { locations: LocationObject[] };

if (Platform.OS !== 'web') {
  TaskManager.defineTask<Body>(VOYAGE_TASK, async ({ data, error }) => {
    if (error) {
      console.warn('[voyage-task]', error.message);
      return;
    }
    const locations = data?.locations ?? [];
    if (locations.length === 0) return;
    try {
      const live = await getLiveVoyage();
      if (!live) {
        // Nothing to attach fixes to: the voyage was stopped elsewhere. Stop the updates lazily.
        const Location = await import('expo-location');
        await Location.stopLocationUpdatesAsync(VOYAGE_TASK).catch(() => {});
        return;
      }
      await appendFixes(live.id, locations.map(toFix));
    } catch (e) {
      console.warn('[voyage-task] failed to store fixes', e);
    }
  });
}
