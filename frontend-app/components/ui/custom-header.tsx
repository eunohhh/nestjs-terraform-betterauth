import { Header } from '@react-navigation/elements';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { TouchableOpacity, StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CustomHeaderProps {
  title: string;
  showDrawerToggle?: boolean;
  headerLeft?: () => React.ReactNode;
}

export default function CustomHeader({
  title,
  showDrawerToggle = true,
  headerLeft,
}: CustomHeaderProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const navigation = useNavigation();

  const toggleDrawer = () => {
    navigation.dispatch(DrawerActions.toggleDrawer());
  };

  const defaultHeaderLeft = showDrawerToggle
    ? () => (
        <TouchableOpacity onPress={toggleDrawer} style={styles.headerLeftButton}>
          <IconSymbol name="line.3.horizontal" size={24} color={theme.text} />
        </TouchableOpacity>
      )
    : undefined;

  return (
    <Header
      title={title}
      headerStyle={[styles.header, { backgroundColor: theme.background }]}
      headerTitleStyle={{ color: theme.text }}
      headerLeft={headerLeft ?? defaultHeaderLeft}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    height: 112,
  },
  headerLeftButton: {
    marginLeft: 16,
  },
});
