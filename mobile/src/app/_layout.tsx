import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Toast } from '@/components/Toast';
import { AppStoreProvider } from '@/store/AppStore';
import { LookProvider, useAppFonts, useTokens } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();
  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);
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
        <Stack.Screen name="summary" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
      </Stack>
      <Toast />
    </ThemeProvider>
  );
}
