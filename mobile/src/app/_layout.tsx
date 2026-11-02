import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Toast } from '@/components/Toast';
// Defines the background location task at start-up, before any fix arrives.
import '@/location/background';
import { urlFromResponse } from '@/lib/reminders';
import { AppStoreProvider, useAppStore } from '@/store/AppStore';
import { LookProvider, useAppFonts, useTokens } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();
  if (!fontsLoaded && !fontError) return null;

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
  const { ready } = useAppStore();
  // Keep the splash up until fonts and the database are both ready.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  // Tapping a reminder opens the screen it is about, including from a cold start.
  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;
    const go = (r: Notifications.NotificationResponse | null) => {
      const url = urlFromResponse(r);
      if (url) router.push(url as never);
    };
    Notifications.getLastNotificationResponseAsync().then(go).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(go);
    return () => sub.remove();
  }, [ready]);
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
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="live" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="summary" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="vessel" />
        <Stack.Screen name="document" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="voyage/[id]" />
        <Stack.Screen name="qualification/[id]" />
        <Stack.Screen name="voyage-new" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
      <Toast />
    </ThemeProvider>
  );
}
