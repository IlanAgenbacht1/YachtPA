import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { ErrorScreen } from '@/components/ErrorScreen';
import { TabBar } from '@/components/TabBar';
import { useAppStore } from '@/store/AppStore';
import { useTokens } from '@/theme';

export default function TabsLayout() {
  const t = useTokens();
  const { ready, current } = useAppStore();
  if (!ready) return null;
  if (!current) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.colors.bg }, lazy: true }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="log" options={{ title: 'Log' }} />
      <Tabs.Screen name="experience" options={{ title: 'Experience' }} />
      <Tabs.Screen name="documents" options={{ title: 'Documents' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

/** A screen that throws shows a plain-language recovery screen instead of crashing the app. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return <ErrorScreen error={error} retry={() => void retry()} />;
}
