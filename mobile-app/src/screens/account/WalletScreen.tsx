import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { triggerHaptic } from '@/lib/haptics';

interface Transaction {
  id: string;
  type: 'topup' | 'purchase' | 'refund';
  description: string;
  amount: number;
  date: Date;
}

interface WalletScreenProps {
  onBack: () => void;
  onTopUp: () => void;
}

export function WalletScreen({ onBack, onTopUp }: WalletScreenProps) {
  const [activeTab, setActiveTab] = useState<'transactions' | 'topup'>('transactions');

  const balance = 125.0;
  const transactions: Transaction[] = [
    {
      id: '1',
      type: 'topup',
      description: 'Ricarica Wallet',
      amount: 50,
      date: new Date('2026-01-20T14:30:00'),
    },
    {
      id: '2',
      type: 'purchase',
      description: 'Saturday Night Fever - 2x VIP',
      amount: -100,
      date: new Date('2026-01-18T22:15:00'),
    },
    {
      id: '3',
      type: 'refund',
      description: 'Rimborso evento annullato',
      amount: 75,
      date: new Date('2026-01-15T10:00:00'),
    },
    {
      id: '4',
      type: 'topup',
      description: 'Ricarica Wallet',
      amount: 100,
      date: new Date('2026-01-10T09:00:00'),
    },
  ];

  const topUpOptions = [10, 25, 50, 100, 200];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'topup':
        return 'arrow-down-circle';
      case 'purchase':
        return 'cart';
      case 'refund':
        return 'return-up-back';
    }
  };

  const getTransactionColor = (type: Transaction['type']) => {
    switch (type) {
      case 'topup':
        return colors.success;
      case 'purchase':
        return colors.foreground;
      case 'refund':
        return colors.teal;
    }
  };

  const renderTransaction = ({ item, index }: { item: Transaction; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <View style={styles.transactionItem}>
        <View style={[styles.transactionIcon, { backgroundColor: `${getTransactionColor(item.type)}15` }]}>
          <Ionicons
            name={getTransactionIcon(item.type) as any}
            size={20}
            color={getTransactionColor(item.type)}
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription} numberOfLines={1}>
            {item.description}
          </Text>
          <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            { color: item.amount >= 0 ? colors.success : colors.foreground },
          ]}
        >
          {item.amount >= 0 ? '+' : ''}€{Math.abs(item.amount).toFixed(2)}
        </Text>
      </View>
    </Animated.View>
  );

  return (
    <SafeArea style={styles.container}>
      <Header title="Wallet" showBack onBack={onBack} testID="header-wallet" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.delay(100)}>
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <View style={styles.balanceHeader}>
              <View style={styles.walletIcon}>
                <Ionicons name="wallet" size={28} color={colors.primaryForeground} />
              </View>
              <Text style={styles.balanceLabel}>Saldo Disponibile</Text>
            </View>
            <Text style={styles.balanceValue}>€ {balance.toFixed(2)}</Text>
            <Button
              variant="secondary"
              size="lg"
              onPress={onTopUp}
              style={styles.topUpButton}
              textStyle={{ color: colors.primary }}
              testID="button-topup"
            >
              <View style={styles.topUpButtonContent}>
                <Ionicons name="add-circle" size={20} color={colors.primary} />
                <Text style={styles.topUpButtonText}>Ricarica</Text>
              </View>
            </Button>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <View style={styles.quickTopUp}>
            <Text style={styles.sectionTitle}>Ricarica Rapida</Text>
            <View style={styles.topUpGrid}>
              {topUpOptions.map((amount) => (
                <Pressable
                  key={amount}
                  onPress={() => {
                    triggerHaptic('medium');
                    onTopUp();
                  }}
                  style={styles.topUpOption}
                >
                  <Text style={styles.topUpAmount}>€{amount}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionTitle}>Movimenti</Text>
          </View>

          <Card style={styles.transactionsCard}>
            {transactions.length > 0 ? (
              transactions.map((item, index) => (
                <View key={item.id}>
                  {renderTransaction({ item, index })}
                  {index < transactions.length - 1 && <View style={styles.transactionDivider} />}
                </View>
              ))
            ) : (
              <View style={styles.emptyTransactions}>
                <Ionicons name="receipt-outline" size={48} color={colors.mutedForeground} />
                <Text style={styles.emptyText}>Nessun movimento</Text>
              </View>
            )}
          </Card>
        </Animated.View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark" size={20} color={colors.success} />
            <Text style={styles.infoText}>
              Il tuo saldo è protetto e sicuro
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="flash" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Paga più velocemente con il Wallet
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeArea>
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  balanceCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.golden,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: {
    fontSize: typography.fontSize.base,
    color: 'rgba(0,0,0,0.7)',
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.primaryForeground,
    marginBottom: spacing.lg,
  },
  topUpButton: {
    backgroundColor: 'white',
  },
  topUpButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topUpButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.primary,
  },
  quickTopUp: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  topUpGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  topUpOption: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  topUpAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  transactionsHeader: {
    marginBottom: spacing.md,
  },
  transactionsCard: {
    padding: spacing.md,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.foreground,
  },
  transactionDate: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  transactionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    marginTop: spacing.md,
  },
  infoSection: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
});

export default WalletScreen;
