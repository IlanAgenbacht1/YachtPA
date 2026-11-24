import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Button, Display, Eyebrow, Hero, Sheet, Txt } from '@/components/ui';
import { log } from '@/lib/diag';
import { supabase } from '@/sync/supabase';

/**
 * Where the "Sign in" link in the email lands (yachtpa://auth#access_token=…).
 * Free Supabase projects can only send the default email, which has a link,
 * not a code. The link opens the app here; we store the session and hand
 * over to the backup screen to finish (back up, or restore).
 */
export default function AuthLanding() {
  const url = Linking.useURL();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!url || !supabase) return;
    const client = supabase;
    const params = new URLSearchParams((url.split('#')[1] ?? url.split('?')[1] ?? '').replace(/^\?/, ''));
    const access = params.get('access_token');
    const refresh = params.get('refresh_token');
    const code = params.get('code');
    const problem = params.get('error_description');
    (async () => {
      if (problem) throw new Error(problem.replace(/\+/g, ' '));
      if (access && refresh) {
        const { error: e } = await client.auth.setSession({ access_token: access, refresh_token: refresh });
        if (e) throw e;
      } else if (code) {
        const { error: e } = await client.auth.exchangeCodeForSession(code);
        if (e) throw e;
      } else return;
      router.replace({ pathname: '/cloud', params: { justSignedIn: '1' } });
    })().catch((e: Error) => {
      log('warn', 'backup', `Sign-in link failed: ${e.message}`);
      setError(/expired|invalid/i.test(e.message) ? 'That sign-in link has expired or was already used. Ask for a new one.' : e.message);
    });
  }, [url]);

  return (
    <Screen>
      <Hero gap={10}>
        <Eyebrow color="heroMuted">Cloud backup</Eyebrow>
        <Display size={32} color="heroFg">
          {error ? 'Couldn’t sign in' : 'Signing you in…'}
        </Display>
      </Hero>
      <Sheet gap={14} paddingTop={24}>
        {error ? (
          <View style={{ gap: 14 }}>
            <Txt size={15} color="muted">
              {error}
            </Txt>
            <Button label="Back to cloud backup" onPress={() => router.replace('/cloud')} />
          </View>
        ) : (
          <Txt size={15} color="muted">
            One moment.
          </Txt>
        )}
      </Sheet>
    </Screen>
  );
}
