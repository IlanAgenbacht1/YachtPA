import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Heavy tap for START and STOP; silently skipped where haptics do not exist. */
export function thump() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}

/** Light confirmation tick. */
export function tick() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
