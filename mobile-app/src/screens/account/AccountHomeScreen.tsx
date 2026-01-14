import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { useAuthStore } from '../../store/auth';
import { Card } from '../../components/Card';
import { Header } from '../../components/Header';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
  badge?: string | number;
}

function MenuItem({ icon, title, subtitle, onPress, destructive, badge }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, destructive && styles.menuIconDestructive]}>
        <Ionicons 
          name={icon} 
          size={22} 
          color={destructive ? colors.destructive : colors.primary} 
        />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, destructive && styles.menuTitleDestructive]}>
          {title}
        </Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export function AccountHomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
  };

  const initials = user 
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || user.email[0].toUpperCase()
    : '?';

  return (
    <View style={styles.container}>
      <Header title="Account" />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : 'Utente'}
              </Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.menuCard}>
          <Text style={styles.sectionTitle}>Il mio account</Text>
          <MenuItem
            icon="person-outline"
            title="Profilo"
            subtitle="Modifica i tuoi dati personali"
            onPress={() => navigation.navigate('Profile')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="ticket-outline"
            title="I miei biglietti"
            subtitle="Visualizza i tuoi acquisti"
            onPress={() => navigation.navigate('MyTickets')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="wallet-outline"
            title="Wallet"
            subtitle="Saldo e movimenti"
            onPress={() => navigation.navigate('Wallet')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="repeat-outline"
            title="Le mie rivendite"
            subtitle="Biglietti in vendita"
            onPress={() => navigation.navigate('MyResales')}
          />
        </Card>

        <Card style={styles.menuCard}>
          <Text style={styles.sectionTitle}>Supporto</Text>
          <MenuItem
            icon="help-circle-outline"
            title="Centro assistenza"
            onPress={() => {}}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="document-text-outline"
            title="Termini e condizioni"
            onPress={() => {}}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="shield-checkmark-outline"
            title="Privacy"
            onPress={() => {}}
          />
        </Card>

        <Card style={styles.menuCard}>
          <MenuItem
            icon="log-out-outline"
            title="Esci"
            onPress={handleLogout}
            destructive
          />
        </Card>

        <Text style={styles.version}>Versione 1.0.0</Text>
      </ScrollView>
    </View>
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
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  profileCard: {
    padding: spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primaryForeground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  profileEmail: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  menuCard: {
    padding: 0,
    overflow: 'hidden',
  },
  sectionTitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconDestructive: {
    backgroundColor: colors.destructive + '15',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  menuTitleDestructive: {
    color: colors.destructive,
  },
  menuSubtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 40 + spacing.md,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    color: colors.primaryForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  version: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
