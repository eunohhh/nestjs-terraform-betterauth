import { Tabs, useNavigation } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { DrawerActions } from '@react-navigation/native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const navigation = useNavigation();

  const toggleDrawer = () => {
    navigation.dispatch(DrawerActions.toggleDrawer());
  };

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { display: 'none' },
        headerShown: true,
        headerLeft: () => (
            <TouchableOpacity onPress={toggleDrawer} style={{ marginLeft: 16 }}>
                <IconSymbol name="line.3.horizontal" size={24} color={Colors[colorScheme ?? 'light'].text} />
            </TouchableOpacity>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
    </Tabs>
  );
}