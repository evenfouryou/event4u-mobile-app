import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/lib/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';

export type ScannerTabName = 'home' | 'events' | 'profile';

interface ScannerTabItem {
  name: ScannerTabName;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

const scannerTabs: ScannerTabItem[] = [
  { name: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'events', label: 'Eventi', icon: 'calendar-outline', iconActive: 'calendar' },
  { name: 'profile', label: 'Profilo', icon: 'person-outline', iconActive: 'person' },
];

interface ScannerBottomTabNavigatorProps {
  activeTab: ScannerTabName;
  onTabPress: (tab: ScannerTabName) => void;
}

export function ScannerBottomTabNavigator({ activeTab, onTabPress }: ScannerBottomTabNavigatorProps) {
  const { colors: themeColors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card, borderTopColor: themeColors.border }]}>
      {scannerTabs.map((tab) => {
        const isActive = activeTab === tab.name;
        return (
          <Pressable
            key={tab.name}
            style={styles.tab}
            onPress={() => {
              triggerHaptic('light');
              onTabPress(tab.name);
            }}
            testID={`scanner-tab-${tab.name}`}
          >
            <View style={styles.tabContent}>
              {isActive && <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />}
              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={24}
                color={isActive ? colors.primary : colors.mutedForeground}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? colors.primary : colors.mutedForeground },
                isActive && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabContent: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 28,
  },
  activeIndicator: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 3,
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
});
