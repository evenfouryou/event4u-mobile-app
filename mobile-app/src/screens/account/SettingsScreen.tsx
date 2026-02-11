import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { LanguageSelector } from '@/components/LanguageSelector';
import { triggerHaptic } from '@/lib/haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, ThemeMode } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';

interface SettingsScreenProps {
  onBack: () => void;
  onNavigateProfile: () => void;
  onNavigateIdentityDocument: () => void;
  onNavigateNameChange: () => void;
  onLogout: () => void;
}

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
  testID?: string;
  colors: ReturnType<typeof useTheme>['colors'];
}

function SettingItem({ icon, label, sublabel, onPress, rightElement, destructive, testID, colors }: SettingItemProps) {
  return (
    <Pressable
      onPress={() => {
        if (onPress) {
          triggerHaptic('light');
          onPress();
        }
      }}
      style={styles.settingItem}
      testID={testID}
    >
      <View style={[styles.settingIcon, { backgroundColor: destructive ? `${staticColors.destructive}15` : `${staticColors.primary}15` }]}>
        <Ionicons 
          name={icon} 
          size={22} 
          color={destructive ? staticColors.destructive : staticColors.primary} 
        />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: destructive ? staticColors.destructive : staticColors.foreground }]}>
          {label}
        </Text>
        {sublabel && (
          <Text style={[styles.settingSublabel, { color: staticColors.mutedForeground }]}>{sublabel}</Text>
        )}
      </View>
      {rightElement || (
        onPress && <Ionicons name="chevron-forward" size={20} color={staticColors.mutedForeground} />
      )}
    </Pressable>
  );
}

