import { router } from 'expo-router';

/** Back, or Home when the screen was opened directly (from a notification, or a reload), so Close and Save never do nothing. */
export function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
