import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, TextInput, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SiteSettings as APISiteSettings } from '@/lib/api';

interface AdminSiteSettingsScreenProps {
  onBack: () => void;
}

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  contactEmail: string;
  supportPhone: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  emailVerificationRequired: boolean;
  maxEventsPerGestore: number;
  defaultCommissionRate: number;
}

export function AdminSiteSettingsScreen({ onBack }: AdminSiteSettingsScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: 'Event4U',
    siteDescription: 'Piattaforma di gestione eventi e biglietteria',
    primaryColor: '#FFD700',
    secondaryColor: '#00CED1',
    logoUrl: '',
    contactEmail: 'support@event4u.it',
    supportPhone: '+39 02 1234567',
    maintenanceMode: false,
    registrationEnabled: true,
    emailVerificationRequired: true,
    maxEventsPerGestore: 50,
    defaultCommissionRate: 5,
  });

  useEffect(() => {
    loadSettings();
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

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdminSiteSettings();
      setSettings(prev => ({
        ...prev,
        maintenanceMode: data.maintenanceMode,
        registrationEnabled: data.allowRegistrations,
        contactEmail: data.supportEmail || prev.contactEmail,
      }));
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSettings();
    setRefreshing(false);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      triggerHaptic('medium');
      await api.updateAdminSiteSettings({
        maintenanceMode: settings.maintenanceMode,
        allowRegistrations: settings.registrationEnabled,
        supportEmail: settings.contactEmail,
      });
      Alert.alert('Successo', 'Impostazioni salvate con successo');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare le impostazioni');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const colorPresets = [
    { name: 'Oro', color: '#FFD700' },
    { name: 'Teal', color: '#00CED1' },
    { name: 'Viola', color: '#8B5CF6' },
    { name: 'Rosa', color: '#EC4899' },
    { name: 'Blu', color: '#3B82F6' },
    { name: 'Verde', color: '#10B981' },
  ];

  if (showLoader) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header showLogo showBack onBack={onBack} testID="header-site-settings" />
        <Loading text="Caricamento impostazioni..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header showLogo showBack onBack={onBack} testID="header-site-settings" />

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
        <Text style={styles.title}>Impostazioni Sito</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informazioni Generali</Text>
          <Card style={styles.sectionCard} testID="card-general-info">
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome Sito</Text>
              <TextInput
                style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
                value={settings.siteName}
                onChangeText={(value) => updateSetting('siteName', value)}
                placeholderTextColor={colors.mutedForeground}
                testID="input-site-name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Descrizione</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, { color: colors.foreground, borderColor: colors.border }]}
                value={settings.siteDescription}
                onChangeText={(value) => updateSetting('siteDescription', value)}
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                testID="input-site-description"
              />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Colori Tema</Text>
          <Card style={styles.sectionCard} testID="card-theme-colors">
            <Text style={styles.inputLabel}>Colore Primario</Text>
            <View style={styles.colorGrid}>
              {colorPresets.map((preset) => (
                <Pressable
                  key={preset.color}
                  onPress={() => {
                    triggerHaptic('light');
                    updateSetting('primaryColor', preset.color);
                  }}
                  style={[
                    styles.colorPreset,
                    { backgroundColor: preset.color },
                    settings.primaryColor === preset.color && styles.colorPresetSelected,
                  ]}
                  testID={`color-primary-${preset.name.toLowerCase()}`}
                >
                  {settings.primaryColor === preset.color && (
                    <Ionicons name="checkmark" size={20} color="#000" />
                  )}
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Colore Secondario</Text>
            <View style={styles.colorGrid}>
              {colorPresets.map((preset) => (
                <Pressable
                  key={preset.color}
                  onPress={() => {
                    triggerHaptic('light');
                    updateSetting('secondaryColor', preset.color);
                  }}
                  style={[
                    styles.colorPreset,
                    { backgroundColor: preset.color },
                    settings.secondaryColor === preset.color && styles.colorPresetSelected,
                  ]}
                  testID={`color-secondary-${preset.name.toLowerCase()}`}
                >
                  {settings.secondaryColor === preset.color && (
                    <Ionicons name="checkmark" size={20} color="#000" />
                  )}
                </Pressable>
              ))}
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contatti</Text>
          <Card style={styles.sectionCard} testID="card-contacts">
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Supporto</Text>
              <TextInput
                style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
                value={settings.contactEmail}
                onChangeText={(value) => updateSetting('contactEmail', value)}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                testID="input-contact-email"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Telefono Supporto</Text>
              <TextInput
                style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
                value={settings.supportPhone}
                onChangeText={(value) => updateSetting('supportPhone', value)}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                testID="input-support-phone"
              />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configurazione Sistema</Text>
          <Card style={styles.sectionCard} testID="card-system-config">
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Modalità Manutenzione</Text>
                <Text style={styles.switchDescription}>Disabilita l'accesso pubblico al sito</Text>
              </View>
              <Switch
                value={settings.maintenanceMode}
                onValueChange={(value) => updateSetting('maintenanceMode', value)}
                trackColor={{ false: staticColors.secondary, true: staticColors.primary }}
                thumbColor={staticColors.foreground}
                testID="switch-maintenance-mode"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Registrazione Abilitata</Text>
                <Text style={styles.switchDescription}>Permetti nuove registrazioni gestori</Text>
              </View>
              <Switch
                value={settings.registrationEnabled}
                onValueChange={(value) => updateSetting('registrationEnabled', value)}
                trackColor={{ false: staticColors.secondary, true: staticColors.primary }}
                thumbColor={staticColors.foreground}
                testID="switch-registration-enabled"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Verifica Email Obbligatoria</Text>
                <Text style={styles.switchDescription}>Richiedi verifica email per attivazione</Text>
              </View>
              <Switch
                value={settings.emailVerificationRequired}
                onValueChange={(value) => updateSetting('emailVerificationRequired', value)}
                trackColor={{ false: staticColors.secondary, true: staticColors.primary }}
                thumbColor={staticColors.foreground}
                testID="switch-email-verification"
              />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Limiti e Commissioni</Text>
          <Card style={styles.sectionCard} testID="card-limits">
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Max Eventi per Gestore</Text>
              <TextInput
                style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
                value={String(settings.maxEventsPerGestore)}
                onChangeText={(value) => updateSetting('maxEventsPerGestore', parseInt(value) || 0)}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                testID="input-max-events"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Commissione Default (%)</Text>
              <TextInput
                style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
                value={String(settings.defaultCommissionRate)}
                onChangeText={(value) => updateSetting('defaultCommissionRate', parseFloat(value) || 0)}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
                testID="input-commission-rate"
              />
            </View>
          </Card>
        </View>

        <View style={styles.saveSection}>
          <Button
            onPress={handleSave}
            loading={isSaving}
            variant="golden"
            testID="button-save-settings"
          >
            Salva Impostazioni
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
  textArea: {
    height: 80,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  colorPreset: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPresetSelected: {
    borderWidth: 3,
    borderColor: staticColors.foreground,
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
