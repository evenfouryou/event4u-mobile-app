import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { SkeletonList } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api from '@/lib/api';

interface AdminSIAECardsScreenProps {
  onBack: () => void;
}

interface SiaeActivationCard {
  id: string;
  companyId: string;
  cardNumber: string;
  fiscalCode: string;
  activationDate?: string;
  expirationDate?: string;
  status: string;
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
}

export function AdminSIAECardsScreen({ onBack }: AdminSIAECardsScreenProps) {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cards, setCards] = useState<SiaeActivationCard[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [cardsData, companiesData] = await Promise.all([
        api.get<SiaeActivationCard[]>('/api/siae/activation-cards'),
        api.get<Company[]>('/api/companies'),
      ]);
      setCards(cardsData);
      setCompanies(companiesData);
    } catch (error) {
      console.error('Error loading SIAE cards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company?.name || 'N/A';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Attiva</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inattiva</Badge>;
      case 'expired':
        return <Badge variant="warning">Scaduta</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const activeCards = cards.filter(c => c.status === 'active').length;
  const uniqueCompanies = new Set(cards.map(c => c.companyId)).size;

  const handleCardDetails = (card: SiaeActivationCard) => {
    triggerHaptic('light');
    Alert.alert(
      'Dettagli Carta',
      `Numero: ${card.cardNumber}\nCodice Fiscale: ${card.fiscalCode}\nAzienda: ${getCompanyName(card.companyId)}\nStato: ${card.status}\nAttivazione: ${formatDate(card.activationDate)}\nScadenza: ${formatDate(card.expirationDate)}`,
      [{ text: 'Chiudi' }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Carte Attivazione SIAE"
        showBack
        onBack={onBack}
        testID="header-siae-cards"
      />

      {showLoader ? (
        <View style={styles.loaderContainer}>
          <SkeletonList count={4} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: spacing.md }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.statsRow}>
            <GlassCard style={styles.statCard} testID="stat-total">
              <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                <Ionicons name="card" size={20} color={staticColors.primary} />
              </View>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{cards.length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Carte Totali</Text>
            </GlassCard>

            <GlassCard style={styles.statCard} testID="stat-active">
              <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
                <Ionicons name="shield-checkmark" size={20} color={staticColors.success} />
              </View>
              <Text style={[styles.statValue, { color: staticColors.success }]}>{activeCards}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Carte Attive</Text>
            </GlassCard>

            <GlassCard style={styles.statCard} testID="stat-companies">
              <View style={[styles.statIcon, { backgroundColor: `${staticColors.info}20` }]}>
                <Ionicons name="business" size={20} color={staticColors.info} />
              </View>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{uniqueCompanies}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Aziende</Text>
            </GlassCard>
          </View>

          <Card style={styles.infoCard} testID="card-desktop-info">
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color={staticColors.info} />
              <Text style={[styles.infoTitle, { color: colors.foreground }]}>Lettore Smart Card</Text>
            </View>
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              La lettura delle smart card SIAE richiede l'applicazione desktop Event4U con il lettore MiniLector EVO collegato.
            </Text>
            <View style={[styles.infoNote, { backgroundColor: `${staticColors.info}15` }]}>
              <Ionicons name="desktop-outline" size={16} color={staticColors.info} />
              <Text style={[styles.infoNoteText, { color: staticColors.info }]}>
                Usa la versione web su desktop per accedere alle funzionalita del lettore
              </Text>
            </View>
          </Card>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Carte Registrate</Text>
            <Badge variant="outline">{cards.length}</Badge>
          </View>

          {cards.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="card-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Nessuna carta registrata
              </Text>
            </Card>
          ) : (
            cards.map((card) => (
              <Card key={card.id} style={styles.cardItem} testID={`card-${card.id}`}>
                <Pressable onPress={() => handleCardDetails(card)}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIconContainer}>
                      <Ionicons name="card" size={24} color={staticColors.primary} />
                    </View>
                    <View style={styles.cardInfo}>
                      <View style={styles.cardTitleRow}>
                        <Text style={[styles.cardNumber, { color: colors.foreground }]}>{card.cardNumber}</Text>
                        {getStatusBadge(card.status)}
                      </View>
                      <Text style={[styles.companyName, { color: colors.mutedForeground }]}>
                        {getCompanyName(card.companyId)}
                      </Text>
                      <Text style={[styles.fiscalCode, { color: colors.mutedForeground }]}>
                        CF: {card.fiscalCode}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                  </View>

                  <View style={[styles.cardDetails, { borderTopColor: colors.border }]}>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Attivazione</Text>
                      <Text style={[styles.detailValue, { color: colors.foreground }]}>
                        {formatDate(card.activationDate)}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Scadenza</Text>
                      <Text style={[styles.detailValue, { color: colors.foreground }]}>
                        {formatDate(card.expirationDate)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </Card>
            ))
          )}

          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  infoCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  infoNoteText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
  },
  cardItem: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  cardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: `${staticColors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardNumber: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  companyName: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.xs,
  },
  fiscalCode: {
    fontSize: typography.fontSize.xs,
    fontFamily: 'monospace',
  },
  cardDetails: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: spacing.xl,
  },
});

export default AdminSIAECardsScreen;
