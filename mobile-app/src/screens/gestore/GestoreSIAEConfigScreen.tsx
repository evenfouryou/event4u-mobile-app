import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, TextInput, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { Button } from '@/components/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAEConfig } from '@/lib/api';

interface GestoreSIAEConfigScreenProps {
  onBack: () => void;
}

export function GestoreSIAEConfigScreen({ onBack }: GestoreSIAEConfigScreenProps) {
  const { colors } = useTheme();
  const [config, setConfig] = useState<SIAEConfig>({
    codiceFiscale: '',
    partitaIVA: '',
    smartCardConnected: false,
    emailAddress: '',
    defaultCategories: [],
    printerConfigured: false,
    printerName: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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
      const data = await api.getSIAEConfig();
      setConfig(data);
      setHasChanges(false);
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
      setSaving(true);
      triggerHaptic('medium');
      await api.updateSIAEConfig(config);
      setHasChanges(false);
      Alert.alert('Successo', 'Configurazione salvata con successo');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare la configurazione');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      triggerHaptic('medium');
      const result = await api.testSIAEConnection();
      if (result.success) {
        Alert.alert('Connessione OK', result.message || 'Connessione al sistema SIAE verificata con successo');
      } else {
        Alert.alert('Errore Connessione', result.message || 'Impossibile connettersi al sistema SIAE');
      }
    } catch (error) {
      Alert.alert('Errore', 'Test di connessione fallito');
    } finally {
      setTesting(false);
    }
  };

  const updateConfig = (key: keyof SIAEConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-siae-config"
      />

      {showLoader ? (
        <Loading text="Caricamento configurazione..." />
      ) : (
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
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Configurazione SIAE</Text>
            <Text style={styles.subtitle}>Gestisci le impostazioni del modulo SIAE</Text>
          </View>

          <Card style={styles.section} testID="section-credentials">
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="key-outline" size={20} color={staticColors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Credenziali</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Codice Fiscale</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Inserisci codice fiscale"
                placeholderTextColor={colors.mutedForeground}
                value={config.codiceFiscale}
                onChangeText={(text) => updateConfig('codiceFiscale', text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={16}
                testID="input-codice-fiscale"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Partita IVA</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Inserisci partita IVA"
                placeholderTextColor={colors.mutedForeground}
                value={config.partitaIVA}
                onChangeText={(text) => updateConfig('partitaIVA', text)}
                keyboardType="numeric"
                maxLength={11}
                testID="input-partita-iva"
              />
            </View>
          </Card>

          <Card style={styles.section} testID="section-smart-card">
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="card-outline" size={20} color={staticColors.teal} />
              </View>
              <Text style={styles.sectionTitle}>Lettore Smart Card</Text>
            </View>

            <View style={styles.statusRow}>
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>Stato connessione</Text>
                <Text style={styles.statusDescription}>Lettore smart card SIAE</Text>
              </View>
              <Badge variant={config.smartCardConnected ? 'success' : 'destructive'}>
                {config.smartCardConnected ? 'Connesso' : 'Disconnesso'}
              </Badge>
            </View>

            {!config.smartCardConnected && (
              <View style={styles.warningBanner}>
                <Ionicons name="warning" size={16} color={staticColors.warning} />
                <Text style={styles.warningText}>
                  Collega il lettore smart card per abilitare le funzioni SIAE
                </Text>
              </View>
            )}
          </Card>

          <Card style={styles.section} testID="section-email">
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="mail-outline" size={20} color={staticColors.purple} />
              </View>
              <Text style={styles.sectionTitle}>Impostazioni Email</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email per trasmissioni</Text>
              <TextInput
                style={styles.textInput}
                placeholder="email@esempio.it"
                placeholderTextColor={colors.mutedForeground}
                value={config.emailAddress}
                onChangeText={(text) => updateConfig('emailAddress', text.toLowerCase())}
                keyboardType="email-address"
                autoCapitalize="none"
                testID="input-email"
              />
            </View>
          </Card>

          <Card style={styles.section} testID="section-printer">
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="print-outline" size={20} color={staticColors.golden} />
              </View>
              <Text style={styles.sectionTitle}>Stampante</Text>
            </View>

            <View style={styles.statusRow}>
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>Stampante configurata</Text>
                <Text style={styles.statusDescription}>
                  {config.printerName || 'Nessuna stampante selezionata'}
                </Text>
              </View>
              <Badge variant={config.printerConfigured ? 'success' : 'secondary'}>
                {config.printerConfigured ? 'Configurata' : 'Non configurata'}
              </Badge>
            </View>

            {config.printerConfigured && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome stampante</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nome stampante"
                  placeholderTextColor={colors.mutedForeground}
                  value={config.printerName}
                  onChangeText={(text) => updateConfig('printerName', text)}
                  testID="input-printer-name"
                />
              </View>
            )}
          </Card>

          <Card style={styles.section} testID="section-categories">
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="pricetag-outline" size={20} color={staticColors.pink} />
              </View>
              <Text style={styles.sectionTitle}>Categorie Biglietto Default</Text>
            </View>

            <View style={styles.categoriesContainer}>
              {config.defaultCategories.length > 0 ? (
                config.defaultCategories.map((category, index) => (
                  <View key={index} style={styles.categoryChip}>
                    <Text style={styles.categoryText}>{category}</Text>
                    <Pressable
                      onPress={() => {
                        const updated = config.defaultCategories.filter((_, i) => i !== index);
                        updateConfig('defaultCategories', updated);
                      }}
                      testID={`remove-category-${index}`}
                    >
                      <Ionicons name="close-circle" size={16} color={staticColors.mutedForeground} />
                    </Pressable>
                  </View>
                ))
              ) : (
                <Text style={styles.noCategoriesText}>Nessuna categoria configurata</Text>
              )}
            </View>
          </Card>

          <View style={styles.actionsContainer}>
            <Pressable
              style={[styles.testButton, testing && styles.buttonDisabled]}
              onPress={handleTestConnection}
              disabled={testing}
              testID="button-test-connection"
            >
              {testing ? (
                <Loading size="small" />
              ) : (
                <>
                  <Ionicons name="wifi-outline" size={20} color={staticColors.teal} />
                  <Text style={styles.testButtonText}>Test Connessione</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[
                styles.saveButton,
                (!hasChanges || saving) && styles.buttonDisabled,
              ]}
              onPress={handleSave}
              disabled={!hasChanges || saving}
              testID="button-save-config"
            >
              {saving ? (
                <Loading size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Salva Configurazione</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      )}
    </SafeArea>
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
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  titleContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 4,
  },
  section: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: `${staticColors.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statusInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  statusLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  statusDescription: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: `${staticColors.warning}10`,
    borderRadius: borderRadius.md,
  },
  warningText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: staticColors.warning,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
  },
  noCategoriesText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    fontStyle: 'italic',
  },
  actionsContainer: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: `${staticColors.teal}20`,
    borderWidth: 1,
    borderColor: staticColors.teal,
  },
  testButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.teal,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: staticColors.primary,
  },
  saveButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: '#000000',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default GestoreSIAEConfigScreen;
