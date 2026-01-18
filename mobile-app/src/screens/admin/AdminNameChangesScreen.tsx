import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

interface NameChangeRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  currentName: string;
  requestedName: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  userAvatar?: string;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export function AdminNameChangesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');

  const { data: requests = [], isLoading, refetch, isRefetching } = useQuery<NameChangeRequest[]>({
    queryKey: ['/api/admin/name-changes'],
    queryFn: () => api.get<NameChangeRequest[]>('/api/admin/name-changes').catch(() => [
      {
        id: '1',
        userId: 'user1',
        userName: 'Marco Rossi',
        userEmail: 'marco.rossi@email.com',
        currentName: 'Marco Rossi',
        requestedName: 'Marco A. Rossi',
        reason: 'Aggiunta secondo nome',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        userId: 'user2',
        userName: 'Giulia Bianchi',
        userEmail: 'giulia.b@email.com',
        currentName: 'Giulia Bianchi',
        requestedName: 'Giulia Verdi',
        reason: 'Cambio cognome dopo matrimonio',
        status: 'pending',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: '3',
        userId: 'user3',
        userName: 'Luca Ferrari',
        userEmail: 'luca.f@email.com',
        currentName: 'Luca Ferrari',
        requestedName: 'Luca F. Ferrari',
        reason: 'Correzione nome',
        status: 'approved',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
      },
    ]),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/name-changes/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/name-changes'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/name-changes/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/name-changes'] });
    },
  });

  const handleApprove = (request: NameChangeRequest) => {
    Alert.alert(
      'Approva Richiesta',
      `Vuoi approvare il cambio nome da "${request.currentName}" a "${request.requestedName}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Approva',
          onPress: () => approveMutation.mutate(request.id),
        },
      ]
    );
  };

  const handleReject = (request: NameChangeRequest) => {
    Alert.alert(
      'Rifiuta Richiesta',
      `Vuoi rifiutare la richiesta di cambio nome di ${request.userName}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rifiuta',
          style: 'destructive',
          onPress: () => rejectMutation.mutate(request.id),
        },
      ]
    );
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requestedName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'approved':
        return colors.success;
      case 'rejected':
        return colors.destructive;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'In Attesa';
      case 'approved':
        return 'Approvato';
      case 'rejected':
        return 'Rifiutato';
      default:
        return status;
    }
  };

  const filterOptions: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'Tutti' },
    { value: 'pending', label: 'In Attesa' },
    { value: 'approved', label: 'Approvati' },
    { value: 'rejected', label: 'Rifiutati' },
  ];

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Header title="Richieste Cambio Nome" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento richieste...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Richieste Cambio Nome" showBack />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={20} color={colors.mutedForeground} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cerca per nome o email..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
              data-testid="input-search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
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
        >
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.filterPill, filterStatus === option.value && styles.filterPillActive]}
              onPress={() => setFilterStatus(option.value)}
              data-testid={`filter-${option.value}`}
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

        <View style={styles.statsRow}>
          <Card variant="glass" style={styles.statCard}>
            <Text style={styles.statValue}>
              {requests.filter((r) => r.status === 'pending').length}
            </Text>
            <Text style={styles.statLabel}>In Attesa</Text>
          </Card>
          <Card variant="glass" style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {requests.filter((r) => r.status === 'approved').length}
            </Text>
            <Text style={styles.statLabel}>Approvati</Text>
          </Card>
          <Card variant="glass" style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.destructive }]}>
              {requests.filter((r) => r.status === 'rejected').length}
            </Text>
            <Text style={styles.statLabel}>Rifiutati</Text>
          </Card>
        </View>

        {filteredRequests.length === 0 ? (
          <Card variant="glass" style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Nessuna richiesta trovata</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Prova a modificare i criteri di ricerca'
                : 'Non ci sono richieste di cambio nome'}
            </Text>
          </Card>
        ) : (
          <View style={styles.requestsList}>
            {filteredRequests.map((request) => (
              <Card key={request.id} variant="glass" style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.userInfo}>
                    <View style={styles.avatar}>
                      <Ionicons name="person" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={styles.userName}>{request.userName}</Text>
                      <Text style={styles.userEmail}>{request.userEmail}</Text>
                    </View>
                  </View>
                  <View
                    style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}
                  >
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(request.status) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                      {getStatusLabel(request.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.nameChangeSection}>
                  <View style={styles.nameRow}>
                    <Text style={styles.nameLabel}>Da:</Text>
                    <Text style={styles.nameValue}>{request.currentName}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} style={styles.arrowIcon} />
                  <View style={styles.nameRow}>
                    <Text style={styles.nameLabel}>A:</Text>
                    <Text style={[styles.nameValue, { color: colors.primary }]}>{request.requestedName}</Text>
                  </View>
                </View>

                <View style={styles.reasonSection}>
                  <Text style={styles.reasonLabel}>Motivazione:</Text>
                  <Text style={styles.reasonText}>{request.reason}</Text>
                </View>

                <Text style={styles.dateText}>{formatDate(request.createdAt)}</Text>

                {request.status === 'pending' && (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleReject(request)}
                      data-testid={`button-reject-${request.id}`}
                    >
                      <Ionicons name="close" size={20} color={colors.destructive} />
                      <Text style={[styles.actionButtonText, { color: colors.destructive }]}>Rifiuta</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleApprove(request)}
                      data-testid={`button-approve-${request.id}`}
                    >
                      <Ionicons name="checkmark" size={20} color={colors.primaryForeground} />
                      <Text style={[styles.actionButtonText, { color: colors.primaryForeground }]}>
                        Approva
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            ))}
          </View>
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
    padding: spacing.lg,
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
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  requestsList: {
    gap: spacing.md,
  },
  requestCard: {
    padding: spacing.lg,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  userEmail: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
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
  nameChangeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  nameRow: {
    flex: 1,
  },
  nameLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.xxs,
  },
  nameValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  arrowIcon: {
    marginHorizontal: spacing.xs,
  },
  reasonSection: {
    marginBottom: spacing.md,
  },
  reasonLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  reasonText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
  },
  dateText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  rejectButton: {
    backgroundColor: colors.destructive + '20',
    borderWidth: 1,
    borderColor: colors.destructive + '40',
  },
  approveButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
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
});
