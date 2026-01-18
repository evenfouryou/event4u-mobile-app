import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';

type RouteParams = {
  AccountResaleSuccess: {
    ticketId?: number;
    eventName?: string;
    ticketType?: string;
    price?: number;
  };
};

export function AccountResaleSuccessScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'AccountResaleSuccess'>>();
  const insets = useSafeAreaInsets();

  const { eventName, ticketType, price } = route.params || {};

  const handleGoToResales = () => {
    navigation.navigate('MyResales');
  };

  const handleGoHome = () => {
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing['3xl'], paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successContainer}>
          <LinearGradient
            colors={['rgba(0, 206, 209, 0.2)', 'transparent']}
            style={styles.gradient}
          />
          
          <View style={styles.iconContainer}>
            <View style={styles.iconOuter}>
              <View style={styles.iconInner}>
                <Ionicons name="checkmark" size={48} color={colors.success} />
              </View>
            </View>
          </View>

          <Text style={styles.title}>Biglietto messo in vendita!</Text>
          <Text style={styles.subtitle}>
            Il tuo biglietto è ora visibile agli altri utenti
          </Text>
        </View>

        <Card variant="glass" style={styles.detailsCard}>
          <View style={styles.detailsHeader}>
            <Ionicons name="ticket-outline" size={24} color={colors.primary} />
            <Text style={styles.detailsTitle}>Dettagli rivendita</Text>
          </View>

          <View style={styles.detailsList}>
            {eventName && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Evento</Text>
                <Text style={styles.detailValue}>{eventName}</Text>
              </View>
            )}
            {ticketType && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tipo biglietto</Text>
                <Text style={styles.detailValue}>{ticketType}</Text>
              </View>
            )}
            {price !== undefined && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Prezzo di vendita</Text>
                <Text style={styles.priceValue}>€{price.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Stato</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>In vendita</Text>
              </View>
            </View>
          </View>
        </Card>

        <Card variant="default" style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={20} color={colors.teal} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Cosa succede ora?</Text>
              <Text style={styles.infoText}>
                Quando qualcuno acquisterà il tuo biglietto, riceverai una notifica e il pagamento
                verrà accreditato sul tuo wallet.
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.actionsContainer}>
          <Button
            title="Vai alle mie rivendite"
            variant="primary"
            onPress={handleGoToResales}
            style={styles.primaryButton}
            icon={<Ionicons name="pricetag-outline" size={20} color={colors.primaryForeground} />}
          />
          <Button
            title="Torna alla Home"
            variant="outline"
            onPress={handleGoHome}
            style={styles.secondaryButton}
          />
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
    padding: spacing.xl,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
    position: 'relative',
  },
  gradient: {
    position: 'absolute',
    top: -spacing['4xl'],
    left: -spacing['4xl'],
    right: -spacing['4xl'],
    height: 250,
    borderRadius: 125,
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  iconOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.success + '25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  detailsCard: {
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  detailsTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  detailsList: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.foreground,
    fontWeight: fontWeight.medium,
    maxWidth: '60%',
    textAlign: 'right',
  },
  priceValue: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  statusText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  infoCard: {
    padding: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actionsContainer: {
    gap: spacing.md,
  },
  primaryButton: {
    width: '100%',
  },
  secondaryButton: {
    width: '100%',
  },
});
