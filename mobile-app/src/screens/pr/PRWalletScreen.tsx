import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header, Button, Input } from '../../components';

interface Transaction {
  id: number;
  type: 'earning' | 'payout' | 'pending';
  description: string;
  amount: string;
  date: string;
  eventName?: string;
  status?: 'completed' | 'pending' | 'processing';
}

const mockTransactions: Transaction[] = [
  { id: 1, type: 'earning', description: 'Commissione lista ospiti', amount: '+€45.00', date: '15 Gen 2026', eventName: 'Notte Italiana', status: 'completed' },
  { id: 2, type: 'earning', description: 'Commissione tavolo VIP', amount: '+€50.00', date: '14 Gen 2026', eventName: 'Friday Vibes', status: 'completed' },
  { id: 3, type: 'pending', description: 'Commissione in attesa', amount: '+€35.00', date: '14 Gen 2026', eventName: 'Friday Vibes', status: 'pending' },
  { id: 4, type: 'payout', description: 'Pagamento su conto', amount: '-€250.00', date: '10 Gen 2026', status: 'completed' },
  { id: 5, type: 'earning', description: 'Commissione lista ospiti', amount: '+€60.00', date: '8 Gen 2026', eventName: 'Retro Night', status: 'completed' },
  { id: 6, type: 'earning', description: 'Bonus mensile', amount: '+€100.00', date: '1 Gen 2026', status: 'completed' },
  { id: 7, type: 'payout', description: 'Pagamento su conto', amount: '-€400.00', date: '28 Dic 2025', status: 'completed' },
];

interface PayoutRequest {
  id: number;
  amount: string;
  method: string;
  status: 'pending' | 'processing' | 'completed';
  requestedAt: string;
  completedAt?: string;
}

const mockPayoutRequests: PayoutRequest[] = [
  { id: 1, amount: '€120.00', method: 'Bonifico Bancario', status: 'processing', requestedAt: '14 Gen 2026' },
  { id: 2, amount: '€250.00', method: 'Bonifico Bancario', status: 'completed', requestedAt: '5 Gen 2026', completedAt: '8 Gen 2026' },
];

