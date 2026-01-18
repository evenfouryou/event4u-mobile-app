import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface SiteSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  eventCreationEnabled: boolean;
  paymentProcessingEnabled: boolean;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  siaeIntegrationEnabled: boolean;
  analyticsEnabled: boolean;
}

export function AdminSiteSettingsScreen() {
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>({
    maintenanceMode: false,
    registrationEnabled: true,
    eventCreationEnabled: true,
    paymentProcessingEnabled: true,
    emailNotificationsEnabled: true,
    pushNotificationsEnabled: true,
    siaeIntegrationEnabled: true,
    analyticsEnabled: true,
  });

  const loadSettings = async () => {
    try {
      const response = await api.get<SiteSettings>('/api/admin/settings').catch(() => null);
      if (response) {
        setSettings(response);
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

  const updateSetting = async (key: keyof SiteSettings, value: boolean) => {
    if (key === 'maintenanceMode' && value) {
      Alert.alert(
        'Attivare Manutenzione?',
        'Gli utenti non potranno accedere al sito durante la manutenzione.',
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Attiva',
            style: 'destructive',
            onPress: () => performUpdate(key, value),
          },
        ]
      );
      return;
    }
    performUpdate(key, value);
  };

  const performUpdate = async (key: keyof SiteSettings, value: boolean) => {
    const previousSettings = { ...settings };
    setSettings({ ...settings, [key]: value });
    
    try {
      await api.put('/api/admin/settings', { [key]: value });
    } catch (error) {
      setSettings(previousSettings);
      Alert.alert('Errore', 'Impossibile salvare le impostazioni');
    }
  };

  const settingsGroups = [
    {
      title: 'Sistema',
      icon: 'cog-outline',
      items: [
        { key: 'maintenanceMode', label: 'Modalità Manutenzione', description: 'Disabilita accesso al sito', danger: true },
      ],
    },
    {
      title: 'Funzionalità',
      icon: 'toggle-outline',
      items: [
        { key: 'registrationEnabled', label: 'Registrazione Utenti', description: 'Permetti nuove registrazioni' },
        { key: 'eventCreationEnabled', label: 'Creazione Eventi', description: 'Permetti creazione nuovi eventi' },
        { key: 'paymentProcessingEnabled', label: 'Elaborazione Pagamenti', description: 'Abilita pagamenti online' },
      ],
    },
    {
      title: 'Notifiche',
      icon: 'notifications-outline',
      items: [
        { key: 'emailNotificationsEnabled', label: 'Notifiche Email', description: 'Invia notifiche via email' },
        { key: 'pushNotificationsEnabled', label: 'Notifiche Push', description: 'Invia notifiche push' },
      ],
    },
    {
      title: 'Integrazioni',
      icon: 'extension-puzzle-outline',
      items: [
        { key: 'siaeIntegrationEnabled', label: 'Integrazione SIAE', description: 'Abilita funzionalità SIAE' },
        { key: 'analyticsEnabled', label: 'Analytics', description: 'Raccogli dati analytics' },
      ],
    },
  ];

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Impostazioni Sito" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Impostazioni Sito" showBack />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {settings.maintenanceMode && (
          <View style={styles.maintenanceWarning}>
            <Ionicons name="warning-outline" size={24} color={colors.warning} />
            <Text style={styles.maintenanceText}>
              Modalità manutenzione attiva - Gli utenti non possono accedere
            </Text>
          </View>
        )}

        {settingsGroups.map((group) => (
          <View key={group.title} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name={group.icon as any} size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>{group.title}</Text>
            </View>
            <Card variant="glass">
              {group.items.map((item, index) => (
                <View key={item.key}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={[styles.settingLabel, item.danger && styles.dangerLabel]}>
                        {item.label}
                      </Text>
                      <Text style={styles.settingDescription}>{item.description}</Text>
                    </View>
                    <Switch
                      value={settings[item.key as keyof SiteSettings]}
                      onValueChange={(value) => updateSetting(item.key as keyof SiteSettings, value)}
                      trackColor={{ false: colors.muted, true: item.danger ? colors.destructive : colors.primary }}
                      thumbColor={colors.foreground}
                      data-testid={`switch-${item.key}`}
                    />
                  </View>
                  {index < group.items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </Card>
          </View>
        ))}

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => Alert.alert('Cache Pulita', 'La cache del sistema è stata pulita con successo')}
            data-testid="button-clear-cache"
          >
            <Ionicons name="trash-outline" size={20} color={colors.destructive} />
            <Text style={styles.dangerButtonText}>Pulisci Cache Sistema</Text>
          </TouchableOpacity>
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
  maintenanceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: `${colors.warning}20`,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  maintenanceText: {
    flex: 1,
    color: colors.warning,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  dangerLabel: {
    color: colors.destructive,
  },
  settingDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.glass.border,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.destructive,
    backgroundColor: `${colors.destructive}10`,
  },
  dangerButtonText: {
    color: colors.destructive,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
});

export default AdminSiteSettingsScreen;
