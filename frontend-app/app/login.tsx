import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { AuthPanel } from '@/components/auth-panel';
import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/providers/auth-provider';

export default function LoginScreen() {
  const { apiBaseUrl, redirectUrl, status, user, accessToken, startLogin, logout, refreshProfile } =
    useAuth();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#F7D4AE', dark: '#5A3B1E' }}
      headerImage={
        <Image source={require('@/assets/images/partial-react-logo.png')} style={styles.reactLogo} />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Login</ThemedText>
        <HelloWave />
      </ThemedView>

      <AuthPanel
        status={status}
        apiBaseUrl={apiBaseUrl}
        redirectUrl={redirectUrl}
        user={user}
        accessToken={accessToken}
        onLogin={startLogin}
        onLogout={logout}
        onRefresh={refreshProfile}
      />
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
