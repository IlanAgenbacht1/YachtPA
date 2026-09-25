import { View } from 'react-native';

import { FadeUp } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Button, Card, Col, Display, Dot, Eyebrow, Hero, Row, Sheet, Txt } from '@/components/ui';
import { docCounts, documents } from '@/data/sample';
import { useAppStore } from '@/store/AppStore';

export default function DocumentsScreen() {
  const { soon } = useAppStore();
  const expiring = documents.filter((d) => d.status !== 'ok').length;

  return (
    <Screen>
      <Hero gap={10}>
        <Eyebrow color="heroMuted">Documents</Eyebrow>
        <Display size={36} color="heroFg">
          {expiring === 0 ? 'All in date' : expiring === 1 ? 'One to renew' : `${expiring} to renew`}
        </Display>
        <Row gap={8}>
          <Dot color="ok" />
          <Txt size={14} color="heroMuted">
            {docCounts.valid} valid
          </Txt>
          <View style={{ marginLeft: 6 }}>
            <Dot color="warn" />
          </View>
          <Txt size={14} color="heroMuted">
            {docCounts.expiring} expiring
          </Txt>
        </Row>
      </Hero>

      <Sheet gap={10}>
        {documents.map((d, i) => (
          <FadeUp key={d.id} delay={40 + i * 50}>
            <Card row gap={12} paddingV={14} paddingH={16} borderColor={d.status === 'warn' ? 'warn' : 'cardBorder'} onPress={soon} accessibilityLabel={d.name}>
              <Dot color={d.status} size={10} />
              <Col gap={2} flex={1}>
                <Txt size={15} weight={700}>
                  {d.name}
                </Txt>
                <Txt size={12} color="muted">
                  {d.detail}
                </Txt>
              </Col>
              <Txt size={13} weight={d.status === 'warn' ? 800 : 700} color={d.status === 'warn' ? 'warn' : 'muted'} tabular>
                {d.remaining}
              </Txt>
            </Card>
          </FadeUp>
        ))}
        <FadeUp delay={40 + documents.length * 50}>
          <Button variant="dashed" icon="plus" iconStrokeWidth={2} label="Add a document" onPress={soon} />
        </FadeUp>
      </Sheet>
    </Screen>
  );
}
