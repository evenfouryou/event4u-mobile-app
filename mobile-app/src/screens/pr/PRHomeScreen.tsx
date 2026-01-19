import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header, Button } from '../../components';

interface StatCardProps {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  trend?: string;
  trendUp?: boolean;
  color?: string;
  testID?: string;
}

function StatCard({ title, value, icon, trend, trendUp, color = colors.purple, testID }: StatCardProps) {
  return (
    <Card style={styles.statCard} testID={testID}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {trend && (
        <View style={styles.trendContainer}>
          <Ionicons 
            name={trendUp ? 'trending-up' : 'trending-down'} 
            size={14} 
            color={trendUp ? colors.success : colors.destructive} 
          />
          <Text style={[styles.trendText, { color: trendUp ? colors.success : colors.destructive }]}>
            {trend}
          </Text>
        </View>
      )}
    </Card>
  );
}

interface EventItemProps {
  id: number;
  name: string;
  date: string;
  venue: string;
  guestCount: number;
  onPress: () => void;
}

function EventItem({ id, name, date, venue, guestCount, onPress }: EventItemProps) {
  return (
    <TouchableOpacity 
      style={styles.eventItem} 
      onPress={onPress} 
      activeOpacity={0.7}
      testID={`button-event-${id}`}
    >
      <View style={styles.eventImagePlaceholder}>
        <Ionicons name="calendar" size={28} color={colors.purple} />
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventName} numberOfLines={1}>{name}</Text>
        <Text style={styles.eventDetails}>{date}</Text>
        <Text style={styles.eventVenue} numberOfLines={1}>{venue}</Text>
      </View>
      <View style={styles.eventStats}>
        <View style={styles.guestBadge}>
          <Ionicons name="people" size={14} color={colors.purple} />
          <Text style={styles.guestCount}>{guestCount}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

export function PRHomeScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const mockEvents = [
    { id: 1, name: 'Notte Italiana', date: 'Sab 18 Gen, 23:00', venue: 'Club Paradiso', guestCount: 24 },
    { id: 2, name: 'Friday Vibes', date: 'Ven 17 Gen, 22:30', venue: 'Discoteca Luna', guestCount: 18 },
    { id: 3, name: 'Electronic Sunday', date: 'Dom 19 Gen, 21:00', venue: 'Space Club', guestCount: 12 },
  ];

  const numColumns = isTablet || isLandscape ? 2 : 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header 
        title="Dashboard PR" 
        rightAction={
          <TouchableOpacity 
            onPress={() => navigation.navigate('PRWallet')}
            testID="button-wallet"
          >
            <Ionicons name="wallet-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.purple}
          />
        }
        testID="scroll-pr-home"
      >
        <View style={[styles.statsGrid, isTablet && styles.statsGridTablet]}>
          <StatCard 
            title="Commissioni Totali"
            value="€1,250.00"
            icon="cash-outline"
            trend="+12%"
            trendUp
            color={colors.success}
            testID="card-total-commissions"
          />
          <StatCard 
            title="Questo Mese"
            value="€320.00"
            icon="calendar-outline"
            trend="+8%"
            trendUp
            color={colors.purple}
            testID="card-monthly-earnings"
          />
          <StatCard 
            title="Ospiti Totali"
            value="156"
            icon="people-outline"
            color={colors.purpleLight}
            testID="card-total-guests"
          />
          <StatCard 
            title="Tavoli Prenotati"
            value="23"
            icon="grid-outline"
            color={colors.warning}
            testID="card-booked-tables"
          />
        </View>

        <Card style={styles.balanceCard} testID="card-balance">
          <View style={styles.balanceHeader}>
            <View>
              <Text style={styles.balanceLabel}>Saldo Disponibile</Text>
              <Text style={styles.balanceAmount}>€ 485.00</Text>
            </View>
            <Button 
              title="Richiedi Pagamento"
              variant="primary"
              size="sm"
              onPress={() => navigation.navigate('PRWallet')}
              testID="button-request-payment"
            />
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceFooter}>
            <View style={styles.balanceFooterItem}>
              <Text style={styles.balanceFooterLabel}>In Attesa</Text>
              <Text style={styles.balanceFooterValue}>€ 120.00</Text>
            </View>
            <View style={styles.balanceFooterItem}>
              <Text style={styles.balanceFooterLabel}>Ultimo Pagamento</Text>
              <Text style={styles.balanceFooterValue}>€ 250.00</Text>
            </View>
          </View>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Eventi Assegnati</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('PREvents')}
            testID="button-see-all-events"
          >
            <Text style={styles.seeAllText}>Vedi tutti</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.eventsCard} testID="card-events">
          {numColumns === 2 ? (
            <View style={styles.eventsGrid}>
              {mockEvents.map((event) => (
                <View key={event.id} style={styles.eventGridItem}>
                  <EventItem
                    id={event.id}
                    name={event.name}
                    date={event.date}
                    venue={event.venue}
                    guestCount={event.guestCount}
                    onPress={() => navigation.navigate('PRGuestLists', { eventId: event.id })}
                  />
                </View>
              ))}
            </View>
          ) : (
            mockEvents.map((event, index) => (
              <React.Fragment key={event.id}>
                <EventItem
                  id={event.id}
                  name={event.name}
                  date={event.date}
                  venue={event.venue}
                  guestCount={event.guestCount}
                  onPress={() => navigation.navigate('PRGuestLists', { eventId: event.id })}
                />
                {index < mockEvents.length - 1 && <View style={styles.eventDivider} />}
              </React.Fragment>
            ))
          )}
        </Card>

        <View style={[styles.quickActions, isLandscape && styles.quickActionsLandscape]}>
          <Button 
            title="Aggiungi Ospite"
            variant="primary"
            icon={<Ionicons name="person-add" size={18} color={colors.primaryForeground} />}
            onPress={() => navigation.navigate('PREvents')}
            testID="button-add-guest"
          />
          <Button 
            title="Prenota Tavolo"
            variant="outline"
            icon={<Ionicons name="grid-outline" size={18} color={colors.foreground} />}
            onPress={() => navigation.navigate('PREvents')}
            testID="button-book-table"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statsGridTablet: {
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  statTitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  trendText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  balanceCard: {
    padding: spacing.lg,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    color: colors.success,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  balanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceFooterItem: {},
  balanceFooterLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: 2,
  },
  balanceFooterValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  seeAllText: {
    color: colors.purple,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  eventsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  eventGridItem: {
    width: '50%',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  eventImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.purple + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  eventDetails: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  eventVenue: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  eventStats: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  guestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.purple + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  guestCount: {
    color: colors.purple,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  eventDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 56 + spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickActionsLandscape: {
    justifyContent: 'center',
  },
});
