import { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  Modal, 
  TextInput,
  Dimensions,
  Animated,
  Easing,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useFeatures } from '@/contexts/FeaturesContext';
import { triggerHaptic } from '@/lib/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.88;

interface MenuItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: string;
  description?: string;
  featureKey?: string;
}

interface MenuGroup {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  items: MenuItem[];
  featureKey?: string;
}

interface GestoreMenuDrawerProps {
  visible: boolean;
  onClose: () => void;
  onNavigateDashboard: () => void;
  onNavigateEvents: () => void;
  onNavigateInventory: () => void;
  onNavigateStaff: () => void;
  onNavigateScanner: () => void;
  onNavigateMarketing: () => void;
  onNavigateAccounting: () => void;
  onNavigateProfile: () => void;
  onNavigateSettings: () => void;
  onNavigateProducts: () => void;
  onNavigatePriceLists: () => void;
  onNavigatePRManagement: () => void;
  onNavigateCompanies: () => void;
  onNavigateStations: () => void;
  onNavigateWarehouse: () => void;
  onNavigateSuppliers: () => void;
  onNavigatePersonnel: () => void;
  onNavigateReports: () => void;
  onNavigateCashier: () => void;
  onNavigateUsers: () => void;
  onNavigateSIAE: () => void;
  onNavigateLocations?: () => void;
  onNavigateFloorPlan?: () => void;
  onNavigatePurchaseOrders?: () => void;
  onNavigateConsumption?: () => void;
  onNavigateBilling?: () => void;
  currentScreen?: string;
}

