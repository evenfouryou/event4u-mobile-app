import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';

interface AdminSIAECardsScreenProps {
  onBack: () => void;
}

interface SIAECard {
  id: string;
  serialNumber: string;
  gestoreName: string;
  companyName: string;
  status: 'active' | 'inactive' | 'expired' | 'revoked';
  activationDate: string;
  expirationDate: string;
  lastUsed: string | null;
  transactionCount: number;
}

type FilterType = 'all' | 'active' | 'inactive' | 'expired' | 'revoked';

export function AdminSIAECardsScreen({ onBack }: AdminSIAECardsScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [cards, setCards] = useState<SIAECard[]>([]);

  useEffect(() => {
    loadCards();
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

  const loadCards = async () => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setCards([
        { id: '1', serialNumber: 'SIAE-2024-001234', gestoreName: 'Marco Rossi', companyName: 'Event Club Milano', status: 'active', activationDate: '2024-01-15', expirationDate: '2025-01-15', lastUsed: '2024-01-27', transactionCount: 156 },
        { id: '2', serialNumber: 'SIAE-2024-001235', gestoreName: 'Giulia Bianchi', companyName: 'Party Roma SRL', status: 'active', activationDate: '2024-01-10', expirationDate: '2025-01-10', lastUsed: '2024-01-26', transactionCount: 89 },
        { id: '3', serialNumber: 'SIAE-2023-000890', gestoreName: 'Luca Verdi', companyName: 'Concerti Torino', status: 'expired', activationDate: '2023-01-05', expirationDate: '2024-01-05', lastUsed: '2024-01-04', transactionCount: 234 },
        { id: '4', serialNumber: 'SIAE-2024-001236', gestoreName: 'Anna Neri', companyName: 'Teatro Napoli', status: 'inactive', activationDate: '2024-01-20', expirationDate: '2025-01-20', lastUsed: null, transactionCount: 0 },
        { id: '5', serialNumber: 'SIAE-2023-000567', gestoreName: 'Paolo Gialli', companyName: 'Music Live Firenze', status: 'revoked', activationDate: '2023-06-01', expirationDate: '2024-06-01', lastUsed: '2023-11-15', transactionCount: 45 },
        { id: '6', serialNumber: 'SIAE-2024-001237', gestoreName: 'Sara Blu', companyName: 'Festival Bologna', status: 'active', activationDate: '2024-01-22', expirationDate: '2025-01-22', lastUsed: '2024-01-27', transactionCount: 12 },
      ]);
    } catch (error) {
      console.error('Error loading SIAE cards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCards();
    setRefreshing(false);
  };

  const getStatusBadge = (status: SIAECard['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Attiva</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inattiva</Badge>;
      case 'expired':
        return <Badge variant="warning">Scaduta</Badge>;
      case 'revoked':
        return <Badge variant="destructive">Revocata</Badge>;
    }
  };

  const filteredCards = cards.filter(card => {
    const matchesSearch = card.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.gestoreName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = activeFilter === 'all' || card.status === activeFilter;
    
    return matchesSearch && matchesFilter;
  });

  const handleActivateCard = (card: SIAECard) => {
    triggerHaptic('medium');
    Alert.alert(
      'Attiva Carta',
      `Vuoi attivare la carta ${card.serialNumber}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Attiva',
          onPress: () => {
            setCards(prev => prev.map(c =>
              c.id === card.id ? { ...c, status: 'active' as const } : c
            ));
          },
        },
      ]
    );
  };

  const handleRevokeCard = (card: SIAECard) => {
    triggerHaptic('medium');
    Alert.alert(
      'Revoca Carta',
      `Sei sicuro di voler revocare la carta ${card.serialNumber}? Questa azione non può essere annullata.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Revoca',
          style: 'destructive',
          onPress: () => {
            setCards(prev => prev.map(c =>
              c.id === card.id ? { ...c, status: 'revoked' as const } : c
            ));
          },
        },
      ]
    );
  };

  const handleRenewCard = (card: SIAECard) => {
    triggerHaptic('medium');
    Alert.alert(
      'Rinnova Carta',
      `Vuoi rinnovare la carta ${card.serialNumber} per un altro anno?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rinnova',
          onPress: () => {
            const newExpDate = new Date();
            newExpDate.setFullYear(newExpDate.getFullYear() + 1);
            setCards(prev => prev.map(c =>
              c.id === card.id ? { ...c, status: 'active' as const, expirationDate: newExpDate.toISOString().split('T')[0] } : c
            ));
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Tutte' },
    { id: 'active', label: 'Attive' },
    { id: 'inactive', label: 'Inattive' },
    { id: 'expired', label: 'Scadute' },
    { id: 'revoked', label: 'Revocate' },
  ];

  const renderCard = ({ item }: { item: SIAECard }) => (
    <Card style={styles.cardItem} testID={`card-${item.id}`}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Ionicons name="card" size={24} color={staticColors.primary} />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.serialNumber}>{item.serialNumber}</Text>
            {getStatusBadge(item.status)}
          </View>
          <Text style={styles.gestoreName}>{item.gestoreName}</Text>
          <Text style={styles.companyName}>{item.companyName}</Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Attivazione</Text>
            <Text style={styles.detailValue}>{formatDate(item.activationDate)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Scadenza</Text>
            <Text style={styles.detailValue}>{formatDate(item.expirationDate)}</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Ultimo Utilizzo</Text>
            <Text style={styles.detailValue}>{item.lastUsed ? formatDate(item.lastUsed) : 'Mai'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Transazioni</Text>
            <Text style={styles.detailValue}>{item.transactionCount}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardActions}>
        {item.status === 'inactive' && (
          <Button
            variant="default"
            size="sm"
            onPress={() => handleActivateCard(item)}
            testID={`button-activate-${item.id}`}
          >
            <Ionicons name="checkmark-circle" size={16} color={staticColors.primaryForeground} />
            <Text style={[styles.actionButtonText, { color: staticColors.primaryForeground }]}>Attiva</Text>
          </Button>
        )}
        {item.status === 'expired' && (
          <Button
            variant="default"
            size="sm"
            onPress={() => handleRenewCard(item)}
            testID={`button-renew-${item.id}`}
          >
            <Ionicons name="refresh" size={16} color={staticColors.primaryForeground} />
            <Text style={[styles.actionButtonText, { color: staticColors.primaryForeground }]}>Rinnova</Text>
          </Button>
        )}
        {(item.status === 'active' || item.status === 'inactive') && (
          <Button
            variant="destructive"
            size="sm"
            onPress={() => handleRevokeCard(item)}
            testID={`button-revoke-${item.id}`}
          >
            <Ionicons name="ban" size={16} color={staticColors.destructiveForeground} />
            <Text style={[styles.actionButtonText, { color: staticColors.destructiveForeground }]}>Revoca</Text>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onPress={() => {
            triggerHaptic('light');
            Alert.alert('Dettagli', `Dettagli carta ${item.serialNumber} - funzionalità in sviluppo`);
          }}
          testID={`button-details-${item.id}`}
        >
          <Ionicons name="eye-outline" size={16} color={staticColors.foreground} />
          <Text style={styles.actionButtonText}>Dettagli</Text>
        </Button>
      </View>
    </Card>
  );

  if (showLoader) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header showLogo showBack onBack={onBack} testID="header-siae-cards" />
        <Loading text="Caricamento carte SIAE..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header showLogo showBack onBack={onBack} testID="header-siae-cards" />

      <View style={styles.statsSection}>
        <Text style={styles.title}>Carte Attivazione SIAE</Text>
        <View style={styles.statsGrid}>
          <GlassCard style={styles.statCard} testID="stat-total">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
              <Ionicons name="card" size={20} color={staticColors.primary} />
            </View>
            <Text style={styles.statValue}>{cards.length}</Text>
            <Text style={styles.statLabel}>Totali</Text>
          </GlassCard>

          <GlassCard style={styles.statCard} testID="stat-active">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
              <Ionicons name="checkmark-circle" size={20} color={staticColors.success} />
            </View>
            <Text style={styles.statValue}>{cards.filter(c => c.status === 'active').length}</Text>
            <Text style={styles.statLabel}>Attive</Text>
          </GlassCard>

          <GlassCard style={styles.statCard} testID="stat-expired">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.warning}20` }]}>
              <Ionicons name="time" size={20} color={staticColors.warning} />
            </View>
            <Text style={styles.statValue}>{cards.filter(c => c.status === 'expired').length}</Text>
            <Text style={styles.statLabel}>Scadute</Text>
          </GlassCard>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca carta, gestore, azienda..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                triggerHaptic('selection');
                setActiveFilter(item.id);
              }}
              style={[
                styles.filterChip,
                activeFilter === item.id && styles.filterChipActive,
              ]}
              testID={`filter-${item.id}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === item.id && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {filteredCards.length > 0 ? (
        <FlatList
          data={filteredCards}
          renderItem={renderCard}
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
          <Ionicons name="card-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessuna carta trovata</Text>
          <Text style={styles.emptyText}>
            Prova a modificare i filtri o la ricerca
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  statsSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: staticColors.border,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  filtersContainer: {
    marginTop: spacing.md,
  },
  filtersList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.card,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  filterChipActive: {
    backgroundColor: staticColors.primary,
    borderColor: staticColors.primary,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  filterChipTextActive: {
    color: staticColors.primaryForeground,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  cardItem: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: `${staticColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  serialNumber: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primary,
  },
  gestoreName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  companyName: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  cardDetails: {
    backgroundColor: staticColors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
    marginLeft: spacing.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
