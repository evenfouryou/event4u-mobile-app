import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';

interface AdminSettingsScreenProps {
  onBack: () => void;
  onLogout: () => void;
}

export function AdminSettingsScreen({ onBack, onLogout }: AdminSettingsScreenProps) {
  const { user, logout } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const handleLogout = async () => {
    Alert.alert(
      'Conferma Logout',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: async () => {
            await logout();
            onLogout();
          },
        },
      ]
    );
  };

  const settingsSections = [
    {
      title: 'Sistema',
      items: [
        {
          id: 'maintenance',
          icon: 'construct-outline' as const,
          label: 'Modalità Manutenzione',
          description: 'Disabilita accesso pubblico',
          type: 'switch' as const,
          value: maintenanceMode,
          onToggle: () => {
            Alert.alert(
              'Conferma',
              maintenanceMode ? 'Disattivare la modalità manutenzione?' : 'Attivare la modalità manutenzione?',
              [
                { text: 'Annulla', style: 'cancel' },
                { text: 'Conferma', onPress: () => setMaintenanceMode(!maintenanceMode) },
              ]
            );
          },
        },
        {
          id: 'registration',
          icon: 'person-add-outline' as const,
          label: 'Registrazione Gestori',
          description: 'Permetti nuove registrazioni',
          type: 'switch' as const,
          value: registrationEnabled,
          onToggle: () => setRegistrationEnabled(!registrationEnabled),
        },
      ],
    },
    {
      title: 'Aspetto',
      items: [
        {
          id: 'darkMode',
          icon: 'moon-outline' as const,
          label: 'Tema Scuro',
          type: 'switch' as const,
          value: isDark,
          onToggle: toggleTheme,
        },
      ],
    },
    {
      title: 'Notifiche',
      items: [
        {
          id: 'emailNotifications',
          icon: 'mail-outline' as const,
          label: 'Notifiche Email Admin',
          type: 'switch' as const,
          value: emailNotifications,
          onToggle: () => setEmailNotifications(!emailNotifications),
        },
      ],
    },
    {
      title: 'Supporto',
      items: [
        {
          id: 'logs',
          icon: 'document-text-outline' as const,
          label: 'Log di Sistema',
          type: 'link' as const,
          onPress: () => Alert.alert('Info', 'Accedi ai log dal pannello web'),
        },
        {
          id: 'cache',
          icon: 'trash-outline' as const,
          label: 'Pulisci Cache',
          type: 'link' as const,
          onPress: () => Alert.alert('Successo', 'Cache pulita'),
        },
        {
          id: 'about',
          icon: 'information-circle-outline' as const,
          label: 'Informazioni Sistema',
          type: 'link' as const,
          onPress: () => Alert.alert('Event4U Admin', 'Versione 1.0.0\nServer: Production'),
        },
      ],
    },
  ];

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-settings"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.userCard}>
          <View style={styles.userInfo}>
            <View style={[styles.userAvatar, { backgroundColor: `${staticColors.destructive}20` }]}>
              <Ionicons name="shield" size={32} color={staticColors.destructive} />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>
          <Badge variant="destructive">Super Admin</Badge>
        </View>

        {settingsSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Card style={styles.sectionCard}>
              {section.items.map((item, index) => (
                <View key={item.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <Pressable
                    onPress={() => {
                      if (item.type === 'link' && item.onPress) {
                        triggerHaptic('light');
                        item.onPress();
                      }
                    }}
                    style={styles.settingItem}
                    testID={`setting-${item.id}`}
                  >
                    <View style={styles.settingLeft}>
                      <View style={[styles.settingIcon, { backgroundColor: `${staticColors.primary}15` }]}>
                        <Ionicons name={item.icon} size={20} color={staticColors.primary} />
                      </View>
                      <View style={styles.settingText}>
                        <Text style={styles.settingLabel}>{item.label}</Text>
                        {'description' in item && item.description && (
                          <Text style={styles.settingDescription}>{item.description}</Text>
                        )}
                      </View>
                    </View>
                    {item.type === 'switch' ? (
                      <Switch
                        value={item.value}
                        onValueChange={item.onToggle}
                        trackColor={{ false: staticColors.secondary, true: staticColors.primary }}
                        thumbColor={staticColors.foreground}
                      />
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                    )}
                  </Pressable>
                </View>
              ))}
            </Card>
          </View>
        ))}

        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Zona Pericolosa</Text>
          <Card style={styles.dangerCard}>
            <Pressable
              onPress={() => {
                Alert.alert(
                  'Attenzione',
                  'Questa azione resetterà tutti i dati di test. Continuare?',
                  [
                    { text: 'Annulla', style: 'cancel' },
                    { text: 'Reset', style: 'destructive', onPress: () => {} },
                  ]
                );
              }}
              style={styles.dangerItem}
            >
              <Ionicons name="warning-outline" size={20} color={staticColors.destructive} />
              <Text style={styles.dangerText}>Reset Dati di Test</Text>
            </Pressable>
          </Card>
        </View>

        <View style={styles.logoutSection}>
          <Pressable
            onPress={() => {
              triggerHaptic('medium');
              handleLogout();
            }}
            style={styles.logoutButton}
            testID="button-logout"
          >
            <Ionicons name="log-out-outline" size={20} color={staticColors.destructive} />
            <Text style={styles.logoutText}>Esci</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>Event4U Admin v1.0.0</Text>
      </ScrollView>
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
    paddingBottom: spacing.xxl,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.lg,
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    gap: 2,
  },
  userName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  userEmail: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  section: {
    marginTop: spacing.lg,
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
    padding: 0,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  settingDescription: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginLeft: 60,
  },
  dangerZone: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  dangerTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.destructive,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dangerCard: {
    padding: 0,
    borderColor: staticColors.destructive,
    borderWidth: 1,
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  dangerText: {
    fontSize: typography.fontSize.base,
    color: staticColors.destructive,
    fontWeight: '500',
  },
  logoutSection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: staticColors.destructive,
    borderRadius: borderRadius.lg,
  },
  logoutText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.destructive,
  },
  version: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});

export default AdminSettingsScreen;
