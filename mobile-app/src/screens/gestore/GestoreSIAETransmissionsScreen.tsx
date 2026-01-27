import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { Button } from '@/components/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAETransmission } from '@/lib/api';

type FilterType = 'all' | 'RCA' | 'RMG' | 'RPM';

interface GestoreSIAETransmissionsScreenProps {
  onBack: () => void;
}

export function GestoreSIAETransmissionsScreen({ onBack }: GestoreSIAETransmissionsScreenProps) {
  const { colors } = useTheme();
  const [transmissions, setTransmissions] = useState<SIAETransmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedTransmission, setSelectedTransmission] = useState<SIAETransmission | null>(null);
  const [showXmlModal, setShowXmlModal] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    loadTransmissions();
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

  const loadTransmissions = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSIAETransmissions();
      setTransmissions(data);
    } catch (error) {
      console.error('Error loading SIAE transmissions:', error);
      setTransmissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransmissions();
    setRefreshing(false);
  };

  const handleRetry = async (transmission: SIAETransmission) => {
    try {
      setRetryingId(transmission.id);
      triggerHaptic('medium');
      await api.retrySIAETransmission(transmission.id);
      Alert.alert('Successo', 'Trasmissione reinviata con successo');
      await loadTransmissions();
    } catch (error) {
      Alert.alert('Errore', 'Impossibile reinviare la trasmissione');
    } finally {
      setRetryingId(null);
    }
  };

  const handleDownloadReceipt = async (transmission: SIAETransmission) => {
    try {
      triggerHaptic('light');
      await api.downloadSIAEReceipt(transmission.id);
      Alert.alert('Successo', 'Ricevuta scaricata');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile scaricare la ricevuta');
    }
  };

  const handleViewXml = (transmission: SIAETransmission) => {
    triggerHaptic('light');
    setSelectedTransmission(transmission);
    setShowXmlModal(true);
  };

  const getStatusBadge = (status: SIAETransmission['status']) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default">Inviato</Badge>;
      case 'pending':
        return <Badge variant="warning">In Attesa</Badge>;
      case 'error':
        return <Badge variant="destructive">Errore</Badge>;
      case 'confirmed':
        return <Badge variant="success">Confermato</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getReportTypeBadge = (type: SIAETransmission['reportType']) => {
    const colors: Record<string, 'golden' | 'teal' | 'outline'> = {
      RCA: 'golden',
      RMG: 'teal',
      RPM: 'outline',
    };
    return <Badge variant={colors[type] || 'outline'}>{type}</Badge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredTransmissions = transmissions.filter(
    (t) => activeFilter === 'all' || t.reportType === activeFilter
  );

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'RCA', label: 'RCA' },
    { id: 'RMG', label: 'RMG' },
    { id: 'RPM', label: 'RPM' },
  ];

  const renderTransmission = ({ item }: { item: SIAETransmission }) => (
    <Card style={styles.transmissionCard} testID={`transmission-${item.id}`}>
      <View style={styles.transmissionHeader}>
        <View style={styles.transmissionInfo}>
          <View style={styles.badgeRow}>
            {getReportTypeBadge(item.reportType)}
            {getStatusBadge(item.status)}
          </View>
          <Text style={styles.transmissionDate}>{formatDate(item.transmissionDate)}</Text>
          {item.eventName && (
            <Text style={styles.eventName} numberOfLines={1}>{item.eventName}</Text>
          )}
        </View>
      </View>

      {item.errorMessage && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={16} color={staticColors.destructive} />
          <Text style={styles.errorText} numberOfLines={2}>{item.errorMessage}</Text>
        </View>
      )}

      <View style={styles.actionRow}>
        <Pressable
          style={styles.actionButton}
          onPress={() => handleViewXml(item)}
          testID={`view-xml-${item.id}`}
        >
          <Ionicons name="code-outline" size={18} color={colors.primary} />
          <Text style={styles.actionText}>XML</Text>
        </Pressable>

        {item.status === 'confirmed' && (
          <Pressable
            style={styles.actionButton}
            onPress={() => handleDownloadReceipt(item)}
            testID={`download-receipt-${item.id}`}
          >
            <Ionicons name="download-outline" size={18} color={colors.primary} />
            <Text style={styles.actionText}>Scarica</Text>
          </Pressable>
        )}

        {item.status === 'error' && (
          <Pressable
            style={[styles.actionButton, styles.retryButton]}
            onPress={() => handleRetry(item)}
            disabled={retryingId === item.id}
            testID={`retry-${item.id}`}
          >
            {retryingId === item.id ? (
              <Loading size="small" />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                <Text style={styles.retryText}>Riprova</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </Card>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-siae-transmissions"
      />

      <View style={styles.titleContainer}>
        <Text style={styles.title}>Trasmissioni SIAE</Text>
        <Text style={styles.subtitle}>{filteredTransmissions.length} trasmissioni</Text>
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          {filters.map((filter) => (
            <Pressable
              key={filter.id}
              onPress={() => {
                triggerHaptic('selection');
                setActiveFilter(filter.id);
              }}
              style={[
                styles.filterChip,
                activeFilter === filter.id && styles.filterChipActive,
              ]}
              testID={`filter-${filter.id}`}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter.id && styles.filterTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {showLoader ? (
        <Loading text="Caricamento trasmissioni..." />
      ) : filteredTransmissions.length > 0 ? (
        <FlatList
          data={filteredTransmissions}
          renderItem={renderTransmission}
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
        <View style={styles.emptyState}>
          <Ionicons name="cloud-upload-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessuna trasmissione</Text>
          <Text style={styles.emptyText}>
            Non ci sono trasmissioni {activeFilter !== 'all' ? activeFilter : ''} disponibili
          </Text>
        </View>
      )}

      <Modal
        visible={showXmlModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowXmlModal(false)}
      >
        <SafeArea style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Contenuto XML</Text>
            <Pressable onPress={() => setShowXmlModal(false)} testID="close-xml-modal">
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>
          <ScrollView style={styles.xmlContainer} contentContainerStyle={styles.xmlContent}>
            <Text style={styles.xmlText}>{selectedTransmission?.xmlContent || 'Contenuto XML non disponibile'}</Text>
          </ScrollView>
        </SafeArea>
      </Modal>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  filtersContainer: {
    marginBottom: spacing.md,
  },
  filtersContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: staticColors.primary,
  },
  filterText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.mutedForeground,
  },
  filterTextActive: {
    color: staticColors.primaryForeground,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: 100,
  },
  transmissionCard: {
    padding: spacing.md,
  },
  transmissionHeader: {
    marginBottom: spacing.sm,
  },
  transmissionInfo: {
    gap: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  transmissionDate: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  eventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: `${staticColors.destructive}10`,
    borderRadius: borderRadius.md,
  },
  errorText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: staticColors.destructive,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  actionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primary,
  },
  retryButton: {
    backgroundColor: staticColors.primary,
    borderRadius: borderRadius.md,
  },
  retryText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: '#FFFFFF',
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
  modalContainer: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  xmlContainer: {
    flex: 1,
  },
  xmlContent: {
    padding: spacing.lg,
  },
  xmlText: {
    fontSize: typography.fontSize.xs,
    fontFamily: 'monospace',
    color: staticColors.foreground,
    lineHeight: 18,
  },
});

export default GestoreSIAETransmissionsScreen;
