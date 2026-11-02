import { View } from 'react-native';

import { FadeUp } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Button, Card, Col, Display, Dot, Eyebrow, Hero, Row, Sheet, Txt } from '@/components/ui';
import { router } from 'expo-router';

import { listDocs } from '@/db/repo';
import { docCounts, docStatus } from '@/lib/docs';
import { fmtIsoMedium } from '@/lib/format';
import { useQuery } from '@/store/AppStore';

const openDoc = (id?: string) => router.push(id ? { pathname: '/document', params: { id } } : '/document');

export default function DocumentsScreen() {
  const docs = useQuery(listDocs) ?? [];
  const counts = docCounts(docs);
  const expiring = counts.warn + counts.danger;

  return (
    <Screen>
      <Hero gap={10}>
        <Eyebrow color="heroMuted">Documents</Eyebrow>
        <Display size={36} color="heroFg">
          {docs.length === 0 ? 'Your wallet' : expiring === 0 ? 'All in date' : expiring === 1 ? 'One to renew' : `${expiring} to renew`}
        </Display>
        {docs.length === 0 ? (
          <Txt size={14} color="heroMuted">
            Certificates, passport, medical. Reminders before they expire.
          </Txt>
        ) : (
          <Row gap={8}>
            {counts.ok > 0 && (
              <>
                <Dot color="ok" />
                <Txt size={14} color="heroMuted">
                  {counts.ok} valid
                </Txt>
              </>
            )}
            {expiring > 0 && (
              <>
                <View style={{ marginLeft: counts.ok > 0 ? 6 : 0 }}>
                  <Dot color={counts.danger ? 'danger' : 'warn'} />
                </View>
                <Txt size={14} color="heroMuted">
                  {counts.warn} expiring{counts.danger ? ` · ${counts.danger} expired` : ''}
                </Txt>
              </>
            )}
          </Row>
        )}
      </Hero>

      <Sheet gap={10}>
        {docs.map((d, i) => {
          const st = docStatus(d);
          const detail = [d.issuer, d.expires ? `expires ${fmtIsoMedium(d.expires)}` : 'no expiry'].filter(Boolean).join(' · ');
          return (
          <FadeUp key={d.id} delay={40 + i * 50}>
            <Card row gap={12} paddingV={14} paddingH={16} borderColor={st.status === 'ok' ? 'cardBorder' : st.status} onPress={() => openDoc(d.id)} accessibilityLabel={d.name}>
              <Dot color={st.status} size={10} />
              <Col gap={2} flex={1}>
                <Txt size={15} weight={700}>
                  {d.name}
                </Txt>
                <Txt size={12} color="muted">
                  {detail}
                </Txt>
              </Col>
              <Txt size={13} weight={st.status === 'ok' ? 700 : 800} color={st.status === 'ok' ? 'muted' : st.status} tabular>
                {st.remaining}
              </Txt>
            </Card>
          </FadeUp>
          );
        })}
        <FadeUp delay={40 + docs.length * 50}>
          <Button variant="dashed" icon="plus" iconStrokeWidth={2} label="Add a document" onPress={() => openDoc()} />
        </FadeUp>
      </Sheet>
    </Screen>
  );
}
