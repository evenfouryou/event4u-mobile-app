import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

interface SystemConfig {
  venueCode: string;
  siaeCode: string;
  autoTransmit: boolean;
  transmitTime: string;
  signatureEnabled: boolean;
  printReceipts: boolean;
  backupEnabled: boolean;
  debugMode: boolean;
}

export function SIAESystemConfigScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SystemConfig>({
    venueCode: '',
    siaeCode: '',
    autoTransmit: false,
    transmitTime: '23:00',
    signatureEnabled: true,
    printReceipts: true,
    backupEnabled: true,
    debugMode: false,
  });

  const loadConfig = async () => {
    try {
      const response = await api.get<any>('/api/siae/config');
      setConfig(response.config || response || config);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/siae/config', config);
      Alert.alert('Successo', 'Configurazione salvata correttamente');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare la configurazione');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key: keyof SystemConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Configurazione Sistema" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Configurazione Sistema" showBack onBack={() => navigation.goBack()} />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identificativi</Text>
          <Card variant="glass">
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Codice Locale</Text>
              <TextInput
                style={styles.input}
                value={config.venueCode}
                onChangeText={(text) => updateConfig('venueCode', text)}
                placeholder="Inserisci codice locale"
                placeholderTextColor={colors.mutedForeground}
                data-testid="input-venue-code"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Codice SIAE</Text>
              <TextInput
                style={styles.input}
                value={config.siaeCode}
                onChangeText={(text) => updateConfig('siaeCode', text)}
                placeholder="Inserisci codice SIAE"
                placeholderTextColor={colors.mutedForeground}
                data-testid="input-siae-code"
              />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trasmissione Automatica</Text>
          <Card variant="glass">
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Trasmissione Automatica</Text>
                <Text style={styles.switchDescription}>Invia report automaticamente ogni giorno</Text>
              </View>
              <Switch
                value={config.autoTransmit}
                onValueChange={(value) => updateConfig('autoTransmit', value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.foreground}
                data-testid="switch-auto-transmit"
              />
            </View>
            {config.autoTransmit && (
              <>
                <View style={styles.divider} />
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Orario Trasmissione</Text>
                  <TextInput
                    style={styles.input}
                    value={config.transmitTime}
                    onChangeText={(text) => updateConfig('transmitTime', text)}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.mutedForeground}
                    data-testid="input-transmit-time"
                  />
                </View>
              </>
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opzioni</Text>
          <Card variant="glass">
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Firma Digitale</Text>
                <Text style={styles.switchDescription}>Firma i report con smart card SIAE</Text>
              </View>
              <Switch
                value={config.signatureEnabled}
                onValueChange={(value) => updateConfig('signatureEnabled', value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.foreground}
                data-testid="switch-signature"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Stampa Ricevute</Text>
                <Text style={styles.switchDescription}>Stampa automaticamente le ricevute</Text>
              </View>
              <Switch
                value={config.printReceipts}
                onValueChange={(value) => updateConfig('printReceipts', value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.foreground}
                data-testid="switch-print"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Backup Automatico</Text>
                <Text style={styles.switchDescription}>Salva backup dei dati giornalmente</Text>
              </View>
              <Switch
                value={config.backupEnabled}
                onValueChange={(value) => updateConfig('backupEnabled', value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.foreground}
                data-testid="switch-backup"
              />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avanzate</Text>
          <Card variant="glass">
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Modalità Debug</Text>
                <Text style={styles.switchDescription}>Mostra log dettagliati per diagnosi</Text>
              </View>
              <Switch
                value={config.debugMode}
                onValueChange={(value) => updateConfig('debugMode', value)}
                trackColor={{ false: colors.border, true: colors.warning }}
                thumbColor={colors.foreground}
                data-testid="switch-debug"
              />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Button
            onPress={handleSave}
            disabled={saving}
            style={styles.saveButton}
            data-testid="button-save-config"
          >
            <Text style={styles.saveButtonText}>{saving ? 'Salvataggio...' : 'Salva Configurazione'}</Text>
          </Button>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputGroup: {
    paddingVertical: spacing.sm,
  },
  inputLabel: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.foreground,
    fontSize: fontSize.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  switchInfo: {
    flex: 1,
    marginRight: spacing.lg,
  },
  switchLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  switchDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});

export default SIAESystemConfigScreen;
