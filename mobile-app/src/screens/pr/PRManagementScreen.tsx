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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header, Button, Input } from '../../components';
import { api } from '../../lib/api';

interface PR {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'suspended';
  totalGuests: number;
  totalEarnings: number;
  pendingEarnings: number;
  commissionRate: number;
  eventsAssigned: number;
  joinedAt: string;
  lastActive?: string;
}

type FilterStatus = 'all' | 'active' | 'inactive' | 'suspended';

export function PRManagementScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPR, setNewPR] = useState({ name: '', email: '', phone: '', commissionRate: '5' });

  const numColumns = isTablet || isLandscape ? 2 : 1;

  const { data: prs = [], refetch } = useQuery<PR[]>({
    queryKey: ['/api/organizer/prs'],
    queryFn: () =>
      api.get<PR[]>('/api/organizer/prs').catch(() => [
        {
          id: '1',
          name: 'Giovanni Rossi',
          email: 'giovanni.r@email.com',
          phone: '+39 333 1234567',
          status: 'active',
          totalGuests: 456,
          totalEarnings: 2280.0,
          pendingEarnings: 180.0,
          commissionRate: 5,
          eventsAssigned: 12,
          joinedAt: '2024-03-15',
          lastActive: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Maria Bianchi',
          email: 'maria.b@email.com',
          phone: '+39 334 7654321',
          status: 'active',
          totalGuests: 234,
          totalEarnings: 1170.0,
          pendingEarnings: 95.0,
          commissionRate: 5,
          eventsAssigned: 8,
          joinedAt: '2024-06-20',
          lastActive: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: '3',
          name: 'Luca Verdi',
          email: 'luca.v@email.com',
          phone: '+39 335 9876543',
          status: 'inactive',
          totalGuests: 89,
          totalEarnings: 445.0,
          pendingEarnings: 0,
          commissionRate: 5,
          eventsAssigned: 0,
          joinedAt: '2024-08-01',
        },
        {
          id: '4',
          name: 'Anna Ferrari',
          email: 'anna.f@email.com',
          phone: '+39 336 1472583',
          status: 'suspended',
          totalGuests: 12,
          totalEarnings: 60.0,
          pendingEarnings: 0,
          commissionRate: 5,
          eventsAssigned: 0,
          joinedAt: '2024-10-10',
        },
      ]),
  });

  const addPRMutation = useMutation({
    mutationFn: (data: typeof newPR) => api.post('/api/organizer/prs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizer/prs'] });
      setShowAddModal(false);
      setNewPR({ name: '', email: '', phone: '', commissionRate: '5' });
      Alert.alert('Successo', 'PR aggiunto con successo');
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredPRs = prs.filter((pr) => {
    const matchesSearch =
      pr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pr.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || pr.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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

  const handlePRPress = (pr: PR) => {
    navigation.navigate('PRDetail', { prId: pr.id });
  };

  const handleAddPR = () => {
    if (!newPR.name || !newPR.email) {
      Alert.alert('Errore', 'Nome e email sono obbligatori');
      return;
    }
    addPRMutation.mutate(newPR);
  };

  const filterOptions: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'Tutti' },
    { value: 'active', label: 'Attivi' },
    { value: 'inactive', label: 'Inattivi' },
    { value: 'suspended', label: 'Sospesi' },
  ];

  const totalStats = {
    totalPRs: prs.length,
    activePRs: prs.filter((p) => p.status === 'active').length,
    totalGuests: prs.reduce((sum, p) => sum + p.totalGuests, 0),
    totalEarnings: prs.reduce((sum, p) => sum + p.totalEarnings, 0),
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Gestione PR"
        showBack
        rightAction={
          <TouchableOpacity onPress={() => setShowAddModal(true)} testID="button-add-pr">
            <Ionicons name="add-circle" size={28} color={colors.purple} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purple} />
        }
        testID="scroll-pr-management"
      >
        <View style={[styles.statsGrid, isTablet && styles.statsGridTablet]}>
          <Card variant="glass" style={styles.statCard} testID="card-stat-total-prs">
            <Text style={styles.statValue}>{totalStats.totalPRs}</Text>
            <Text style={styles.statLabel}>PR Totali</Text>
          </Card>
          <Card variant="glass" style={styles.statCard} testID="card-stat-active-prs">
            <Text style={[styles.statValue, { color: colors.success }]}>{totalStats.activePRs}</Text>
            <Text style={styles.statLabel}>Attivi</Text>
          </Card>
          <Card variant="glass" style={styles.statCard} testID="card-stat-total-guests">
            <Text style={[styles.statValue, { color: colors.purpleLight }]}>{totalStats.totalGuests}</Text>
            <Text style={styles.statLabel}>Ospiti Totali</Text>
          </Card>
          <Card variant="glass" style={styles.statCard} testID="card-stat-commissions">
            <Text style={[styles.statValue, { color: colors.purple }]}>
              € {totalStats.totalEarnings.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Commissioni</Text>
          </Card>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={20} color={colors.mutedForeground} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cerca PR..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
              testID="input-search-pr"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} testID="button-clear-search">
                <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
          testID="scroll-filters"
        >
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.filterPill, filterStatus === option.value && styles.filterPillActive]}
              onPress={() => setFilterStatus(option.value)}
              testID={`filter-${option.value}`}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filterStatus === option.value && styles.filterPillTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredPRs.length === 0 ? (
          <Card variant="glass" style={styles.emptyCard} testID="card-empty">
            <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Nessun PR trovato</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Prova a modificare la ricerca' : 'Aggiungi il primo PR al tuo team'}
            </Text>
          </Card>
        ) : (
          <View style={[styles.prList, numColumns === 2 && styles.prListGrid]}>
            {filteredPRs.map((pr, index) => (
              <TouchableOpacity
                key={pr.id}
                onPress={() => handlePRPress(pr)}
                activeOpacity={0.8}
                style={[
                  numColumns === 2 && { width: '50%', paddingHorizontal: spacing.xs },
                  numColumns === 2 && index % 2 === 0 && { paddingLeft: 0 },
                  numColumns === 2 && index % 2 === 1 && { paddingRight: 0 },
                ]}
                testID={`button-pr-${pr.id}`}
              >
                <Card variant="glass" style={styles.prCard}>
                  <View style={styles.prHeader}>
                    <View style={styles.prInfo}>
                      <View style={styles.avatar}>
                        <Ionicons name="person" size={24} color={colors.purple} />
                      </View>
                      <View style={styles.prDetails}>
                        <Text style={styles.prName}>{pr.name}</Text>
                        <Text style={styles.prEmail}>{pr.email}</Text>
                      </View>
                    </View>
                    <View style={styles.statusContainer}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(pr.status) + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(pr.status) }]} />
                        <Text style={[styles.statusText, { color: getStatusColor(pr.status) }]}>
                          {getStatusLabel(pr.status)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                    </View>
                  </View>

                  <View style={styles.prStats}>
                    <View style={styles.prStat}>
                      <Text style={styles.prStatValue}>{pr.totalGuests}</Text>
                      <Text style={styles.prStatLabel}>Ospiti</Text>
                    </View>
                    <View style={styles.prStatDivider} />
                    <View style={styles.prStat}>
                      <Text style={styles.prStatValue}>{pr.eventsAssigned}</Text>
                      <Text style={styles.prStatLabel}>Eventi</Text>
                    </View>
                    <View style={styles.prStatDivider} />
                    <View style={styles.prStat}>
                      <Text style={[styles.prStatValue, { color: colors.success }]}>
                        € {pr.totalEarnings.toFixed(0)}
                      </Text>
                      <Text style={styles.prStatLabel}>Totale</Text>
                    </View>
                    <View style={styles.prStatDivider} />
                    <View style={styles.prStat}>
                      <Text style={[styles.prStatValue, { color: colors.warning }]}>
                        € {pr.pendingEarnings.toFixed(0)}
                      </Text>
                      <Text style={styles.prStatLabel}>In Attesa</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Aggiungi PR</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} testID="button-close-modal">
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Nome *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nome completo"
                  placeholderTextColor={colors.mutedForeground}
                  value={newPR.name}
                  onChangeText={(text) => setNewPR({ ...newPR, name: text })}
                  testID="input-pr-name"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Email *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="email@esempio.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={newPR.email}
                  onChangeText={(text) => setNewPR({ ...newPR, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  testID="input-pr-email"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Telefono</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="+39 333 1234567"
                  placeholderTextColor={colors.mutedForeground}
                  value={newPR.phone}
                  onChangeText={(text) => setNewPR({ ...newPR, phone: text })}
                  keyboardType="phone-pad"
                  testID="input-pr-phone"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Commissione (%)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="5"
                  placeholderTextColor={colors.mutedForeground}
                  value={newPR.commissionRate}
                  onChangeText={(text) => setNewPR({ ...newPR, commissionRate: text })}
                  keyboardType="numeric"
                  testID="input-pr-commission"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button title="Annulla" variant="outline" onPress={() => setShowAddModal(false)} testID="button-cancel-add" />
              <Button
                title="Aggiungi"
                variant="primary"
                onPress={handleAddPR}
                loading={addPRMutation.isPending}
                testID="button-confirm-add"
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
    padding: spacing.lg,
  },
  contentContainer: {
    paddingBottom: spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statsGridTablet: {
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
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
    marginBottom: spacing.md,
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
  filtersContainer: {
    marginBottom: spacing.lg,
  },
  filtersContent: {
    gap: spacing.md,
  },
  filterPill: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterPillActive: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  filterPillText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  filterPillTextActive: {
    color: colors.primaryForeground,
    fontWeight: fontWeight.semibold,
  },
  prList: {
    gap: spacing.md,
  },
  prListGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  prCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  prHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  prInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.purple + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prDetails: {
    flex: 1,
  },
  prName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  prEmail: {
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
  prStats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  prStat: {
    flex: 1,
    alignItems: 'center',
  },
  prStatDivider: {
    width: 1,
    backgroundColor: colors.borderSubtle,
  },
  prStatValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  prStatLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
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
    paddingBottom: spacing['3xl'],
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
  modalForm: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  formField: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
