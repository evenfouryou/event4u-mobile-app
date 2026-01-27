import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';

interface MenuItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: string;
}

interface MenuGroup {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  items: MenuItem[];
}

interface AdminMenuDrawerProps {
  visible: boolean;
  onClose: () => void;
  onNavigateDashboard: () => void;
  onNavigateGestori: () => void;
  onNavigateCompanies: () => void;
  onNavigateSettings: () => void;
  onNavigatePrinter: () => void;
  onNavigateDigitalTemplates: () => void;
  onNavigateStripeAdmin: () => void;
  onNavigateSIAEApprovals: () => void;
  onNavigateSIAETables: () => void;
  onNavigateSIAECards: () => void;
  onNavigateSIAEConfig: () => void;
  onNavigateSIAECustomers: () => void;
  onNavigateSIAEConsole: () => void;
  onNavigateSIAETransactions: () => void;
  onNavigateSIAEMonitor: () => void;
  onNavigateBillingPlans: () => void;
  onNavigateBillingOrganizers: () => void;
  onNavigateBillingInvoices: () => void;
  onNavigateBillingReports: () => void;
  onNavigateUsers: () => void;
  onNavigateEvents: () => void;
  onNavigateNameChanges: () => void;
}

export function AdminMenuDrawer({
  visible,
  onClose,
  onNavigateDashboard,
  onNavigateGestori,
  onNavigateCompanies,
  onNavigateSettings,
  onNavigatePrinter,
  onNavigateDigitalTemplates,
  onNavigateStripeAdmin,
  onNavigateSIAEApprovals,
  onNavigateSIAETables,
  onNavigateSIAECards,
  onNavigateSIAEConfig,
  onNavigateSIAECustomers,
  onNavigateSIAEConsole,
  onNavigateSIAETransactions,
  onNavigateSIAEMonitor,
  onNavigateBillingPlans,
  onNavigateBillingOrganizers,
  onNavigateBillingInvoices,
  onNavigateBillingReports,
  onNavigateUsers,
  onNavigateEvents,
  onNavigateNameChanges,
}: AdminMenuDrawerProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['sistema']);

  const toggleGroup = (groupId: string) => {
    triggerHaptic('light');
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleItemPress = (onPress: () => void) => {
    triggerHaptic('light');
    onPress();
    onClose();
  };

  const menuGroups: MenuGroup[] = [
    {
      id: 'sistema',
      title: 'Sistema',
      icon: 'settings',
      gradient: ['#14B8A6', '#0D9488'],
      items: [
        { id: 'dashboard', label: 'Pannello di Controllo', icon: 'grid', onPress: onNavigateDashboard },
        { id: 'gestori', label: 'Gestori', icon: 'people', onPress: onNavigateGestori },
        { id: 'companies', label: 'Aziende', icon: 'business', onPress: onNavigateCompanies },
        { id: 'users', label: 'Utenti', icon: 'person', onPress: onNavigateUsers },
        { id: 'events', label: 'Eventi', icon: 'calendar', onPress: onNavigateEvents },
        { id: 'settings', label: 'Impostazioni Sito', icon: 'cog', onPress: onNavigateSettings },
        { id: 'printer', label: 'Stampanti', icon: 'print', onPress: onNavigatePrinter },
        { id: 'templates', label: 'Template Digitali', icon: 'document-text', onPress: onNavigateDigitalTemplates },
        { id: 'stripe', label: 'Gestione Stripe', icon: 'card', onPress: onNavigateStripeAdmin },
      ],
    },
    {
      id: 'siae',
      title: 'Modulo SIAE',
      icon: 'shield-checkmark',
      gradient: ['#10B981', '#059669'],
      items: [
        { id: 'siae-approvals', label: 'Approvazioni', icon: 'checkmark-done', onPress: onNavigateSIAEApprovals, badge: '3' },
        { id: 'siae-tables', label: 'Tabelle Dati', icon: 'grid-outline', onPress: onNavigateSIAETables },
        { id: 'siae-cards', label: 'Tessere Attivazione', icon: 'card-outline', onPress: onNavigateSIAECards },
        { id: 'siae-config', label: 'Configurazione', icon: 'options', onPress: onNavigateSIAEConfig },
        { id: 'siae-customers', label: 'Clienti SIAE', icon: 'people-outline', onPress: onNavigateSIAECustomers },
        { id: 'siae-console', label: 'Console Operativa', icon: 'terminal', onPress: onNavigateSIAEConsole },
        { id: 'siae-transactions', label: 'Transazioni', icon: 'swap-horizontal', onPress: onNavigateSIAETransactions },
        { id: 'siae-monitor', label: 'Monitoraggio', icon: 'pulse', onPress: onNavigateSIAEMonitor },
        { id: 'name-changes', label: 'Cambio Nominativo', icon: 'swap-vertical', onPress: onNavigateNameChanges },
      ],
    },
    {
      id: 'billing',
      title: 'Fatturazione',
      icon: 'wallet',
      gradient: ['#F59E0B', '#D97706'],
      items: [
        { id: 'billing-plans', label: 'Piani Abbonamento', icon: 'layers', onPress: onNavigateBillingPlans },
        { id: 'billing-organizers', label: 'Organizzatori', icon: 'briefcase', onPress: onNavigateBillingOrganizers },
        { id: 'billing-invoices', label: 'Fatture', icon: 'receipt', onPress: onNavigateBillingInvoices },
        { id: 'billing-reports', label: 'Report Finanziari', icon: 'bar-chart', onPress: onNavigateBillingReports },
      ],
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.drawer, { paddingTop: insets.top, backgroundColor: colors.background }]}>
          {/* Header con gradiente */}
          <LinearGradient
            colors={['#14B8A6', '#0D9488']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <View style={styles.drawerHeader}>
              <View style={styles.headerContent}>
                <View style={styles.logoContainer}>
                  <Ionicons name="shield-checkmark" size={28} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.drawerTitle}>Pannello Admin</Text>
                  <Text style={styles.drawerSubtitle}>Event4U Management</Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  onClose();
                }}
                style={styles.closeButton}
                testID="button-close-drawer"
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>
          </LinearGradient>

          <ScrollView 
            style={styles.menuScroll} 
            contentContainerStyle={styles.menuContent}
            showsVerticalScrollIndicator={false}
          >
            {menuGroups.map((group) => {
              const isExpanded = expandedGroups.includes(group.id);
              
              return (
                <View key={group.id} style={styles.menuGroup}>
                  <Pressable
                    onPress={() => toggleGroup(group.id)}
                    style={({ pressed }) => [
                      styles.groupHeader,
                      { 
                        backgroundColor: pressed ? colors.muted : colors.card,
                        borderColor: colors.border,
                      }
                    ]}
                    testID={`group-${group.id}`}
                  >
                    <LinearGradient
                      colors={group.gradient}
                      style={styles.groupIconWrap}
                    >
                      <Ionicons name={group.icon} size={18} color="#FFFFFF" />
                    </LinearGradient>
                    <Text style={[styles.groupTitle, { color: colors.foreground }]}>
                      {group.title}
                    </Text>
                    <View style={[styles.itemCount, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.itemCountText, { color: colors.mutedForeground }]}>
                        {group.items.length}
                      </Text>
                    </View>
                    <Ionicons 
                      name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                      size={18} 
                      color={colors.mutedForeground} 
                    />
                  </Pressable>

                  {isExpanded && (
                    <View style={[styles.groupItems, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      {group.items.map((item, index) => (
                        <Pressable
                          key={item.id}
                          onPress={() => handleItemPress(item.onPress)}
                          style={({ pressed }) => [
                            styles.menuItem,
                            { 
                              backgroundColor: pressed ? colors.muted : 'transparent',
                              borderBottomColor: index < group.items.length - 1 ? colors.border : 'transparent',
                              borderBottomWidth: index < group.items.length - 1 ? 1 : 0,
                            }
                          ]}
                          testID={`menu-item-${item.id}`}
                        >
                          <View style={[styles.menuIconWrap, { backgroundColor: `${group.gradient[0]}15` }]}>
                            <Ionicons name={item.icon} size={16} color={group.gradient[0]} />
                          </View>
                          <Text style={[styles.menuItemLabel, { color: colors.foreground }]}>
                            {item.label}
                          </Text>
                          {item.badge && (
                            <View style={styles.badge}>
                              <Text style={styles.badgeText}>{item.badge}</Text>
                            </View>
                          )}
                          <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <Text style={[styles.quickActionsTitle, { color: colors.mutedForeground }]}>
                Azioni Rapide
              </Text>
              <View style={styles.quickActionsGrid}>
                <Pressable 
                  style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleItemPress(onNavigateDashboard)}
                  testID="quick-action-dashboard"
                >
                  <Ionicons name="speedometer" size={24} color="#14B8A6" />
                  <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>Dashboard</Text>
                </Pressable>
                <Pressable 
                  style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleItemPress(onNavigateSIAEMonitor)}
                  testID="quick-action-monitor"
                >
                  <Ionicons name="pulse" size={24} color="#10B981" />
                  <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>Monitor</Text>
                </Pressable>
                <Pressable 
                  style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleItemPress(onNavigateBillingInvoices)}
                  testID="quick-action-invoices"
                >
                  <Ionicons name="receipt" size={24} color="#F59E0B" />
                  <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>Fatture</Text>
                </Pressable>
                <Pressable 
                  style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleItemPress(onNavigateSettings)}
                  testID="quick-action-settings"
                >
                  <Ionicons name="settings" size={24} color="#8B5CF6" />
                  <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>Impostazioni</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.drawerFooter, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
            <View style={styles.footerContent}>
              <Ionicons name="information-circle-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
                Event4U Admin v2.0
              </Text>
            </View>
          </View>
        </View>
        <Pressable style={styles.backdrop} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 0.15,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  drawer: {
    flex: 0.85,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerGradient: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  drawerSubtitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  menuScroll: {
    flex: 1,
  },
  menuContent: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  menuGroup: {
    marginBottom: spacing.md,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    gap: spacing.sm,
    borderWidth: 1,
  },
  groupIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  itemCount: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemCountText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  groupItems: {
    marginTop: spacing.xs,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickActions: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  quickActionsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickAction: {
    width: '48%',
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  quickActionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  drawerFooter: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  footerText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
});

export default AdminMenuDrawer;
