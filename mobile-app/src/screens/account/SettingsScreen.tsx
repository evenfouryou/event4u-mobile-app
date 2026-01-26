import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { triggerHaptic } from '@/lib/haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, ThemeMode } from '@/contexts/ThemeContext';
import { useState } from 'react';

interface SettingsScreenProps {
  onBack: () => void;
  onNavigateProfile: () => void;
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
      <View style={[styles.settingIcon, { backgroundColor: destructive ? `${colors.destructive}15` : `${colors.primary}15` }]}>
        <Ionicons 
          name={icon} 
          size={22} 
          color={destructive ? colors.destructive : colors.primary} 
        />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: destructive ? colors.destructive : colors.foreground }]}>
          {label}
        </Text>
        {sublabel && (
          <Text style={[styles.settingSublabel, { color: colors.mutedForeground }]}>{sublabel}</Text>
        )}
      </View>
      {rightElement || (
        onPress && <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
      )}
    </Pressable>
  );
}

export function SettingsScreen({ 
  onBack, 
  onNavigateProfile, 
  onNavigateNameChange,
  onLogout 
}: SettingsScreenProps) {
  const { user, logout } = useAuth();
  const { colors, mode, setMode, isDark } = useTheme();
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
    <SafeArea edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
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
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Account</Text>
          <Card style={styles.settingsCard}>
            <SettingItem
              icon="person-outline"
              label="Profilo"
              sublabel={user?.email || 'Modifica i tuoi dati personali'}
              onPress={onNavigateProfile}
              testID="setting-profile"
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
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
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Aspetto</Text>
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
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Notifiche</Text>
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
                  trackColor={{ false: colors.muted, true: colors.primary }}
                  thumbColor={colors.foreground}
                />
              }
              testID="setting-notifications"
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
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
                  trackColor={{ false: colors.muted, true: colors.primary }}
                  thumbColor={colors.foreground}
                />
              }
              testID="setting-email-notifications"
              colors={colors}
            />
          </Card>
        </View>

        <View>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Supporto</Text>
          <Card style={styles.settingsCard}>
            <SettingItem
              icon="help-circle-outline"
              label="Centro Assistenza"
              sublabel="FAQ e supporto"
              onPress={() => Alert.alert('Centro Assistenza', 'Visita help.eventfouryou.com')}
              testID="setting-help"
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingItem
              icon="chatbubble-outline"
              label="Contattaci"
              sublabel="support@eventfouryou.com"
              onPress={() => Alert.alert('Contattaci', 'Scrivi a support@eventfouryou.com')}
              testID="setting-contact"
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingItem
              icon="document-text-outline"
              label="Termini e Condizioni"
              onPress={() => Alert.alert('Termini', 'Visita eventfouryou.com/terms')}
              testID="setting-terms"
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
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
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Sicurezza</Text>
          <Card style={styles.settingsCard}>
            <SettingItem
              icon="log-out-outline"
              label="Esci"
              sublabel="Disconnetti il tuo account"
              onPress={handleLogout}
              testID="setting-logout"
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
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
          <Text style={[styles.versionText, { color: colors.mutedForeground }]}>Event4U v1.0.0</Text>
          <Text style={[styles.copyrightText, { color: colors.mutedForeground }]}>© 2026 Event4U. Tutti i diritti riservati.</Text>
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
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  versionText: {
    fontSize: typography.fontSize.sm,
  },
  copyrightText: {
    fontSize: typography.fontSize.xs,
  },
});
