import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

interface SystemSettings {
  appName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  emailSettings: {
    smtpHost: string;
    smtpPort: string;
    smtpUser: string;
    fromEmail: string;
    fromName: string;
  };
  siaeDefaults: {
    autoTransmit: boolean;
    transmitTime: string;
    retryAttempts: number;
    defaultReportType: string;
  };
  version: string;
  buildNumber: string;
}

export function SystemSettingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    appName: 'Event4U',
    supportEmail: '',
    maintenanceMode: false,
    maintenanceMessage: '',
    emailSettings: {
      smtpHost: '',
      smtpPort: '587',
      smtpUser: '',
      fromEmail: '',
      fromName: '',
    },
    siaeDefaults: {
      autoTransmit: false,
      transmitTime: '06:00',
      retryAttempts: 3,
      defaultReportType: 'RCA',
    },
    version: '1.0.0',
    buildNumber: '1',
  });

  const loadSettings = async () => {
    try {
      const response = await api.get<any>('/api/admin/settings');
      if (response) {
        setSettings({
          ...settings,
          ...response,
          emailSettings: { ...settings.emailSettings, ...response.emailSettings },
          siaeDefaults: { ...settings.siaeDefaults, ...response.siaeDefaults },
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/admin/settings', settings);
      Alert.alert('Successo', 'Impostazioni salvate correttamente');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare le impostazioni');
    } finally {
      setSaving(false);
    }
  };

  const updateEmailSettings = (key: keyof typeof settings.emailSettings, value: string) => {
    setSettings({
      ...settings,
      emailSettings: {
        ...settings.emailSettings,
        [key]: value,
      },
    });
  };

  const updateSiaeDefaults = (key: keyof typeof settings.siaeDefaults, value: any) => {
    setSettings({
      ...settings,
      siaeDefaults: {
        ...settings.siaeDefaults,
        [key]: value,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Impostazioni Sistema" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Impostazioni Sistema" showBack />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="glass" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="settings-outline" size={24} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Configurazione App</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nome Applicazione</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome app"
              placeholderTextColor={colors.mutedForeground}
              value={settings.appName}
              onChangeText={(text) => setSettings({ ...settings, appName: text })}
              data-testid="input-app-name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Supporto</Text>
            <TextInput
              style={styles.input}
              placeholder="supporto@esempio.it"
              placeholderTextColor={colors.mutedForeground}
              value={settings.supportEmail}
              onChangeText={(text) => setSettings({ ...settings, supportEmail: text })}
              keyboardType="email-address"
              autoCapitalize="none"
              data-testid="input-support-email"
            />
          </View>
        </Card>

        <Card variant="glass" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${colors.success}20` }]}>
              <Ionicons name="mail-outline" size={24} color={colors.success} />
            </View>
            <Text style={styles.sectionTitle}>Impostazioni Email</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>SMTP Host</Text>
            <TextInput
              style={styles.input}
              placeholder="smtp.esempio.it"
              placeholderTextColor={colors.mutedForeground}
              value={settings.emailSettings.smtpHost}
              onChangeText={(text) => updateEmailSettings('smtpHost', text)}
              autoCapitalize="none"
              data-testid="input-smtp-host"
            />
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Porta</Text>
              <TextInput
                style={styles.input}
                placeholder="587"
                placeholderTextColor={colors.mutedForeground}
                value={settings.emailSettings.smtpPort}
                onChangeText={(text) => updateEmailSettings('smtpPort', text)}
                keyboardType="number-pad"
                data-testid="input-smtp-port"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.inputLabel}>Utente SMTP</Text>
              <TextInput
                style={styles.input}
                placeholder="utente@esempio.it"
                placeholderTextColor={colors.mutedForeground}
                value={settings.emailSettings.smtpUser}
                onChangeText={(text) => updateEmailSettings('smtpUser', text)}
                autoCapitalize="none"
                data-testid="input-smtp-user"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Mittente</Text>
            <TextInput
              style={styles.input}
              placeholder="noreply@esempio.it"
              placeholderTextColor={colors.mutedForeground}
              value={settings.emailSettings.fromEmail}
              onChangeText={(text) => updateEmailSettings('fromEmail', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              data-testid="input-from-email"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nome Mittente</Text>
            <TextInput
              style={styles.input}
              placeholder="Event4U"
              placeholderTextColor={colors.mutedForeground}
              value={settings.emailSettings.fromName}
              onChangeText={(text) => updateEmailSettings('fromName', text)}
              data-testid="input-from-name"
            />
          </View>
        </Card>

        <Card variant="glass" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${colors.accent}20` }]}>
              <Ionicons name="shield-checkmark-outline" size={24} color={colors.accent} />
            </View>
            <Text style={styles.sectionTitle}>Impostazioni SIAE</Text>
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Trasmissione Automatica</Text>
              <Text style={styles.toggleDesc}>
                Invia automaticamente i report alla SIAE
              </Text>
            </View>
            <Switch
              value={settings.siaeDefaults.autoTransmit}
              onValueChange={(value) => updateSiaeDefaults('autoTransmit', value)}
              trackColor={{ false: colors.muted, true: `${colors.accent}50` }}
              thumbColor={settings.siaeDefaults.autoTransmit ? colors.accent : colors.mutedForeground}
              data-testid="switch-auto-transmit"
            />
          </View>

          {settings.siaeDefaults.autoTransmit && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Orario Trasmissione</Text>
              <TextInput
                style={styles.input}
                placeholder="06:00"
                placeholderTextColor={colors.mutedForeground}
                value={settings.siaeDefaults.transmitTime}
                onChangeText={(text) => updateSiaeDefaults('transmitTime', text)}
                data-testid="input-transmit-time"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tentativi di Ritrasmissione</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => updateSiaeDefaults('retryAttempts', Math.max(1, settings.siaeDefaults.retryAttempts - 1))}
                data-testid="button-retry-decrease"
              >
                <Ionicons name="remove" size={20} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{settings.siaeDefaults.retryAttempts}</Text>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => updateSiaeDefaults('retryAttempts', Math.min(10, settings.siaeDefaults.retryAttempts + 1))}
                data-testid="button-retry-increase"
              >
                <Ionicons name="add" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tipo Report Predefinito</Text>
            <View style={styles.reportTypeSelector}>
              {['RCA', 'RMG', 'RPM'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.reportTypeOption,
                    settings.siaeDefaults.defaultReportType === type && styles.reportTypeOptionActive
                  ]}
                  onPress={() => updateSiaeDefaults('defaultReportType', type)}
                  data-testid={`button-report-type-${type}`}
                >
                  <Text style={[
                    styles.reportTypeText,
                    settings.siaeDefaults.defaultReportType === type && styles.reportTypeTextActive
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        <Card variant="glass" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${colors.warning}20` }]}>
              <Ionicons name="construct-outline" size={24} color={colors.warning} />
            </View>
            <Text style={styles.sectionTitle}>Modalità Manutenzione</Text>
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Attiva Manutenzione</Text>
              <Text style={styles.toggleDesc}>
                Disabilita l'accesso all'app per gli utenti
              </Text>
            </View>
            <Switch
              value={settings.maintenanceMode}
              onValueChange={(value) => setSettings({ ...settings, maintenanceMode: value })}
              trackColor={{ false: colors.muted, true: `${colors.warning}50` }}
              thumbColor={settings.maintenanceMode ? colors.warning : colors.mutedForeground}
              data-testid="switch-maintenance-mode"
            />
          </View>

          {settings.maintenanceMode && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Messaggio Manutenzione</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Stiamo effettuando manutenzione..."
                placeholderTextColor={colors.mutedForeground}
                value={settings.maintenanceMessage}
                onChangeText={(text) => setSettings({ ...settings, maintenanceMessage: text })}
                multiline
                numberOfLines={3}
                data-testid="input-maintenance-message"
              />
            </View>
          )}
        </Card>

        <Card variant="glass" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${colors.mutedForeground}20` }]}>
              <Ionicons name="information-circle-outline" size={24} color={colors.mutedForeground} />
            </View>
            <Text style={styles.sectionTitle}>Informazioni Versione</Text>
          </View>

          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Versione App</Text>
            <Text style={styles.versionValue}>{settings.version}</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Build Number</Text>
            <Text style={styles.versionValue}>{settings.buildNumber}</Text>
          </View>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title={saving ? 'Salvataggio...' : 'Salva Impostazioni'}
            onPress={handleSave}
            variant="primary"
            disabled={saving}
            data-testid="button-save-settings"
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
    flex: 1,
    paddingHorizontal: spacing.lg,
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
  section: {
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    height: 48,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  textArea: {
    height: 100,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  toggleInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  toggleDesc: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    minWidth: 40,
    textAlign: 'center',
  },
  reportTypeSelector: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  reportTypeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingVertical: spacing.md,
  },
  reportTypeOptionActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  reportTypeText: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  reportTypeTextActive: {
    color: colors.accentForeground,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  versionLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  versionValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  buttonContainer: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
});

export default SystemSettingsScreen;
