import { View, StyleSheet, ViewStyle, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';

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
  backgroundColor,
}: SafeAreaProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const bgColor = backgroundColor ?? colors.background;

  const paddingStyle: ViewStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  return (
    <View style={[{ flex: 1, backgroundColor: bgColor }, paddingStyle, style]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={bgColor}
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
  const { colors } = useTheme();
  
  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: colors.background,
    ...(noPadding ? {} : { paddingHorizontal: 16 }),
    ...style,
  };
  
  return (
    <SafeArea style={containerStyle}>
      {children}
    </SafeArea>
  );
}

export default SafeArea;
