import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, TextInput, FlatList, Vibration, Animated, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { colors as staticColors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { ScannerEvent, GuestSearchResult, ScanResult } from '@/lib/api';

type TabType = 'scan' | 'search' | 'stats';
type ScanMode = 'camera' | 'manual';

interface ScannerScanScreenProps {
  eventId: string;
  onBack: () => void;
}

export function ScannerScanScreen({ eventId, onBack }: ScannerScanScreenProps) {
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [activeTab, setActiveTab] = useState<TabType>('scan');
  const [scanMode, setScanMode] = useState<ScanMode>('camera');
  const [event, setEvent] = useState<ScannerEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GuestSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [showResultModal, setShowResultModal] = useState(false);

  const resultAnimation = useRef(new Animated.Value(0)).current;
  const scanCooldownRef = useRef(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    loadEventData(true);
  }, [eventId]);

  useEffect(() => {
    if (lastScan && showResultModal) {
      Animated.timing(resultAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timeout = setTimeout(() => {
        Animated.timing(resultAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowResultModal(false);
          setIsCameraActive(true);
        });
      }, 2500);

      return () => clearTimeout(timeout);
    }
  }, [lastScan, showResultModal]);

  const loadEventData = async (isInitial: boolean = false) => {
    try {
      if (isInitial && !initialLoadDone) {
        setLoading(true);
      }
      const events = await api.getScannerEvents();
      const currentEvent = events.find(e => e.eventId === eventId);
      if (currentEvent) {
        setEvent(currentEvent);
        setScanCount(currentEvent.checkedIn);
      }
      if (isInitial) {
        setInitialLoadDone(true);
      }
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (scanCooldownRef.current || isScanning) return;
    
    scanCooldownRef.current = true;
    setIsCameraActive(false);
    
    const code = result.data;
    await processCode(code);
    
    setTimeout(() => {
      scanCooldownRef.current = false;
    }, 2000);
  };

  const processCode = async (code: string) => {
    if (!code.trim()) return;

    setIsScanning(true);
    try {
      triggerHaptic('medium');
      const result = await api.scanEntry(eventId, code.trim());
      setLastScan(result);
      setShowResultModal(true);

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
      setShowResultModal(true);
      Vibration.vibrate([0, 300]);
      triggerHaptic('error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleManualScan = async () => {
    await processCode(manualCode);
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

  const requestCameraPermission = async () => {
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(
        'Permesso Negato',
        'Per scansionare i QR code è necessario il permesso della fotocamera. Vai nelle impostazioni per abilitarlo.',
        [{ text: 'OK' }]
      );
    }
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
              style={[styles.actionButton, { backgroundColor: staticColors.success }]}
              onPress={() => handleManualCheckIn(item)}
            >
              <Ionicons name="checkmark" size={20} color={staticColors.primaryForeground} />
            </Pressable>
            <Pressable
              style={[styles.actionButton, { backgroundColor: staticColors.destructive }]}
              onPress={() => handleDenyAccess(item)}
            >
              <Ionicons name="close" size={20} color={staticColors.primaryForeground} />
            </Pressable>
          </View>
        )}
      </Card>
    );
  };

  const renderCameraScanner = () => {
    if (!permission?.granted) {
      return (
        <View style={styles.permissionContainer}>
          <View style={[styles.permissionCard, { backgroundColor: colors.card }]}>
            <Ionicons name="camera" size={64} color={colors.mutedForeground} />
            <Text style={[styles.permissionTitle, { color: colors.foreground }]}>
              Permesso Fotocamera
            </Text>
            <Text style={[styles.permissionText, { color: colors.mutedForeground }]}>
              Per scansionare i codici QR è necessario il permesso della fotocamera
            </Text>
            <Button onPress={requestCameraPermission} testID="button-request-permission">
              Abilita Fotocamera
            </Button>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8'],
          }}
          onBarcodeScanned={isCameraActive ? handleBarCodeScanned : undefined}
        />
        <View style={styles.cameraOverlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.scanCorner, styles.topLeft]} />
            <View style={[styles.scanCorner, styles.topRight]} />
            <View style={[styles.scanCorner, styles.bottomLeft]} />
            <View style={[styles.scanCorner, styles.bottomRight]} />
          </View>
          <Text style={styles.scanHint}>Inquadra il codice QR</Text>
        </View>

        <View style={styles.cameraControls}>
          <Pressable
            style={[styles.modeButton, scanMode === 'camera' && { backgroundColor: colors.primary }]}
            onPress={() => setScanMode('camera')}
          >
            <Ionicons name="camera" size={20} color={scanMode === 'camera' ? staticColors.primaryForeground : colors.foreground} />
            <Text style={[styles.modeButtonText, { color: scanMode === 'camera' ? staticColors.primaryForeground : colors.foreground }]}>
              Camera
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, scanMode === 'manual' && { backgroundColor: colors.primary }]}
            onPress={() => setScanMode('manual')}
          >
            <Ionicons name="keypad" size={20} color={scanMode === 'manual' ? staticColors.primaryForeground : colors.foreground} />
            <Text style={[styles.modeButtonText, { color: scanMode === 'manual' ? staticColors.primaryForeground : colors.foreground }]}>
              Manuale
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderManualInput = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.scanContent}>
      <GlassCard style={styles.scanCard}>
        <View style={[styles.scanIconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="keypad" size={48} color={colors.primary} />
        </View>
        
        <Text style={[styles.scanTitle, { color: colors.foreground }]}>
          Inserisci Codice
        </Text>
        <Text style={[styles.scanSubtitle, { color: colors.mutedForeground }]}>
          Inserisci il codice del biglietto
        </Text>

        <View style={[styles.codeInputContainer, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Ionicons name="qr-code-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.codeInput, { color: colors.foreground }]}
            placeholder="Codice..."
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
          style={styles.scanButton}
          testID="button-scan"
        >
          Verifica Accesso
        </Button>
      </GlassCard>

      <View style={styles.modeToggle}>
        <Pressable
          style={[styles.modeButton, scanMode === 'camera' && { backgroundColor: colors.primary }]}
          onPress={() => setScanMode('camera')}
        >
          <Ionicons name="camera" size={20} color={scanMode === 'camera' ? staticColors.primaryForeground : colors.foreground} />
          <Text style={[styles.modeButtonText, { color: scanMode === 'camera' ? staticColors.primaryForeground : colors.foreground }]}>
            Camera
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeButton, scanMode === 'manual' && { backgroundColor: colors.primary }]}
          onPress={() => setScanMode('manual')}
        >
          <Ionicons name="keypad" size={20} color={scanMode === 'manual' ? staticColors.primaryForeground : colors.foreground} />
          <Text style={[styles.modeButtonText, { color: scanMode === 'manual' ? staticColors.primaryForeground : colors.foreground }]}>
            Manuale
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton} testID="button-back">
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {event?.eventName || 'Scanner'}
          </Text>
        </View>
        <Badge variant="success">
          <Text style={styles.badgeText}>{scanCount}</Text>
        </Badge>
      </View>

      <View style={styles.tabs}>
        {(['scan', 'search', 'stats'] as TabType[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => {
              triggerHaptic('selection');
              setActiveTab(tab);
            }}
            style={[
              styles.tab,
              { 
                backgroundColor: activeTab === tab ? colors.primary : colors.card,
                borderColor: activeTab === tab ? colors.primary : colors.border,
              }
            ]}
            testID={`tab-${tab}`}
          >
            <Ionicons
              name={tab === 'scan' ? 'scan' : tab === 'search' ? 'search' : 'stats-chart'}
              size={16}
              color={activeTab === tab ? staticColors.primaryForeground : colors.mutedForeground}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === tab ? staticColors.primaryForeground : colors.mutedForeground }
            ]}>
              {tab === 'scan' ? 'Scansiona' : tab === 'search' ? 'Cerca' : 'Stats'}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'scan' && (
        scanMode === 'camera' ? renderCameraScanner() : renderManualInput()
      )}

      {activeTab === 'search' && (
        <View style={styles.tabContent}>
          <View style={styles.searchSection}>
            <View style={[styles.searchInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search" size={20} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Nome o telefono..."
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
          </View>

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
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.statsContent}>
          <View style={styles.mainStatsCard}>
            <LinearGradient
              colors={[...gradients.teal]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.mainStatsGradient}
            >
              <Text style={styles.mainStatValue}>{scanCount}</Text>
              <Text style={styles.mainStatLabel}>Check-in Effettuati</Text>
            </LinearGradient>
          </View>

          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{event.totalGuests}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Totali</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {event.totalGuests - scanCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Da entrare</Text>
            </Card>
          </View>

          <Card style={styles.progressCard}>
            <Text style={[styles.progressCardTitle, { color: colors.foreground }]}>Progresso</Text>
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
            <Text style={[styles.progressPercent, { color: colors.primary }]}>
              {event.totalGuests > 0 ? Math.round((scanCount / event.totalGuests) * 100) : 0}%
            </Text>
          </Card>

          <Card style={styles.permissionsCard}>
            <Text style={[styles.permissionsTitle, { color: colors.foreground }]}>Permessi</Text>
            <View style={styles.permissionsList}>
              <View style={styles.permissionItem}>
                <Ionicons
                  name={event.canScanLists ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={event.canScanLists ? staticColors.success : staticColors.destructive}
                />
                <Text style={[styles.permissionLabel, { color: colors.foreground }]}>Liste</Text>
              </View>
              <View style={styles.permissionItem}>
                <Ionicons
                  name={event.canScanTables ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={event.canScanTables ? staticColors.success : staticColors.destructive}
                />
                <Text style={[styles.permissionLabel, { color: colors.foreground }]}>Tavoli</Text>
              </View>
              <View style={styles.permissionItem}>
                <Ionicons
                  name={event.canScanTickets ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={event.canScanTickets ? staticColors.success : staticColors.destructive}
                />
                <Text style={[styles.permissionLabel, { color: colors.foreground }]}>Biglietti</Text>
              </View>
            </View>
          </Card>
        </ScrollView>
      )}

      <Modal
        visible={showResultModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowResultModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                opacity: resultAnimation,
                transform: [{
                  scale: resultAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                }],
              },
            ]}
          >
            <View style={[
              styles.resultCard,
              { 
                backgroundColor: colors.card,
                borderColor: lastScan?.success ? staticColors.success : staticColors.destructive 
              }
            ]}>
              <Ionicons
                name={lastScan?.success ? 'checkmark-circle' : 'close-circle'}
                size={80}
                color={lastScan?.success ? staticColors.success : staticColors.destructive}
              />
              <Text style={[styles.resultTitle, { color: colors.foreground }]}>
                {lastScan?.success ? 'ACCESSO OK' : 'NEGATO'}
              </Text>
              {lastScan?.guestName && (
                <Text style={[styles.resultName, { color: colors.foreground }]}>
                  {lastScan.guestName}
                </Text>
              )}
              <Text style={[styles.resultMessage, { color: colors.mutedForeground }]}>
                {lastScan?.message}
              </Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
    borderWidth: 1,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  tabContent: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: staticColors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scanHint: {
    marginTop: spacing.xl,
    color: 'white',
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cameraControls: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modeButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  permissionCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    gap: spacing.md,
    width: '100%',
  },
  permissionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
  },
  permissionText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
  },
  scanContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  scanCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  scanIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  scanTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  scanSubtitle: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  codeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    width: '100%',
    borderWidth: 1,
  },
  codeInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    paddingVertical: spacing.sm,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  scanButton: {
    width: '100%',
  },
  searchSection: {
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
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    paddingVertical: spacing.sm,
  },
  searchResults: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.sm,
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
    flexWrap: 'wrap',
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
    fontSize: typography.fontSize.sm,
  },
  guestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  noResultsText: {
    fontSize: typography.fontSize.base,
  },
  statsContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  mainStatsCard: {
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
  },
  mainStatsGradient: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  mainStatValue: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: '700',
    color: staticColors.primaryForeground,
  },
  mainStatLabel: {
    fontSize: typography.fontSize.base,
    color: 'rgba(255,255,255,0.85)',
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
    gap: spacing.md,
  },
  progressCardTitle: {
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
  progressPercent: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  permissionsCard: {
    padding: spacing.lg,
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
    fontSize: typography.fontSize.base,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
  },
  resultCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 3,
    gap: spacing.md,
  },
  resultTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
  },
  resultName: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
  },
  resultMessage: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
  },
});