export function PRWalletScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'transactions' | 'payouts'>('transactions');

  const availableBalance = 485.00;
  const pendingBalance = 120.00;
  const totalEarnings = 1250.00;

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const handleRequestPayout = () => {
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Errore', 'Inserisci un importo valido');
      return;
    }
    if (amount > availableBalance) {
      Alert.alert('Errore', 'Importo superiore al saldo disponibile');
      return;
    }
    Alert.alert(
      'Conferma Richiesta',
      `Vuoi richiedere un pagamento di €${amount.toFixed(2)}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Conferma', 
          onPress: () => {
            setShowPayoutModal(false);
            setPayoutAmount('');
            Alert.alert('Successo', 'Richiesta di pagamento inviata!');
          }
        },
      ]
    );
  };

  const getTransactionIcon = (type: Transaction['type']): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'earning': return 'arrow-down-circle';
      case 'payout': return 'arrow-up-circle';
      case 'pending': return 'time';
    }
  };

  const getTransactionColor = (type: Transaction['type']) => {
    switch (type) {
      case 'earning': return colors.success;
      case 'payout': return colors.primary;
      case 'pending': return colors.warning;
    }
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Il Mio Wallet" 
        showBack 
        onBack={() => navigation.goBack()}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <Card style={styles.balanceCard}>
          <View style={styles.balanceMain}>
            <Text style={styles.balanceLabel}>Saldo Disponibile</Text>
            <Text style={styles.balanceAmount}>€ {availableBalance.toFixed(2)}</Text>
          </View>
          
          <View style={styles.balanceSecondary}>
            <View style={styles.balanceSecondaryItem}>
              <View style={styles.balanceIconContainer}>
                <Ionicons name="time-outline" size={20} color={colors.warning} />
              </View>
              <View>
                <Text style={styles.balanceSecondaryLabel}>In Attesa</Text>
                <Text style={styles.balanceSecondaryValue}>€ {pendingBalance.toFixed(2)}</Text>
              </View>
            </View>
            <View style={styles.balanceSecondaryItem}>
              <View style={styles.balanceIconContainer}>
                <Ionicons name="trending-up" size={20} color={colors.success} />
              </View>
              <View>
                <Text style={styles.balanceSecondaryLabel}>Totale Guadagni</Text>
                <Text style={styles.balanceSecondaryValue}>€ {totalEarnings.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          <Button
            title="Richiedi Pagamento"
            variant="primary"
            onPress={() => setShowPayoutModal(true)}
            icon={<Ionicons name="wallet-outline" size={18} color={colors.primaryForeground} />}
          />
        </Card>

        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'transactions' && styles.tabActive]}
            onPress={() => setActiveTab('transactions')}
          >
            <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}>
              Movimenti
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'payouts' && styles.tabActive]}
            onPress={() => setActiveTab('payouts')}
          >
            <Text style={[styles.tabText, activeTab === 'payouts' && styles.tabTextActive]}>
              Richieste Pagamento
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'transactions' ? (
          <Card style={styles.transactionsCard}>
            {mockTransactions.map((transaction, index) => (
              <React.Fragment key={transaction.id}>
                <View style={styles.transactionItem}>
                  <View style={[styles.transactionIcon, { backgroundColor: getTransactionColor(transaction.type) + '20' }]}>
                    <Ionicons 
                      name={getTransactionIcon(transaction.type)} 
                      size={20} 
                      color={getTransactionColor(transaction.type)} 
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDescription}>{transaction.description}</Text>
                    {transaction.eventName && (
                      <Text style={styles.transactionEvent}>{transaction.eventName}</Text>
                    )}
                    <Text style={styles.transactionDate}>{transaction.date}</Text>
                  </View>
                  <View style={styles.transactionAmountContainer}>
                    <Text style={[
                      styles.transactionAmount,
                      { color: getTransactionColor(transaction.type) }
                    ]}>
                      {transaction.amount}
                    </Text>
                    {transaction.status === 'pending' && (
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingText}>In attesa</Text>
                      </View>
                    )}
                  </View>
                </View>
                {index < mockTransactions.length - 1 && <View style={styles.transactionDivider} />}
              </React.Fragment>
            ))}
          </Card>
        ) : (
          <Card style={styles.transactionsCard}>
            {mockPayoutRequests.map((request, index) => (
              <React.Fragment key={request.id}>
                <View style={styles.payoutItem}>
                  <View style={styles.payoutInfo}>
                    <Text style={styles.payoutAmount}>{request.amount}</Text>
                    <Text style={styles.payoutMethod}>{request.method}</Text>
                    <Text style={styles.payoutDate}>Richiesto: {request.requestedAt}</Text>
                    {request.completedAt && (
                      <Text style={styles.payoutDate}>Completato: {request.completedAt}</Text>
                    )}
                  </View>
                  <View style={[
                    styles.payoutStatusBadge,
                    { backgroundColor: request.status === 'completed' ? colors.success + '20' : colors.warning + '20' }
                  ]}>
                    <Ionicons 
                      name={request.status === 'completed' ? 'checkmark-circle' : 'time'} 
                      size={14} 
                      color={request.status === 'completed' ? colors.success : colors.warning} 
                    />
                    <Text style={[
                      styles.payoutStatusText,
                      { color: request.status === 'completed' ? colors.success : colors.warning }
                    ]}>
                      {request.status === 'completed' ? 'Completato' : 'In elaborazione'}
                    </Text>
                  </View>
                </View>
                {index < mockPayoutRequests.length - 1 && <View style={styles.transactionDivider} />}
              </React.Fragment>
            ))}
          </Card>
        )}

        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.infoTitle}>Come funziona</Text>
          </View>
          <Text style={styles.infoText}>
            Le commissioni vengono accreditate dopo che l'evento è terminato e verificato. 
            Puoi richiedere un pagamento quando il tuo saldo disponibile supera €50.
          </Text>
          <View style={styles.infoStats}>
            <View style={styles.infoStatItem}>
              <Text style={styles.infoStatLabel}>Commissione ospite</Text>
              <Text style={styles.infoStatValue}>€5.00</Text>
            </View>
            <View style={styles.infoStatItem}>
              <Text style={styles.infoStatLabel}>Commissione tavolo</Text>
              <Text style={styles.infoStatValue}>10%</Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      <Modal
        visible={showPayoutModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPayoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Richiedi Pagamento</Text>
              <TouchableOpacity onPress={() => setShowPayoutModal(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View style={styles.availableInfo}>
              <Text style={styles.availableLabel}>Saldo disponibile</Text>
              <Text style={styles.availableAmount}>€ {availableBalance.toFixed(2)}</Text>
            </View>

            <Input
              label="Importo da prelevare"
              placeholder="0.00"
              value={payoutAmount}
              onChangeText={setPayoutAmount}
              keyboardType="decimal-pad"
              leftIcon={<Text style={styles.currencySymbol}>€</Text>}
            />

            <View style={styles.quickAmounts}>
              {[50, 100, 200, availableBalance].map((amount) => (
                <TouchableOpacity 
                  key={amount}
                  style={styles.quickAmountButton}
                  onPress={() => setPayoutAmount(amount.toString())}
                >
                  <Text style={styles.quickAmountText}>
                    {amount === availableBalance ? 'Tutto' : `€${amount}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.payoutMethodSection}>
              <Text style={styles.payoutMethodLabel}>Metodo di pagamento</Text>
              <View style={styles.payoutMethodCard}>
                <Ionicons name="card-outline" size={24} color={colors.primary} />
                <View style={styles.payoutMethodInfo}>
                  <Text style={styles.payoutMethodName}>Bonifico Bancario</Text>
                  <Text style={styles.payoutMethodDetails}>IBAN: IT** **** **** **** 1234</Text>
                </View>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Annulla"
                variant="outline"
                onPress={() => setShowPayoutModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Richiedi"
                variant="primary"
                onPress={handleRequestPayout}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  balanceCard: {
    padding: spacing.lg,
  },
  balanceMain: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  balanceLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    color: colors.success,
    fontSize: 48,
    fontWeight: fontWeight.bold,
  },
  balanceSecondary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  balanceSecondaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  balanceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceSecondaryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  balanceSecondaryValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  tabTextActive: {
    color: colors.primaryForeground,
  },
  transactionsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  transactionEvent: {
    color: colors.primary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  transactionDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  pendingBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 4,
  },
  pendingText: {
    color: colors.warning,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  transactionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 44 + spacing.md,
  },
  payoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  payoutInfo: {},
  payoutAmount: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  payoutMethod: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  payoutDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  payoutStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  payoutStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  infoCard: {
    padding: spacing.md,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  infoText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  infoStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoStatItem: {
    alignItems: 'center',
  },
  infoStatLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  infoStatValue: {
    color: colors.success,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  availableInfo: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
  },
  availableLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  availableAmount: {
    color: colors.success,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  currencySymbol: {
    color: colors.mutedForeground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  quickAmountText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  payoutMethodSection: {
    marginBottom: spacing.lg,
  },
  payoutMethodLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  payoutMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '50',
  },
  payoutMethodInfo: {
    flex: 1,
  },
  payoutMethodName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  payoutMethodDetails: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
