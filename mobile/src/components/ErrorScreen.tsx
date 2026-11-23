import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, Share, Text, View } from 'react-native';

import { log, problemReport } from '@/lib/diag';

/** What gets sent when a tester taps "Send details": enough for a developer to find the bug, nothing personal. */
export function errorReport(error: Error): string {
  const version = Constants.expoConfig?.version ?? '?';
  const stack = (error.stack ?? '').split('\n').slice(0, 8).join('\n');
  return `YachtPA ${version} (${Platform.OS} ${Platform.Version})\n${error.name}: ${error.message}\n${stack}`;
}

/**
 * Shown instead of a screen that failed. Plain words, records reassured,
 * three ways out. Used as Expo Router's ErrorBoundary in the layouts.
 *
 * Deliberately self-contained: no theme, fonts or app state, because at the
 * top level it renders outside those providers, and it must never fail itself.
 */
export function ErrorScreen({ error, retry }: { error: Error; retry: () => void }) {
  useEffect(() => {
    log('error', 'screen', `Screen failed: ${error.message}`, error);
  }, [error]);
  // The report carries the recent log too; if even that fails, the error alone still goes.
  const send = async () => {
    let message = errorReport(error);
    try {
      message = await problemReport({}, message);
    } catch {
      // keep the short version
    }
    Share.share({ message }).catch(() => {});
  };
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F2F4F7' }} contentContainerStyle={{ padding: 24, paddingTop: 72, gap: 16 }}>
      <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1.5, color: '#5A6A7A' }}>SOMETHING WENT WRONG</Text>
      <Text style={{ fontSize: 28, fontWeight: '700', color: '#0E1D31' }}>This screen didn’t open properly</Text>
      <Text style={{ fontSize: 15, lineHeight: 22, color: '#5A6A7A' }}>
        Your voyages, logs and documents are safe. Try again, or go back to Home. If it keeps happening, tap Send details and pass it on to whoever gave you the app.
      </Text>
      <View style={{ gap: 10, marginTop: 8 }}>
        <PlainButton primary label="Try again" onPress={retry} />
        <PlainButton label="Go to Home" onPress={() => router.replace('/')} />
        <PlainButton label="Send details" onPress={send} />
      </View>
      <Text selectable style={{ fontSize: 11, color: '#5A6A7A', marginTop: 12 }}>
        {error.message}
      </Text>
    </ScrollView>
  );
}

function PlainButton({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: primary ? '#D2481F' : '#FFFFFF',
        borderWidth: 1,
        borderColor: primary ? '#D2481F' : '#E0E6EC',
        opacity: pressed ? 0.85 : 1,
      })}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: primary ? '#FFFFFF' : '#0E1D31' }}>{label}</Text>
    </Pressable>
  );
}

/**
 * Keeps one part of a screen from taking the whole screen down: if a child
 * throws, `fallback` renders instead and `onError` is told once.
 */
export class Contain extends Component<{ children: ReactNode; fallback: ReactNode; onError?: (e: Error) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError?.(error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
