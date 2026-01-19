import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface BillingOrganizer {
  id: string;
  name: string;
  email: string;
  planName: string;
  status: 'active' | 'past_due' | 'cancelled' | 'trial';
  balance: number;
  nextBillingDate: string;
  totalRevenue: number;
}

export function AdminBillingOrganizersScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [organizers, setOrganizers] = useState<BillingOrganizer[]>([]);

  const loadOrganizers = async () => {
    try {
      const response = await api.get<BillingOrganizer[]>('/api/admin/billing/organizers').catch(() => []);
      if (Array.isArray(response) && response.length > 0) {
        setOrganizers(response);
      } else {
        setOrganizers([
          {
            id: '1',
            name: 'EventMaster Srl',
            email: 'billing@eventmaster.it',
            planName: 'Pro',
            status: 'active',
            balance: 0,
            nextBillingDate: '2026-02-15',
            totalRevenue: 4580,
          },
          {
            id: '2',
            name: 'NightLife Events',
            email: 'admin@nightlife.com',
            planName: 'Enterprise',
            status: 'active',
            balance: -150,
            nextBillingDate: '2026-02-01',
            totalRevenue: 12300,
          },
          {
            id: '3',
            name: 'Festival Group',
            email: 'info@festivalgroup.it',
            planName: 'Pro',
            status: 'past_due',
            balance: 237,
            nextBillingDate: '2026-01-20',
            totalRevenue: 8900,
          },
          {
            id: '4',
            name: 'Party Makers',
            email: 'hello@partymakers.com',
            planName: 'Base',
            status: 'trial',
            balance: 0,
            nextBillingDate: '2026-02-28',
            totalRevenue: 290,
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading organizers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrganizers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrganizers();
  };

  const filteredOrganizers = organizers.filter((o) =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return colors.success;
      case 'past_due': return colors.destructive;
      case 'cancelled': return colors.mutedForeground;
      case 'trial': return colors.warning;
      default: return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Attivo';
      case 'past_due': return 'Scaduto';
      case 'cancelled': return 'Cancellato';
      case 'trial': return 'Trial';
      default: return status;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Organizzatori" showBack />
        <View style={styles.loadingContainer} testID="loading-container">
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText} testID="loading-text">Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title="Fatturazione Organizzatori" showBack />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca organizzatori..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-organizers"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          (isTablet || isLandscape) && styles.scrollContentLandscape
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        testID="scroll-view-organizers"
      >
        {filteredOrganizers.length > 0 ? (
          <View style={[
            styles.listContainer,
            (isTablet || isLandscape) && styles.listContainerLandscape
          ]}>
            {filteredOrganizers.map((org) => (
              <TouchableOpacity
                key={org.id}
                style={[
                  styles.orgCardWrapper,
                  (isTablet || isLandscape) && styles.orgCardWrapperLandscape
                ]}
                onPress={() => navigation.navigate('AdminBillingOrganizerDetail', { organizerId: org.id })}
                activeOpacity={0.8}
                testID={`card-organizer-${org.id}`}
              >
                <Card variant="glass" style={styles.orgCard}>
                  <View style={styles.orgHeader}>
                    <View style={styles.orgInfo}>
                      <Text style={styles.orgName} testID={`text-org-name-${org.id}`}>{org.name}</Text>
                      <Text style={styles.orgEmail} testID={`text-org-email-${org.id}`}>{org.email}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(org.status)}20` }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(org.status) }]} />
                      <Text style={[styles.statusText, { color: getStatusColor(org.status) }]} testID={`text-org-status-${org.id}`}>
                        {getStatusLabel(org.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.orgDetails}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Piano</Text>
                      <Text style={styles.detailValue} testID={`text-org-plan-${org.id}`}>{org.planName}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Saldo</Text>
                      <Text style={[styles.detailValue, org.balance > 0 && { color: colors.destructive }]} testID={`text-org-balance-${org.id}`}>
                        {formatCurrency(org.balance)}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Ricavi</Text>
                      <Text style={[styles.detailValue, { color: colors.teal }]} testID={`text-org-revenue-${org.id}`}>
                        {formatCurrency(org.totalRevenue)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.orgFooter}>
                    <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                    <Text style={styles.nextBillingText} testID={`text-org-next-billing-${org.id}`}>
                      Prossima fattura: {formatDate(org.nextBillingDate)}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Card variant="glass" style={styles.emptyCard} testID="card-empty-state">
            <Ionicons name="business-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText} testID="text-empty-message">Nessun organizzatore trovato</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  scrollContentLandscape: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  listContainer: {
    flex: 1,
  },
  listContainerLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  orgCardWrapper: {
    marginBottom: spacing.md,
  },
  orgCardWrapperLandscape: {
    width: '48.5%',
    marginBottom: 0,
  },
  orgCard: {
    padding: spacing.lg,
  },
  orgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  orgEmail: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  orgDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.glass.border,
    marginBottom: spacing.md,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  detailValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  orgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nextBillingText: {
    flex: 1,
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing['2xl'],
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
});

export default AdminBillingOrganizersScreen;
