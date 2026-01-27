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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.88, 380);

interface MenuItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: string;
  description?: string;
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
  onNavigateSIAEBoxOffice: () => void;
  onNavigateSIAETransmissions: () => void;
  onNavigateSIAETicketTypes: () => void;
  onNavigateSIAEResales: () => void;
  onNavigateSIAESubscriptions: () => void;
  onNavigateSIAEAuditLogs: () => void;
  onNavigateBillingPlans: () => void;
  onNavigateBillingOrganizers: () => void;
  onNavigateBillingInvoices: () => void;
  onNavigateBillingReports: () => void;
  onNavigateUsers: () => void;
  onNavigateEvents: () => void;
  onNavigateNameChanges: () => void;
  currentScreen?: string;
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
  onNavigateSIAEBoxOffice,
  onNavigateSIAETransmissions,
  onNavigateSIAETicketTypes,
  onNavigateSIAEResales,
  onNavigateSIAESubscriptions,
  onNavigateSIAEAuditLogs,
  onNavigateBillingPlans,
  onNavigateBillingOrganizers,
  onNavigateBillingInvoices,
  onNavigateBillingReports,
  onNavigateUsers,
  onNavigateEvents,
  onNavigateNameChanges,
  currentScreen,
}: AdminMenuDrawerProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [expandedGroup, setExpandedGroup] = useState<string | null>('sistema');
  const [searchQuery, setSearchQuery] = useState('');
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
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
      id: 'sistema',
      title: 'Sistema',
      icon: 'apps',
      gradient: ['#14B8A6', '#0D9488'],
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'speedometer', onPress: onNavigateDashboard, description: 'Panoramica generale' },
        { id: 'gestori', label: 'Gestori', icon: 'people', onPress: onNavigateGestori, description: 'Gestione organizzatori' },
        { id: 'companies', label: 'Aziende', icon: 'business', onPress: onNavigateCompanies, description: 'Società registrate' },
        { id: 'users', label: 'Utenti', icon: 'person', onPress: onNavigateUsers, description: 'Account utenti' },
        { id: 'events', label: 'Eventi', icon: 'calendar', onPress: onNavigateEvents, description: 'Tutti gli eventi' },
      ],
    },
    {
      id: 'tools',
      title: 'Strumenti',
      icon: 'construct',
      gradient: ['#8B5CF6', '#7C3AED'],
      items: [
        { id: 'settings', label: 'Impostazioni', icon: 'settings', onPress: onNavigateSettings, description: 'Configurazione sito' },
        { id: 'printer', label: 'Stampanti', icon: 'print', onPress: onNavigatePrinter, description: 'Gestione stampa' },
        { id: 'templates', label: 'Template', icon: 'document-text', onPress: onNavigateDigitalTemplates, description: 'Template biglietti' },
        { id: 'stripe', label: 'Stripe', icon: 'card', onPress: onNavigateStripeAdmin, description: 'Pagamenti online' },
      ],
    },
    {
      id: 'siae',
      title: 'SIAE',
      icon: 'shield-checkmark',
      gradient: ['#10B981', '#059669'],
      items: [
        { id: 'siae-approvals', label: 'Approvazioni', icon: 'checkmark-done', onPress: onNavigateSIAEApprovals, badge: '3', description: 'Richieste in attesa' },
        { id: 'siae-monitor', label: 'Monitoraggio', icon: 'pulse', onPress: onNavigateSIAEMonitor, description: 'Stato sistema' },
        { id: 'siae-tables', label: 'Tabelle', icon: 'grid-outline', onPress: onNavigateSIAETables, description: 'Dati di riferimento' },
        { id: 'siae-cards', label: 'Tessere', icon: 'card-outline', onPress: onNavigateSIAECards, description: 'Attivazione smart card' },
        { id: 'siae-config', label: 'Configurazione', icon: 'options', onPress: onNavigateSIAEConfig, description: 'Parametri SIAE' },
        { id: 'siae-customers', label: 'Clienti', icon: 'people-outline', onPress: onNavigateSIAECustomers, description: 'Anagrafica clienti' },
        { id: 'siae-console', label: 'Console', icon: 'terminal', onPress: onNavigateSIAEConsole, description: 'Operazioni avanzate' },
        { id: 'siae-transactions', label: 'Transazioni', icon: 'swap-horizontal', onPress: onNavigateSIAETransactions, description: 'Storico operazioni' },
        { id: 'siae-boxoffice', label: 'Cassa', icon: 'cash-outline', onPress: onNavigateSIAEBoxOffice, description: 'Sessioni di cassa' },
        { id: 'siae-tickettypes', label: 'Tipi Biglietti', icon: 'pricetag', onPress: onNavigateSIAETicketTypes, description: 'Categorie SIAE' },
        { id: 'siae-subscriptions', label: 'Abbonamenti', icon: 'calendar-number', onPress: onNavigateSIAESubscriptions, description: 'Abbonamenti attivi' },
        { id: 'siae-resales', label: 'Rivendite', icon: 'repeat', onPress: onNavigateSIAEResales, description: 'Mercato secondario' },
        { id: 'siae-transmissions', label: 'Trasmissioni', icon: 'cloud-upload', onPress: onNavigateSIAETransmissions, description: 'Invii report SIAE' },
        { id: 'siae-auditlogs', label: 'Log Audit', icon: 'document-text-outline', onPress: onNavigateSIAEAuditLogs, description: 'Traccia operazioni' },
        { id: 'name-changes', label: 'Nominativi', icon: 'swap-vertical', onPress: onNavigateNameChanges, description: 'Cambio intestatario' },
      ],
    },
    {
      id: 'billing',
      title: 'Fatturazione',
      icon: 'wallet',
      gradient: ['#F59E0B', '#D97706'],
      items: [
        { id: 'billing-plans', label: 'Piani', icon: 'layers', onPress: onNavigateBillingPlans, description: 'Abbonamenti attivi' },
        { id: 'billing-organizers', label: 'Organizzatori', icon: 'briefcase', onPress: onNavigateBillingOrganizers, description: 'Fatturazione clienti' },
        { id: 'billing-invoices', label: 'Fatture', icon: 'receipt', onPress: onNavigateBillingInvoices, description: 'Documenti emessi' },
        { id: 'billing-reports', label: 'Report', icon: 'bar-chart', onPress: onNavigateBillingReports, description: 'Statistiche vendite' },
      ],
    },
  ];

  const allItems = menuGroups.flatMap(g => g.items.map(i => ({ ...i, groupId: g.id, groupColor: g.gradient[0] })));
  
  const filteredItems = searchQuery.trim() 
    ? allItems.filter(item => 
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const isItemActive = (itemId: string) => {
    if (!currentScreen) return false;
    return currentScreen.toLowerCase().includes(itemId.replace(/-/g, ''));
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalContainer}
      >
        <View style={styles.overlay}>
          {/* Animated Backdrop */}
          <Animated.View 
            style={[
              styles.backdrop, 
              { opacity: backdropAnim }
            ]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>

          {/* Animated Drawer */}
          <Animated.View 
            style={[
              styles.drawer, 
              { 
                width: DRAWER_WIDTH,
                backgroundColor: colors.background,
                transform: [{ translateX: slideAnim }],
              }
            ]}
          >
            {/* Header compatto */}
            <LinearGradient
              colors={['#14B8A6', '#0D9488']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.header, { paddingTop: insets.top + 12 }]}
            >
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <View style={styles.logoIcon}>
                    <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>Admin</Text>
                    <Text style={styles.headerSubtitle}>Event4U</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    onClose();
                  }}
                  style={styles.closeBtn}
                  testID="button-close-drawer"
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </Pressable>
              </View>

              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={16} color="rgba(255,255,255,0.6)" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cerca sezione..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  testID="input-search-menu"
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
                    <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.6)" />
                  </Pressable>
                )}
              </View>
            </LinearGradient>

            {/* Content */}
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Search Results */}
              {searchQuery.trim().length > 0 ? (
                <View style={styles.searchResults}>
                  <Text style={[styles.searchResultsTitle, { color: colors.mutedForeground }]}>
                    {filteredItems.length} risultat{filteredItems.length === 1 ? 'o' : 'i'}
                  </Text>
                  {filteredItems.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => handleItemPress(item.onPress)}
                      style={({ pressed }) => [
                        styles.searchResultItem,
                        { 
                          backgroundColor: pressed ? colors.muted : colors.card,
                          borderColor: colors.border,
                        }
                      ]}
                      testID={`search-result-${item.id}`}
                    >
                      <View style={[styles.searchResultIcon, { backgroundColor: `${item.groupColor}20` }]}>
                        <Ionicons name={item.icon} size={18} color={item.groupColor} />
                      </View>
                      <View style={styles.searchResultText}>
                        <Text style={[styles.searchResultLabel, { color: colors.foreground }]}>
                          {item.label}
                        </Text>
                        {item.description && (
                          <Text style={[styles.searchResultDesc, { color: colors.mutedForeground }]}>
                            {item.description}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                    </Pressable>
                  ))}
                  {filteredItems.length === 0 && (
                    <View style={styles.noResults}>
                      <Ionicons name="search-outline" size={40} color={colors.mutedForeground} />
                      <Text style={[styles.noResultsText, { color: colors.mutedForeground }]}>
                        Nessun risultato
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <>
                  {/* Menu Groups */}
                  {menuGroups.map((group) => {
                    const isExpanded = expandedGroup === group.id;
                    
                    return (
                      <View key={group.id} style={styles.group}>
                        <Pressable
                          onPress={() => toggleGroup(group.id)}
                          style={({ pressed }) => [
                            styles.groupHeader,
                            { 
                              backgroundColor: pressed ? colors.muted : 'transparent',
                            }
                          ]}
                          testID={`group-${group.id}`}
                        >
                          <LinearGradient
                            colors={group.gradient}
                            style={styles.groupIcon}
                          >
                            <Ionicons name={group.icon} size={16} color="#FFFFFF" />
                          </LinearGradient>
                          <Text style={[styles.groupTitle, { color: colors.foreground }]}>
                            {group.title}
                          </Text>
                          <View style={[styles.groupBadge, { backgroundColor: colors.muted }]}>
                            <Text style={[styles.groupBadgeText, { color: colors.mutedForeground }]}>
                              {group.items.length}
                            </Text>
                          </View>
                          <Ionicons 
                            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                            size={16} 
                            color={colors.mutedForeground} 
                          />
                        </Pressable>

                        {isExpanded && (
                          <View style={[styles.groupItems, { borderLeftColor: group.gradient[0] }]}>
                            {group.items.map((item) => {
                              const isActive = isItemActive(item.id);
                              
                              return (
                                <Pressable
                                  key={item.id}
                                  onPress={() => handleItemPress(item.onPress)}
                                  style={({ pressed }) => [
                                    styles.menuItem,
                                    { 
                                      backgroundColor: pressed 
                                        ? colors.muted 
                                        : isActive 
                                          ? `${group.gradient[0]}15`
                                          : 'transparent',
                                    }
                                  ]}
                                  testID={`menu-item-${item.id}`}
                                >
                                  <View style={[
                                    styles.menuItemIcon, 
                                    { backgroundColor: isActive ? `${group.gradient[0]}25` : colors.muted }
                                  ]}>
                                    <Ionicons 
                                      name={item.icon} 
                                      size={14} 
                                      color={isActive ? group.gradient[0] : colors.mutedForeground} 
                                    />
                                  </View>
                                  <View style={styles.menuItemContent}>
                                    <Text style={[
                                      styles.menuItemLabel, 
                                      { 
                                        color: isActive ? group.gradient[0] : colors.foreground,
                                        fontWeight: isActive ? '600' : '500',
                                      }
                                    ]}>
                                      {item.label}
                                    </Text>
                                    {item.description && (
                                      <Text style={[styles.menuItemDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                                        {item.description}
                                      </Text>
                                    )}
                                  </View>
                                  {item.badge && (
                                    <View style={styles.itemBadge}>
                                      <Text style={styles.itemBadgeText}>{item.badge}</Text>
                                    </View>
                                  )}
                                </Pressable>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
              <Pressable 
                style={[styles.footerButton, { backgroundColor: colors.muted }]}
                onPress={() => handleItemPress(onNavigateDashboard)}
                testID="footer-dashboard"
              >
                <Ionicons name="speedometer-outline" size={18} color={colors.foreground} />
              </Pressable>
              <Pressable 
                style={[styles.footerButton, { backgroundColor: colors.muted }]}
                onPress={() => handleItemPress(onNavigateSIAEMonitor)}
                testID="footer-monitor"
              >
                <Ionicons name="pulse-outline" size={18} color={colors.foreground} />
              </Pressable>
              <Pressable 
                style={[styles.footerButton, { backgroundColor: colors.muted }]}
                onPress={() => handleItemPress(onNavigateBillingInvoices)}
                testID="footer-invoices"
              >
                <Ionicons name="receipt-outline" size={18} color={colors.foreground} />
              </Pressable>
              <Pressable 
                style={[styles.footerButton, { backgroundColor: colors.muted }]}
                onPress={() => handleItemPress(onNavigateSettings)}
                testID="footer-settings"
              >
                <Ionicons name="settings-outline" size={18} color={colors.foreground} />
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    height: '100%',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    padding: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  searchResults: {
    gap: 8,
  },
  searchResultsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  searchResultIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultText: {
    flex: 1,
  },
  searchResultLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchResultDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  noResultsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  group: {
    marginBottom: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 10,
  },
  groupIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  groupBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  groupBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  groupItems: {
    marginLeft: 20,
    paddingLeft: 12,
    borderLeftWidth: 2,
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 10,
    marginBottom: 2,
  },
  menuItemIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 14,
  },
  menuItemDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  itemBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  itemBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    gap: 8,
  },
  footerButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AdminMenuDrawer;
