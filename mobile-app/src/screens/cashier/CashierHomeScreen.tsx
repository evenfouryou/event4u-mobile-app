import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Button, Header } from '../../components';

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  action: () => void;
}

interface StatCard {
  id: string;
  label: string;
  value: string;
  unit?: string;
  icon: string;
  trend?: number;
}

const { width } = Dimensions.get('window');

export function CashierHomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const stats: StatCard[] = [
    {
      id: '1',
      label: 'Incassi Oggi',
      value: '€ 2.450',
      unit: 'EUR',
      icon: 'cash',
      trend: 15,
    },
    {
      id: '2',
      label: 'Biglietti Venduti',
      value: '87',
      icon: 'ticket',
      trend: 8,
    },
    {
      id: '3',
      label: 'Transazioni',
      value: '43',
      icon: 'swap-horizontal',
      trend: 5,
    },
    {
      id: '4',
      label: 'Incassi Contanti',
      value: '€ 1.200',
      unit: 'EUR',
      icon: 'wallet',
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: '1',
      title: 'Vendi Biglietto',
      icon: 'ticket',
      color: colors.primary,
      action: () => navigation.navigate('CashierTicket'),
    },
    {
      id: '2',
      title: 'Riepilogo Bevande',
      icon: 'wine',
      color: colors.accent,
      action: () => {
        // Navigate to beverage summary
      },
    },
    {
      id: '3',
      title: 'Riepilogo Incassi',
      icon: 'pie-chart',
      color: colors.success,
      action: () => {
        // Navigate to revenue summary
      },
    },
    {
      id: '4',
      title: 'Chiusura Cassa',
      icon: 'lock-closed',
      color: colors.destructive,
      action: () => {
        // Navigate to closing
      },
    },
  ];

  const renderStatCard = ({ item }: { item: StatCard }) => (
    <Card style={[styles.statCard, { width: (width - spacing.lg * 2 - spacing.md) / 2 }]}>
      <View style={styles.statHeader}>
        <Ionicons name={item.icon as any} size={24} color={colors.primary} />
        {item.trend && (
          <View style={styles.trendBadge}>
            <Ionicons name="arrow-up" size={12} color={colors.success} />
            <Text style={styles.trendText}>{item.trend}%</Text>
          </View>
        )}
      </View>
      <Text style={styles.statLabel}>{item.label}</Text>
      <Text style={styles.statValue}>{item.value}</Text>
      {item.unit && <Text style={styles.statUnit}>{item.unit}</Text>}
    </Card>
  );

  const renderQuickAction = ({ item }: { item: QuickAction }) => (
    <TouchableOpacity
      style={styles.quickActionButton}
      onPress={item.action}
      activeOpacity={0.8}
      data-testid={`button-quick-action-${item.id}`}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon as any} size={32} color={colors.primaryForeground} />
      </View>
      <Text style={styles.quickActionLabel}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header title="Cassa" />
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Event Section */}
        <Card style={styles.eventCard} variant="elevated">
          <View style={styles.eventHeader}>
            <View>
              <Text style={styles.eventLabel}>Evento Attuale</Text>
              <Text style={styles.eventName}>Festival Notte d'Estate</Text>
              <Text style={styles.eventTime}>Oggi • 20:00 - 04:00</Text>
            </View>
            <View style={styles.eventStatus}>
              <View style={styles.statusIndicator} />
              <Text style={styles.statusText}>In corso</Text>
            </View>
          </View>
        </Card>

        {/* Statistics Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistiche Oggi</Text>
          <FlatList
            data={stats}
            renderItem={renderStatCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.statsGrid}
            scrollEnabled={false}
          />
        </View>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Azioni Rapide</Text>
          <FlatList
            data={quickActions}
            renderItem={renderQuickAction}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.actionsGrid}
            scrollEnabled={false}
          />
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transazioni Recenti</Text>
            <TouchableOpacity data-testid="button-view-all">
              <Text style={styles.viewAllText}>Vedi tutto</Text>
            </TouchableOpacity>
          </View>

          <Card style={styles.transactionCard}>
            <View style={styles.transactionItem}>
              <View style={styles.transactionIcon}>
                <Ionicons name="ticket" size={20} color={colors.primary} />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionTitle}>Biglietto VIP</Text>
                <Text style={styles.transactionTime}>14:35</Text>
              </View>
              <Text style={styles.transactionAmount}>€ 50,00</Text>
            </View>
          </Card>

          <Card style={styles.transactionCard}>
            <View style={styles.transactionItem}>
              <View style={styles.transactionIcon}>
                <Ionicons name="wine" size={20} color={colors.accent} />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionTitle}>Bevande</Text>
                <Text style={styles.transactionTime}>14:20</Text>
              </View>
              <Text style={styles.transactionAmount}>€ 25,50</Text>
            </View>
          </Card>

          <Card style={styles.transactionCard}>
            <View style={styles.transactionItem}>
              <View style={styles.transactionIcon}>
                <Ionicons name="ticket" size={20} color={colors.success} />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionTitle}>Biglietto Standard</Text>
                <Text style={styles.transactionTime}>14:10</Text>
              </View>
              <Text style={styles.transactionAmount}>€ 30,00</Text>
            </View>
          </Card>
        </View>

        {/* Daily Summary */}
        <View style={styles.section}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Contanti</Text>
              <Text style={styles.summaryValue}>€ 1.200,00</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Carte</Text>
              <Text style={styles.summaryValue}>€ 1.250,00</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Totale</Text>
              <Text style={styles.summaryTotal}>€ 2.450,00</Text>
            </View>
          </Card>
        </View>
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
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  viewAllText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  eventCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  eventTime: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  eventStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success,
  },
  statusText: {
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  statsGrid: {
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  trendText: {
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statUnit: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  actionsGrid: {
    gap: spacing.md,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  quickActionLabel: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  transactionCard: {
    marginBottom: spacing.md,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  transactionTime: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  transactionAmount: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  summaryCard: {
    paddingVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  summaryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  summaryValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  summaryTotal: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
