import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { triggerHaptic } from '@/lib/haptics';
import { useAuth } from '@/contexts/AuthContext';
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
}

function SettingItem({ icon, label, sublabel, onPress, rightElement, destructive, testID }: SettingItemProps) {
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
      <View style={[styles.settingIcon, destructive && styles.settingIconDestructive]}>
        <Ionicons 
          name={icon} 
          size={22} 
          color={destructive ? colors.destructive : colors.primary} 
        />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, destructive && styles.settingLabelDestructive]}>
          {label}
        </Text>
        {sublabel && (
          <Text style={styles.settingSublabel}>{sublabel}</Text>
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
  const { user } = useAuth();
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
          onPress: () => {
            triggerHaptic('medium');
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

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
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
          <Text style={styles.sectionTitle}>Account</Text>
          <Card style={styles.settingsCard}>
            <SettingItem
              icon="person-outline"
              label="Profilo"
              sublabel={user?.email || 'Modifica i tuoi dati personali'}
              onPress={onNavigateProfile}
              testID="setting-profile"
            />
            <View style={styles.divider} />
            <SettingItem
              icon="id-card-outline"
              label="Cambio Nominativo"
              sublabel="Seleziona un biglietto per modificare intestatario"
              onPress={onNavigateNameChange}
              testID="setting-name-change"
            />
          </Card>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Notifiche</Text>
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
            />
            <View style={styles.divider} />
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
            />
          </Card>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Supporto</Text>
          <Card style={styles.settingsCard}>
            <SettingItem
              icon="help-circle-outline"
              label="Centro Assistenza"
              sublabel="FAQ e supporto"
              onPress={() => Alert.alert('Centro Assistenza', 'Visita help.eventfouryou.com')}
              testID="setting-help"
            />
            <View style={styles.divider} />
            <SettingItem
              icon="chatbubble-outline"
              label="Contattaci"
              sublabel="support@eventfouryou.com"
              onPress={() => Alert.alert('Contattaci', 'Scrivi a support@eventfouryou.com')}
              testID="setting-contact"
            />
            <View style={styles.divider} />
            <SettingItem
              icon="document-text-outline"
              label="Termini e Condizioni"
              onPress={() => Alert.alert('Termini', 'Visita eventfouryou.com/terms')}
              testID="setting-terms"
            />
            <View style={styles.divider} />
            <SettingItem
              icon="shield-outline"
              label="Privacy Policy"
              onPress={() => Alert.alert('Privacy', 'Visita eventfouryou.com/privacy')}
              testID="setting-privacy"
            />
          </Card>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Sicurezza</Text>
          <Card style={styles.settingsCard}>
            <SettingItem
              icon="log-out-outline"
              label="Esci"
              sublabel="Disconnetti il tuo account"
              onPress={handleLogout}
              testID="setting-logout"
            />
            <View style={styles.divider} />
            <SettingItem
              icon="trash-outline"
              label="Elimina Account"
              sublabel="Elimina permanentemente i tuoi dati"
              onPress={handleDeleteAccount}
              destructive
              testID="setting-delete-account"
            />
          </Card>
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Event4U v1.0.0</Text>
          <Text style={styles.copyrightText}>© 2026 Event4U. Tutti i diritti riservati.</Text>
        </View>
      </ScrollView>
    </SafeArea>
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
  scrollContent: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.mutedForeground,
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
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDestructive: {
    backgroundColor: `${colors.destructive}15`,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.foreground,
  },
  settingLabelDestructive: {
    color: colors.destructive,
  },
  settingSublabel: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 40 + spacing.md,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  versionText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  copyrightText: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
});
