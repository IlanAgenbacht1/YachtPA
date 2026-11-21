import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Toast } from '@/components/Toast';
import { initDb } from '@/db/db';
import { initNotifications } from '@/lib/notify';
import { AppStoreProvider } from '@/store/AppStore';
import { LookProvider, useAppFonts, useTokens } from '@/theme';
// Defines the background location task at module load, as TaskManager requires.
import '@/tracking/tracker';

SplashScreen.preventAutoHideAsync();
initNotifications();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();
  const [dbReady, setDbReady] = useState(false);
  useEffect(() => {
    initDb().then(() => setDbReady(true));
  }, []);
  const ready = (fontsLoaded || !!fontError) && dbReady;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LookProvider>
        <AppStoreProvider>
          <Shell />
        </AppStoreProvider>
      </LookProvider>
    </GestureHandlerRootView>
  );
}

function Shell() {
  const t = useTokens();
  const base = t.look === 'night' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: t.colors.bg, card: t.colors.tab, text: t.colors.fg, border: t.colors.cardBorder, primary: t.colors.accent },
  };
  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={t.heroIsDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="live" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="voyage/[id]" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
      </Stack>
      <Toast />
    </ThemeProvider>
  );
}
