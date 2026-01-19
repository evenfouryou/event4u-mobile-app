import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { useAuthStore } from '../../store/auth';
import { Card } from '../../components/Card';
import { Header } from '../../components/Header';
import { api } from '../../lib/api';

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
  badge?: string | number;
  testID?: string;
}

function MenuItem({ icon, title, subtitle, onPress, destructive, badge, testID }: MenuItemProps) {
  return (
    <TouchableOpacity 
      style={styles.menuItem} 
      onPress={onPress} 
      activeOpacity={0.7}
      testID={testID}
    >
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
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const { logout } = useAuthStore();

  const { data: customer, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['/api/public/customers/me'],
    queryFn: () => api.get<Customer>('/api/public/customers/me'),
  });

  const handleLogout = async () => {
    await logout();
  };

  const initials = customer 
    ? `${customer.firstName?.[0] || ''}${customer.lastName?.[0] || ''}`.toUpperCase() || customer.email[0].toUpperCase()
    : '?';

  const contentMaxWidth = isTablet || isLandscape ? 600 : undefined;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title="Account" testID="header-account" />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content, 
          (isTablet || isLandscape) && styles.contentCentered
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            testID="refresh-control-account"
          />
        }
        testID="scrollview-account"
      >
        <View style={[styles.innerContent, contentMaxWidth ? { maxWidth: contentMaxWidth, width: '100%' } : undefined]}>
          <Card style={styles.profileCard} testID="card-profile">
            <View style={styles.profileHeader}>
              <View style={styles.avatar} testID="avatar-user">
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName} testID="text-profile-name">
                  {customer?.firstName && customer?.lastName 
                    ? `${customer.firstName} ${customer.lastName}`
                    : 'Utente'}
                </Text>
                <Text style={styles.profileEmail} testID="text-profile-email">{customer?.email}</Text>
              </View>
            </View>
          </Card>

          <View style={(isTablet || isLandscape) ? styles.menuGrid : undefined}>
            <Card style={styles.menuCard} testID="card-account-menu">
              <Text style={styles.sectionTitle}>Il mio account</Text>
              <MenuItem
                icon="person-outline"
                title="Profilo"
                subtitle="Modifica i tuoi dati personali"
                onPress={() => navigation.navigate('Profile')}
                testID="button-menu-profile"
              />
              <View style={styles.menuDivider} />
              <MenuItem
                icon="ticket-outline"
                title="I miei biglietti"
                subtitle="Visualizza i tuoi acquisti"
                onPress={() => navigation.navigate('MyTickets')}
                testID="button-menu-tickets"
              />
              <View style={styles.menuDivider} />
              <MenuItem
                icon="wallet-outline"
                title="Wallet"
                subtitle="Saldo e movimenti"
                onPress={() => navigation.navigate('Wallet')}
                testID="button-menu-wallet"
              />
              <View style={styles.menuDivider} />
              <MenuItem
                icon="repeat-outline"
                title="Le mie rivendite"
                subtitle="Biglietti in vendita"
                onPress={() => navigation.navigate('MyResales')}
                testID="button-menu-resales"
              />
            </Card>

            <Card style={styles.menuCard} testID="card-support-menu">
              <Text style={styles.sectionTitle}>Supporto</Text>
              <MenuItem
                icon="help-circle-outline"
                title="Centro assistenza"
                onPress={() => {}}
                testID="button-menu-help"
              />
              <View style={styles.menuDivider} />
              <MenuItem
                icon="document-text-outline"
                title="Termini e condizioni"
                onPress={() => {}}
                testID="button-menu-terms"
              />
              <View style={styles.menuDivider} />
              <MenuItem
                icon="shield-checkmark-outline"
                title="Privacy"
                onPress={() => {}}
                testID="button-menu-privacy"
              />
            </Card>
          </View>

          <Card style={styles.menuCard} testID="card-logout-menu">
            <MenuItem
              icon="log-out-outline"
              title="Esci"
              onPress={handleLogout}
              destructive
              testID="button-logout"
            />
          </Card>

          <Text style={styles.version} testID="text-version">Versione 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  contentCentered: {
    alignItems: 'center',
  },
  innerContent: {
    gap: spacing.md,
    width: '100%',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    flex: 1,
    minWidth: 280,
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
