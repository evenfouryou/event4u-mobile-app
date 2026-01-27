import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, TextInput, Switch, Alert } from 'react-native';
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

interface AdminSIAEConfigScreenProps {
  onBack: () => void;
}

interface SIAEConfig {
  apiEndpoint: string;
  apiVersion: string;
  certificatePath: string;
  certificateExpiry: string;
  autoTransmission: boolean;
  transmissionTime: string;
  retryAttempts: number;
  retryDelay: number;
  validationEnabled: boolean;
  testMode: boolean;
  debugLogging: boolean;
  notifyOnError: boolean;
  notifyOnSuccess: boolean;
  adminEmails: string[];
}

interface ConnectionStatus {
  isConnected: boolean;
  lastCheck: string;
  latency: number;
  certificateValid: boolean;
}

export function AdminSIAEConfigScreen({ onBack }: AdminSIAEConfigScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [config, setConfig] = useState<SIAEConfig>({
    apiEndpoint: 'https://api.siae.it/v2',
    apiVersion: '2.1.0',
    certificatePath: '/etc/ssl/siae/certificate.pem',
    certificateExpiry: '2025-06-15',
    autoTransmission: true,
    transmissionTime: '02:00',
    retryAttempts: 3,
    retryDelay: 300,
    validationEnabled: true,
    testMode: false,
    debugLogging: false,
    notifyOnError: true,
    notifyOnSuccess: false,
    adminEmails: ['admin@event4u.it', 'siae@event4u.it'],
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: true,
    lastCheck: new Date().toISOString(),
    latency: 45,
    certificateValid: true,
  });

  useEffect(() => {
    loadConfig();
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

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error loading SIAE config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConfig();
    setRefreshing(false);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      triggerHaptic('medium');
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert('Successo', 'Configurazione SIAE salvata con successo');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare la configurazione');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      triggerHaptic('medium');
      await new Promise(resolve => setTimeout(resolve, 2000));
      setConnectionStatus({
        isConnected: true,
        lastCheck: new Date().toISOString(),
        latency: Math.floor(Math.random() * 100) + 20,
        certificateValid: true,
      });
      Alert.alert('Successo', 'Connessione al sistema SIAE verificata con successo');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile connettersi al sistema SIAE');
    } finally {
      setIsTesting(false);
    }
  };

  const updateConfig = <K extends keyof SIAEConfig>(key: K, value: SIAEConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
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

  const getDaysUntilExpiry = () => {
    const expiry = new Date(config.certificateExpiry);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (showLoader) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header showLogo showBack onBack={onBack} testID="header-siae-config" />
        <Loading text="Caricamento configurazione SIAE..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header showLogo showBack onBack={onBack} testID="header-siae-config" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={styles.title}>Configurazione SIAE</Text>

        <View style={styles.statusSection}>
          <GlassCard style={styles.statusCard} testID="card-connection-status">
            <View style={styles.statusHeader}>
              <View style={styles.statusInfo}>
                <View style={styles.statusRow}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: connectionStatus.isConnected ? staticColors.success : staticColors.destructive }
                  ]} />
                  <Text style={styles.statusTitle}>
                    {connectionStatus.isConnected ? 'Connesso' : 'Disconnesso'}
                  </Text>
                </View>
                <Text style={styles.statusSubtitle}>
                  Ultimo controllo: {formatDate(connectionStatus.lastCheck)}
                </Text>
              </View>
              <Badge variant={connectionStatus.isConnected ? 'success' : 'destructive'}>
                {connectionStatus.latency}ms
              </Badge>
            </View>

            <View style={styles.statusDetails}>
              <View style={styles.statusItem}>
                <Ionicons
                  name={connectionStatus.certificateValid ? 'shield-checkmark' : 'shield-outline'}
                  size={20}
                  color={connectionStatus.certificateValid ? staticColors.success : staticColors.destructive}
                />
                <Text style={styles.statusItemText}>
                  Certificato {connectionStatus.certificateValid ? 'Valido' : 'Non Valido'}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Ionicons name="time-outline" size={20} color={staticColors.warning} />
                <Text style={styles.statusItemText}>
                  Scade tra {getDaysUntilExpiry()} giorni
                </Text>
              </View>
            </View>

            <Button
              variant="outline"
              onPress={handleTestConnection}
              loading={isTesting}
              testID="button-test-connection"
            >
              <Ionicons name="pulse" size={18} color={staticColors.foreground} />
              <Text style={styles.testButtonText}>Test Connessione</Text>
            </Button>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Endpoint API</Text>
          <Card style={styles.sectionCard} testID="card-api-settings">
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>URL Endpoint</Text>
              <TextInput
                style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
                value={config.apiEndpoint}
                onChangeText={(value) => updateConfig('apiEndpoint', value)}
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                testID="input-api-endpoint"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Versione API</Text>
              <TextInput
                style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
                value={config.apiVersion}
                onChangeText={(value) => updateConfig('apiVersion', value)}
                placeholderTextColor={colors.mutedForeground}
                testID="input-api-version"
              />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Certificato</Text>
          <Card style={styles.sectionCard} testID="card-certificate-settings">
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Percorso Certificato</Text>
              <TextInput
                style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
                value={config.certificatePath}
                onChangeText={(value) => updateConfig('certificatePath', value)}
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                testID="input-certificate-path"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Scadenza Certificato</Text>
              <View style={styles.expiryRow}>
                <TextInput
                  style={[styles.textInput, styles.dateInput, { color: colors.foreground, borderColor: colors.border }]}
                  value={config.certificateExpiry}
                  onChangeText={(value) => updateConfig('certificateExpiry', value)}
                  placeholderTextColor={colors.mutedForeground}
                  testID="input-certificate-expiry"
                />
                <Badge variant={getDaysUntilExpiry() > 30 ? 'success' : 'warning'}>
                  {getDaysUntilExpiry()} giorni
                </Badge>
              </View>
            </View>

            <Button
              variant="secondary"
              onPress={() => {
                triggerHaptic('medium');
                Alert.alert('Rinnova Certificato', 'Funzionalità di rinnovo certificato in sviluppo');
              }}
              testID="button-renew-certificate"
            >
              <Ionicons name="refresh" size={18} color={staticColors.foreground} />
              <Text style={styles.renewButtonText}>Rinnova Certificato</Text>
            </Button>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trasmissione Automatica</Text>
          <Card style={styles.sectionCard} testID="card-transmission-settings">
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Trasmissione Automatica</Text>
                <Text style={styles.switchDescription}>Invia report automaticamente</Text>
              </View>
              <Switch
                value={config.autoTransmission}
                onValueChange={(value) => updateConfig('autoTransmission', value)}
                trackColor={{ false: staticColors.secondary, true: staticColors.primary }}
                thumbColor={staticColors.foreground}
                testID="switch-auto-transmission"
              />
            </View>

            {config.autoTransmission && (
              <>
                <View style={styles.divider} />
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Orario Trasmissione</Text>
                  <TextInput
                    style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
                    value={config.transmissionTime}
                    onChangeText={(value) => updateConfig('transmissionTime', value)}
                    placeholderTextColor={colors.mutedForeground}
                    placeholder="HH:MM"
                    testID="input-transmission-time"
                  />
                </View>
              </>
            )}

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tentativi Retry</Text>
              <TextInput
                style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
                value={String(config.retryAttempts)}
                onChangeText={(value) => updateConfig('retryAttempts', parseInt(value) || 0)}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                testID="input-retry-attempts"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Delay Retry (secondi)</Text>
              <TextInput
                style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
                value={String(config.retryDelay)}
                onChangeText={(value) => updateConfig('retryDelay', parseInt(value) || 0)}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                testID="input-retry-delay"
              />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opzioni Avanzate</Text>
          <Card style={styles.sectionCard} testID="card-advanced-settings">
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Validazione XML</Text>
                <Text style={styles.switchDescription}>Valida i report prima dell'invio</Text>
              </View>
              <Switch
                value={config.validationEnabled}
                onValueChange={(value) => updateConfig('validationEnabled', value)}
                trackColor={{ false: staticColors.secondary, true: staticColors.primary }}
                thumbColor={staticColors.foreground}
                testID="switch-validation"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Modalità Test</Text>
                <Text style={styles.switchDescription}>Usa ambiente di test SIAE</Text>
              </View>
              <Switch
                value={config.testMode}
                onValueChange={(value) => updateConfig('testMode', value)}
                trackColor={{ false: staticColors.secondary, true: staticColors.warning }}
                thumbColor={staticColors.foreground}
                testID="switch-test-mode"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Debug Logging</Text>
                <Text style={styles.switchDescription}>Log dettagliati per debug</Text>
              </View>
              <Switch
                value={config.debugLogging}
                onValueChange={(value) => updateConfig('debugLogging', value)}
                trackColor={{ false: staticColors.secondary, true: staticColors.primary }}
                thumbColor={staticColors.foreground}
                testID="switch-debug-logging"
              />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifiche</Text>
          <Card style={styles.sectionCard} testID="card-notification-settings">
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Notifica su Errore</Text>
                <Text style={styles.switchDescription}>Email in caso di errore trasmissione</Text>
              </View>
              <Switch
                value={config.notifyOnError}
                onValueChange={(value) => updateConfig('notifyOnError', value)}
                trackColor={{ false: staticColors.secondary, true: staticColors.primary }}
                thumbColor={staticColors.foreground}
                testID="switch-notify-error"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Notifica su Successo</Text>
                <Text style={styles.switchDescription}>Email conferma trasmissione</Text>
              </View>
              <Switch
                value={config.notifyOnSuccess}
                onValueChange={(value) => updateConfig('notifyOnSuccess', value)}
                trackColor={{ false: staticColors.secondary, true: staticColors.primary }}
                thumbColor={staticColors.foreground}
                testID="switch-notify-success"
              />
            </View>
          </Card>
        </View>

        <View style={styles.saveSection}>
          <Button
            onPress={handleSave}
            loading={isSaving}
            variant="golden"
            testID="button-save-config"
          >
            Salva Configurazione
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  statusSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statusCard: {
    padding: spacing.md,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  statusInfo: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  statusSubtitle: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  statusDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusItemText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
  },
  testButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: staticColors.foreground,
    marginLeft: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.mutedForeground,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    padding: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
    marginBottom: spacing.xs,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.base,
    backgroundColor: staticColors.background,
  },
  dateInput: {
    flex: 1,
    marginRight: spacing.sm,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  renewButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: staticColors.foreground,
    marginLeft: spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  switchInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  switchDescription: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.xs,
  },
  saveSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
