import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/auth-provider';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const { startGoogleLogin, startAppleLogin, user, status } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  const isLoading = status.tone === 'neutral' && status.label !== 'idle';

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>allrecords</Text>
        <Text style={[styles.subtitle, { color: theme.icon }]}>Manage our family services simply.</Text>
      </View>

      <View style={styles.footer}>
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.tint} />
        ) : (
          <View style={styles.buttonContainer}>
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.button, styles.appleButton]}
                onPress={startAppleLogin}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Continue with Apple</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.googleButton]}
              onPress={startGoogleLogin}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, styles.googleButtonText]}>Continue with Google</Text>
            </TouchableOpacity>
          </View>
        )}
        {status.tone === 'error' && status.detail && (
          <Text style={styles.errorText}>{status.detail}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 24,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dadce0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  googleButtonText: {
    color: '#3c4043',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
});
