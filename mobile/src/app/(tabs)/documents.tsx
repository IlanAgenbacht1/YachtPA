import { router } from 'expo-router';
import { View } from 'react-native';

import { FadeUp } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Button, Card, Col, Display, Dot, Eyebrow, Hero, Row, Sheet, Txt } from '@/components/ui';
import { currentDocs, docStatus, docTypeLabel, remainingLabel } from '@/domain/documents';
import { fmtDay } from '@/lib/format';
import { useAppStore } from '@/store/AppStore';

const RANK = { danger: 0, warn: 1, ok: 2 } as const;

export default function DocumentsScreen() {
  const s = useAppStore();
  const docs = currentDocs(s.docs).sort((a, b) => {
    const r = RANK[docStatus(a, s.today)] - RANK[docStatus(b, s.today)];
    if (r) return r;
    return (a.expiryDate ?? '9999') < (b.expiryDate ?? '9999') ? -1 : 1;
  });
  const due = s.docCounts.warn + s.docCounts.danger;

  return (
    <Screen>
      <Hero gap={10}>
        <Eyebrow color="heroMuted">Documents</Eyebrow>
        <Display size={36} color="heroFg">
          {docs.length === 0 ? 'Your wallet' : due === 0 ? 'All in date' : due === 1 ? 'One to renew' : `${due} to renew`}
        </Display>
        <Row gap={8}>
          <Dot color="ok" />
          <Txt size={14} color="heroMuted">
            {s.docCounts.ok} valid
          </Txt>
          <View style={{ marginLeft: 6 }}>
            <Dot color="warn" />
          </View>
          <Txt size={14} color="heroMuted">
            {s.docCounts.warn} expiring
          </Txt>
          {s.docCounts.danger > 0 && (
            <>
              <View style={{ marginLeft: 6 }}>
                <Dot color="danger" />
              </View>
              <Txt size={14} color="heroMuted">
                {s.docCounts.danger} urgent
              </Txt>
            </>
          )}
        </Row>
      </Hero>

      <Sheet gap={10} paddingBottom={32}>
        {docs.length === 0 && (
          <Txt size={14} color="muted" lh={20}>
            Add your certificates, passport, visas and medical. You get reminders 90, 60 and 30 days before anything expires.
          </Txt>
        )}
        {docs.map((d, i) => {
          const st = docStatus(d, s.today);
          return (
            <FadeUp key={d.id} delay={40 + i * 40}>
              <Card
                row
                gap={12}
                paddingV={14}
                paddingH={16}
                borderColor={st === 'ok' ? 'cardBorder' : st}
                onPress={() => router.push({ pathname: '/document', params: { id: d.id } })}
                accessibilityLabel={d.name}>
                <Dot color={st} />
                <Col gap={2} flex={1}>
                  <Txt size={15} weight={700}>
                    {d.name}
                  </Txt>
                  <Txt size={12} color="muted" numberOfLines={1}>
                    {[d.issuer || docTypeLabel(d.type), d.expiryDate ? `expires ${fmtDay(d.expiryDate)}` : 'no expiry'].join(' · ')}
                  </Txt>
                </Col>
                <Txt size={13} weight={st === 'ok' ? 700 : 800} color={st === 'ok' ? 'muted' : st} tabular>
                  {remainingLabel(d, s.today)}
                </Txt>
              </Card>
            </FadeUp>
          );
        })}
        <FadeUp delay={40 + docs.length * 40}>
          <Button variant="dashed" icon="plus" iconStrokeWidth={2} label="Add a document" onPress={() => router.push('/document')} />
        </FadeUp>
      </Sheet>
    </Screen>
  );
}
