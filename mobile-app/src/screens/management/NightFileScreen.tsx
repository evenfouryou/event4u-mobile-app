import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize } from '../../theme';
import { Card, Button, Header } from '../../components';
import { api } from '../../lib/api';

interface NightFileSummary {
  eventId: string;
  eventName: string;
  eventDate: string;
  locationName: string;
  startTime: string;
  endTime: string;
  totalAttendees: number;
  ticketsSold: number;
  ticketsScanned: number;
  totalRevenue: number;
  barRevenue: number;
  ticketRevenue: number;
  staffCount: number;
  topProducts: ProductSale[];
  salesByHour: HourlySale[];
  stations: StationSummary[];
}

interface ProductSale {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface HourlySale {
  hour: string;
  sales: number;
  revenue: number;
}

interface StationSummary {
  id: string;
  name: string;
  totalSales: number;
  revenue: number;
}

export function NightFileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const eventId = route.params?.eventId;

  const [summary, setSummary] = useState<NightFileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNightFile();
  }, [eventId]);

  const loadNightFile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<any>(`/api/night-files/event/${eventId}`);
      setSummary({
        eventId: data.eventId?.toString() || eventId,
        eventName: data.eventName || data.name || '',
        eventDate: data.eventDate ? new Date(data.eventDate).toLocaleDateString('it-IT') : '',
        locationName: data.locationName || '',
        startTime: data.startTime || '',
        endTime: data.endTime || '',
        totalAttendees: data.totalAttendees || 0,
        ticketsSold: data.ticketsSold || 0,
        ticketsScanned: data.ticketsScanned || 0,
        totalRevenue: data.totalRevenue || 0,
        barRevenue: data.barRevenue || 0,
        ticketRevenue: data.ticketRevenue || 0,
        staffCount: data.staffCount || 0,
        topProducts: (data.topProducts || []).slice(0, 5).map((p: any) => ({
          id: p.id?.toString() || '',
          name: p.name || '',
          quantity: p.quantity || 0,
          revenue: p.revenue || 0,
        })),
        salesByHour: (data.salesByHour || []).map((h: any) => ({
          hour: h.hour || '',
          sales: h.sales || 0,
          revenue: h.revenue || 0,
        })),
        stations: (data.stations || []).map((s: any) => ({
          id: s.id?.toString() || '',
          name: s.name || '',
          totalSales: s.totalSales || 0,
          revenue: s.revenue || 0,
        })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!summary) return;
    try {
      const text = `
Night File - ${summary.eventName}
Data: ${summary.eventDate}
Location: ${summary.locationName}

Presenze: ${summary.totalAttendees}
Biglietti venduti: ${summary.ticketsSold}
Biglietti scansionati: ${summary.ticketsScanned}

Incasso Totale: € ${summary.totalRevenue.toFixed(2)}
- Biglietti: € ${summary.ticketRevenue.toFixed(2)}
- Bar: € ${summary.barRevenue.toFixed(2)}

Staff: ${summary.staffCount} persone
      `.trim();

      await Share.share({ message: text, title: `Night File - ${summary.eventName}` });
    } catch (e) {
      console.error('Share error:', e);
    }
  };

  const formatCurrency = (value: number) => `€ ${value.toFixed(2)}`;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Night File" showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  if (error || !summary) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Night File" showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{error || 'Dati non disponibili'}</Text>
          <Button title="Riprova" onPress={loadNightFile} style={styles.retryButton} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Night File"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity style={styles.shareButton} onPress={handleShare} data-testid="button-share">
            <Ionicons name="share-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.heroCard} variant="elevated">
          <Text style={styles.eventName}>{summary.eventName}</Text>
          <View style={styles.eventMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
              <Text style={styles.metaText}>{summary.eventDate}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
              <Text style={styles.metaText}>{summary.locationName}</Text>
            </View>
            {summary.startTime && summary.endTime && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
                <Text style={styles.metaText}>{summary.startTime} - {summary.endTime}</Text>
              </View>
            )}
          </View>
        </Card>

        <View style={styles.statsGrid}>
          <Card style={styles.statCard} variant="elevated">
            <Ionicons name="people" size={24} color={colors.teal} />
            <Text style={styles.statValue}>{summary.totalAttendees}</Text>
            <Text style={styles.statLabel}>Presenze</Text>
          </Card>
          <Card style={styles.statCard} variant="elevated">
            <Ionicons name="ticket" size={24} color={colors.primary} />
            <Text style={styles.statValue}>{summary.ticketsScanned}/{summary.ticketsSold}</Text>
            <Text style={styles.statLabel}>Scansionati</Text>
          </Card>
        </View>

        <Card style={styles.revenueCard} variant="elevated">
          <View style={styles.revenueHeader}>
            <Text style={styles.sectionTitle}>Incasso Totale</Text>
            <Text style={styles.totalRevenue}>{formatCurrency(summary.totalRevenue)}</Text>
          </View>
          <View style={styles.revenueBreakdown}>
            <View style={styles.revenueItem}>
              <View style={[styles.revenueIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="ticket-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.revenueInfo}>
                <Text style={styles.revenueLabel}>Biglietti</Text>
                <Text style={styles.revenueValue}>{formatCurrency(summary.ticketRevenue)}</Text>
              </View>
              <Text style={styles.revenuePercent}>
                {summary.totalRevenue > 0 
                  ? `${((summary.ticketRevenue / summary.totalRevenue) * 100).toFixed(0)}%` 
                  : '0%'}
              </Text>
            </View>
            <View style={styles.revenueItem}>
              <View style={[styles.revenueIcon, { backgroundColor: `${colors.teal}20` }]}>
                <Ionicons name="beer-outline" size={18} color={colors.teal} />
              </View>
              <View style={styles.revenueInfo}>
                <Text style={styles.revenueLabel}>Bar</Text>
                <Text style={styles.revenueValue}>{formatCurrency(summary.barRevenue)}</Text>
              </View>
              <Text style={styles.revenuePercent}>
                {summary.totalRevenue > 0 
                  ? `${((summary.barRevenue / summary.totalRevenue) * 100).toFixed(0)}%` 
                  : '0%'}
              </Text>
            </View>
          </View>
        </Card>

        {summary.topProducts.length > 0 && (
          <Card style={styles.section} variant="elevated">
            <Text style={styles.sectionTitle}>Top Prodotti</Text>
            {summary.topProducts.map((product, index) => (
              <View key={product.id} style={styles.productRow}>
                <View style={styles.productRank}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productQty}>{product.quantity} venduti</Text>
                </View>
                <Text style={styles.productRevenue}>{formatCurrency(product.revenue)}</Text>
              </View>
            ))}
          </Card>
        )}

        {summary.stations.length > 0 && (
          <Card style={styles.section} variant="elevated">
            <Text style={styles.sectionTitle}>Stazioni</Text>
            {summary.stations.map((station) => (
              <View key={station.id} style={styles.stationRow}>
                <View style={styles.stationIcon}>
                  <Ionicons name="beer" size={18} color={colors.primary} />
                </View>
                <View style={styles.stationInfo}>
                  <Text style={styles.stationName}>{station.name}</Text>
                  <Text style={styles.stationSales}>{station.totalSales} vendite</Text>
                </View>
                <Text style={styles.stationRevenue}>{formatCurrency(station.revenue)}</Text>
              </View>
            ))}
          </Card>
        )}

        <Card style={styles.section} variant="elevated">
          <View style={styles.staffHeader}>
            <Text style={styles.sectionTitle}>Staff</Text>
            <View style={styles.staffBadge}>
              <Text style={styles.staffCount}>{summary.staffCount}</Text>
            </View>
          </View>
          <Text style={styles.staffText}>
            {summary.staffCount} persone hanno lavorato a questo evento
          </Text>
        </Card>

        <View style={styles.bottomPadding} />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.destructive,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  heroCard: {
    marginTop: spacing.md,
  },
  eventName: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.foreground,
  },
  eventMeta: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statValue: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing.xxs,
  },
  revenueCard: {
    marginTop: spacing.md,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  totalRevenue: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.primary,
  },
  revenueBreakdown: {
    gap: spacing.md,
  },
  revenueItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  revenueIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  revenueInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  revenueLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  revenueValue: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  revenuePercent: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  section: {
    marginTop: spacing.md,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  productName: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.foreground,
  },
  productQty: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  productRevenue: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stationIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  stationName: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.foreground,
  },
  stationSales: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  stationRevenue: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.teal,
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  staffBadge: {
    marginLeft: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 10,
  },
  staffCount: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  staffText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  bottomPadding: {
    height: spacing['3xl'],
  },
});
