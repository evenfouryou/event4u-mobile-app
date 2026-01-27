import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Alert, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAECustomer } from '@/lib/api';

interface GestoreSIAECustomersScreenProps {
  onBack: () => void;
}

export function GestoreSIAECustomersScreen({ onBack }: GestoreSIAECustomersScreenProps) {
  const { colors } = useTheme();
  const [customers, setCustomers] = useState<SIAECustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getSIAECustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Error loading SIAE customers:', err);
      setError('Errore nel caricamento dei clienti SIAE');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  };

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(customer =>
      customer.firstName.toLowerCase().includes(query) ||
      customer.lastName.toLowerCase().includes(query) ||
      customer.fiscalCode?.toLowerCase().includes(query) ||
      customer.cardNumber?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: SIAECustomer['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Attivo</Badge>;
      case 'suspended':
        return <Badge variant="warning">Sospeso</Badge>;
      case 'expired':
        return <Badge variant="destructive">Scaduto</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleAddCustomer = () => {
    triggerHaptic('selection');
    Alert.alert('Nuovo Cliente', 'Usa il pannello web per aggiungere nuovi clienti SIAE');
  };

  const toggleExpand = (id: string) => {
    triggerHaptic('light');
    setExpandedId(expandedId === id ? null : id);
  };

  const renderCustomer = ({ item }: { item: SIAECustomer }) => {
    const isExpanded = expandedId === item.id;

    return (
      <Pressable onPress={() => toggleExpand(item.id)} testID={`customer-item-${item.id}`}>
        <Card style={styles.customerCard}>
          <View style={styles.customerHeader}>
            <View style={[styles.customerIcon, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="person" size={24} color={colors.primary} />
            </View>
            <View style={styles.customerInfo}>
              <Text style={[styles.customerName, { color: colors.foreground }]}>
                {item.firstName} {item.lastName}
              </Text>
              <Text style={[styles.customerMeta, { color: colors.mutedForeground }]}>
                CF: {item.fiscalCode || '-'}
              </Text>
              {item.cardNumber && (
                <Text style={[styles.customerMeta, { color: colors.mutedForeground }]}>
                  Tessera: {item.cardNumber}
                </Text>
              )}
            </View>
            <View style={styles.customerActions}>
              {getStatusBadge(item.status)}
              <Ionicons 
                name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color={colors.mutedForeground} 
              />
            </View>
          </View>

          <View style={[styles.customerDivider, { backgroundColor: colors.border }]} />

          <View style={styles.customerStats}>
            <View style={styles.customerStat}>
              <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
              <Text style={[styles.customerStatLabel, { color: colors.mutedForeground }]}>
                Registrato: {formatDate(item.registrationDate)}
              </Text>
            </View>
          </View>

          {isExpanded && (
            <View style={styles.expandedSection}>
              <View style={[styles.expandedDivider, { backgroundColor: colors.border }]} />
              
              {item.address && (
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.detailText, { color: colors.foreground }]}>{item.address}</Text>
                </View>
              )}
              
              {item.phone && (
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.detailText, { color: colors.foreground }]}>{item.phone}</Text>
                </View>
              )}
              
              {item.email && (
                <View style={styles.detailRow}>
                  <Ionicons name="mail-outline" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.detailText, { color: colors.foreground }]}>{item.email}</Text>
                </View>
              )}
              
              {item.documentType && (
                <View style={styles.detailRow}>
                  <Ionicons name="card-outline" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.detailText, { color: colors.foreground }]}>
                    {item.documentType}: {item.documentNumber || '-'}
                  </Text>
                </View>
              )}
              
              <View style={styles.expandedActions}>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: `${colors.primary}15` }]}
                  onPress={() => {
                    triggerHaptic('selection');
                    Alert.alert('Modifica', 'Usa il pannello web per modificare i clienti');
                  }}
                  testID={`button-edit-customer-${item.id}`}
                >
                  <Ionicons name="pencil" size={16} color={colors.primary} />
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>Modifica</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Card>
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color={colors.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        Nessun cliente trovato
      </Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        {searchQuery ? 'Prova con una ricerca diversa' : 'Aggiungi clienti SIAE dal pannello web'}
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.emptyState}>
      <Ionicons name="alert-circle-outline" size={64} color={colors.destructive} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Errore</Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{error}</Text>
      <Pressable
        style={[styles.retryButton, { backgroundColor: colors.primary }]}
        onPress={loadCustomers}
        testID="button-retry"
      >
        <Text style={[styles.retryButtonText, { color: colors.primaryForeground }]}>Riprova</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeArea edges={['bottom']} style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }]) as ViewStyle}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-siae-customers"
      />

      <View style={styles.titleContainer}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Clienti SIAE</Text>
        <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>
          {customers.length} clienti registrati
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.secondary }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca per nome, CF o tessera..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-customers"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {showLoader ? (
        <Loading text="Caricamento clienti SIAE..." />
      ) : error ? (
        renderError()
      ) : filteredCustomers.length > 0 ? (
        <FlatList
          data={filteredCustomers}
          renderItem={renderCustomer}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        renderEmptyState()
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleAddCustomer}
        testID="button-add-customer"
      >
        <Ionicons name="add" size={28} color={colors.primaryForeground} />
      </Pressable>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  screenTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  screenSubtitle: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: 100,
  },
  customerCard: {
    padding: spacing.md,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  customerIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  customerMeta: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  customerActions: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  customerDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
  customerStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  customerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  customerStatLabel: {
    fontSize: typography.fontSize.xs,
  },
  expandedSection: {
    marginTop: spacing.sm,
  },
  expandedDivider: {
    height: 1,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  expandedActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default GestoreSIAECustomersScreen;
