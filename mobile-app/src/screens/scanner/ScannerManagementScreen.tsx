import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  Modal,
  Alert,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Button, Header, Input } from '../../components';

interface Operator {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'suspended';
  permissions: OperatorPermissions;
  assignedGates: string[];
  totalScans: number;
  lastActive: string;
  createdAt: string;
}

interface OperatorPermissions {
  canScan: boolean;
  canViewStats: boolean;
  canManualEntry: boolean;
  canOverride: boolean;
  canExport: boolean;
}

const PERMISSION_LABELS: Record<keyof OperatorPermissions, string> = {
  canScan: 'Scansione Biglietti',
  canViewStats: 'Visualizza Statistiche',
  canManualEntry: 'Inserimento Manuale',
  canOverride: 'Override Errori',
  canExport: 'Esporta Dati',
};

const GATES = ['Ingresso A', 'Ingresso B', 'Ingresso VIP', 'Backstage', 'Uscita'];

export default function ScannerManagementScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  const numColumns = isTablet || isLandscape ? 2 : 1;
  const contentMaxWidth = isTablet ? 1200 : undefined;

  const [newOperator, setNewOperator] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const { data: operators, refetch } = useQuery<Operator[]>({
    queryKey: ['/api/scanner/operators'],
  });

  const addOperatorMutation = useMutation({
    mutationFn: async (data: typeof newOperator) => {
      return fetch('/api/scanner/operators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scanner/operators'] });
      setShowAddModal(false);
      setNewOperator({ name: '', email: '', phone: '' });
      Alert.alert('Successo', 'Operatore aggiunto correttamente');
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async (data: { operatorId: string; permissions: OperatorPermissions }) => {
      return fetch(`/api/scanner/operators/${data.operatorId}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.permissions),
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scanner/operators'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const mockOperators: Operator[] = operators || [
    {
      id: '1',
      name: 'Luigi Verdi',
      email: 'luigi@event4u.it',
      phone: '+39 333 1234567',
      status: 'active',
      permissions: { canScan: true, canViewStats: true, canManualEntry: false, canOverride: false, canExport: false },
      assignedGates: ['Ingresso A', 'Ingresso B'],
      totalScans: 1250,
      lastActive: '5 min fa',
      createdAt: '2025-11-15',
    },
    {
      id: '2',
      name: 'Maria Rossi',
      email: 'maria@event4u.it',
      phone: '+39 333 7654321',
      status: 'active',
      permissions: { canScan: true, canViewStats: true, canManualEntry: true, canOverride: true, canExport: true },
      assignedGates: ['Ingresso VIP', 'Backstage'],
      totalScans: 890,
      lastActive: '12 min fa',
      createdAt: '2025-10-20',
    },
    {
      id: '3',
      name: 'Francesco Bianchi',
      email: 'francesco@event4u.it',
      phone: '+39 333 9876543',
      status: 'inactive',
      permissions: { canScan: true, canViewStats: false, canManualEntry: false, canOverride: false, canExport: false },
      assignedGates: ['Ingresso A'],
      totalScans: 456,
      lastActive: '2 giorni fa',
      createdAt: '2025-12-01',
    },
    {
      id: '4',
      name: 'Anna Neri',
      email: 'anna@event4u.it',
      phone: '+39 333 1112233',
      status: 'suspended',
      permissions: { canScan: false, canViewStats: false, canManualEntry: false, canOverride: false, canExport: false },
      assignedGates: [],
      totalScans: 120,
      lastActive: '1 settimana fa',
      createdAt: '2025-09-10',
    },
  ];

  const filteredOperators = mockOperators.filter((op) =>
    op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    op.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusConfig = (status: Operator['status']) => {
    switch (status) {
      case 'active': return { label: 'Attivo', color: colors.teal };
      case 'inactive': return { label: 'Inattivo', color: colors.mutedForeground };
      case 'suspended': return { label: 'Sospeso', color: colors.destructive };
    }
  };

  const handleEditPermissions = (operator: Operator) => {
    setSelectedOperator(operator);
    setShowPermissionsModal(true);
  };

  const togglePermission = (key: keyof OperatorPermissions) => {
    if (!selectedOperator) return;
    const newPermissions = {
      ...selectedOperator.permissions,
      [key]: !selectedOperator.permissions[key],
    };
    setSelectedOperator({ ...selectedOperator, permissions: newPermissions });
  };

  const savePermissions = () => {
    if (!selectedOperator) return;
    updatePermissionsMutation.mutate({
      operatorId: selectedOperator.id,
      permissions: selectedOperator.permissions,
    });
    setShowPermissionsModal(false);
  };

  const renderOperatorCard = ({ item, index }: { item: Operator; index: number }) => {
    const statusConfig = getStatusConfig(item.status);
    const isLeftColumn = index % 2 === 0;

    return (
      <View
        style={[
          styles.operatorCardWrapper,
          numColumns === 2 && {
            flex: 0.5,
            paddingLeft: isLeftColumn ? 0 : spacing.sm,
            paddingRight: isLeftColumn ? spacing.sm : 0,
          },
        ]}
      >
        <Card variant="glass" style={styles.operatorCard}>
          <View style={styles.operatorHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
            </View>
            <View style={styles.operatorInfo}>
              <Text style={styles.operatorName}>{item.name}</Text>
              <Text style={styles.operatorEmail}>{item.email}</Text>
              <View style={styles.gatesContainer}>
                {item.assignedGates.slice(0, 2).map((gate) => (
                  <View key={gate} style={styles.gateBadge}>
                    <Text style={styles.gateBadgeText}>{gate}</Text>
                  </View>
                ))}
                {item.assignedGates.length > 2 && (
                  <View style={styles.gateBadge}>
                    <Text style={styles.gateBadgeText}>+{item.assignedGates.length - 2}</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate('OperatorDetail', { operatorId: item.id })}
              testID={`button-menu-${item.id}`}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="scan-outline" size={16} color={colors.emerald} />
              <Text style={styles.statValue} testID={`text-scans-${item.id}`}>{item.totalScans.toLocaleString()}</Text>
              <Text style={styles.statLabel}>scansioni</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
              <Text style={styles.statValue} testID={`text-last-active-${item.id}`}>{item.lastActive}</Text>
            </View>
          </View>

          <View style={styles.permissionsSummary}>
            {Object.entries(item.permissions).slice(0, 3).map(([key, value]) => (
              <View key={key} style={styles.permissionItem}>
                <Ionicons
                  name={value ? 'checkmark-circle' : 'close-circle'}
                  size={14}
                  color={value ? colors.teal : colors.mutedForeground}
                />
                <Text style={[styles.permissionText, !value && styles.permissionDisabled]}>
                  {PERMISSION_LABELS[key as keyof OperatorPermissions]}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditPermissions(item)}
              testID={`button-permissions-${item.id}`}
            >
              <Ionicons name="key-outline" size={18} color={colors.emerald} />
              <Text style={styles.actionButtonText}>Permessi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('AssignGates', { operatorId: item.id })}
              testID={`button-gates-${item.id}`}
            >
              <Ionicons name="enter-outline" size={18} color={colors.teal} />
              <Text style={styles.actionButtonText}>Ingressi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('OperatorStats', { operatorId: item.id })}
              testID={`button-stats-${item.id}`}
            >
              <Ionicons name="stats-chart-outline" size={18} color={colors.foreground} />
              <Text style={styles.actionButtonText}>Stats</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Gestione Scanner"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => setShowAddModal(true)} testID="button-add-operator">
            <Ionicons name="person-add-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <View style={[styles.contentContainer, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined]}>
        <View style={styles.summaryContainer}>
          <Card variant="glass" style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue} testID="text-total-operators">{mockOperators.length}</Text>
              <Text style={styles.summaryLabel}>Totale</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.teal }]} testID="text-active-operators">
                {mockOperators.filter(o => o.status === 'active').length}
              </Text>
              <Text style={styles.summaryLabel}>Attivi</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.emerald }]} testID="text-total-scans">
                {mockOperators.reduce((sum, o) => sum + o.totalScans, 0).toLocaleString()}
              </Text>
              <Text style={styles.summaryLabel}>Scansioni</Text>
            </View>
          </Card>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca operatore..."
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

        <FlatList
          data={filteredOperators}
          renderItem={renderOperatorCard}
          keyExtractor={(item) => item.id}
          key={numColumns}
          numColumns={numColumns}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.emerald} />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={
            <Card style={styles.emptyCard} variant="glass">
              <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle} testID="text-empty-title">Nessun operatore</Text>
              <Text style={styles.emptyText} testID="text-empty-subtitle">Aggiungi operatori per gestire gli scanner</Text>
            </Card>
          }
          testID="list-operators"
        />
      </View>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuovo Operatore</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} testID="button-close-add-modal">
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nome Completo</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Mario Rossi"
                placeholderTextColor={colors.mutedForeground}
                value={newOperator.name}
                onChangeText={(text) => setNewOperator({ ...newOperator, name: text })}
                testID="input-name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={styles.formInput}
                placeholder="mario@event4u.it"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                value={newOperator.email}
                onChangeText={(text) => setNewOperator({ ...newOperator, email: text })}
                testID="input-email"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Telefono</Text>
              <TextInput
                style={styles.formInput}
                placeholder="+39 333 1234567"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                value={newOperator.phone}
                onChangeText={(text) => setNewOperator({ ...newOperator, phone: text })}
                testID="input-phone"
              />
            </View>

            <Button
              onPress={() => addOperatorMutation.mutate(newOperator)}
              disabled={addOperatorMutation.isPending || !newOperator.name || !newOperator.email}
              testID="button-submit-operator"
            >
              <Text style={styles.buttonText}>
                {addOperatorMutation.isPending ? 'Aggiunta...' : 'Aggiungi Operatore'}
              </Text>
            </Button>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPermissionsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPermissionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Permessi - {selectedOperator?.name}</Text>
              <TouchableOpacity onPress={() => setShowPermissionsModal(false)} testID="button-close-permissions-modal">
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {selectedOperator && (
              <View style={styles.permissionsForm}>
                {(Object.keys(selectedOperator.permissions) as (keyof OperatorPermissions)[]).map((key) => (
                  <View key={key} style={styles.permissionRow}>
                    <View style={styles.permissionInfo}>
                      <Text style={styles.permissionLabel}>{PERMISSION_LABELS[key]}</Text>
                    </View>
                    <Switch
                      value={selectedOperator.permissions[key]}
                      onValueChange={() => togglePermission(key)}
                      trackColor={{ false: colors.surface, true: `${colors.emerald}50` }}
                      thumbColor={selectedOperator.permissions[key] ? colors.emerald : colors.mutedForeground}
                      testID={`switch-permission-${key}`}
                    />
                  </View>
                ))}
              </View>
            )}

            <Button onPress={savePermissions} testID="button-save-permissions">
              <Text style={styles.buttonText}>Salva Permessi</Text>
            </Button>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={[styles.fab, isTablet && styles.fabTablet]}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
        testID="button-fab-add"
      >
        <Ionicons name="person-add" size={24} color={colors.emeraldForeground} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flex: 1,
  },
  summaryContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  summaryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.borderSubtle,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  searchInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  listContent: {
    padding: spacing.lg,
  },
  operatorCardWrapper: {
    flex: 1,
  },
  operatorCard: {
    paddingVertical: spacing.lg,
  },
  operatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.emerald}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.emerald,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  operatorInfo: {
    flex: 1,
  },
  operatorName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  operatorEmail: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  gatesContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  gateBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  gateBadgeText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  menuButton: {
    padding: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  permissionsSummary: {
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  permissionText: {
    color: colors.foreground,
    fontSize: fontSize.xs,
  },
  permissionDisabled: {
    color: colors.mutedForeground,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  actionButtonText: {
    color: colors.foreground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
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
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  modalContentTablet: {
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
    borderRadius: borderRadius['2xl'],
    marginBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  formInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  permissionsForm: {
    marginBottom: spacing.lg,
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  buttonText: {
    color: colors.emeraldForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  fab: {
    position: 'absolute',
    bottom: spacing['2xl'],
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabTablet: {
    bottom: spacing['3xl'],
    right: spacing.xl,
  },
});
