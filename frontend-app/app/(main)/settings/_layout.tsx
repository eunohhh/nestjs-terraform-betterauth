import { Stack } from 'expo-router';
import React from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function SettingsLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: '설정',
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: '알림 설정',
        }}
      />
      <Stack.Screen
        name="privacy-policy"
        options={{
          title: '개인정보 처리방침',
        }}
      />
    </Stack>
  );
}
