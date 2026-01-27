import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  color: string;
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
      color: staticColors.teal,
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'grid', onPress: onNavigateDashboard },
        { id: 'gestori', label: 'Gestori', icon: 'people', onPress: onNavigateGestori },
        { id: 'companies', label: 'Aziende', icon: 'business', onPress: onNavigateCompanies },
        { id: 'users', label: 'Utenti', icon: 'person', onPress: onNavigateUsers },
        { id: 'events', label: 'Eventi', icon: 'calendar', onPress: onNavigateEvents },
        { id: 'settings', label: 'Site Settings', icon: 'cog', onPress: onNavigateSettings },
        { id: 'printer', label: 'Printer', icon: 'print', onPress: onNavigatePrinter },
        { id: 'templates', label: 'Digital Templates', icon: 'document-text', onPress: onNavigateDigitalTemplates },
        { id: 'stripe', label: 'Stripe Admin', icon: 'card', onPress: onNavigateStripeAdmin },
      ],
    },
    {
      id: 'siae',
      title: 'SIAE',
      icon: 'shield-checkmark',
      color: '#10B981',
      items: [
        { id: 'siae-approvals', label: 'Approvals', icon: 'checkmark-done', onPress: onNavigateSIAEApprovals, badge: '3' },
        { id: 'siae-tables', label: 'Tables', icon: 'grid-outline', onPress: onNavigateSIAETables },
        { id: 'siae-cards', label: 'Activation Cards', icon: 'card-outline', onPress: onNavigateSIAECards },
        { id: 'siae-config', label: 'System Config', icon: 'options', onPress: onNavigateSIAEConfig },
        { id: 'siae-customers', label: 'Customers', icon: 'people-outline', onPress: onNavigateSIAECustomers },
        { id: 'siae-console', label: 'Console', icon: 'terminal', onPress: onNavigateSIAEConsole },
        { id: 'siae-transactions', label: 'Transactions', icon: 'swap-horizontal', onPress: onNavigateSIAETransactions },
        { id: 'siae-monitor', label: 'Monitor', icon: 'pulse', onPress: onNavigateSIAEMonitor },
        { id: 'name-changes', label: 'Cambio Nominativo', icon: 'swap-vertical', onPress: onNavigateNameChanges },
      ],
    },
    {
      id: 'billing',
      title: 'Billing',
      icon: 'wallet',
      color: staticColors.golden,
      items: [
        { id: 'billing-plans', label: 'Plans', icon: 'layers', onPress: onNavigateBillingPlans },
        { id: 'billing-organizers', label: 'Organizers', icon: 'briefcase', onPress: onNavigateBillingOrganizers },
        { id: 'billing-invoices', label: 'Invoices', icon: 'receipt', onPress: onNavigateBillingInvoices },
        { id: 'billing-reports', label: 'Reports', icon: 'bar-chart', onPress: onNavigateBillingReports },
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
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.drawer, { paddingTop: insets.top + spacing.md, backgroundColor: colors.card }]}>
          <View style={styles.drawerHeader}>
            <Text style={[styles.drawerTitle, { color: colors.foreground }]}>Admin Menu</Text>
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                onClose();
              }}
              style={styles.closeButton}
              testID="button-close-drawer"
            >
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView 
            style={styles.menuScroll} 
            contentContainerStyle={styles.menuContent}
            showsVerticalScrollIndicator={false}
          >
            {menuGroups.map((group) => (
              <View key={group.id} style={styles.menuGroup}>
                <Pressable
                  onPress={() => toggleGroup(group.id)}
                  style={[styles.groupHeader, { backgroundColor: `${group.color}15` }]}
                  testID={`group-${group.id}`}
                >
                  <View style={[styles.groupIconWrap, { backgroundColor: `${group.color}25` }]}>
                    <Ionicons name={group.icon} size={20} color={group.color} />
                  </View>
                  <Text style={[styles.groupTitle, { color: colors.foreground }]}>{group.title}</Text>
                  <Ionicons 
                    name={expandedGroups.includes(group.id) ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color={colors.mutedForeground} 
                  />
                </Pressable>

                {expandedGroups.includes(group.id) && (
                  <View style={styles.groupItems}>
                    {group.items.map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => handleItemPress(item.onPress)}
                        style={({ pressed }) => [
                          styles.menuItem,
                          { 
                            backgroundColor: pressed ? colors.muted : 'transparent',
                            borderLeftColor: group.color,
                          }
                        ]}
                        testID={`menu-item-${item.id}`}
                      >
                        <Ionicons name={item.icon} size={18} color={colors.mutedForeground} />
                        <Text style={[styles.menuItemLabel, { color: colors.foreground }]}>
                          {item.label}
                        </Text>
                        {item.badge && (
                          <View style={[styles.badge, { backgroundColor: staticColors.destructive }]}>
                            <Text style={styles.badgeText}>{item.badge}</Text>
                          </View>
                        )}
                        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={[styles.drawerFooter, { borderTopColor: colors.border }]}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              Event4U Admin Panel v2.0
            </Text>
          </View>
        </View>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    flex: 0.85,
    borderTopLeftRadius: borderRadius.xl,
    borderBottomLeftRadius: borderRadius.xl,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  drawerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.glass,
  },
  menuScroll: {
    flex: 1,
  },
  menuContent: {
    paddingVertical: spacing.md,
  },
  menuGroup: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  groupIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  groupItems: {
    marginTop: spacing.xs,
    marginLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: staticColors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginLeft: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
    borderLeftWidth: 0,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  drawerFooter: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
});

export default AdminMenuDrawer;
