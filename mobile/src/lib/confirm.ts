import { Alert, Platform } from 'react-native';

/** Yes/no dialog that resolves to the answer. Uses the browser's confirm on web, where Alert has no buttons. */
export function confirm(title: string, message: string, yes = 'OK', no = 'Cancel'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message}`) : false);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: no, style: 'cancel', onPress: () => resolve(false) },
      { text: yes, onPress: () => resolve(true) },
    ]);
  });
}
