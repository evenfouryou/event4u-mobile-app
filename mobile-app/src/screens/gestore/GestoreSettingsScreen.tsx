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

interface GestoreSettingsScreenProps {
  onBack: () => void;
  onLogout: () => void;
}

export function GestoreSettingsScreen({ onBack, onLogout }: GestoreSettingsScreenProps) {
  const { user, logout } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

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
          id: 'notifications',
          icon: 'notifications-outline' as const,
          label: 'Notifiche',
          type: 'switch' as const,
          value: notifications,
          onToggle: () => setNotifications(!notifications),
        },
        {
          id: 'emailNotifications',
          icon: 'mail-outline' as const,
          label: 'Notifiche Email',
          type: 'switch' as const,
          value: emailNotifications,
          onToggle: () => setEmailNotifications(!emailNotifications),
        },
        {
          id: 'pushNotifications',
          icon: 'phone-portrait-outline' as const,
          label: 'Notifiche Push',
          type: 'switch' as const,
          value: pushNotifications,
          onToggle: () => setPushNotifications(!pushNotifications),
        },
      ],
    },
    {
      title: 'Sicurezza',
      items: [
        {
          id: 'changePassword',
          icon: 'lock-closed-outline' as const,
          label: 'Cambia Password',
          type: 'link' as const,
          onPress: () => Alert.alert('Info', 'Funzione disponibile dal web'),
        },
        {
          id: 'twoFactor',
          icon: 'shield-checkmark-outline' as const,
          label: 'Autenticazione a Due Fattori',
          type: 'link' as const,
          onPress: () => Alert.alert('Info', 'Funzione disponibile dal web'),
        },
      ],
    },
    {
      title: 'Supporto',
      items: [
        {
          id: 'help',
          icon: 'help-circle-outline' as const,
          label: 'Centro Assistenza',
          type: 'link' as const,
          onPress: () => Alert.alert('Info', 'Contatta support@event4u.it'),
        },
        {
          id: 'feedback',
          icon: 'chatbubble-outline' as const,
          label: 'Invia Feedback',
          type: 'link' as const,
          onPress: () => Alert.alert('Info', 'Invia feedback a feedback@event4u.it'),
        },
        {
          id: 'about',
          icon: 'information-circle-outline' as const,
          label: 'Informazioni',
          type: 'link' as const,
          onPress: () => Alert.alert('Event4U', 'Versione 1.0.0'),
        },
      ],
    },
    {
      title: 'Legale',
      items: [
        {
          id: 'privacy',
          icon: 'document-text-outline' as const,
          label: 'Privacy Policy',
          type: 'link' as const,
          onPress: () => {},
        },
        {
          id: 'terms',
          icon: 'document-outline' as const,
          label: 'Termini di Servizio',
          type: 'link' as const,
          onPress: () => {},
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
            <View style={[styles.userAvatar, { backgroundColor: `${staticColors.primary}20` }]}>
              <Ionicons name="person" size={32} color={staticColors.primary} />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>
          <Badge variant="default">Gestore</Badge>
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
                      <Text style={styles.settingLabel}>{item.label}</Text>
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

        <Text style={styles.version}>Versione 1.0.0</Text>
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
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  divider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginLeft: 60,
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

export default GestoreSettingsScreen;
