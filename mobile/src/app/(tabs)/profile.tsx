import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';

import { FadeUp } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Button, Card, Col, Display, Eyebrow, Field, Hero, Icon, Input, Sheet, Toggle, Txt } from '@/components/ui';
import { vesselHistory } from '@/domain/experience';
import { shareJson, sharePdf } from '@/lib/exportRecord';
import { useAppStore } from '@/store/AppStore';
import { LOOKS, useLook, type Look } from '@/theme';

const LOOK_COPY: Record<Look, { name: string; blurb: string }> = {
  horizon: { name: 'Horizon', blurb: 'Dark navy hero, regatta orange. The default.' },
  sailcloth: { name: 'Sailcloth', blurb: 'Warm off-white, teal action, serif headlines.' },
  night: { name: 'Night watch', blurb: 'Pure black, everything in red. For the bridge after dark.' },
};

type Perms = { location: string; background: string; notifications: string };

async function readPerms(): Promise<Perms> {
  if (Platform.OS === 'web') return { location: 'browser', background: 'n/a', notifications: 'n/a' };
  const label = (s: string) => (s === 'granted' ? 'On' : s === 'denied' ? 'Off' : 'Not asked');
  try {
    const [fg, bg, n] = await Promise.all([Location.getForegroundPermissionsAsync(), Location.getBackgroundPermissionsAsync(), Notifications.getPermissionsAsync()]);
    return { location: label(fg.status), background: label(bg.status), notifications: label(n.status) };
  } catch {
    return { location: '?', background: '?', notifications: '?' };
  }
}

