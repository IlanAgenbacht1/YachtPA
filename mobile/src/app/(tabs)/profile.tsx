import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, Switch, View } from 'react-native';

import { FadeUp } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Button, Card, Col, Display, Eyebrow, Hero, Icon, Row, Sheet, Txt } from '@/components/ui';
import { resetDb } from '@/db/db';
import { shareProblemReport } from '@/lib/diag';
import { exportAll } from '@/lib/exportData';
import { exportRecordPdf } from '@/lib/exportPdf';
import { notificationsAllowed } from '@/lib/reminders';
import { speechSupport } from '@/lib/speech';
import { trackingStatus } from '@/location/permissions';
import { isBackupOn } from '@/sync/backup';
import { downloadOfflineSpeech } from '@/lib/speechSetup';
import { fmtIsoMonth } from '@/lib/format';
import { useAppStore } from '@/store/AppStore';
import { setUsageSharing, track, usageSharingOn } from '@/telemetry';
import { cloudConfigured } from '@/sync/supabase';
import { LOOKS, useLook, type Look } from '@/theme';

const LOOK_COPY: Record<Look, { name: string; blurb: string }> = {
  horizon: { name: 'Horizon', blurb: 'Dark navy hero, regatta orange. The default.' },
  sailcloth: { name: 'Sailcloth', blurb: 'Warm off-white, teal action, serif headlines.' },
  night: { name: 'Night watch', blurb: 'Pure black, everything in red. For the bridge after dark.' },
};


