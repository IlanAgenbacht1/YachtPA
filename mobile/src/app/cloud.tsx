import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable } from 'react-native';

import { Screen } from '@/components/Screen';
import { Button, Card, Col, Display, Eyebrow, Field, Hero, HeroButton, Row, Sheet, Txt } from '@/components/ui';
import { fmtDateShort, fmtClock, minutesOfDay } from '@/lib/format';
import {
  cloudHasData,
  deleteCloudAccount,
  isBackupOn,
  lastBackupAt,
  pendingCount,
  phoneHasData,
  pushChanges,
  replaceCloudWithPhone,
  restoreFromCloud,
  startBackup,
  stopBackup,
} from '@/sync/backup';
import { cloudConfigured, supabase } from '@/sync/supabase';
import { useAppStore } from '@/store/AppStore';

type Status = { email: string | null; on: boolean; last: number | null; pending: number };

async function getStatus(): Promise<Status | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const [on, last, pending] = await Promise.all([isBackupOn(), lastBackupAt(), pendingCount()]);
  return { email: data.session?.user.email ?? null, on, last, pending };
}

/**
 * Optional cloud backup. Sign in with a code sent by email; no password.
 * First sign-in either backs this phone up, or restores a backup onto it.
 */
export default function CloudScreen() {
  const { refresh, flash, voyage } = useAppStore();
  const { justSignedIn } = useLocalSearchParams<{ justSignedIn?: string }>();
  const [showCode, setShowCode] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);

  const load = () => getStatus().then(setStatus);

  useEffect(() => {
    let live = true;
    getStatus().then((s) => live && setStatus(s));
    return () => {
      live = false;
    };
  }, []);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setBusy(null);
      load();
    }
  };

  const restore = async () => {
    await restoreFromCloud(setBusy);
    await refresh();
    flash('Restored from your backup');
    router.dismissTo('/');
  };

  const backUpThisPhone = async () => {
    await startBackup();
    await pushChanges();
    flash('Backed up');
  };

  /** After sign-in: back up, restore, or ask which side wins. */
  const afterSignIn = async () => {
    const [cloud, phone] = await Promise.all([cloudHasData(), phoneHasData()]);
    if (!cloud && phone) return backUpThisPhone();
    if (cloud && !phone) return restore();
    if (!cloud && !phone) {
      await startBackup();
      flash('Signed in. Your records will back up as you go.');
      router.back();
      return;
    }
    Alert.alert('You already have a backup', 'Keep the records on this phone, or replace them with the backup?', [
      { text: 'Use this phone', onPress: () => run('Replacing the backup…', replaceCloudWithPhone) },
      { text: 'Use the backup', style: 'destructive', onPress: () => run('Restoring…', restore) },
    ]);
  };

  const sendCode = () =>
    run('Sending…', async () => {
      // The email's "Sign in" link opens the app at /auth, which finishes signing in.
      const { error } = await supabase!.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true, emailRedirectTo: Linking.createURL('auth') },
      });
      if (error) throw new Error(error.message);
      setSent(true);
    });

  const verify = () =>
    run('Checking…', async () => {
      const { error } = await supabase!.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
      if (error) throw new Error(error.message);
      await afterSignIn();
    });

  // Arrived from the email link: finish exactly as after typing a code.
  const finished = useRef(false);
  useEffect(() => {
    if (justSignedIn !== '1' || finished.current) return;
    finished.current = true;
    run('Finishing sign-in…', afterSignIn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justSignedIn]);

  const signOut = () =>
    Alert.alert('Sign out?', 'Backup stops on this phone. Your records stay here and in the cloud.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        onPress: () =>
          run('Signing out…', async () => {
            await stopBackup();
            await supabase!.auth.signOut();
          }),
      },
    ]);

  const deleteAccount = () =>
    Alert.alert('Delete your cloud backup?', 'Your account and everything backed up are deleted. The records on this phone stay.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => run('Deleting…', deleteCloudAccount) },
    ]);

  const signedIn = !!status?.email;
  const last = status?.last ? new Date(status.last) : null;

  return (
    <Screen>
      <Hero gap={10}>
        <Row justify="space-between">
          <Eyebrow color="heroMuted">Cloud backup</Eyebrow>
          <HeroButton />
        </Row>
        <Display size={32} color="heroFg">
          {!cloudConfigured ? 'Not set up' : signedIn ? 'Backed up' : 'Back up your record'}
        </Display>
        <Txt size={14} color="heroMuted">
          {signedIn ? status?.email : 'Optional. Lose the phone, keep your sea time.'}
        </Txt>
      </Hero>
      <Sheet gap={14} paddingTop={24}>
        {!cloudConfigured && (
          <Txt size={14} color="muted">
            Cloud backup isn’t switched on in this version of the app. Your records are saved on this phone. To keep a copy somewhere else, use Profile → Save a copy of my data.
          </Txt>
        )}

        {cloudConfigured && !signedIn && (
          <Col gap={14}>
            <Txt size={14} color="muted">
              {sent
                ? 'Check your email on this phone and tap “Sign in”. YachtPA opens and finishes by itself. It can take a minute to arrive; check spam too.'
                : 'Sign in with your email. We email you a sign-in link, no password. Open it on this phone. Your records are only visible to you.'}
            </Txt>
            <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
            {!sent ? (
              <Button label={busy ?? 'Email me a sign-in link'} onPress={busy || !email.includes('@') ? () => {} : sendCode} />
            ) : (
              <>
                <Button variant="ghost" label={busy ?? 'Send the link again'} onPress={busy ? () => {} : sendCode} />
                {showCode ? (
                  <>
                    <Field label="Code from the email" value={code} onChangeText={setCode} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" />
                    <Button label={busy ?? 'Sign in'} onPress={busy || code.trim().length < 6 ? () => {} : verify} />
                  </>
                ) : (
                  <Pressable onPress={() => setShowCode(true)} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
                    <Txt size={13} weight={700} color="accent">
                      Got a code instead?
                    </Txt>
                  </Pressable>
                )}
              </>
            )}
          </Col>
        )}

        {cloudConfigured && signedIn && (
          <Col gap={12}>
            <Card gap={6}>
              <Txt size={15} weight={700}>
                {status?.on ? (status.pending > 0 ? `${status.pending} changes waiting to upload` : 'Everything is backed up') : 'Backup is off on this phone'}
              </Txt>
              <Txt size={12} color="muted">
                {last ? `Last backup ${fmtDateShort(last)} ${fmtClock(minutesOfDay(last))}` : 'No backup yet'}. Changes upload by themselves when there is signal.
              </Txt>
            </Card>
            <Button label={busy ?? 'Back up now'} onPress={busy || voyage ? () => {} : () => run('Backing up…', status?.on ? pushChanges : afterSignIn)} />
            <Button variant="ghost" label="Sign out" onPress={signOut} />
            <Button variant="ghost" label="Delete cloud backup and account" onPress={deleteAccount} />
          </Col>
        )}
      </Sheet>
    </Screen>
  );
}
