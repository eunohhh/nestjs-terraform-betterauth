import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/auth-provider';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const { startLogin, user, status } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Family Infra</Text>
        <Text style={[styles.subtitle, { color: theme.icon }]}>Manage your family services simply.</Text>
      </View>

      <View style={styles.footer}>
         {status.tone === 'neutral' && status.label !== 'idle' ? (
             <ActivityIndicator size="large" color="#0064FF" />
         ) : (
            <TouchableOpacity style={styles.button} onPress={startLogin} activeOpacity={0.8}>
              <Text style={styles.buttonText}>Start with Google</Text>
            </TouchableOpacity>
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
  button: {
    backgroundColor: '#0064FF', // Toss Blue-ish
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});