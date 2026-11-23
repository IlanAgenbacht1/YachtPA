import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, Pressable, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Button, Card, Col, Display, Eyebrow, Hero, HeroButton, Icon, Row, Sheet, Spacer, Txt } from '@/components/ui';
import { setSetting } from '@/db/repo';
import { thump } from '@/lib/haptics';
import { ensureNotificationPermission, notificationsAllowed } from '@/lib/reminders';
import {
  askAllowed,
  askAlways,
  openAppSettings,
  openBatterySettings,
  openLocationSwitch,
  pocketReady,
  trackingStatus,
  type TrackingStatus,
} from '@/location/permissions';
import { useAppStore } from '@/store/AppStore';
import { track } from '@/telemetry';
import { useTokens } from '@/theme';

const android = Platform.OS === 'android';

/**
 * A checklist that gets the phone ready to log a voyage in a pocket. Each row
 * shows a tick when done and one button that goes straight to the right
 * place. Statuses refresh when the user comes back from Settings.
 * Opened before the first voyage (`?start=1`) and from Profile.
 */
export default function TrackingSetup() {
  const { start } = useLocalSearchParams<{ start?: string }>();
  const { startVoyage } = useAppStore();
  const [s, setS] = useState<TrackingStatus | null>(null);
  const [notes, setNotes] = useState(false);

  const refresh = useCallback(() => {
    Promise.all([trackingStatus(), notificationsAllowed()]).then(([t, n]) => {
      setS(t);
      setNotes(n);
      track('setup_status', { services: t.services, allowed: t.allowed, precise: t.precise, always: t.always, canAlways: t.canAlways, notifications: n, screen: true });
    });
  }, []);

  useFocusEffect(refresh);
  useEffect(() => {
    setSetting('tracking_setup_seen', '1').catch(() => {});
    const sub = AppState.addEventListener('change', (st) => st === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  if (!s) return null;
  const ready = pocketReady(s);

  const go = async () => {
    thump();
    if (await startVoyage()) router.replace('/live');
  };

  const rows: { done: boolean; title: string; why: string; action?: string; onPress?: () => void; hidden?: boolean }[] = [
    { done: s.services, title: 'Location is on', why: 'The phone’s own location switch.', action: 'Turn on', onPress: openLocationSwitch },
    { done: s.allowed, title: 'YachtPA can use your location', why: 'Only between Start and Stop voyage.', action: 'Allow', onPress: () => askAllowed().then(refresh) },
    {
      done: s.allowed && s.precise,
      title: 'Precise location',
      why: 'Approximate location is too rough to count miles.',
      action: 'Open Settings',
      onPress: openAppSettings,
      hidden: !s.allowed,
    },
    {
      done: s.always,
      title: android ? 'Allow all the time' : 'Allow Always',
      why: android
        ? 'So it keeps logging with the phone locked or in your pocket. In Settings tap Location, then “Allow all the time”.'
        : 'So it keeps logging with the phone locked or in your pocket. Choose “Change to Always Allow”.',
      action: android ? 'Open Settings' : 'Allow',
      onPress: () => askAlways().then(refresh),
      hidden: !s.canAlways || !s.allowed,
    },
    {
      done: notes,
      title: 'Notifications',
      why: android ? 'Shows “Voyage underway” while logging, and reminds you about expiring documents.' : 'Reminders about expiring documents and long voyages.',
      action: 'Allow',
      onPress: () => ensureNotificationPermission().then((ok) => (ok ? refresh() : openAppSettings())),
    },
  ];

  return (
    <Screen>
      <Hero gap={10}>
        <Row justify="space-between">
          <Eyebrow color="heroMuted">Tracking setup</Eyebrow>
          <HeroButton icon="x" label="Close" />
        </Row>
        <Display size={32} color="heroFg">
          {ready ? 'Ready to go' : 'Log voyages with the phone in your pocket'}
        </Display>
        <Txt size={14} color="heroMuted">
          {ready ? 'YachtPA will keep logging with the screen off.' : 'A few phone settings, once. Tap each one.'}
        </Txt>
      </Hero>
      <Sheet gap={12} paddingTop={24}>
        {rows
          .filter((r) => !r.hidden)
          .map((r) => (
            <Card key={r.title} row gap={12} paddingV={14}>
              <Tick done={r.done} />
              <Col gap={3} flex={1}>
                <Txt size={15} weight={700}>
                  {r.title}
                </Txt>
                <Txt size={12} lh={17} color="muted">
                  {r.why}
                </Txt>
              </Col>
              {!r.done && r.onPress ? <SmallButton label={r.action ?? 'Fix'} onPress={r.onPress} /> : null}
            </Card>
          ))}

        {android && (
          <Card row gap={12} paddingV={14}>
            <View style={{ width: 26, alignItems: 'center' }}>
              <Icon name="anchor" size={20} color="muted" />
            </View>
            <Col gap={3} flex={1}>
              <Txt size={15} weight={700}>
                Battery: don’t restrict YachtPA
              </Txt>
              <Txt size={12} lh={17} color="muted">
                Some phones (Samsung especially) stop apps to save battery. Find YachtPA and choose “Unrestricted” or “Don’t optimise”.
              </Txt>
            </Col>
            <SmallButton label="Open" onPress={openBatterySettings} />
          </Card>
        )}

        {!s.canAlways && (
          <Txt size={12} color="muted">
            This version of the app can only log while it is open. The full app logs with the phone locked.
          </Txt>
        )}

        <Txt size={12} color="muted">
          {android
            ? 'Once set up, YachtPA keeps logging when you switch apps, lock the phone, or swipe it away. Only “Force stop” in Settings stops it.'
            : 'Once set up, YachtPA keeps logging when you switch apps or lock the phone. Don’t swipe it away while underway: iPhone stops tracking for apps that are swiped closed.'}
        </Txt>

        <Spacer />
        {start ? (
          <>
            <Button label={ready ? 'Start voyage' : 'Start anyway'} icon="send" onPress={go} />
            {!ready && (
              <Txt size={12} color="muted" align="center">
                Without these, keep YachtPA open with the screen on while underway.
              </Txt>
            )}
          </>
        ) : (
          <Button variant={ready ? 'primary' : 'ghost'} label="Done" icon="check" onPress={() => router.back()} />
        )}
      </Sheet>
    </Screen>
  );
}

function Tick({ done }: { done: boolean }) {
  const t = useTokens();
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 1.5,
        borderColor: done ? t.colors.ok : t.colors.cardBorder,
        backgroundColor: done ? t.colors.ok : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {done && <Icon name="check" size={16} color="accentFg" strokeWidth={3} />}
    </View>
  );
}

function SmallButton({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTokens();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={6}
      style={({ pressed }) => ({
        paddingHorizontal: 14,
        height: 38,
        borderRadius: 99,
        justifyContent: 'center',
        backgroundColor: t.colors.accent,
        opacity: pressed ? 0.85 : 1,
      })}>
      <Txt size={13} weight={800} color="accentFg">
        {label}
      </Txt>
    </Pressable>
  );
}
