import { View, StyleSheet, ViewStyle, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';

interface SafeAreaProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  backgroundColor?: string;
}

export function SafeArea({
  children,
  style,
  edges = ['top', 'bottom'],
  backgroundColor = colors.background,
}: SafeAreaProps) {
  const insets = useSafeAreaInsets();

  const paddingStyle: ViewStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  return (
    <View style={[styles.container, { backgroundColor }, paddingStyle, style]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={backgroundColor}
        translucent={Platform.OS === 'android'}
      />
      {children}
    </View>
  );
}

export function ScreenContainer({
  children,
  style,
  noPadding = false,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
}) {
  return (
    <SafeArea style={[styles.screen, !noPadding && styles.padding, style]}>
      {children}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  padding: {
    paddingHorizontal: 16,
  },
});

export default SafeArea;