export function SettingsScreen({ 
  onBack, 
  onNavigateProfile, 
  onNavigateIdentityDocument,
  onNavigateNameChange,
  onLogout 
}: SettingsScreenProps) {
  const { user, logout } = useAuth();
  const { colors, mode, setMode, isDark } = useTheme();
  const { t } = useLanguage();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Conferma Logout',
      'Sei sicuro di voler uscire dal tuo account?',
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Esci', 
          style: 'destructive',
          onPress: async () => {
            triggerHaptic('medium');
            await logout();
            onLogout();
          }
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Elimina Account',
      'Questa azione è irreversibile. Tutti i tuoi dati verranno eliminati permanentemente.',
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Elimina', 
          style: 'destructive',
          onPress: () => {
            triggerHaptic('heavy');
            Alert.alert('Contatta il supporto', 'Per eliminare il tuo account, contatta support@eventfouryou.com');
          }
        },
      ]
    );
  };

  const handleThemeChange = () => {
    const options: { label: string; value: ThemeMode }[] = [
      { label: 'Automatico (sistema)', value: 'auto' },
      { label: 'Chiaro', value: 'light' },
      { label: 'Scuro', value: 'dark' },
    ];
    
    Alert.alert(
      'Tema',
      'Seleziona il tema dell\'app',
      [
        ...options.map(option => ({
          text: option.value === mode ? `${option.label} ✓` : option.label,
          onPress: () => {
            triggerHaptic('selection');
            setMode(option.value);
          },
        })),
        { text: 'Annulla', style: 'cancel' },
      ]
    );
  };

  const getThemeLabel = () => {
    switch (mode) {
      case 'auto': return 'Automatico';
      case 'light': return 'Chiaro';
      case 'dark': return 'Scuro';
    }
  };

  return (
    <SafeArea edges={['bottom']} style={{ flex: 1, backgroundColor: staticColors.background }}>
      <Header
        title="Impostazioni"
        showBack
        onBack={onBack}
        testID="header-settings"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={[styles.sectionTitle, { color: staticColors.mutedForeground }]}>Account</Text>
          <Card style={styles.settingsCard}>
            <SettingItem
              icon="person-outline"
              label="Profilo"
              sublabel={user?.email || 'Modifica i tuoi dati personali'}
              onPress={onNavigateProfile}
              testID="setting-profile"
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: staticColors.border }]} />
            <SettingItem
              icon="shield-checkmark-outline"
              label="Verifica Documento"
              sublabel="Carica documento d'identità"
              onPress={onNavigateIdentityDocument}
              testID="setting-identity-document"
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: staticColors.border }]} />
            <SettingItem
              icon="id-card-outline"
              label="Cambio Nominativo"
              sublabel="Seleziona un biglietto per modificare intestatario"
              onPress={onNavigateNameChange}
              testID="setting-name-change"
              colors={colors}
            />
          </Card>
        </View>

        <View>
          <Text style={[styles.sectionTitle, { color: staticColors.mutedForeground }]}>Aspetto</Text>
          <Card style={styles.settingsCard}>
            <SettingItem
              icon={isDark ? 'moon-outline' : 'sunny-outline'}
              label="Tema"
              sublabel={getThemeLabel()}
              onPress={handleThemeChange}
              testID="setting-theme"
              colors={colors}
            />
          </Card>
        </View>

        <View>
          <Text style={[styles.sectionTitle, { color: staticColors.mutedForeground }]}>{t('settings.language')}</Text>
          <Card style={styles.settingsCard}>
            <View style={styles.languageRow}>
              <View style={styles.languageLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${staticColors.primary}15` }]}>
                  <Ionicons name="globe-outline" size={22} color={staticColors.primary} />
                </View>
                <Text style={[styles.settingLabel, { color: staticColors.foreground }]}>{t('languages.selectLanguage')}</Text>
              </View>
              <LanguageSelector compact />
            </View>
          </Card>
        </View>

        <View>
          <Text style={[styles.sectionTitle, { color: staticColors.mutedForeground }]}>Notifiche</Text>
          <Card style={styles.settingsCard}>
            <SettingItem
              icon="notifications-outline"
              label="Notifiche Push"
              sublabel="Ricevi aggiornamenti sugli eventi"
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={(value) => {
                    triggerHaptic('selection');
                    setNotificationsEnabled(value);
                  }}
                  trackColor={{ false: staticColors.muted, true: staticColors.primary }}
                  thumbColor={staticColors.foreground}
                />
              }
              testID="setting-notifications"
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: staticColors.border }]} />
            <SettingItem
              icon="mail-outline"
              label="Notifiche Email"
              sublabel="Ricevi email promozionali"
              rightElement={
                <Switch
                  value={emailNotifications}
                  onValueChange={(value) => {
                    triggerHaptic('selection');
                    setEmailNotifications(value);
                  }}
                  trackColor={{ false: staticColors.muted, true: staticColors.primary }}
                  thumbColor={staticColors.foreground}
                />
              }
              testID="setting-email-notifications"
              colors={colors}
            />
          </Card>
        </View>

        <View>
          <Text style={[styles.sectionTitle, { color: staticColors.mutedForeground }]}>Supporto</Text>
          <Card style={styles.settingsCard}>
            <SettingItem
              icon="help-circle-outline"
              label="Centro Assistenza"
              sublabel="FAQ e supporto"
              onPress={() => Alert.alert('Centro Assistenza', 'Visita help.eventfouryou.com')}
              testID="setting-help"
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: staticColors.border }]} />
            <SettingItem
              icon="chatbubble-outline"
              label="Contattaci"
              sublabel="support@eventfouryou.com"
              onPress={() => Alert.alert('Contattaci', 'Scrivi a support@eventfouryou.com')}
              testID="setting-contact"
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: staticColors.border }]} />
            <SettingItem
              icon="document-text-outline"
              label="Termini e Condizioni"
              onPress={() => Alert.alert('Termini', 'Visita eventfouryou.com/terms')}
              testID="setting-terms"
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: staticColors.border }]} />
            <SettingItem
              icon="shield-outline"
              label="Privacy Policy"
              onPress={() => Alert.alert('Privacy', 'Visita eventfouryou.com/privacy')}
              testID="setting-privacy"
              colors={colors}
            />
          </Card>
        </View>

        <View>
          <Text style={[styles.sectionTitle, { color: staticColors.mutedForeground }]}>Sicurezza</Text>
          <Card style={styles.settingsCard}>
            <SettingItem
              icon="log-out-outline"
              label="Esci"
              sublabel="Disconnetti il tuo account"
              onPress={handleLogout}
              testID="setting-logout"
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: staticColors.border }]} />
            <SettingItem
              icon="trash-outline"
              label="Elimina Account"
              sublabel="Elimina permanentemente i tuoi dati"
              onPress={handleDeleteAccount}
              destructive
              testID="setting-delete-account"
              colors={colors}
            />
          </Card>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: staticColors.mutedForeground }]}>Event Four You v1.0.0</Text>
          <Text style={[styles.copyrightText, { color: staticColors.mutedForeground }]}>© 2026 Event Four You. Tutti i diritti riservati.</Text>
        </View>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  settingsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
  },
  settingSublabel: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: spacing.md + 40 + spacing.md,
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.xs,
  },
  versionText: {
    fontSize: typography.fontSize.sm,
  },
  copyrightText: {
    fontSize: typography.fontSize.xs,
  },
});
