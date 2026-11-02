import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

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
      const { error } = await supabase!.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      if (error) throw new Error(error.message);
      setSent(true);
    });

  const verify = () =>
    run('Checking…', async () => {
      const { error } = await supabase!.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
      if (error) throw new Error(error.message);
      await afterSignIn();
    });

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
            This build has no cloud project configured. Everything still works and stays on this phone; use Profile → Export all my data to keep a copy.
          </Txt>
        )}

        {cloudConfigured && !signedIn && (
          <Col gap={14}>
            <Txt size={14} color="muted">
              Sign in with your email. We send a 6-digit code, no password. Your records are only visible to you.
            </Txt>
            <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
            {sent && <Field label="Code from the email" value={code} onChangeText={setCode} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" />}
            {!sent ? (
              <Button label={busy ?? 'Send code'} onPress={busy || !email.includes('@') ? () => {} : sendCode} />
            ) : (
              <>
                <Button label={busy ?? 'Sign in'} onPress={busy || code.trim().length < 6 ? () => {} : verify} />
                <Button variant="ghost" label="Send a new code" onPress={busy ? () => {} : sendCode} />
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
