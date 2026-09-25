import { getDb, newId } from './database';

export type VesselType = 'motor' | 'sail';

export type Vessel = {
  id: string;
  name: string;
  type: VesselType;
  loaM: number | null;
  flag: string | null;
};

export type Engagement = {
  id: string;
  vessel: Vessel;
  position: string;
  startedOn: string;
  endedOn: string | null;
  captain: string | null;
  company: string | null;
};

type Row = {
  id: string;
  position: string;
  started_on: string;
  ended_on: string | null;
  captain: string | null;
  company: string | null;
  vessel_id: string;
  name: string;
  type: VesselType;
  loa_m: number | null;
  flag: string | null;
};

const SELECT = `
  SELECT e.id, e.position, e.started_on, e.ended_on, e.captain, e.company,
         v.id AS vessel_id, v.name, v.type, v.loa_m, v.flag
  FROM engagements e JOIN vessels v ON v.id = e.vessel_id
`;

function toEngagement(r: Row): Engagement {
  return {
    id: r.id,
    position: r.position,
    startedOn: r.started_on,
    endedOn: r.ended_on,
    captain: r.captain,
    company: r.company,
    vessel: { id: r.vessel_id, name: r.name, type: r.type, loaM: r.loa_m, flag: r.flag },
  };
}

/** The open engagement (no end date), newest first. */
export async function getActiveEngagement(): Promise<Engagement | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(`${SELECT} WHERE e.ended_on IS NULL ORDER BY e.started_on DESC LIMIT 1`);
  return row ? toEngagement(row) : null;
}

export type NewEngagement = {
  vessel: { name: string; type: VesselType; loaM?: number | null; flag?: string | null };
  position: string;
  /** ISO date, YYYY-MM-DD */
  startedOn: string;
  captain?: string | null;
  company?: string | null;
};

/** "Add current yacht": creates the vessel and an open engagement on it. */
export async function createEngagement(input: NewEngagement): Promise<Engagement> {
  const db = await getDb();
  const now = Date.now();
  const vesselId = newId();
  const id = newId();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO vessels (id, name, type, loa_m, flag, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      vesselId,
      input.vessel.name,
      input.vessel.type,
      input.vessel.loaM ?? null,
      input.vessel.flag ?? null,
      now,
    );
    await db.runAsync(
      'INSERT INTO engagements (id, vessel_id, position, started_on, ended_on, captain, company, created_at) VALUES (?, ?, ?, ?, NULL, ?, ?, ?)',
      id,
      vesselId,
      input.position,
      input.startedOn,
      input.captain ?? null,
      input.company ?? null,
      now,
    );
  });
  const row = await db.getFirstAsync<Row>(`${SELECT} WHERE e.id = ?`, id);
  if (!row) throw new Error('engagement not found after insert');
  return toEngagement(row);
}

/** Returns the active engagement, creating `seed` when there is none yet. */
export async function ensureEngagement(seed: NewEngagement): Promise<Engagement> {
  return (await getActiveEngagement()) ?? createEngagement(seed);
}
