import { Redirect, router } from 'expo-router';
import { View } from 'react-native';

import { Rise, useProgress } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Button, Display, Eyebrow, Hero, Icon, Row, Sheet, Spacer, Tag, Tile, Txt } from '@/components/ui';
import { vessel } from '@/data/sample';
import { fmtClock, fmtDateShort, fmtDur, fmtInt } from '@/lib/format';
import { tick } from '@/lib/haptics';
import { useAppStore } from '@/store/AppStore';

export default function SummaryScreen() {
  const { summary, confirmVoyage, flash, soon } = useAppStore();
  const p = useProgress(1100, 250);

  if (!summary) return <Redirect href="/" />;

  const onConfirm = () => {
    tick();
    const added = confirmVoyage();
    router.back();
    flash(`Voyage saved · ${added} NM added to your record`);
  };

  return (
    <Screen>
      <Hero gap={10}>
        <Eyebrow color="heroMuted">Voyage complete</Eyebrow>
        <Display size={36} color="heroFg">
          {summary.from} → {summary.to}
        </Display>
        <Txt size={14} color="heroMuted">
          {fmtDateShort(new Date())} · {fmtClock(summary.startMin)} – {fmtClock(summary.endMin)}
        </Txt>
      </Hero>

      <Rise style={{ flex: 1 }}>
        <Sheet gap={14} paddingTop={24} paddingBottom={24}>
          <Row gap={10} align="baseline">
            <Display size={80} lh={78} ls={-1.6} tabular>
              {fmtInt(summary.nm * p)}
            </Display>
            <Txt size={20} weight={700} color="muted">
              NM
            </Txt>
          </Row>

          <Row gap={10} align="stretch">
            <View style={{ flex: 1 }}>
              <Tile label="Duration" value={fmtDur(summary.durationMin * p)} />
            </View>
            <View style={{ flex: 1 }}>
              <Tile label="Night hours" value={fmtDur(summary.nightMin * p)} />
            </View>
          </Row>
          <Row gap={10} align="stretch">
            <View style={{ flex: 1 }}>
              <Tile label="Avg speed" value={`${(summary.avgSpeed * p).toFixed(1)} kn`} />
            </View>
            <View style={{ flex: 1 }}>
              <Tile label="Max speed" value={`${(summary.maxSpeed * p).toFixed(1)} kn`} />
            </View>
          </Row>

          <Row gap={8} wrap>
            <Tag accent label={summary.nightMin > 0 ? 'Night passage' : 'Day passage'} />
            <Tag label={vessel.type} />
            <Tag label={vessel.position} />
          </Row>

          <Row gap={8}>
            <Icon name="check" size={18} color="ok" strokeWidth={2.4} />
            <Txt size={13} weight={600} color="muted">
              Consistent with your last known position
            </Txt>
          </Row>

          <Spacer />
          <Button label="Confirm voyage" icon="check" iconStrokeWidth={2.4} onPress={onConfirm} />
          <Button variant="ghost" label="Edit details" onPress={soon} />
        </Sheet>
      </Rise>
    </Screen>
  );
}
