import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Linking, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { Supplier } from '@/lib/api';

interface GestoreSuppliersScreenProps {
  onBack: () => void;
}

export function GestoreSuppliersScreen({ onBack }: GestoreSuppliersScreenProps) {
  const { colors } = useTheme();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error('Error loading suppliers:', err);
      setError('Errore nel caricamento dei fornitori');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery) return suppliers;

    const query = searchQuery.toLowerCase();
    return suppliers.filter(supplier =>
      supplier.companyName.toLowerCase().includes(query) ||
      supplier.contactName?.toLowerCase().includes(query) ||
      supplier.email?.toLowerCase().includes(query)
    );
  }, [suppliers, searchQuery]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Mai';
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleCall = (phone: string) => {
    triggerHaptic('light');
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    triggerHaptic('light');
    Linking.openURL(`mailto:${email}`);
  };

  const getOrdersBadge = (count: number) => {
    if (count === 0) {
      return <Badge variant="secondary">0 ordini</Badge>;
    } else if (count < 5) {
      return <Badge variant="outline">{count} ordini</Badge>;
    } else if (count < 20) {
      return <Badge variant="default">{count} ordini</Badge>;
    }
    return <Badge variant="success">{count} ordini</Badge>;
  };

  const renderSupplier = ({ item }: { item: Supplier }) => (
    <Pressable
      onPress={() => triggerHaptic('light')}
      testID={`supplier-item-${item.id}`}
    >
      <Card style={styles.supplierCard}>
        <View style={styles.supplierHeader}>
          <View style={[styles.supplierIcon, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="business" size={24} color={colors.primary} />
          </View>
          <View style={styles.supplierInfo}>
            <Text style={[styles.supplierName, { color: colors.foreground }]}>{item.companyName}</Text>
            {item.contactName && (
              <Text style={[styles.supplierContact, { color: colors.mutedForeground }]}>
                {item.contactName}
              </Text>
            )}
          </View>
          {getOrdersBadge(item.totalOrders || 0)}
        </View>

        <View style={[styles.supplierDivider, { backgroundColor: colors.border }]} />

        <View style={styles.contactInfo}>
          {item.phone && (
            <Pressable
              style={styles.contactRow}
              onPress={() => handleCall(item.phone!)}
              testID={`button-call-${item.id}`}
            >
              <Ionicons name="call-outline" size={16} color={colors.primary} />
              <Text style={[styles.contactText, { color: colors.foreground }]}>{item.phone}</Text>
            </Pressable>
          )}
          {item.email && (
            <Pressable
              style={styles.contactRow}
              onPress={() => handleEmail(item.email!)}
              testID={`button-email-${item.id}`}
            >
              <Ionicons name="mail-outline" size={16} color={colors.primary} />
              <Text style={[styles.contactText, { color: colors.foreground }]}>{item.email}</Text>
            </Pressable>
          )}
          {item.address && (
            <View style={styles.contactRow}>
              <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.contactText, { color: colors.mutedForeground }]}>{item.address}</Text>
            </View>
          )}
        </View>

        <View style={[styles.supplierDivider, { backgroundColor: colors.border }]} />

        <View style={styles.supplierFooter}>
          <View style={styles.footerItem}>
            <Text style={[styles.footerLabel, { color: colors.mutedForeground }]}>Ultimo ordine</Text>
            <Text style={[styles.footerValue, { color: colors.foreground }]}>
              {formatDate(item.lastOrderDate)}
            </Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={[styles.footerLabel, { color: colors.mutedForeground }]}>Totale ordini</Text>
            <Text style={[styles.footerValue, { color: colors.foreground }]}>
              {item.totalOrders || 0}
            </Text>
          </View>
          {item.status && (
            <Badge variant={item.status === 'active' ? 'success' : 'secondary'}>
              {item.status === 'active' ? 'Attivo' : 'Inattivo'}
            </Badge>
          )}
        </View>
      </Card>
    </Pressable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="business-outline" size={64} color={colors.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        Nessun fornitore trovato
      </Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        {searchQuery ? 'Prova con una ricerca diversa' : 'Aggiungi fornitori dal pannello web'}
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
        onPress={loadData}
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
        testID="header-suppliers"
      />

      <View style={styles.titleContainer}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Fornitori</Text>
        <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>
          {suppliers.length} fornitori registrati
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.secondary }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca fornitori..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-suppliers"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {error ? (
        renderError()
      ) : showLoader ? (
        <Loading text="Caricamento fornitori..." />
      ) : filteredSuppliers.length > 0 ? (
        <FlatList
          data={filteredSuppliers}
          renderItem={renderSupplier}
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
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  titleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  screenTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  screenSubtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  supplierCard: {
    padding: spacing.md,
  },
  supplierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  supplierIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  supplierContact: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  supplierDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  contactInfo: {
    gap: spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  contactText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
  },
  supplierFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerItem: {
    alignItems: 'flex-start',
  },
  footerLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  footerValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
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
    color: staticColors.foreground,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: staticColors.primary,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
});

export default GestoreSuppliersScreen;