export default function ProfileScreen() {
  const { look, tokens, setLook } = useLook();
  const { current, simulate, setSimulate, voyage, refresh, flash, micOn, setMicOn, devTools, setDevTools } = useAppStore();
  // Tapping the version 7 times unlocks the testing tools; testers never stumble on them.
  const taps = useRef(0);
  const [sharing, setSharing] = useState(true);
  useEffect(() => {
    usageSharingOn().then(setSharing);
  }, []);
  if (!current) return null;
  const onVersionTap = () => {
    if (devTools) return;
    taps.current += 1;
    if (taps.current >= 7) {
      taps.current = 0;
      setDevTools(true);
      flash('Testing tools unlocked');
    }
  };
  const mic = speechSupport();
  // What a developer needs to know about this phone's setup, alongside the log.
  const sendReport = async () => {
    const [t, notes, backup] = await Promise.all([trackingStatus(), notificationsAllowed(), isBackupOn().catch(() => false)]);
    await shareProblemReport({
      location: t.allowed ? (t.always ? 'all the time' : 'while open') : 'off',
      precise: t.precise,
      phoneLocation: t.services,
      notifications: notes,
      mic: micOn && mic.available ? 'on' : mic.available ? 'off' : 'n/a',
      backup,
      pretendGps: simulate,
    });
  };

  const rows: { label: string; onPress: () => void }[] = [
    { label: 'Tracking setup', onPress: () => router.push('/tracking-setup') },
    { label: 'Vessel and position', onPress: () => router.push('/vessel') },
    { label: 'Moved to a new yacht', onPress: () => router.push({ pathname: '/vessel', params: { mode: 'new' } }) },
    { label: 'Cloud backup', onPress: () => router.push('/cloud') },
    { label: 'Sea service record (PDF)', onPress: () => exportRecordPdf().then(() => track('pdf_exported')).catch((e: Error) => flash(e.message)) },
    ...(Platform.OS === 'android' && mic.available ? [{ label: 'Download offline speech', onPress: () => downloadOfflineSpeech().then(flash) }] : []),
    { label: 'Send a problem report', onPress: () => sendReport().then(() => track('report_sent')).catch((e: Error) => flash(e.message)) },
    { label: 'Save a copy of my data', onPress: () => exportAll().catch((e: Error) => flash(e.message)) },
  ];

  const onDeleteAll = () => {
    if (voyage) {
      Alert.alert('Stop the live voyage first.');
      return;
    }
    Alert.alert('Delete all data on this phone?', 'Every voyage, daily log and document on this phone is erased. If you use cloud backup, that copy is kept and can be brought back.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete everything',
        style: 'destructive',
        onPress: async () => {
          await resetDb();
          await refresh();
        },
      },
    ]);
  };

  return (
    <Screen>
      <Hero gap={10}>
        <Eyebrow color="heroMuted">Profile</Eyebrow>
        <Display size={36} color="heroFg">
          {current.profile.name}
        </Display>
        <Txt size={14} color="heroMuted">
          {current.engagement.position} · {current.vessel.name} · since {fmtIsoMonth(current.engagement.startDate)}
        </Txt>
      </Hero>

      <Sheet gap={12}>
        <FadeUp delay={50}>
          <Card gap={4} paddingV={10} paddingH={6}>
            <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4 }}>
              <Eyebrow>Look</Eyebrow>
            </View>
            {LOOKS.map((l) => {
              const on = l === look;
              const sw = tokens.swatches[l];
              return (
                <Pressable
                  key={l}
                  onPress={() => setLook(l)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => [
                    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
                    pressed && { backgroundColor: tokens.colors.track },
                  ]}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: sw.fill,
                      borderWidth: 1,
                      borderColor: sw.border ?? tokens.colors.cardBorder,
                    }}
                  />
                  <Col gap={2} flex={1}>
                    <Txt size={15} weight={700}>
                      {LOOK_COPY[l].name}
                    </Txt>
                    <Txt size={12} color="muted">
                      {LOOK_COPY[l].blurb}
                    </Txt>
                  </Col>
                  {on && <Icon name="check" size={18} color="accent" strokeWidth={2.4} />}
                </Pressable>
              );
            })}
          </Card>
        </FadeUp>

        <FadeUp delay={120}>
          <Card gap={0} paddingV={4} paddingH={0}>
            {rows.map(({ label, onPress }, i) => (
              <Pressable
                key={label}
                onPress={onPress}
                accessibilityRole="button"
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 14,
                    paddingHorizontal: 18,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: tokens.colors.cardBorder,
                  },
                  pressed && { backgroundColor: tokens.colors.track },
                ]}>
                <Txt size={15} weight={600} style={{ flex: 1 }}>
                  {label}
                </Txt>
                <Icon name="chevronRight" size={18} color="muted" />
              </Pressable>
            ))}
          </Card>
        </FadeUp>

        <FadeUp delay={190}>
          <Card row gap={12} paddingV={12}>
            <Col gap={2} flex={1}>
              <Txt size={15} weight={600}>
                Use the mic for the daily log
              </Txt>
              <Txt size={12} color="muted">
                {mic.available ? 'Turn off to type instead.' : 'Not available on this phone. You can type, or use the mic on your keyboard.'}
              </Txt>
            </Col>
            <Switch value={micOn && mic.available} onValueChange={setMicOn} disabled={!mic.available} trackColor={{ true: tokens.colors.accent, false: tokens.colors.track }} />
          </Card>
        </FadeUp>

        {cloudConfigured && (
          <FadeUp delay={200}>
            <Card row gap={12} paddingV={12}>
              <Col gap={2} flex={1}>
                <Txt size={15} weight={600}>
                  Share anonymous usage data
                </Txt>
                <Txt size={12} color="muted">
                  Helps fix problems: how well tracking worked, battery use, errors. Never your name, positions, yachts or logs.
                </Txt>
              </Col>
              <Switch
                value={sharing}
                onValueChange={(on) => {
                  setSharing(on);
                  setUsageSharing(on).catch(() => {});
                }}
                trackColor={{ true: tokens.colors.accent, false: tokens.colors.track }}
              />
            </Card>
          </FadeUp>
        )}

        {devTools && (
          <FadeUp delay={210}>
            <Card gap={10} paddingV={12}>
              <Eyebrow>Testing tools</Eyebrow>
              <Row gap={12}>
                <Col gap={2} flex={1}>
                  <Txt size={15} weight={600}>
                    Simulate GPS
                  </Txt>
                  <Txt size={12} color="muted">
                    A pretend boat at 9 kn, one minute per second. Never counts towards qualifications or the PDF.
                  </Txt>
                </Col>
                <Switch value={simulate} onValueChange={setSimulate} disabled={!!voyage} trackColor={{ true: tokens.colors.accent, false: tokens.colors.track }} />
              </Row>
              <Button
                variant="ghost"
                label="Hide testing tools"
                onPress={() => {
                  setSimulate(false);
                  setDevTools(false);
                }}
              />
            </Card>
          </FadeUp>
        )}

        <FadeUp delay={240}>
          <Button variant="ghost" label="Delete all data on this phone" onPress={onDeleteAll} />
        </FadeUp>

        <Pressable onPress={onVersionTap} style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }} accessibilityRole="text">
          <Txt size={12} weight={600} color="muted">
            YachtPA {Constants.expoConfig?.version ?? ''}
          </Txt>
        </Pressable>
      </Sheet>
    </Screen>
  );
}