export function GestoreMenuDrawer({
  visible,
  onClose,
  onNavigateDashboard,
  onNavigateEvents,
  onNavigateInventory,
  onNavigateStaff,
  onNavigateScanner,
  onNavigateMarketing,
  onNavigateAccounting,
  onNavigateProfile,
  onNavigateSettings,
  onNavigateProducts,
  onNavigatePriceLists,
  onNavigatePRManagement,
  onNavigateCompanies,
  onNavigateStations,
  onNavigateWarehouse,
  onNavigateSuppliers,
  onNavigatePersonnel,
  onNavigateReports,
  onNavigateCashier,
  onNavigateUsers,
  onNavigateSIAE,
  onNavigateLocations,
  onNavigateFloorPlan,
  onNavigatePurchaseOrders,
  onNavigateConsumption,
  onNavigateBilling,
  currentScreen,
}: GestoreMenuDrawerProps) {
  const { colors, isDark } = useTheme();
  const { isModuleEnabled } = useFeatures();
  const insets = useSafeAreaInsets();
  const [expandedGroup, setExpandedGroup] = useState<string | null>('modules');
  const [searchQuery, setSearchQuery] = useState('');
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  
  // Animazioni per i gruppi del menu (7 gruppi)
  const groupAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  
  const scaleAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          onClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      // Reset group animations
      groupAnims.forEach(anim => anim.setValue(0));
      
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Stagger group entrance animations
        const groupAnimations = groupAnims.map((anim, index) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            delay: index * 50,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: true,
          })
        );
        Animated.stagger(50, groupAnimations).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SHEET_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);
  
  const handleGroupPressIn = (index: number) => {
    Animated.spring(scaleAnims[index], {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };
  
  const handleGroupPressOut = (index: number) => {
    Animated.spring(scaleAnims[index], {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const toggleGroup = (groupId: string) => {
    triggerHaptic('light');
    setExpandedGroup(prev => prev === groupId ? null : groupId);
  };

  const handleItemPress = (onPress: () => void) => {
    triggerHaptic('light');
    onPress();
    onClose();
  };

  const menuGroups: MenuGroup[] = [
    {
      id: 'board',
      title: 'Bacheca',
      icon: 'home',
      gradient: ['#8B5CF6', '#7C3AED'],
      items: [
        { id: 'dashboard', label: 'Home', icon: 'home', onPress: onNavigateDashboard, description: 'Panoramica generale' },
      ],
    },
    {
      id: 'modules',
      title: 'Moduli',
      icon: 'apps',
      gradient: ['#14B8A6', '#0D9488'],
      items: [
        { id: 'events', label: 'Eventi', icon: 'calendar', onPress: onNavigateEvents, description: 'Gestione eventi' },
        { id: 'inventory', label: 'Inventario', icon: 'wine', onPress: onNavigateInventory, description: 'Gestione beverage', featureKey: 'inventory' },
        { id: 'accounting', label: 'Contabilità', icon: 'calculator', onPress: onNavigateAccounting, description: 'Gestione contabile', featureKey: 'accounting' },
        { id: 'staff', label: 'Staff', icon: 'people', onPress: onNavigatePersonnel, description: 'Gestione staff', featureKey: 'staff' },
        { id: 'cashier', label: 'Cassa', icon: 'cash', onPress: onNavigateCashier, description: 'Gestione cassa', featureKey: 'cashier' },
        { id: 'night-file', label: 'File Serata', icon: 'document-text', onPress: onNavigateSettings, description: 'Report serata', featureKey: 'nightFile' },
      ],
    },
    {
      id: 'management',
      title: 'Gestione',
      icon: 'settings',
      gradient: ['#F59E0B', '#D97706'],
      items: [
        { id: 'event-formats', label: 'Format Eventi', icon: 'list', onPress: onNavigateEvents, description: 'Template eventi' },
        { id: 'companies', label: 'Aziende', icon: 'business', onPress: onNavigateCompanies, description: 'Gestione società' },
        { id: 'locations', label: 'Location', icon: 'location', onPress: onNavigateLocations || (() => {}), description: 'Sedi e venue' },
        { id: 'users', label: 'Utenti', icon: 'people', onPress: onNavigateUsers, description: 'Account utenti' },
        { id: 'printer', label: 'Stampante', icon: 'print', onPress: onNavigateSettings, description: 'Impostazioni stampa' },
        { id: 'ticket-cashier', label: 'Cassa Biglietti', icon: 'ticket', onPress: onNavigateCashier, description: 'Vendita biglietti', featureKey: 'cassaBiglietti' },
        { id: 'scanner-management', label: 'Gestione Scanner', icon: 'scan', onPress: onNavigateScanner, description: 'Gestione scanner', featureKey: 'scanner' },
        { id: 'scanner-qr', label: 'Scanner QR', icon: 'qr-code', onPress: onNavigateScanner, description: 'Scansione QR', featureKey: 'scanner' },
        { id: 'pr', label: 'Gestione PR', icon: 'person-add', onPress: onNavigatePRManagement, description: 'Gestione PR e liste', featureKey: 'pr' },
        { id: 'digital-templates', label: 'Template Digitali', icon: 'grid', onPress: onNavigateSettings, description: 'Template digitali', featureKey: 'template' },
        { id: 'cashier-management', label: 'Gestione Cassieri', icon: 'people', onPress: onNavigateCashier, description: 'Gestione cassieri', featureKey: 'cashier' },
        { id: 'siae-customers', label: 'Clienti SIAE', icon: 'people-circle', onPress: onNavigateSIAE, description: 'Anagrafica clienti SIAE', featureKey: 'siae' },
      ],
    },
    {
      id: 'marketing',
      title: 'Marketing',
      icon: 'megaphone',
      gradient: ['#3B82F6', '#2563EB'],
      featureKey: 'marketing',
      items: [
        { id: 'marketing-dashboard', label: 'Marketing Dashboard', icon: 'stats-chart', onPress: onNavigateMarketing, description: 'Panoramica marketing', featureKey: 'marketing' },
        { id: 'loyalty', label: 'Programma Fedeltà', icon: 'gift', onPress: onNavigateMarketing, description: 'Gestione loyalty', featureKey: 'marketing' },
        { id: 'referral', label: 'Programma Referral', icon: 'share-social', onPress: onNavigateMarketing, description: 'Gestione referral', featureKey: 'marketing' },
        { id: 'bundles', label: 'Bundle Prodotti', icon: 'cube', onPress: onNavigateMarketing, description: 'Gestione bundle', featureKey: 'marketing' },
      ],
    },
    {
      id: 'account',
      title: 'Account',
      icon: 'person',
      gradient: ['#EC4899', '#DB2777'],
      items: [
        { id: 'reports', label: 'Report', icon: 'document-text', onPress: onNavigateSettings, description: 'Report e statistiche' },
      ],
    },
    {
      id: 'system',
      title: 'Sistema',
      icon: 'cog',
      gradient: ['#6366F1', '#4F46E5'],
      items: [
        { id: 'settings', label: 'Impostazioni', icon: 'settings', onPress: onNavigateSettings, description: 'Configurazione' },
      ],
    },
  ];

  const featureFilteredGroups = menuGroups
    .filter(group => !group.featureKey || isModuleEnabled(group.featureKey))
    .map(group => ({
      ...group,
      items: group.items.filter(item => !item.featureKey || isModuleEnabled(item.featureKey)),
    }))
    .filter(group => group.items.length > 0);

  const filteredGroups = searchQuery
    ? featureFilteredGroups.map(group => ({
        ...group,
        items: group.items.filter(item =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(group => group.items.length > 0)
    : featureFilteredGroups;

  const styles = StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: SHEET_HEIGHT,
      backgroundColor: colors.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      overflow: 'hidden',
    },
    handle: {
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    handleBar: {
      width: 48,
      height: 5,
      backgroundColor: colors.border,
      borderRadius: 3,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    titleIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
    },
    title: {
      fontSize: typography.fontSize['2xl'],
      fontWeight: '700',
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      borderRadius: borderRadius.xl,
      paddingHorizontal: spacing.md,
      height: 48,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    },
    searchInput: {
      flex: 1,
      fontSize: typography.fontSize.base,
      color: colors.foreground,
      marginLeft: spacing.sm,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.md,
    },
    groupContainer: {
      marginBottom: spacing.sm,
      borderRadius: borderRadius.xl,
      overflow: 'visible',
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    groupHeaderExpanded: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderBottomWidth: 0,
    },
    groupIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
    },
    groupTitleContainer: {
      flex: 1,
    },
    groupTitle: {
      fontSize: typography.fontSize.base,
      fontWeight: '700',
      color: colors.foreground,
      letterSpacing: 0.2,
    },
    groupSubtitle: {
      fontSize: typography.fontSize.xs,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    groupItemsCount: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 10,
      marginRight: spacing.sm,
    },
    groupItemsCountText: {
      fontSize: typography.fontSize.xs,
      fontWeight: '600',
      color: colors.mutedForeground,
    },
    expandIcon: {
      marginLeft: spacing.xs,
    },
    itemsContainer: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      borderBottomLeftRadius: borderRadius.xl,
      borderBottomRightRadius: borderRadius.xl,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },
    menuItemLast: {
      borderBottomWidth: 0,
    },
    menuItemActive: {
      backgroundColor: `${staticColors.primary}15`,
    },
    menuItemIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    menuItemContent: {
      flex: 1,
    },
    menuItemLabel: {
      fontSize: typography.fontSize.base,
      fontWeight: '600',
      color: colors.foreground,
    },
    menuItemDescription: {
      fontSize: typography.fontSize.xs,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    menuItemBadge: {
      backgroundColor: staticColors.primary,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: 12,
    },
    menuItemBadgeText: {
      fontSize: typography.fontSize.xs,
      fontWeight: '700',
      color: '#fff',
    },
    menuItemArrow: {
      marginLeft: spacing.xs,
    },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      paddingBottom: insets.bottom + spacing.lg,
      backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)',
    },
    footerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    footerLogo: {
      width: 24,
      height: 24,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerText: {
      fontSize: typography.fontSize.sm,
      fontWeight: '600',
      color: colors.mutedForeground,
    },
    footerVersion: {
      fontSize: typography.fontSize.xs,
      color: colors.mutedForeground,
      opacity: 0.7,
    },
  });

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View 
          style={[styles.backdrop, { opacity: backdropAnim }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View 
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View {...panResponder.panHandlers}>
            <View style={styles.handle}>
              <View style={styles.handleBar} />
            </View>
          </View>

          <View style={styles.header}>
            <View style={styles.titleRow}>
              <LinearGradient
                colors={[staticColors.primary, `${staticColors.primary}99`]}
                style={styles.titleIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="grid" size={18} color="#FFF" />
              </LinearGradient>
              <Text style={styles.title}>Menu Gestore</Text>
            </View>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={colors.mutedForeground} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cerca funzionalità..."
                placeholderTextColor={colors.mutedForeground}
                value={searchQuery}
                onChangeText={setSearchQuery}
                testID="menu-search-input"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} testID="menu-search-clear">
                  <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
                </Pressable>
              )}
            </View>
          </View>

          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing.xl }}
          >
            {filteredGroups.map((group, groupIndex) => {
              // Use stable animation values, fallback to static values for filtered results
              const hasAnim = groupIndex < groupAnims.length;
              const animStyle = hasAnim ? {
                opacity: groupAnims[groupIndex],
                transform: [
                  { translateX: groupAnims[groupIndex].interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }) },
                  { scale: scaleAnims[groupIndex] },
                ],
              } : {};
              
              return (
              <Animated.View 
                key={group.id} 
                style={[
                  styles.groupContainer,
                  animStyle,
                ]}
              >
                <Pressable
                  style={[
                    styles.groupHeader,
                    expandedGroup === group.id && styles.groupHeaderExpanded,
                  ]}
                  onPressIn={() => hasAnim && handleGroupPressIn(groupIndex)}
                  onPressOut={() => hasAnim && handleGroupPressOut(groupIndex)}
                  onPress={() => toggleGroup(group.id)}
                  testID={`menu-group-${group.id}`}
                >
                  <LinearGradient
                    colors={group.gradient}
                    style={styles.groupIconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name={group.icon} size={22} color="#fff" />
                  </LinearGradient>
                  <View style={styles.groupTitleContainer}>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    <Text style={styles.groupSubtitle}>{group.items.length} funzionalità</Text>
                  </View>
                  <View style={styles.groupItemsCount}>
                    <Text style={styles.groupItemsCountText}>{group.items.length}</Text>
                  </View>
                  <Ionicons
                    name={expandedGroup === group.id ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.mutedForeground}
                    style={styles.expandIcon}
                  />
                </Pressable>

                {expandedGroup === group.id && (
                  <View style={styles.itemsContainer}>
                    {group.items.map((item, index) => (
                      <Pressable
                        key={item.id}
                        style={({ pressed }) => [
                          styles.menuItem,
                          index === group.items.length - 1 && styles.menuItemLast,
                          currentScreen === item.id && styles.menuItemActive,
                          pressed && { opacity: 0.7, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                        ]}
                        onPress={() => handleItemPress(item.onPress)}
                        testID={`menu-item-${item.id}`}
                      >
                        <View style={[
                          styles.menuItemIcon,
                          currentScreen === item.id && { backgroundColor: `${staticColors.primary}20` },
                        ]}>
                          <Ionicons 
                            name={item.icon} 
                            size={18} 
                            color={currentScreen === item.id ? staticColors.primary : colors.foreground} 
                          />
                        </View>
                        <View style={styles.menuItemContent}>
                          <Text style={[
                            styles.menuItemLabel,
                            currentScreen === item.id && { color: staticColors.primary },
                          ]}>{item.label}</Text>
                          {item.description && (
                            <Text style={styles.menuItemDescription}>{item.description}</Text>
                          )}
                        </View>
                        {item.badge && (
                          <View style={styles.menuItemBadge}>
                            <Text style={styles.menuItemBadgeText}>{item.badge}</Text>
                          </View>
                        )}
                        <Ionicons 
                          name="chevron-forward" 
                          size={16} 
                          color={colors.mutedForeground} 
                          style={styles.menuItemArrow}
                        />
                      </Pressable>
                    ))}
                  </View>
                )}
              </Animated.View>
            );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.footerContent}>
              <LinearGradient
                colors={[staticColors.primary, `${staticColors.primary}80`]}
                style={styles.footerLogo}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="sparkles" size={14} color="#FFF" />
              </LinearGradient>
              <Text style={styles.footerText}>Event Four You</Text>
              <Text style={styles.footerVersion}>v2.0</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
