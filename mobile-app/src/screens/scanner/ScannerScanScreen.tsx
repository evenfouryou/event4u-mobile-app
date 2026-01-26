import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, TextInput, FlatList, Vibration, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { ScannerEvent, GuestSearchResult, ScanResult } from '@/lib/api';

type TabType = 'scan' | 'search' | 'stats';

interface ScannerScanScreenProps {
  eventId: string;
  onBack: () => void;
}

export function ScannerScanScreen({ eventId, onBack }: ScannerScanScreenProps) {
  const { colors, gradients } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('scan');
  const [event, setEvent] = useState<ScannerEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GuestSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const resultAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  useEffect(() => {
    if (lastScan) {
      Animated.sequence([
        Animated.timing(resultAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
        Animated.timing(resultAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [lastScan]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      const events = await api.getScannerEvents();
      const currentEvent = events.find(e => e.eventId === eventId);
      if (currentEvent) {
        setEvent(currentEvent);
        setScanCount(currentEvent.checkedIn);
      }
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualScan = async () => {
    if (!manualCode.trim()) return;

    setIsScanning(true);
    try {
      triggerHaptic('medium');
      const result = await api.scanEntry(eventId, manualCode.trim());
      setLastScan(result);

      if (result.success) {
        Vibration.vibrate([0, 100, 50, 100]);
        triggerHaptic('success');
        setScanCount(prev => prev + 1);
        setManualCode('');
      } else {
        Vibration.vibrate([0, 300]);
        triggerHaptic('error');
      }
    } catch (error: any) {
      setLastScan({
        success: false,
        message: error.message || 'Errore durante la scansione',
      });
      Vibration.vibrate([0, 300]);
      triggerHaptic('error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;

    setSearching(true);
    try {
      const results = await api.searchGuests(eventId, searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching guests:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleManualCheckIn = async (guest: GuestSearchResult) => {
    try {
      triggerHaptic('medium');
      const result = await api.manualCheckIn(eventId, guest.id, guest.type);
      
      if (result.success) {
        Alert.alert('Check-in Completato', `${guest.firstName} ${guest.lastName} è entrato/a`);
        setScanCount(prev => prev + 1);
        setSearchResults(prev => 
          prev.map(g => g.id === guest.id ? { ...g, status: 'checked_in', checkedInAt: new Date().toISOString() } : g)
        );
      } else {
        Alert.alert('Errore', result.message);
      }
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Errore durante il check-in');
    }
  };

  const handleDenyAccess = async (guest: GuestSearchResult) => {
    Alert.alert(
      'Nega Accesso',
      `Vuoi negare l'accesso a ${guest.firstName} ${guest.lastName}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Nega',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.denyAccess(guest.id);
              Alert.alert('Accesso Negato', 'L\'ospite è stato segnato come accesso negato');
              setSearchResults(prev => 
                prev.map(g => g.id === guest.id ? { ...g, status: 'denied' } : g)
              );
            } catch (error: any) {
              Alert.alert('Errore', error.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <Loading text="Caricamento evento..." />;
  }

  const renderGuestItem = ({ item }: { item: GuestSearchResult }) => {
    const isCheckedIn = item.status === 'checked_in' || item.checkedInAt;
    const isDenied = item.status === 'denied';

    return (
      <Card style={styles.guestCard}>
        <View style={styles.guestInfo}>
          <View style={styles.guestHeader}>
            <Text style={[styles.guestName, { color: colors.foreground }]}>
              {item.firstName} {item.lastName}
            </Text>
            {isCheckedIn && <Badge variant="success"><Text style={styles.badgeText}>Entrato</Text></Badge>}
            {isDenied && <Badge variant="destructive"><Text style={styles.badgeText}>Negato</Text></Badge>}
          </View>
          <View style={styles.guestMeta}>
            {item.phone && (
              <View style={styles.guestMetaRow}>
                <Ionicons name="call-outline" size={14} color={colors.mutedForeground} />
                <Text style={[styles.guestMetaText, { color: colors.mutedForeground }]}>{item.phone}</Text>
              </View>
            )}
            <View style={styles.guestMetaRow}>
              <Ionicons name={item.type === 'list' ? 'list-outline' : 'grid-outline'} size={14} color={colors.mutedForeground} />
              <Text style={[styles.guestMetaText, { color: colors.mutedForeground }]}>
                {item.type === 'list' ? item.listName : item.tableName}
              </Text>
            </View>
            {item.guestCount && item.guestCount > 1 && (
              <View style={styles.guestMetaRow}>
                <Ionicons name="people-outline" size={14} color={colors.mutedForeground} />
                <Text style={[styles.guestMetaText, { color: colors.mutedForeground }]}>
                  {item.guestCount} ospiti
                </Text>
              </View>
            )}
          </View>
        </View>
        {!isCheckedIn && !isDenied && (
          <View style={styles.guestActions}>
            <Pressable
              style={[styles.actionButton, styles.checkInButton]}
              onPress={() => handleManualCheckIn(item)}
            >
              <Ionicons name="checkmark-circle" size={24} color={staticColors.primaryForeground} />
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.denyButton]}
              onPress={() => handleDenyAccess(item)}
            >
              <Ionicons name="close-circle" size={24} color={staticColors.primaryForeground} />
            </Pressable>
          </View>
        )}
      </Card>
    );
  };

  return (
    <SafeArea edges={['bottom']} style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }])}>
      <Header
        title={event?.eventName || 'Scanner'}
        showBack
        onBack={onBack}
        rightElement={
          <View style={styles.headerStats}>
            <Badge variant="success">
              <Text style={styles.badgeText}>{scanCount} entrati</Text>
            </Badge>
          </View>
        }
        testID="header-scanner"
      />

      <View style={styles.tabs}>
        {(['scan', 'search', 'stats'] as TabType[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => {
              triggerHaptic('selection');
              setActiveTab(tab);
            }}
            style={StyleSheet.flatten([
              styles.tab,
              { backgroundColor: activeTab === tab ? colors.primary : colors.secondary }
            ])}
            testID={`tab-${tab}`}
          >
            <Ionicons
              name={tab === 'scan' ? 'scan' : tab === 'search' ? 'search' : 'stats-chart'}
              size={18}
              color={activeTab === tab ? staticColors.primaryForeground : colors.mutedForeground}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === tab ? staticColors.primaryForeground : colors.mutedForeground }
            ]}>
              {tab === 'scan' ? 'Scansiona' : tab === 'search' ? 'Cerca' : 'Statistiche'}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'scan' && (
        <View style={styles.scanContainer}>
          <View style={styles.manualScanSection}>
            <GlassCard style={styles.scanCard}>
              <View style={styles.scanIconContainer}>
                <LinearGradient
                  colors={[...gradients.golden]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.scanIconGradient}
                >
                  <Ionicons name="scan" size={64} color={staticColors.primaryForeground} />
                </LinearGradient>
              </View>
              
              <Text style={[styles.scanTitle, { color: colors.foreground }]}>
                Inserisci Codice QR
              </Text>
              <Text style={[styles.scanSubtitle, { color: colors.mutedForeground }]}>
                Inserisci manualmente il codice del biglietto o usa la ricerca ospiti
              </Text>

              <View style={[styles.codeInputContainer, { backgroundColor: colors.secondary }]}>
                <Ionicons name="qr-code-outline" size={20} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.codeInput, { color: colors.foreground }]}
                  placeholder="Codice QR..."
                  placeholderTextColor={colors.mutedForeground}
                  value={manualCode}
                  onChangeText={setManualCode}
                  onSubmitEditing={handleManualScan}
                  returnKeyType="done"
                  autoCapitalize="characters"
                  testID="input-manual-code"
                />
                {manualCode.length > 0 && (
                  <Pressable onPress={() => setManualCode('')}>
                    <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
                  </Pressable>
                )}
              </View>

              <Button
                onPress={handleManualScan}
                loading={isScanning}
                disabled={!manualCode.trim()}
                testID="button-scan"
              >
                Verifica Accesso
              </Button>
            </GlassCard>

            <View style={styles.quickSearchHint}>
              <Pressable
                style={styles.hintButton}
                onPress={() => setActiveTab('search')}
              >
                <Ionicons name="search" size={20} color={colors.primary} />
                <Text style={[styles.hintText, { color: colors.primary }]}>
                  Usa la ricerca per trovare ospiti per nome
                </Text>
              </Pressable>
            </View>
          </View>

          {lastScan && (
            <Animated.View
              style={[
                styles.resultCard,
                {
                  opacity: resultAnimation,
                  transform: [{
                    translateY: resultAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  }],
                },
              ]}
            >
              <GlassCard style={StyleSheet.flatten([
                styles.resultContent,
                { borderColor: lastScan.success ? staticColors.success : staticColors.destructive }
              ])}>
                <Ionicons
                  name={lastScan.success ? 'checkmark-circle' : 'close-circle'}
                  size={48}
                  color={lastScan.success ? staticColors.success : staticColors.destructive}
                />
                <Text style={[styles.resultTitle, { color: colors.foreground }]}>
                  {lastScan.success ? 'Check-in Completato' : 'Accesso Negato'}
                </Text>
                {lastScan.guestName && (
                  <Text style={[styles.resultName, { color: colors.foreground }]}>
                    {lastScan.guestName}
                  </Text>
                )}
                <Text style={[styles.resultMessage, { color: colors.mutedForeground }]}>
                  {lastScan.message}
                </Text>
              </GlassCard>
            </Animated.View>
          )}
        </View>
      )}

      {activeTab === 'search' && (
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, { backgroundColor: colors.secondary }]}>
            <Ionicons name="search" size={20} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Cerca per nome o telefono..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              testID="input-search-guest"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          <Button onPress={handleSearch} loading={searching} testID="button-search">
            Cerca
          </Button>

          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderGuestItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.searchResults}
              showsVerticalScrollIndicator={false}
            />
          ) : searchQuery.length > 0 && !searching ? (
            <View style={styles.noResults}>
              <Ionicons name="person-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.noResultsText, { color: colors.mutedForeground }]}>
                Nessun ospite trovato
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {activeTab === 'stats' && event && (
        <View style={styles.statsContainer}>
          <GlassCard style={styles.statsCard}>
            <LinearGradient
              colors={[...gradients.teal]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statsGradient}
            >
              <View style={styles.mainStat}>
                <Text style={styles.mainStatValue}>{scanCount}</Text>
                <Text style={styles.mainStatLabel}>Check-in Effettuati</Text>
              </View>
            </LinearGradient>
          </GlassCard>

          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{event.totalGuests}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Ospiti Totali</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {event.totalGuests - scanCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Da Entrare</Text>
            </Card>
          </View>

          <Card style={styles.progressCard}>
            <Text style={[styles.progressTitle, { color: colors.foreground }]}>Progresso Check-in</Text>
            <View style={[styles.progressBar, { backgroundColor: colors.secondary }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${event.totalGuests > 0 ? (scanCount / event.totalGuests) * 100 : 0}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressPercentage, { color: colors.primary }]}>
              {event.totalGuests > 0 ? Math.round((scanCount / event.totalGuests) * 100) : 0}%
            </Text>
          </Card>

          <View style={styles.permissionsInfo}>
            <Text style={[styles.permissionsTitle, { color: colors.foreground }]}>I tuoi permessi</Text>
            <View style={styles.permissionsList}>
              <View style={styles.permissionItem}>
                <Ionicons
                  name={event.canScanLists ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={event.canScanLists ? staticColors.success : staticColors.destructive}
                />
                <Text style={[styles.permissionLabel, { color: colors.foreground }]}>Scansione Liste</Text>
              </View>
              <View style={styles.permissionItem}>
                <Ionicons
                  name={event.canScanTables ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={event.canScanTables ? staticColors.success : staticColors.destructive}
                />
                <Text style={[styles.permissionLabel, { color: colors.foreground }]}>Scansione Tavoli</Text>
              </View>
              <View style={styles.permissionItem}>
                <Ionicons
                  name={event.canScanTickets ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={event.canScanTickets ? staticColors.success : staticColors.destructive}
                />
                <Text style={[styles.permissionLabel, { color: colors.foreground }]}>Scansione Biglietti</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  scanContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  manualScanSection: {
    flex: 1,
    gap: spacing.lg,
  },
  scanCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  scanIconContainer: {
    marginBottom: spacing.md,
  },
  scanIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.golden,
  },
  scanTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  scanSubtitle: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  codeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    width: '100%',
  },
  codeInput: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    paddingVertical: spacing.sm,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  quickSearchHint: {
    alignItems: 'center',
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  hintText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  resultCard: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
  },
  resultContent: {
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 2,
  },
  resultTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  resultName: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  resultMessage: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  searchContainer: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    paddingVertical: spacing.sm,
  },
  searchResults: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  guestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guestInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  guestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  guestName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  guestMeta: {
    gap: spacing.xs,
  },
  guestMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  guestMetaText: {
    fontSize: typography.fontSize.xs,
  },
  guestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkInButton: {
    backgroundColor: staticColors.success,
  },
  denyButton: {
    backgroundColor: staticColors.destructive,
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  noResultsText: {
    fontSize: typography.fontSize.base,
  },
  statsContainer: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  statsCard: {
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
  },
  statsGradient: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  mainStat: {
    alignItems: 'center',
  },
  mainStatValue: {
    fontSize: 64,
    fontWeight: '700',
    color: staticColors.primaryForeground,
  },
  mainStatLabel: {
    fontSize: typography.fontSize.base,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
  },
  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  progressCard: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  progressTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionsInfo: {
    gap: spacing.md,
  },
  permissionsTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  permissionsList: {
    gap: spacing.sm,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  permissionLabel: {
    fontSize: typography.fontSize.sm,
  },
});
