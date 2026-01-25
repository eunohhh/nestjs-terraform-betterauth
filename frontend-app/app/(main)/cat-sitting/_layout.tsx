import { Stack } from 'expo-router';
import { DrawerToggleButton } from '@react-navigation/drawer';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function CatSittingLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerLeft: () => <DrawerToggleButton tintColor={theme.text} />,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: '고양이 돌보미',
        }}
      />
      <Stack.Screen
        name="care/[id]"
        options={{
          title: '케어 상세',
          headerLeft: undefined,
        }}
      />
      <Stack.Screen
        name="bookings"
        options={{
          title: '예약 목록',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="admin"
        options={{
          title: '관리자',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
