import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, TextInput, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

interface LocalSettings {
  cookie_consent_enabled: boolean;
  cookie_consent_text: string;
  privacy_policy_url: string;
  terms_of_service_url: string;
  contact_email: string;
  support_phone: string;
}

type TabId = 'cookies' | 'legal' | 'contact';

export function AdminSiteSettingsScreen({ onBack }: AdminSiteSettingsScreenProps) {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('cookies');
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState<LocalSettings>({
    cookie_consent_enabled: true,
    cookie_consent_text: '',
    privacy_policy_url: '',
    terms_of_service_url: '',
    contact_email: '',
    support_phone: '',
  });

  const tabs: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'cookies', label: 'Cookie', icon: 'finger-print-outline' },
    { id: 'legal', label: 'Legale', icon: 'document-text-outline' },
    { id: 'contact', label: 'Contatti', icon: 'call-outline' },
  ];

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
      setSettings({
        cookie_consent_enabled: data.cookie_consent_enabled ?? true,
        cookie_consent_text: data.cookie_consent_text || '',
        privacy_policy_url: data.privacy_policy_url || '',
        terms_of_service_url: data.terms_of_service_url || '',
        contact_email: data.contact_email || '',
        support_phone: data.support_phone || '',
      });
      setHasChanges(false);
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
      await api.updateAdminSiteSettings(settings);
      setHasChanges(false);
      Alert.alert('Successo', 'Impostazioni salvate con successo');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare le impostazioni');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof LocalSettings>(key: K, value: LocalSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const renderCookiesTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.card} testID="card-cookies">
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: `${staticColors.primary}20` }]}>
            <Ionicons name="finger-print" size={24} color={staticColors.primary} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Consenso Cookie</Text>
            <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
              Configura il banner dei cookie secondo la normativa GDPR
            </Text>
          </View>
        </View>

        <View style={[styles.settingRow, { backgroundColor: `${colors.muted}50` }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.foreground }]}>Abilita Banner Cookie</Text>
            <Text style={[styles.settingDescription, { color: colors.mutedForeground }]}>
              Mostra il banner di consenso cookie ai visitatori
            </Text>
          </View>
          <Switch
            value={settings.cookie_consent_enabled}
            onValueChange={(value) => updateSetting('cookie_consent_enabled', value)}
            trackColor={{ false: colors.border, true: staticColors.primary }}
            thumbColor="#FFFFFF"
            testID="switch-cookie-enabled"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>Testo del Banner</Text>
          <TextInput
            style={[styles.textArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={settings.cookie_consent_text}
            onChangeText={(value) => updateSetting('cookie_consent_text', value)}
            placeholder="Utilizziamo i cookie per migliorare la tua esperienza..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            testID="input-cookie-text"
          />
          <Text style={[styles.inputHint, { color: colors.mutedForeground }]}>
            Questo testo verra mostrato nel banner dei cookie
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>URL Privacy Policy</Text>
          <TextInput
            style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={settings.privacy_policy_url}
            onChangeText={(value) => updateSetting('privacy_policy_url', value)}
            placeholder="https://esempio.com/privacy"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="url"
            autoCapitalize="none"
            testID="input-privacy-url"
          />
          <Text style={[styles.inputHint, { color: colors.mutedForeground }]}>
            Link alla pagina della privacy policy
          </Text>
        </View>
      </Card>
    </View>
  );

  const renderLegalTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.card} testID="card-legal">
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: `${staticColors.teal}20` }]}>
            <Ionicons name="document-text" size={24} color={staticColors.teal} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Documenti Legali</Text>
            <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
              Configura i link ai documenti legali del sito
            </Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>URL Termini di Servizio</Text>
          <TextInput
            style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={settings.terms_of_service_url}
            onChangeText={(value) => updateSetting('terms_of_service_url', value)}
            placeholder="https://esempio.com/termini"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="url"
            autoCapitalize="none"
            testID="input-terms-url"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>URL Privacy Policy</Text>
          <TextInput
            style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={settings.privacy_policy_url}
            onChangeText={(value) => updateSetting('privacy_policy_url', value)}
            placeholder="https://esempio.com/privacy"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="url"
            autoCapitalize="none"
            testID="input-privacy-url-legal"
          />
        </View>
      </Card>
    </View>
  );

  const renderContactTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.card} testID="card-contact">
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: `${staticColors.purple}20` }]}>
            <Ionicons name="call" size={24} color={staticColors.purple} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Informazioni di Contatto</Text>
            <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
              Configura le informazioni di contatto del sito
            </Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>Email di Contatto</Text>
          <TextInput
            style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={settings.contact_email}
            onChangeText={(value) => updateSetting('contact_email', value)}
            placeholder="info@esempio.com"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            testID="input-contact-email"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>Telefono Supporto</Text>
          <TextInput
            style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={settings.support_phone}
            onChangeText={(value) => updateSetting('support_phone', value)}
            placeholder="+39 02 1234567"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="phone-pad"
            testID="input-support-phone"
          />
        </View>
      </Card>
    </View>
  );

  if (showLoader) {
    return (
      <View style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-site-settings" />
        <Loading text="Caricamento impostazioni..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: colors.foreground }]}>Impostazioni Sito</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Gestisci le impostazioni globali del sito, cookie e testi legali
          </Text>
        </View>

        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => {
                triggerHaptic('selection');
                setActiveTab(tab.id);
              }}
              style={[
                styles.tab,
                activeTab === tab.id && [styles.tabActive, { borderBottomColor: staticColors.primary }],
              ]}
              testID={`tab-${tab.id}`}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={activeTab === tab.id ? staticColors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab.id ? staticColors.primary : colors.mutedForeground },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'cookies' && renderCookiesTab()}
        {activeTab === 'legal' && renderLegalTab()}
        {activeTab === 'contact' && renderContactTab()}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {hasChanges && (
        <View style={[styles.saveBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Button
            onPress={handleSave}
            loading={isSaving}
            style={styles.saveButton}
            testID="button-save-settings"
          >
            <Ionicons name="save-outline" size={18} color="#000" style={styles.saveIcon} />
            <Text style={styles.saveButtonText}>Salva Modifiche</Text>
          </Button>
        </View>
      )}
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + 80,
  },
  headerSection: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  tabContent: {
    gap: spacing.md,
  },
  card: {
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontSize: typography.fontSize.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  settingDescription: {
    fontSize: typography.fontSize.sm,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    minHeight: 100,
  },
  inputHint: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
  saveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveIcon: {
    marginRight: spacing.sm,
  },
  saveButtonText: {
    color: '#000',
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: spacing.xxl,
  },
});

export default AdminSiteSettingsScreen;
