import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { type SiaeAuditLog } from '@/lib/api';

interface AdminSIAEAuditLogsScreenProps {
  onBack: () => void;
  companyId?: string;
}

type ActionFilter = 'all' | 'create' | 'update' | 'delete' | 'cancel' | 'emit' | 'validate' | 'transmit';
type EntityFilter = 'all' | 'ticket' | 'transaction' | 'customer' | 'event' | 'sector' | 'subscription' | 'name_change' | 'resale';
type OriginFilter = 'all' | 'system' | 'user';

export function AdminSIAEAuditLogsScreen({
  onBack,
  companyId: externalCompanyId,
}: AdminSIAEAuditLogsScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all');
  const [auditLogs, setAuditLogs] = useState<SiaeAuditLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<SiaeAuditLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const actionOptions: { key: ActionFilter; label: string }[] = [
    { key: 'all', label: 'Tutte le azioni' },
    { key: 'create', label: 'Creazione' },
    { key: 'update', label: 'Modifica' },
    { key: 'delete', label: 'Eliminazione' },
    { key: 'cancel', label: 'Annullamento' },
    { key: 'emit', label: 'Emissione' },
    { key: 'validate', label: 'Validazione' },
    { key: 'transmit', label: 'Trasmissione' },
  ];

  const entityOptions: { key: EntityFilter; label: string }[] = [
    { key: 'all', label: 'Tutte le entità' },
    { key: 'ticket', label: 'Biglietto' },
    { key: 'transaction', label: 'Transazione' },
    { key: 'customer', label: 'Cliente' },
    { key: 'event', label: 'Evento' },
    { key: 'sector', label: 'Settore' },
    { key: 'subscription', label: 'Abbonamento' },
    { key: 'name_change', label: 'Cambio Nome' },
    { key: 'resale', label: 'Rivendita' },
  ];

  const originOptions: { key: OriginFilter; label: string }[] = [
    { key: 'all', label: 'Tutti gli origini' },
    { key: 'system', label: 'Sistema' },
    { key: 'user', label: 'Utente' },
  ];

  useEffect(() => {
    loadAuditLogs();
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

  const loadAuditLogs = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSIAEAuditLogs(externalCompanyId);
      setAuditLogs(data);
    } catch (error) {
      console.error('Error loading SIAE audit logs:', error);
      Alert.alert('Errore', 'Impossibile caricare i log audit SIAE');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAuditLogs();
    setRefreshing(false);
  };

  const getActionBadge = (action: string) => {
    const badgeConfig: Record<
      string,
      { variant: 'default' | 'success' | 'warning' | 'destructive'; label: string }
    > = {
      create: { variant: 'success', label: 'Creazione' },
      update: { variant: 'default', label: 'Modifica' },
      delete: { variant: 'destructive', label: 'Eliminazione' },
      cancel: { variant: 'warning', label: 'Annullamento' },
      emit: { variant: 'default', label: 'Emissione' },
      validate: { variant: 'success', label: 'Validazione' },
      transmit: { variant: 'default', label: 'Trasmissione' },
    };
    return badgeConfig[action] || { variant: 'default' as const, label: action };
  };

  const getEntityBadge = (entityType: string) => {
    const badgeConfig: Record<
      string,
      { variant: 'default' | 'success' | 'warning' | 'destructive'; label: string }
    > = {
      ticket: { variant: 'default', label: 'Biglietto' },
      transaction: { variant: 'default', label: 'Transazione' },
      customer: { variant: 'default', label: 'Cliente' },
      event: { variant: 'success', label: 'Evento' },
      sector: { variant: 'default', label: 'Settore' },
      subscription: { variant: 'default', label: 'Abbonamento' },
      name_change: { variant: 'warning', label: 'Cambio Nome' },
      resale: { variant: 'default', label: 'Rivendita' },
    };
    return badgeConfig[entityType] || { variant: 'default' as const, label: entityType };
  };

  const getActionIcon = (action: string) => {
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      create: 'add-circle-outline',
      update: 'pencil-outline',
      delete: 'trash-outline',
      cancel: 'close-circle-outline',
      emit: 'document-text-outline',
      validate: 'checkmark-circle-outline',
      transmit: 'send-outline',
    };
    return iconMap[action] || 'help-circle-outline';
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      searchQuery === '' ||
      log.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.fiscalSealCode?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter;
    const matchesOrigin =
      originFilter === 'all' ||
      (originFilter === 'system' && !log.userId) ||
      (originFilter === 'user' && log.userId);

    return matchesSearch && matchesAction && matchesEntity && matchesOrigin;
  });

  const stats = {
    total: auditLogs.length,
    creates: auditLogs.filter((l) => l.action === 'create').length,
    updates: auditLogs.filter((l) => l.action === 'update').length,
    deletes: auditLogs.filter((l) => l.action === 'delete').length,
  };

  const activeFiltersCount =
    (actionFilter !== 'all' ? 1 : 0) +
    (entityFilter !== 'all' ? 1 : 0) +
    (originFilter !== 'all' ? 1 : 0);

  const handleViewDetails = (log: SiaeAuditLog) => {
    triggerHaptic('medium');
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const handleClearFilters = () => {
    triggerHaptic('light');
    setActionFilter('all');
    setEntityFilter('all');
    setOriginFilter('all');
  };

  const parseJsonSafely = (jsonString: string | null) => {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  };

  const renderLogCard = ({ item }: { item: SiaeAuditLog }) => {
    const actionBadge = getActionBadge(item.action);
    const entityBadge = getEntityBadge(item.entityType);
    const date = new Date(item.createdAt).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const time = new Date(item.createdAt).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <Pressable
        onPress={() => handleViewDetails(item)}
        testID={`log-card-${item.id}`}
      >
        <Card style={styles.logCard}>
          <View style={styles.logHeader}>
            <View style={styles.logIconContainer}>
              <Ionicons
                name={getActionIcon(item.action)}
                size={24}
                color={staticColors.primary}
              />
            </View>
            <View style={styles.logInfo}>
              <View style={styles.badgeRow}>
                <Badge variant={actionBadge.variant} size="sm">
                  {actionBadge.label}
                </Badge>
                <Badge variant={entityBadge.variant} size="sm">
                  {entityBadge.label}
                </Badge>
              </View>
              {item.description && (
                <Text
                  style={[styles.description, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {item.description}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.logMeta}>
            <View style={styles.metaItem}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={colors.mutedForeground}
              />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {date} {time}
              </Text>
            </View>
            {item.userId && (
              <View style={styles.metaItem}>
                <Ionicons
                  name="person-outline"
                  size={14}
                  color={colors.mutedForeground}
                />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  Utente
                </Text>
              </View>
            )}
            {!item.userId && (
              <View style={styles.metaItem}>
                <Ionicons
                  name="cog-outline"
                  size={14}
                  color={colors.mutedForeground}
                />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  Sistema
                </Text>
              </View>
            )}
            {item.entityId && (
              <View style={styles.metaItem}>
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  ID: {item.entityId.slice(0, 8)}...
                </Text>
              </View>
            )}
          </View>
        </Card>
      </Pressable>
    );
  };

  const styles = createStyles(colors, insets);

  if (showLoader) {
    return <Loading text="Caricamento log audit SIAE..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Log Audit SIAE"
        onBack={onBack}
        testID="header-admin-siae-audit-logs"
      />

      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputWrapper,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca nei log..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-logs"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              testID="button-clear-search"
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.mutedForeground}
              />
            </Pressable>
          )}
        </View>
      </View>

      <GlassCard style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {stats.total}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Totali
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                { color: staticColors.primary },
              ]}
            >
              {stats.creates}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Creazioni
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                { color: staticColors.primary },
              ]}
            >
              {stats.updates}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Modifiche
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                { color: staticColors.danger },
              ]}
            >
              {stats.deletes}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Eliminazioni
            </Text>
          </View>
        </View>
      </GlassCard>

      <View style={styles.filterHeaderContainer}>
        <Pressable
          style={[
            styles.filterButton,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => setShowFilterPanel(!showFilterPanel)}
          testID="button-toggle-filters"
        >
          <Ionicons name="funnel-outline" size={18} color={colors.foreground} />
          <Text style={[styles.filterButtonText, { color: colors.foreground }]}>
            Filtri
          </Text>
          {activeFiltersCount > 0 && (
            <View style={[styles.badgeCount, { backgroundColor: staticColors.primary }]}>
              <Text style={styles.badgeCountText}>{activeFiltersCount}</Text>
            </View>
          )}
        </Pressable>
        {activeFiltersCount > 0 && (
          <Pressable
            onPress={handleClearFilters}
            testID="button-clear-filters"
          >
            <Text style={[styles.clearFilterText, { color: staticColors.primary }]}>
              Azzera
            </Text>
          </Pressable>
        )}
      </View>

      {showFilterPanel && (
        <View style={[styles.filterPanel, { backgroundColor: colors.card }]}>
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: colors.foreground }]}>
              Azione
            </Text>
            <FlatList
              horizontal
              data={actionOptions}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor:
                        actionFilter === item.key
                          ? staticColors.primary
                          : colors.border,
                    },
                  ]}
                  onPress={() => {
                    triggerHaptic('light');
                    setActionFilter(item.key);
                  }}
                  testID={`filter-action-${item.key}`}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color:
                          actionFilter === item.key
                            ? '#000000'
                            : colors.foreground,
                        fontWeight: actionFilter === item.key ? '700' : '500',
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
              keyExtractor={(item) => item.key}
              contentContainerStyle={styles.filterChipsScroll}
              scrollEnabled={true}
            />
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: colors.foreground }]}>
              Entità
            </Text>
            <FlatList
              horizontal
              data={entityOptions}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor:
                        entityFilter === item.key
                          ? staticColors.primary
                          : colors.border,
                    },
                  ]}
                  onPress={() => {
                    triggerHaptic('light');
                    setEntityFilter(item.key);
                  }}
                  testID={`filter-entity-${item.key}`}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color:
                          entityFilter === item.key
                            ? '#000000'
                            : colors.foreground,
                        fontWeight: entityFilter === item.key ? '700' : '500',
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
              keyExtractor={(item) => item.key}
              contentContainerStyle={styles.filterChipsScroll}
              scrollEnabled={true}
            />
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: colors.foreground }]}>
              Origine
            </Text>
            <FlatList
              horizontal
              data={originOptions}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor:
                        originFilter === item.key
                          ? staticColors.primary
                          : colors.border,
                    },
                  ]}
                  onPress={() => {
                    triggerHaptic('light');
                    setOriginFilter(item.key);
                  }}
                  testID={`filter-origin-${item.key}`}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color:
                          originFilter === item.key
                            ? '#000000'
                            : colors.foreground,
                        fontWeight: originFilter === item.key ? '700' : '500',
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
              keyExtractor={(item) => item.key}
              contentContainerStyle={styles.filterChipsScroll}
              scrollEnabled={true}
            />
          </View>
        </View>
      )}

      <View style={styles.resultCountContainer}>
        <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
          {filteredLogs.length} log trovati
        </Text>
      </View>

      <FlatList
        data={filteredLogs}
        renderItem={renderLogCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={staticColors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="document-text-outline"
              size={48}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Nessun Log
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Non ci sono log audit disponibili
            </Text>
          </View>
        }
      />

      <Modal
        visible={isDetailModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDetailModalOpen(false)}
        testID="modal-log-details"
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            {selectedLog && (
              <ScrollView>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                    Dettagli Log
                  </Text>
                  <Pressable
                    onPress={() => setIsDetailModalOpen(false)}
                    testID="button-close-modal"
                  >
                    <Ionicons
                      name="close-outline"
                      size={24}
                      color={colors.foreground}
                    />
                  </Pressable>
                </View>

                <View style={styles.detailSection}>
                  <Text
                    style={[
                      styles.detailSectionTitle,
                      { color: colors.foreground },
                    ]}
                  >
                    Operazione
                  </Text>
                  <View style={styles.detailRow}>
                    <Text
                      style={[styles.detailLabel, { color: colors.mutedForeground }]}
                    >
                      Azione:
                    </Text>
                    <Badge
                      variant={getActionBadge(selectedLog.action).variant}
                      size="sm"
                    >
                      {getActionBadge(selectedLog.action).label}
                    </Badge>
                  </View>
                  <View style={styles.detailRow}>
                    <Text
                      style={[styles.detailLabel, { color: colors.mutedForeground }]}
                    >
                      Entità:
                    </Text>
                    <Badge
                      variant={getEntityBadge(selectedLog.entityType).variant}
                      size="sm"
                    >
                      {getEntityBadge(selectedLog.entityType).label}
                    </Badge>
                  </View>
                  {selectedLog.description && (
                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Descrizione:
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.foreground }]}>
                        {selectedLog.description}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text
                    style={[
                      styles.detailSectionTitle,
                      { color: colors.foreground },
                    ]}
                  >
                    Dettagli
                  </Text>
                  {selectedLog.entityId && (
                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        ID Entità:
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.foreground }]}>
                        {selectedLog.entityId}
                      </Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Origine:
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.foreground }]}>
                      {selectedLog.userId ? 'Utente' : 'Sistema'}
                    </Text>
                  </View>
                  {selectedLog.userId && (
                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        ID Utente:
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.foreground }]}>
                        {selectedLog.userId.slice(0, 12)}...
                      </Text>
                    </View>
                  )}
                  {selectedLog.fiscalSealCode && (
                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Codice Sigillo:
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.foreground }]}>
                        {selectedLog.fiscalSealCode}
                      </Text>
                    </View>
                  )}
                  {selectedLog.cardCode && (
                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Codice Smart Card:
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.foreground }]}>
                        {selectedLog.cardCode}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text
                    style={[
                      styles.detailSectionTitle,
                      { color: colors.foreground },
                    ]}
                  >
                    Timestamp
                  </Text>
                  <View style={styles.detailRow}>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Data/Ora:
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.foreground }]}>
                      {new Date(selectedLog.createdAt).toLocaleString('it-IT')}
                    </Text>
                  </View>
                </View>

                {(selectedLog.oldData || selectedLog.newData) && (
                  <View style={styles.detailSection}>
                    <Text
                      style={[
                        styles.detailSectionTitle,
                        { color: colors.foreground },
                      ]}
                    >
                      Dati
                    </Text>
                    {selectedLog.oldData && (
                      <View style={styles.jsonSection}>
                        <Text
                          style={[
                            styles.jsonLabel,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          Prima:
                        </Text>
                        <View
                          style={[
                            styles.jsonBox,
                            { backgroundColor: colors.card },
                          ]}
                        >
                          <Text
                            style={[
                              styles.jsonText,
                              { color: colors.mutedForeground },
                            ]}
                          >
                            {JSON.stringify(
                              parseJsonSafely(selectedLog.oldData),
                              null,
                              2
                            ) || 'N/A'}
                          </Text>
                        </View>
                      </View>
                    )}
                    {selectedLog.newData && (
                      <View style={styles.jsonSection}>
                        <Text
                          style={[
                            styles.jsonLabel,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          Dopo:
                        </Text>
                        <View
                          style={[
                            styles.jsonBox,
                            { backgroundColor: colors.card },
                          ]}
                        >
                          <Text
                            style={[
                              styles.jsonText,
                              { color: colors.mutedForeground },
                            ]}
                          >
                            {JSON.stringify(
                              parseJsonSafely(selectedLog.newData),
                              null,
                              2
                            ) || 'N/A'}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {selectedLog.ipAddress && (
                  <View style={styles.detailSection}>
                    <Text
                      style={[
                        styles.detailSectionTitle,
                        { color: colors.foreground },
                      ]}
                    >
                      Metadati
                    </Text>
                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        IP:
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.foreground }]}>
                        {selectedLog.ipAddress}
                      </Text>
                    </View>
                  </View>
                )}

                <Pressable
                  style={[
                    styles.closeButton,
                    { backgroundColor: staticColors.primary },
                  ]}
                  onPress={() => setIsDetailModalOpen(false)}
                  testID="button-modal-close"
                >
                  <Text style={styles.closeButtonText}>Chiudi</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any, insets: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    searchContainer: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    searchInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      height: 44,
      gap: spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontWeight: '400',
    },
    statsCard: {
      marginHorizontal: spacing.md,
      marginVertical: spacing.md,
      padding: spacing.md,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 22,
      fontWeight: '700',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '500',
    },
    filterHeaderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.md,
    },
    filterButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    filterButtonText: {
      fontSize: 14,
      fontWeight: '500',
    },
    badgeCount: {
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 'auto',
    },
    badgeCountText: {
      color: '#000000',
      fontSize: 12,
      fontWeight: '700',
    },
    clearFilterText: {
      fontSize: 13,
      fontWeight: '600',
    },
    filterPanel: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    filterSection: {
      gap: spacing.sm,
    },
    filterSectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    filterChipsScroll: {
      paddingRight: spacing.md,
      gap: spacing.sm,
    },
    filterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      marginRight: spacing.sm,
    },
    filterChipText: {
      fontSize: 12,
    },
    resultCountContainer: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    resultCount: {
      fontSize: 13,
      fontWeight: '500',
    },
    listContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: insets.bottom + spacing.xl,
    },
    logCard: {
      marginBottom: spacing.md,
      padding: spacing.md,
      gap: spacing.md,
    },
    logHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    logIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: staticColors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    logInfo: {
      flex: 1,
      gap: spacing.xs,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    description: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    },
    logMeta: {
      flexDirection: 'row',
      gap: spacing.md,
      flexWrap: 'wrap',
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    metaText: {
      fontSize: 12,
    },
    emptyState: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.md,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    emptyText: {
      fontSize: 13,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalContent: {
      maxHeight: '90%',
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      paddingHorizontal: spacing.md,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      marginBottom: spacing.md,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
    },
    detailSection: {
      marginBottom: spacing.lg,
      gap: spacing.md,
    },
    detailSectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: spacing.sm,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
    },
    detailLabel: {
      fontSize: 13,
      fontWeight: '500',
    },
    detailValue: {
      fontSize: 13,
      fontWeight: '400',
      flex: 1,
      textAlign: 'right',
    },
    jsonSection: {
      gap: spacing.sm,
      marginVertical: spacing.sm,
    },
    jsonLabel: {
      fontSize: 12,
      fontWeight: '600',
    },
    jsonBox: {
      borderRadius: borderRadius.md,
      padding: spacing.sm,
    },
    jsonText: {
      fontSize: 10,
      fontFamily: 'monospace',
      lineHeight: 14,
    },
    closeButton: {
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginVertical: spacing.lg,
      marginBottom: insets.bottom + spacing.md,
    },
    closeButtonText: {
      color: '#000000',
      fontSize: 14,
      fontWeight: '700',
    },
  });
