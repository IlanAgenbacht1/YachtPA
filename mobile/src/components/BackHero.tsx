import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable } from 'react-native';

import { Col, Display, Eyebrow, Hero, Icon, Row, Txt } from '@/components/ui';
import { useTokens } from '@/theme';

/** Hero for screens above the tabs: back button, eyebrow, title, optional subtitle and action. */
export function BackHero({ eyebrow, title, subtitle, right, onBack }: { eyebrow: string; title: string; subtitle?: string; right?: ReactNode; onBack?: () => void }) {
  const t = useTokens();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <Hero gap={12}>
      <Row justify="space-between">
        <Pressable
          onPress={back}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: t.colors.btn2,
            borderWidth: 1,
            borderColor: t.colors.btn2Border,
          }}>
          <Icon name="chevronLeft" size={20} color="heroFg" />
        </Pressable>
        {right}
      </Row>
      <Col gap={6}>
        <Eyebrow color="heroMuted">{eyebrow}</Eyebrow>
        <Display size={32} color="heroFg" numberOfLines={2}>
          {title}
        </Display>
        {subtitle ? (
          <Txt size={14} color="heroMuted">
            {subtitle}
          </Txt>
        ) : null}
      </Col>
    </Hero>
  );
}
