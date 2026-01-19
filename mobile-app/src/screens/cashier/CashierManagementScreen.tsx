import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

const CASHIER_ACCENT = colors.cashier;
const CASHIER_ACCENT_FOREGROUND = colors.cashierForeground;
const TABLET_BREAKPOINT = 768;
const CONTENT_MAX_WIDTH = 800;

interface Cashier {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'suspended';
  permissions: {
    sellTickets: boolean;
    processRefunds: boolean;
    viewReports: boolean;
    manageInventory: boolean;
  };
  totalSales: number;
  transactionsCount: number;
  lastActive?: string;
  createdAt: string;
}

export function CashierManagementScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= TABLET_BREAKPOINT;

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);
  const [newCashier, setNewCashier] = useState({
    name: '',
    email: '',
    phone: '',
    permissions: {
      sellTickets: true,
      processRefunds: false,
      viewReports: false,
      manageInventory: false,
    },
  });

  const { data: cashiers = [], refetch } = useQuery<Cashier[]>({
    queryKey: ['/api/cashier/management/staff'],
    queryFn: () =>
      api.get<Cashier[]>('/api/cashier/management/staff').catch(() => [
        {
          id: '1',
          name: 'Marco Rossi',
          email: 'marco.r@email.com',
          phone: '+39 333 1234567',
          status: 'active',
          permissions: {
            sellTickets: true,
            processRefunds: true,
            viewReports: true,
            manageInventory: false,
          },
          totalSales: 12450.0,
          transactionsCount: 234,
          lastActive: new Date().toISOString(),
          createdAt: '2024-06-15',
        },
        {
          id: '2',
          name: 'Laura Bianchi',
          email: 'laura.b@email.com',
          phone: '+39 334 7654321',
          status: 'active',
          permissions: {
            sellTickets: true,
            processRefunds: false,
            viewReports: false,
            manageInventory: false,
          },
          totalSales: 8320.0,
          transactionsCount: 156,
          lastActive: new Date(Date.now() - 3600000).toISOString(),
          createdAt: '2024-08-20',
        },
        {
          id: '3',
          name: 'Paolo Verdi',
          email: 'paolo.v@email.com',
          phone: '+39 335 9876543',
          status: 'inactive',
          permissions: {
            sellTickets: true,
            processRefunds: false,
            viewReports: false,
            manageInventory: false,
          },
          totalSales: 3450.0,
          transactionsCount: 67,
          createdAt: '2024-10-01',
        },
      ]),
  });

  const addCashierMutation = useMutation({
    mutationFn: (data: typeof newCashier) => api.post('/api/cashier/management/staff', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cashier/management/staff'] });
      setShowAddModal(false);
      setNewCashier({
        name: '',
        email: '',
        phone: '',
        permissions: {
          sellTickets: true,
          processRefunds: false,
          viewReports: false,
          manageInventory: false,
        },
      });
      Alert.alert('Successo', 'Cassiere aggiunto con successo');
    },
  });

  const updateCashierMutation = useMutation({
    mutationFn: (data: Cashier) => api.put(`/api/cashier/management/staff/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cashier/management/staff'] });
      setShowEditModal(false);
      setSelectedCashier(null);
      Alert.alert('Successo', 'Cassiere aggiornato');
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredCashiers = cashiers.filter(
    (cashier) =>
      cashier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cashier.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'inactive':
        return colors.mutedForeground;
      case 'suspended':
        return colors.destructive;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Attivo';
      case 'inactive':
        return 'Inattivo';
      case 'suspended':
        return 'Sospeso';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return `€ ${amount.toFixed(2).replace('.', ',')}`;
  };

  const handleEditCashier = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setShowEditModal(true);
  };

  const handleAddCashier = () => {
    if (!newCashier.name || !newCashier.email) {
      Alert.alert('Errore', 'Nome e email sono obbligatori');
      return;
    }
    addCashierMutation.mutate(newCashier);
  };

  const handleUpdateCashier = () => {
    if (selectedCashier) {
      updateCashierMutation.mutate(selectedCashier);
    }
  };

  const permissionLabels: Record<keyof Cashier['permissions'], string> = {
    sellTickets: 'Vendita Biglietti',
    processRefunds: 'Elabora Rimborsi',
    viewReports: 'Visualizza Report',
    manageInventory: 'Gestione Inventario',
  };

  const numColumns = isLandscape || isTablet ? 3 : 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Gestione Cassieri"
        showBack
        rightAction={
          <TouchableOpacity 
            onPress={() => setShowAddModal(true)} 
            testID="button-add-cashier"
          >
            <Ionicons name="add-circle" size={28} color={CASHIER_ACCENT} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={CASHIER_ACCENT} 
            testID="refresh-control"
          />
        }
        testID="scroll-view"
      >
        <View style={[styles.contentWrapper, isTablet && { maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', width: '100%' }]}>
          <View style={[styles.statsRow, isLandscape && styles.statsRowLandscape]}>
            <Card variant="glass" style={styles.statCard} testID="card-stat-total">
              <Text style={styles.statValue} testID="text-total-cashiers">{cashiers.length}</Text>
              <Text style={styles.statLabel}>Totale</Text>
            </Card>
            <Card variant="glass" style={styles.statCard} testID="card-stat-active">
              <Text style={[styles.statValue, { color: colors.success }]} testID="text-active-cashiers">
                {cashiers.filter((c) => c.status === 'active').length}
              </Text>
              <Text style={styles.statLabel}>Attivi</Text>
            </Card>
            <Card variant="glass" style={styles.statCard} testID="card-stat-sales">
              <Text style={[styles.statValue, { color: CASHIER_ACCENT }]} testID="text-total-sales">
                {formatCurrency(cashiers.reduce((sum, c) => sum + c.totalSales, 0))}
              </Text>
              <Text style={styles.statLabel}>Vendite Totali</Text>
            </Card>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={20} color={colors.mutedForeground} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cerca cassiere..."
                placeholderTextColor={colors.mutedForeground}
                value={searchQuery}
                onChangeText={setSearchQuery}
                testID="input-search-cashier"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => setSearchQuery('')}
                  testID="button-clear-search"
                >
                  <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {filteredCashiers.length === 0 ? (
            <Card variant="glass" style={styles.emptyCard} testID="card-empty">
              <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>Nessun cassiere trovato</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Prova a modificare la ricerca' : 'Aggiungi il primo cassiere'}
              </Text>
            </Card>
          ) : (
            <View style={styles.cashiersList}>
              {filteredCashiers.map((cashier) => (
                <TouchableOpacity
                  key={cashier.id}
                  onPress={() => handleEditCashier(cashier)}
                  activeOpacity={0.8}
                  testID={`button-cashier-${cashier.id}`}
                >
                  <Card variant="glass" style={styles.cashierCard} testID={`card-cashier-${cashier.id}`}>
                    <View style={styles.cashierHeader}>
                      <View style={styles.cashierInfo}>
                        <View style={styles.avatar}>
                          <Ionicons name="person" size={24} color={CASHIER_ACCENT} />
                        </View>
                        <View style={styles.cashierDetails}>
                          <Text style={styles.cashierName} testID={`text-cashier-name-${cashier.id}`}>
                            {cashier.name}
                          </Text>
                          <Text style={styles.cashierEmail}>{cashier.email}</Text>
                        </View>
                      </View>
                      <View style={styles.statusContainer}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(cashier.status) + '20' }]}>
                          <View style={[styles.statusDot, { backgroundColor: getStatusColor(cashier.status) }]} />
                          <Text style={[styles.statusText, { color: getStatusColor(cashier.status) }]}>
                            {getStatusLabel(cashier.status)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                      </View>
                    </View>

                    <View style={styles.cashierStats}>
                      <View style={styles.cashierStat}>
                        <Text style={styles.cashierStatValue} testID={`text-cashier-sales-${cashier.id}`}>
                          {formatCurrency(cashier.totalSales)}
                        </Text>
                        <Text style={styles.cashierStatLabel}>Vendite</Text>
                      </View>
                      <View style={styles.cashierStatDivider} />
                      <View style={styles.cashierStat}>
                        <Text style={styles.cashierStatValue} testID={`text-cashier-transactions-${cashier.id}`}>
                          {cashier.transactionsCount}
                        </Text>
                        <Text style={styles.cashierStatLabel}>Transazioni</Text>
                      </View>
                    </View>

                    <View style={styles.permissionsRow}>
                      {Object.entries(cashier.permissions)
                        .filter(([, enabled]) => enabled)
                        .map(([key]) => (
                          <View key={key} style={styles.permissionBadge}>
                            <Text style={styles.permissionText}>
                              {permissionLabels[key as keyof Cashier['permissions']]}
                            </Text>
                          </View>
                        ))}
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isTablet && { maxWidth: CONTENT_MAX_WIDTH }]} testID="modal-add-cashier">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Aggiungi Cassiere</Text>
              <TouchableOpacity 
                onPress={() => setShowAddModal(false)}
                testID="button-close-add-modal"
              >
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Nome *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nome completo"
                  placeholderTextColor={colors.mutedForeground}
                  value={newCashier.name}
                  onChangeText={(text) => setNewCashier({ ...newCashier, name: text })}
                  testID="input-new-cashier-name"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Email *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="email@esempio.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={newCashier.email}
                  onChangeText={(text) => setNewCashier({ ...newCashier, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  testID="input-new-cashier-email"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Telefono</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="+39 333 1234567"
                  placeholderTextColor={colors.mutedForeground}
                  value={newCashier.phone}
                  onChangeText={(text) => setNewCashier({ ...newCashier, phone: text })}
                  keyboardType="phone-pad"
                  testID="input-new-cashier-phone"
                />
              </View>

              <Text style={styles.permissionsTitle}>Permessi</Text>
              {(Object.keys(newCashier.permissions) as (keyof typeof newCashier.permissions)[]).map(
                (key) => (
                  <View key={key} style={styles.permissionRow}>
                    <Text style={styles.permissionLabel}>{permissionLabels[key]}</Text>
                    <Switch
                      value={newCashier.permissions[key]}
                      onValueChange={(value) =>
                        setNewCashier({
                          ...newCashier,
                          permissions: { ...newCashier.permissions, [key]: value },
                        })
                      }
                      trackColor={{ false: colors.borderSubtle, true: CASHIER_ACCENT + '60' }}
                      thumbColor={newCashier.permissions[key] ? CASHIER_ACCENT : colors.mutedForeground}
                      testID={`switch-permission-${key}`}
                    />
                  </View>
                )
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button 
                title="Annulla" 
                variant="outline" 
                onPress={() => setShowAddModal(false)} 
                testID="button-cancel-add-cashier"
              />
              <Button
                title="Aggiungi"
                variant="primary"
                onPress={handleAddCashier}
                loading={addCashierMutation.isPending}
                testID="button-submit-add-cashier"
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isTablet && { maxWidth: CONTENT_MAX_WIDTH }]} testID="modal-edit-cashier">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifica Cassiere</Text>
              <TouchableOpacity 
                onPress={() => setShowEditModal(false)}
                testID="button-close-edit-modal"
              >
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {selectedCashier && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Nome</Text>
                  <TextInput
                    style={styles.textInput}
                    value={selectedCashier.name}
                    onChangeText={(text) => setSelectedCashier({ ...selectedCashier, name: text })}
                    testID="input-edit-cashier-name"
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    style={styles.textInput}
                    value={selectedCashier.email}
                    onChangeText={(text) => setSelectedCashier({ ...selectedCashier, email: text })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    testID="input-edit-cashier-email"
                  />
                </View>

                <Text style={styles.permissionsTitle}>Permessi</Text>
                {(Object.keys(selectedCashier.permissions) as (keyof Cashier['permissions'])[]).map(
                  (key) => (
                    <View key={key} style={styles.permissionRow}>
                      <Text style={styles.permissionLabel}>{permissionLabels[key]}</Text>
                      <Switch
                        value={selectedCashier.permissions[key]}
                        onValueChange={(value) =>
                          setSelectedCashier({
                            ...selectedCashier,
                            permissions: { ...selectedCashier.permissions, [key]: value },
                          })
                        }
                        trackColor={{ false: colors.borderSubtle, true: CASHIER_ACCENT + '60' }}
                        thumbColor={
                          selectedCashier.permissions[key] ? CASHIER_ACCENT : colors.mutedForeground
                        }
                        testID={`switch-edit-permission-${key}`}
                      />
                    </View>
                  )
                )}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <Button 
                title="Annulla" 
                variant="outline" 
                onPress={() => setShowEditModal(false)} 
                testID="button-cancel-edit-cashier"
              />
              <Button
                title="Salva"
                variant="primary"
                onPress={handleUpdateCashier}
                loading={updateCashierMutation.isPending}
                testID="button-submit-edit-cashier"
              />
            </View>
          </View>
        </View>
      </Modal>
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
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  scrollContentTablet: {
    paddingHorizontal: spacing.xl,
  },
  contentWrapper: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statsRowLandscape: {
    justifyContent: 'center',
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
  },
  searchContainer: {
    marginBottom: spacing.lg,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  cashiersList: {
    gap: spacing.md,
  },
  cashierCard: {
    padding: spacing.lg,
  },
  cashierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  cashierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: CASHIER_ACCENT + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashierDetails: {
    flex: 1,
  },
  cashierName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  cashierEmail: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  cashierStats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cashierStat: {
    flex: 1,
    alignItems: 'center',
  },
  cashierStatDivider: {
    width: 1,
    backgroundColor: colors.borderSubtle,
  },
  cashierStatValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  cashierStatLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
  },
  permissionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  permissionBadge: {
    backgroundColor: CASHIER_ACCENT + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  permissionText: {
    color: CASHIER_ACCENT,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  emptyCard: {
    padding: spacing['3xl'],
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  emptySubtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  modalScroll: {
    maxHeight: 400,
  },
  formField: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  permissionsTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  permissionLabel: {
    color: colors.foreground,
    fontSize: fontSize.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
