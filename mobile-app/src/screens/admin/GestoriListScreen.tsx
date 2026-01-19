import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface Gestore {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  companyId?: string;
  status: 'active' | 'inactive' | 'pending';
  siaeEnabled: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export function GestoriListScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [gestori, setGestori] = useState<Gestore[]>([]);

  const loadGestori = async () => {
    try {
      const response = await api.get<any[]>('/api/admin/gestori');
      const data = Array.isArray(response) ? response : [];
      setGestori(data.map((g: any) => ({
        id: g.id?.toString() || '',
        firstName: g.firstName || g.name?.split(' ')[0] || '',
        lastName: g.lastName || g.name?.split(' ').slice(1).join(' ') || '',
        email: g.email || '',
        phone: g.phone,
        companyName: g.company?.name || g.companyName || '',
        companyId: g.companyId?.toString(),
        status: g.status || 'active',
        siaeEnabled: g.siaeEnabled ?? false,
        avatarUrl: g.avatarUrl || g.avatar,
        createdAt: g.createdAt,
      })));
    } catch (error) {
      console.error('Error loading gestori:', error);
      setGestori([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGestori();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadGestori();
  };

  const filteredGestori = gestori.filter((g) => {
    const search = searchQuery.toLowerCase();
    return (
      `${g.firstName} ${g.lastName}`.toLowerCase().includes(search) ||
      g.email.toLowerCase().includes(search) ||
      (g.companyName?.toLowerCase().includes(search) ?? false)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'inactive':
        return colors.destructive;
      case 'pending':
        return colors.warning;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Attivo';
      case 'inactive':
        return 'Inattivo';
      case 'pending':
        return 'In Attesa';
      default:
        return status;
    }
  };

  const renderAvatar = (gestore: Gestore) => {
    if (gestore.avatarUrl) {
      return (
        <Image source={{ uri: gestore.avatarUrl }} style={styles.avatar} />
      );
    }
    const initials = `${gestore.firstName.charAt(0)}${gestore.lastName.charAt(0)}`.toUpperCase();
    return (
      <View style={[styles.avatar, styles.avatarPlaceholder]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Gestori" showBack />
        <View style={styles.loadingContainer} testID="loading-container">
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText} testID="loading-text">Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title="Gestori" showBack />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca gestori..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-gestori"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          (isTablet || isLandscape) && styles.scrollContentLandscape
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        testID="scroll-view-gestori"
      >
        {filteredGestori.length > 0 ? (
          <View style={[
            styles.listContainer,
            (isTablet || isLandscape) && styles.listContainerLandscape
          ]}>
            {filteredGestori.map((gestore) => (
              <TouchableOpacity
                key={gestore.id}
                style={[
                  styles.gestoreCard,
                  (isTablet || isLandscape) && styles.gestoreCardLandscape
                ]}
                onPress={() => navigation.navigate('GestoreDetail', { gestoreId: gestore.id })}
                activeOpacity={0.8}
                testID={`card-gestore-${gestore.id}`}
              >
                <Card variant="glass">
                  <View style={styles.gestoreRow}>
                    {renderAvatar(gestore)}
                    <View style={styles.gestoreInfo}>
                      <View style={styles.gestoreHeader}>
                        <Text style={styles.gestoreName} testID={`text-gestore-name-${gestore.id}`}>
                          {gestore.firstName} {gestore.lastName}
                        </Text>
                        <View style={styles.badges}>
                          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(gestore.status)}20` }]}>
                            <View style={[styles.statusDot, { backgroundColor: getStatusColor(gestore.status) }]} />
                            <Text style={[styles.statusText, { color: getStatusColor(gestore.status) }]} testID={`text-gestore-status-${gestore.id}`}>
                              {getStatusLabel(gestore.status)}
                            </Text>
                          </View>
                          {gestore.siaeEnabled && (
                            <View style={[styles.siaeBadge, { backgroundColor: `${colors.accent}20` }]}>
                              <Ionicons name="shield-checkmark" size={12} color={colors.accent} />
                              <Text style={[styles.siaeText, { color: colors.accent }]}>SIAE</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Text style={styles.gestoreEmail} testID={`text-gestore-email-${gestore.id}`}>{gestore.email}</Text>
                      {gestore.companyName && (
                        <View style={styles.companyRow}>
                          <Ionicons name="business-outline" size={14} color={colors.mutedForeground} />
                          <Text style={styles.companyName} testID={`text-gestore-company-${gestore.id}`}>{gestore.companyName}</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Card variant="glass" style={styles.emptyCard} testID="card-empty-state">
            <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText} testID="text-empty-message">
              {searchQuery ? 'Nessun gestore trovato' : 'Nessun gestore registrato'}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('GestoreDetail', { mode: 'create' })}
              testID="button-add-first-gestore"
            >
              <Ionicons name="add" size={20} color={colors.primaryForeground} />
              <Text style={styles.emptyButtonText}>Aggiungi Gestore</Text>
            </TouchableOpacity>
          </Card>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: 90 }]}
        onPress={() => navigation.navigate('GestoreDetail', { mode: 'create' })}
        activeOpacity={0.8}
        testID="button-fab-add-gestore"
      >
        <Ionicons name="add" size={28} color={colors.primaryForeground} />
      </TouchableOpacity>
    </SafeAreaView>
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
  scrollContent: {
    paddingBottom: 100,
  },
  scrollContentLandscape: {
    paddingBottom: 40,
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
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  listContainer: {
    flex: 1,
  },
  listContainerLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gestoreCard: {
    marginBottom: spacing.md,
  },
  gestoreCardLandscape: {
    width: '48.5%',
    marginBottom: 0,
  },
  gestoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primaryForeground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  gestoreInfo: {
    flex: 1,
  },
  gestoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  gestoreName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  siaeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  siaeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  gestoreEmail: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  companyName: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing['2xl'],
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  emptyButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

export default GestoriListScreen;