export default function ProfileScreen() {
  const { look, tokens, setLook } = useLook();
  const s = useAppStore();
  const [editing, setEditing] = useState(false);
  const [p, setP] = useState(s.profile);
  const [perms, setPerms] = useState<Perms | null>(null);
  const [busy, setBusy] = useState('');
  const [armWipe, setArmWipe] = useState(false);

  useFocusEffect(
    useCallback(() => {
      readPerms().then(setPerms);
      setP(s.profile);
    }, [s.profile]),
  );

  const run = async (what: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(what);
    try {
      await fn();
    } catch (e) {
      s.flash(e instanceof Error ? e.message : 'Something went wrong.');
    }
    setBusy('');
  };

  const exportPdf = () =>
    run('pdf', () =>
      sharePdf({
        profile: s.profile,
        exp: s.exp,
        history: vesselHistory({ vessels: s.vessels, engagements: s.engagements, voyages: s.voyages, entries: s.entries }),
        voyages: s.voyages,
        engagements: s.engagements,
        vessels: s.vessels,
        docs: s.docs,
        quals: s.quals,
        generatedAt: Date.now(),
      }),
    );

  const wipe = async () => {
    if (!armWipe) return setArmWipe(true);
    await s.wipe();
    router.replace('/onboarding');
  };

  const rows: { label: string; detail?: string; onPress: () => void }[] = [
    { label: 'Vessels and engagements', detail: `${s.vessels.length} yachts`, onPress: () => router.push('/vessels') },
    { label: 'Diary', detail: `${s.entries.length} days`, onPress: () => router.push('/diary') },
    { label: busy === 'pdf' ? 'Building PDF…' : 'Export sea-service record (PDF)', onPress: exportPdf },
    { label: busy === 'json' ? 'Exporting…' : 'Export all data (JSON)', onPress: () => run('json', shareJson) },
  ];

  return (
    <Screen>
      <Hero gap={10}>
        <Eyebrow color="heroMuted">Profile</Eyebrow>
        <Display size={36} color="heroFg" numberOfLines={1}>
          {s.profile.name || 'Crew member'}
        </Display>
        <Txt size={14} color="heroMuted">
          {s.active ? `${s.active.position} · ${s.activeVessel?.name ?? ''}` : 'No current yacht'}
        </Txt>
      </Hero>

      <Sheet gap={12} paddingBottom={32}>
        <FadeUp delay={30}>
          <Card gap={12}>
            {editing ? (
              <>
                <Field label="Name">
                  <Input value={p.name} onChangeText={(v) => setP({ ...p, name: v })} autoCapitalize="words" />
                </Field>
                <Field label="Nationality">
                  <Input value={p.nationality} onChangeText={(v) => setP({ ...p, nationality: v })} autoCapitalize="words" />
                </Field>
                <Field label="Home country">
                  <Input value={p.homeCountry} onChangeText={(v) => setP({ ...p, homeCountry: v })} autoCapitalize="words" />
                </Field>
                <Field label="Email">
                  <Input value={p.email} onChangeText={(v) => setP({ ...p, email: v })} keyboardType="email-address" autoCapitalize="none" />
                </Field>
                <Field label="Phone">
                  <Input value={p.phone} onChangeText={(v) => setP({ ...p, phone: v })} keyboardType="phone-pad" />
                </Field>
                <Button
                  label="Save"
                  icon="check"
                  height={52}
                  onPress={async () => {
                    await s.saveProfile(p);
                    setEditing(false);
                  }}
                />
              </>
            ) : (
              <Pressable onPress={() => setEditing(true)} accessibilityRole="button" accessibilityLabel="Edit personal details" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Col flex={1} gap={3}>
                  <Eyebrow>Personal details</Eyebrow>
                  <Txt size={14} color="muted" numberOfLines={2}>
                    {[s.profile.nationality, s.profile.homeCountry, s.profile.email, s.profile.phone].filter(Boolean).join(' · ') || 'Add nationality and contact details'}
                  </Txt>
                </Col>
                <Icon name="edit" size={18} color="muted" />
              </Pressable>
            )}
          </Card>
        </FadeUp>

        <FadeUp delay={60}>
          <List rows={rows} />
        </FadeUp>

        <FadeUp delay={90}>
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
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: sw.fill, borderWidth: 1, borderColor: sw.border ?? tokens.colors.cardBorder }} />
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
          <Card gap={10}>
            <Eyebrow>Settings</Eyebrow>
            <Info label="Units" value="Nautical miles · knots" />
            <Info label="Sync and backup" value="On this phone only (cloud sync not set up yet)" />
            {perms && (
              <>
                <Info label="Location" value={perms.location} />
                <Info label="Location in background" value={perms.background} />
                <Info label="Notifications" value={perms.notifications} />
                {Platform.OS !== 'web' && <Button variant="ghost" label="Open phone settings" height={44} onPress={() => Linking.openSettings()} />}
              </>
            )}
            <Toggle
              label="Simulated GPS"
              detail="Demo mode: a scripted Port Louis → Black River run instead of real positions"
              value={s.simulatedGps}
              onChange={s.setSimulatedGps}
            />
          </Card>
        </FadeUp>

        <FadeUp delay={150}>
          <Button variant="ghost" label={armWipe ? 'Tap again: this deletes everything on this phone' : 'Delete all my data'} onPress={wipe} />
        </FadeUp>

        <Txt size={12} weight={600} color="muted" align="center" style={{ paddingTop: 8 }}>
          YachtPA 0.2 · records stored on this phone
        </Txt>
      </Sheet>
    </Screen>
  );
}

function List({ rows }: { rows: { label: string; detail?: string; onPress: () => void }[] }) {
  const { tokens } = useLook();
  return (
    <Card gap={0} paddingV={4} paddingH={0}>
      {rows.map((r, i) => (
        <Pressable
          key={r.label}
          onPress={r.onPress}
          accessibilityRole="button"
          style={({ pressed }) => [
            { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 18, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: tokens.colors.cardBorder },
            pressed && { backgroundColor: tokens.colors.track },
          ]}>
          <Txt size={15} weight={600} style={{ flex: 1 }}>
            {r.label}
          </Txt>
          {r.detail ? (
            <Txt size={13} color="muted">
              {r.detail}
            </Txt>
          ) : null}
          <Icon name="chevronRight" size={18} color="muted" />
        </Pressable>
      ))}
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, minHeight: 28, alignItems: 'center' }}>
      <Txt size={14} weight={600}>
        {label}
      </Txt>
      <Txt size={13} color="muted" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Txt>
    </View>
  );
}
