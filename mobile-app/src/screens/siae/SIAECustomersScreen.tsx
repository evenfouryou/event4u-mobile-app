import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  fiscalCode: string;
  email: string | null;
  phone: string | null;
  ticketsCount: number;
}

export function SIAECustomersScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const numColumns = (isTablet || isLandscape) ? 2 : 1;

  const loadCustomers = async () => {
    try {
      const response = await api.get<any>('/api/siae/customers');
      const data = response.customers || response || [];
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadCustomers();
  };

  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase();
    return (
      customer.firstName.toLowerCase().includes(query) ||
      customer.lastName.toLowerCase().includes(query) ||
      customer.fiscalCode.toLowerCase().includes(query) ||
      (customer.email && customer.email.toLowerCase().includes(query))
    );
  });

  const renderCustomer = ({ item, index }: { item: Customer; index: number }) => (
    <TouchableOpacity
      style={[
        styles.customerCard,
        numColumns === 2 && {
          width: '48%',
          marginRight: index % 2 === 0 ? '4%' : 0,
        },
      ]}
      onPress={() => navigation.navigate('SIAECustomerDetail', { customerId: item.id })}
      activeOpacity={0.8}
      testID={`card-customer-${item.id}`}
    >
      <Card variant="glass">
        <View style={styles.customerRow}>
          <View style={[styles.avatar, { backgroundColor: `${colors.teal}20` }]}>
            <Text style={styles.avatarText}>
              {item.firstName[0]}{item.lastName[0]}
            </Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName} testID={`text-customer-name-${item.id}`}>{item.firstName} {item.lastName}</Text>
            <View style={styles.customerDetails}>
              <View style={styles.detailItem}>
                <Ionicons name="document-text-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.detailText} testID={`text-fiscal-code-${item.id}`}>{item.fiscalCode}</Text>
              </View>
              {item.email && (
                <View style={styles.detailItem}>
                  <Ionicons name="mail-outline" size={14} color={colors.mutedForeground} />
                  <Text style={styles.detailText}>{item.email}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.ticketsBadge}>
            <Ionicons name="ticket-outline" size={16} color={colors.primary} />
            <Text style={styles.ticketsCount} testID={`text-tickets-count-${item.id}`}>{item.ticketsCount}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Anagrafica Clienti" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Anagrafica Clienti"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => navigation.navigate('SIAECustomerAdd')} testID="button-add-customer">
            <Ionicons name="add-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInput}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchText}
            placeholder="Cerca per nome, cognome o CF..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomer}
        keyExtractor={(item) => item.id.toString()}
        key={numColumns}
        numColumns={numColumns}
        contentContainerStyle={[
          styles.listContent,
          (isTablet || isLandscape) && styles.listContentLandscape,
        ]}
        columnWrapperStyle={numColumns === 2 ? styles.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Nessun cliente trovato' : 'Nessun cliente registrato'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Prova a modificare la ricerca' : 'I clienti verranno aggiunti automaticamente'}
            </Text>
          </View>
        }
        testID="list-customers"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  searchText: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  listContentLandscape: {
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
  },
  customerCard: {
    marginBottom: spacing.md,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  avatarText: {
    color: colors.teal,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  customerDetails: {
    gap: spacing.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  ticketsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  ticketsCount: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
  },
  emptyText: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  emptySubtext: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});

export default SIAECustomersScreen;
