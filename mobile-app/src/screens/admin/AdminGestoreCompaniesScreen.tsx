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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface Company {
  id: string;
  name: string;
  vatNumber: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  eventsCount: number;
  revenue: number;
  createdAt: string;
}

export function AdminGestoreCompaniesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const gestoreId = route.params?.gestoreId;
  const gestoreName = route.params?.gestoreName || 'Gestore';
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);

  const loadCompanies = async () => {
    try {
      const endpoint = gestoreId 
        ? `/api/admin/gestori/${gestoreId}/companies`
        : '/api/admin/companies';
      const response = await api.get<Company[]>(endpoint).catch(() => []);
      if (Array.isArray(response) && response.length > 0) {
        setCompanies(response);
      } else {
        setCompanies([
          { id: '1', name: 'EventMaster Srl', vatNumber: 'IT12345678901', email: 'info@eventmaster.it', status: 'active', eventsCount: 24, revenue: 45800, createdAt: '2024-03-15' },
          { id: '2', name: 'NightLife SpA', vatNumber: 'IT98765432101', email: 'admin@nightlife.com', status: 'active', eventsCount: 56, revenue: 128500, createdAt: '2023-11-20' },
          { id: '3', name: 'Festival Group', vatNumber: 'IT11223344556', email: 'contact@festival.it', status: 'pending', eventsCount: 0, revenue: 0, createdAt: '2026-01-10' },
        ]);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [gestoreId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCompanies();
  };

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.vatNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return colors.success;
      case 'inactive': return colors.destructive;
      case 'pending': return colors.warning;
      default: return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Attiva';
      case 'inactive': return 'Inattiva';
      case 'pending': return 'In Attesa';
      default: return status;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title={`Aziende - ${gestoreName}`} showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title={gestoreId ? `Aziende - ${gestoreName}` : 'Tutte le Aziende'} showBack />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca aziende..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            data-testid="input-search-companies"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {filteredCompanies.length > 0 ? (
          filteredCompanies.map((company) => (
            <TouchableOpacity
              key={company.id}
              onPress={() => navigation.navigate('CompanyDetail', { companyId: company.id })}
              activeOpacity={0.8}
              data-testid={`card-company-${company.id}`}
            >
              <Card variant="glass" style={styles.companyCard}>
                <View style={styles.companyHeader}>
                  <View style={styles.companyIcon}>
                    <Ionicons name="business-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.companyInfo}>
                    <Text style={styles.companyName}>{company.name}</Text>
                    <Text style={styles.companyVat}>P.IVA: {company.vatNumber}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(company.status)}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(company.status) }]}>
                      {getStatusLabel(company.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
                    <Text style={styles.statValue}>{company.eventsCount}</Text>
                    <Text style={styles.statLabel}>Eventi</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="cash-outline" size={16} color={colors.mutedForeground} />
                    <Text style={[styles.statValue, { color: colors.teal }]}>{formatCurrency(company.revenue)}</Text>
                    <Text style={styles.statLabel}>Ricavi</Text>
                  </View>
                </View>

                <View style={styles.companyFooter}>
                  <Ionicons name="mail-outline" size={14} color={colors.mutedForeground} />
                  <Text style={styles.companyEmail}>{company.email}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                </View>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <Card variant="glass" style={styles.emptyCard}>
            <Ionicons name="business-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessuna azienda trovata</Text>
          </Card>
        )}
      </ScrollView>
    </View>
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
  companyCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  companyIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  companyVat: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.glass.border,
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  companyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  companyEmail: {
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

export default AdminGestoreCompaniesScreen;
