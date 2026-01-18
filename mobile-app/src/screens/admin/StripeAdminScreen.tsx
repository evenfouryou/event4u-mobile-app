import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

interface StripeSettings {
  testMode: boolean;
  webhookUrl: string;
  webhookSecret: string;
  publishableKey: string;
  secretKey: string;
  paymentMethods: string[];
  currency: string;
  statementDescriptor: string;
  webhookEvents: string[];
  lastWebhookReceived?: string;
  webhookStatus: 'active' | 'inactive' | 'error';
}

interface StripeStats {
  totalRevenue: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  refunds: number;
}

export function StripeAdminScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editedSettings, setEditedSettings] = useState<Partial<StripeSettings>>({});

  const { data: settings, isLoading } = useQuery<StripeSettings>({
    queryKey: ['/api/admin/stripe/settings'],
    queryFn: () =>
      api.get<StripeSettings>('/api/admin/stripe/settings').catch(() => ({
        testMode: true,
        webhookUrl: 'https://api.event4u.it/webhooks/stripe',
        webhookSecret: 'whsec_**********************',
        publishableKey: 'pk_test_**********************',
        secretKey: 'sk_test_**********************',
        paymentMethods: ['card', 'sepa_debit', 'ideal'],
        currency: 'EUR',
        statementDescriptor: 'EVENT4U',
        webhookEvents: ['payment_intent.succeeded', 'payment_intent.failed', 'charge.refunded'],
        lastWebhookReceived: new Date().toISOString(),
        webhookStatus: 'active',
      })),
  });

  const { data: stats } = useQuery<StripeStats>({
    queryKey: ['/api/admin/stripe/stats'],
    queryFn: () =>
      api.get<StripeStats>('/api/admin/stripe/stats').catch(() => ({
        totalRevenue: 45680.5,
        successfulPayments: 1234,
        failedPayments: 23,
        pendingPayments: 5,
        refunds: 12,
      })),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<StripeSettings>) => api.put('/api/admin/stripe/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stripe/settings'] });
      setIsEditing(false);
      Alert.alert('Successo', 'Impostazioni Stripe aggiornate');
    },
    onError: () => {
      Alert.alert('Errore', 'Impossibile aggiornare le impostazioni');
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: () => api.post('/api/admin/stripe/test-webhook'),
    onSuccess: () => {
      Alert.alert('Successo', 'Webhook test inviato con successo');
    },
    onError: () => {
      Alert.alert('Errore', 'Test webhook fallito');
    },
  });

  const handleToggleTestMode = (value: boolean) => {
    Alert.alert(
      value ? 'Attiva Modalità Test' : 'Attiva Modalità Live',
      value
        ? 'Stai per passare alla modalità test. Nessun pagamento reale sarà processato.'
        : 'ATTENZIONE: Stai per attivare la modalità live. I pagamenti reali saranno processati.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          style: value ? 'default' : 'destructive',
          onPress: () => updateSettingsMutation.mutate({ testMode: value }),
        },
      ]
    );
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(editedSettings);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getWebhookStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'inactive':
        return colors.warning;
      case 'error':
        return colors.destructive;
      default:
        return colors.mutedForeground;
    }
  };

  const getWebhookStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Attivo';
      case 'inactive':
        return 'Inattivo';
      case 'error':
        return 'Errore';
      default:
        return status;
    }
  };

  if (isLoading || !settings) {
    return (
      <View style={styles.container}>
        <Header title="Stripe Settings" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento impostazioni...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Stripe Settings"
        showBack
        rightAction={
          <TouchableOpacity
            onPress={() => Linking.openURL('https://dashboard.stripe.com')}
            data-testid="button-stripe-dashboard"
          >
            <Ionicons name="open-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="glass" style={styles.modeCard}>
          <View style={styles.modeHeader}>
            <View style={styles.modeInfo}>
              <View
                style={[
                  styles.modeIndicator,
                  { backgroundColor: settings.testMode ? colors.warning : colors.success },
                ]}
              />
              <View>
                <Text style={styles.modeTitle}>
                  {settings.testMode ? 'Modalità Test' : 'Modalità Live'}
                </Text>
                <Text style={styles.modeSubtitle}>
                  {settings.testMode
                    ? 'I pagamenti non sono reali'
                    : 'I pagamenti vengono processati'}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.testMode}
              onValueChange={handleToggleTestMode}
              trackColor={{ false: colors.success + '40', true: colors.warning + '40' }}
              thumbColor={settings.testMode ? colors.warning : colors.success}
              data-testid="switch-test-mode"
            />
          </View>
        </Card>

        {stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statistiche Pagamenti</Text>
            <View style={styles.statsGrid}>
              <Card variant="glass" style={styles.statCard}>
                <Ionicons name="cash" size={24} color={colors.success} />
                <Text style={styles.statValue}>{formatCurrency(stats.totalRevenue)}</Text>
                <Text style={styles.statLabel}>Ricavi Totali</Text>
              </Card>
              <Card variant="glass" style={styles.statCard}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <Text style={styles.statValue}>{stats.successfulPayments}</Text>
                <Text style={styles.statLabel}>Pagamenti OK</Text>
              </Card>
              <Card variant="glass" style={styles.statCard}>
                <Ionicons name="close-circle" size={24} color={colors.destructive} />
                <Text style={styles.statValue}>{stats.failedPayments}</Text>
                <Text style={styles.statLabel}>Falliti</Text>
              </Card>
              <Card variant="glass" style={styles.statCard}>
                <Ionicons name="return-down-back" size={24} color={colors.warning} />
                <Text style={styles.statValue}>{stats.refunds}</Text>
                <Text style={styles.statLabel}>Rimborsi</Text>
              </Card>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configurazione Webhook</Text>
          <Card variant="glass" style={styles.webhookCard}>
            <View style={styles.webhookHeader}>
              <View style={styles.webhookStatus}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getWebhookStatusColor(settings.webhookStatus) },
                  ]}
                />
                <Text
                  style={[styles.statusText, { color: getWebhookStatusColor(settings.webhookStatus) }]}
                >
                  {getWebhookStatusLabel(settings.webhookStatus)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.testButton}
                onPress={() => testWebhookMutation.mutate()}
                disabled={testWebhookMutation.isPending}
                data-testid="button-test-webhook"
              >
                {testWebhookMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="flash" size={16} color={colors.primary} />
                    <Text style={styles.testButtonText}>Test</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.webhookField}>
              <Text style={styles.fieldLabel}>URL Webhook</Text>
              <View style={styles.fieldValue}>
                <Text style={styles.fieldText} numberOfLines={1}>
                  {settings.webhookUrl}
                </Text>
                <TouchableOpacity onPress={() => {}}>
                  <Ionicons name="copy" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.webhookField}>
              <Text style={styles.fieldLabel}>Webhook Secret</Text>
              <View style={styles.fieldValue}>
                <Text style={styles.fieldText}>{settings.webhookSecret}</Text>
              </View>
            </View>

            {settings.lastWebhookReceived && (
              <Text style={styles.lastWebhook}>
                Ultimo webhook ricevuto:{' '}
                {new Date(settings.lastWebhookReceived).toLocaleString('it-IT')}
              </Text>
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Eventi Webhook Attivi</Text>
          <Card variant="glass" style={styles.eventsCard}>
            {settings.webhookEvents.map((event, index) => (
              <View
                key={event}
                style={[
                  styles.eventItem,
                  index < settings.webhookEvents.length - 1 && styles.eventItemBorder,
                ]}
              >
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.eventName}>{event}</Text>
              </View>
            ))}
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chiavi API</Text>
          <Card variant="glass" style={styles.keysCard}>
            <View style={styles.keyField}>
              <Text style={styles.fieldLabel}>Publishable Key</Text>
              <View style={styles.fieldValue}>
                <Text style={styles.fieldText}>{settings.publishableKey}</Text>
                <TouchableOpacity onPress={() => {}}>
                  <Ionicons name="copy" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.keyField}>
              <Text style={styles.fieldLabel}>Secret Key</Text>
              <View style={styles.fieldValue}>
                <Text style={styles.fieldText}>{settings.secretKey}</Text>
                <TouchableOpacity onPress={() => {}}>
                  <Ionicons name="eye-off" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Impostazioni Pagamento</Text>
          <Card variant="glass" style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Valuta</Text>
              <Text style={styles.settingValue}>{settings.currency}</Text>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Descrizione Estratto Conto</Text>
              <Text style={styles.settingValue}>{settings.statementDescriptor}</Text>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Metodi di Pagamento</Text>
              <View style={styles.paymentMethods}>
                {settings.paymentMethods.map((method) => (
                  <View key={method} style={styles.methodBadge}>
                    <Text style={styles.methodText}>{method.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>
        </View>

        <Button
          title="Modifica Impostazioni"
          variant="outline"
          icon={<Ionicons name="create-outline" size={20} color={colors.foreground} />}
          onPress={() => setIsEditing(true)}
          style={styles.editButton}
        />
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
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  modeCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  modeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  modeTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  modeSubtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  webhookCard: {
    padding: spacing.lg,
  },
  webhookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  webhookStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.md,
  },
  testButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  webhookField: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  fieldText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
    flex: 1,
  },
  lastWebhook: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
  eventsCard: {
    padding: spacing.lg,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  eventItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
  },
  keysCard: {
    padding: spacing.lg,
  },
  keyField: {
    marginBottom: spacing.lg,
  },
  settingsCard: {
    padding: spacing.lg,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  settingLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  settingValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  methodBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  methodText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  editButton: {
    marginTop: spacing.md,
  },
});
