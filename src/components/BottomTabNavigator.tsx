import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/lib/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';

export type TabName = 'home' | 'search' | 'tickets' | 'account';

interface TabItem {
  name: TabName;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

const tabs: TabItem[] = [
  { name: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'search', label: 'Cerca', icon: 'search-outline', iconActive: 'search' },
  { name: 'tickets', label: 'Biglietti', icon: 'ticket-outline', iconActive: 'ticket' },
  { name: 'account', label: 'Account', icon: 'person-outline', iconActive: 'person' },
];

interface BottomTabNavigatorProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
  cartCount?: number;
  isAuthenticated?: boolean;
}

export function BottomTabNavigator({
  activeTab,
  onTabPress,
  cartCount = 0,
  isAuthenticated = false,
}: BottomTabNavigatorProps) {
  const { colors: themeColors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card, borderTopColor: themeColors.border }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.name;
        return (
          <Pressable
            key={tab.name}
            style={styles.tab}
            onPress={() => {
              triggerHaptic('light');
              onTabPress(tab.name);
            }}
            testID={`tab-${tab.name}`}
          >
            <View style={styles.tabContent}>
              {isActive && <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />}
              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={24}
                color={isActive ? colors.primary : colors.mutedForeground}
              />
              {tab.name === 'tickets' && cartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
                </View>
              )}
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
  badge: {
    position: 'absolute',
    top: -2,
    right: 2,
    backgroundColor: colors.destructive,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
