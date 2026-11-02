import { router } from 'expo-router';

import type { QResult } from '@/domain/qualifications';
import { qualHeadline, qualTitle } from '@/lib/quals';

import { Card, Col, Icon, Ring, Txt } from './ui';

/** Compact qualification progress: ring, name, what is left. Opens the detail screen. */
export function QualCard({ r }: { r: QResult }) {
  return (
    <Card
      row
      gap={14}
      paddingV={14}
      onPress={() => router.push({ pathname: '/qualification/[id]', params: { id: r.qualification.id } })}
      accessibilityLabel={qualTitle(r)}>
      <Ring size={64} stroke={6} value={r.progress}>
        <Txt size={14} weight={800} tabular>
          {Math.round(r.progress * 100)}%
        </Txt>
      </Ring>
      <Col gap={4} flex={1}>
        <Txt size={15} weight={700}>
          {qualTitle(r)}
        </Txt>
        <Txt size={12} weight={700} color={r.seaTimeMet ? 'ok' : 'brass'}>
          {qualHeadline(r)}
        </Txt>
      </Col>
      <Icon name="chevronRight" size={18} color="muted" />
    </Card>
  );
}
