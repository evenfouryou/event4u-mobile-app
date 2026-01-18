import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Vibration, Dimensions, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { api } from '../../lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.7;

type ScanResult = 'idle' | 'valid' | 'invalid' | 'duplicate' | 'scanning';

interface TicketInfo {
  ticketCode: string;
  holderName: string;
  ticketType: string;
  status: string;
  message?: string;
}

interface TodayStats {
  totalScans: number;
  validScans: number;
  invalidScans: number;
}

export function LiveScanningScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { eventId, eventTitle } = route.params || {};
  const [permission, requestPermission] = useCameraPermissions();
  const [scanResult, setScanResult] = useState<ScanResult>('idle');
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanMode, setScanMode] = useState<'entry' | 'exit'>('entry');

  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { data: todayStats, refetch: refetchStats } = useQuery<TodayStats>({
    queryKey: ['/api/scanner/stats/today', eventId],
    refetchInterval: 30000,
  });

  const stats = todayStats || { totalScans: 0, validScans: 0, invalidScans: 0 };

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await api.post('/api/scans/verify', {
        eventId,
        ticketCode: code,
        scanType: scanMode,
      });
      return response;
    },
    onSuccess: (data: any) => {
      if (data.valid) {
        setScanResult('valid');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Vibration.vibrate([0, 100, 50, 100]);
      } else if (data.duplicate) {
        setScanResult('duplicate');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Vibration.vibrate([0, 200, 100, 200]);
      } else {
        setScanResult('invalid');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Vibration.vibrate([0, 500]);
      }
      setTicketInfo(data.ticket || { 
        ticketCode: scannedCode || '', 
        holderName: 'N/A', 
        ticketType: 'N/A', 
        status: data.message || 'Errore' 
      });
      showFeedback();
      refetchStats();
      queryClient.invalidateQueries({ queryKey: ['/api/scanner/stats/today', eventId] });
      queryClient.invalidateQueries({ queryKey: ['/api/scans'] });
    },
    onError: () => {
      setScanResult('invalid');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Vibration.vibrate([0, 500]);
      setTicketInfo({ 
        ticketCode: scannedCode || '', 
        holderName: 'N/A', 
        ticketType: 'N/A', 
        status: 'Errore di connessione' 
      });
      showFeedback();
    },
  });

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scanLineAnim]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const showFeedback = () => {
    Animated.sequence([
      Animated.timing(feedbackOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(feedbackOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setScanResult('idle');
      setTicketInfo(null);
      setScannedCode(null);
    });
  };

  const handleBarCodeScanned = useCallback((result: BarcodeScanningResult) => {
    if (scanResult !== 'idle') return;

    const code = result.data;
    setScannedCode(code);
    setScanResult('scanning');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    verifyMutation.mutate(code);
  }, [scanResult, verifyMutation]);

  const handleManualSubmit = useCallback(() => {
    if (!manualCode.trim()) return;
    
    setScannedCode(manualCode.trim());
    setScanResult('scanning');
    setShowManualEntry(false);
    verifyMutation.mutate(manualCode.trim());
    setManualCode('');
  }, [manualCode, verifyMutation]);

  const handleClose = () => {
    navigation.goBack();
  };

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleScanMode = () => {
    setScanMode(prev => prev === 'entry' ? 'exit' : 'entry');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  if (!permission) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.permissionText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-off-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.permissionTitle}>Permesso Camera Richiesto</Text>
          <Text style={styles.permissionText}>
            Per scansionare i biglietti QR, è necessario consentire l'accesso alla fotocamera.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Consenti Accesso</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={handleClose}>
            <Text style={styles.backButtonText}>Torna Indietro</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const getFeedbackColor = () => {
    switch (scanResult) {
      case 'valid':
        return colors.teal;
      case 'invalid':
        return colors.destructive;
      case 'duplicate':
        return colors.warning;
      default:
        return 'transparent';
    }
  };

  const getFeedbackIcon = () => {
    switch (scanResult) {
      case 'valid':
        return 'checkmark-circle';
      case 'invalid':
        return 'close-circle';
      case 'duplicate':
        return 'alert-circle';
      default:
        return 'scan';
    }
  };

  const getFeedbackMessage = () => {
    switch (scanResult) {
      case 'valid':
        return 'Biglietto Valido';
      case 'invalid':
        return 'Biglietto Non Valido';
      case 'duplicate':
        return 'Biglietto Già Usato';
      case 'scanning':
        return 'Verifica in corso...';
      default:
        return 'Inquadra il QR Code';
    }
  };

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_AREA_SIZE - 4],
  });

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={flashEnabled}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanResult === 'idle' ? handleBarCodeScanned : undefined}
      />

      <View style={styles.overlay}>
        <View style={[styles.overlayTop, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={handleClose} data-testid="button-close">
              <Ionicons name="close" size={28} color={colors.foreground} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>{eventTitle || 'Scansione'}</Text>
              <TouchableOpacity style={styles.modeToggle} onPress={toggleScanMode} data-testid="button-toggle-mode">
                <Ionicons 
                  name={scanMode === 'entry' ? 'enter-outline' : 'exit-outline'} 
                  size={16} 
                  color={scanMode === 'entry' ? colors.teal : colors.warning} 
                />
                <Text style={[styles.modeText, { color: scanMode === 'entry' ? colors.teal : colors.warning }]}>
                  {scanMode === 'entry' ? 'Entrata' : 'Uscita'}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.headerButton} onPress={toggleFlash} data-testid="button-flash">
              <Ionicons name={flashEnabled ? 'flash' : 'flash-off'} size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <Animated.View style={[styles.statBadge, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="scan" size={16} color={colors.emerald} />
              <Text style={styles.statBadgeValue}>{stats.totalScans}</Text>
              <Text style={styles.statBadgeLabel}>oggi</Text>
            </Animated.View>
            <View style={[styles.statBadge, { backgroundColor: colors.teal + '20' }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.teal} />
              <Text style={[styles.statBadgeValue, { color: colors.teal }]}>{stats.validScans}</Text>
            </View>
            <View style={[styles.statBadge, { backgroundColor: colors.destructive + '20' }]}>
              <Ionicons name="close-circle" size={16} color={colors.destructive} />
              <Text style={[styles.statBadgeValue, { color: colors.destructive }]}>{stats.invalidScans}</Text>
            </View>
          </View>
        </View>

        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanAreaContainer}>
            <View style={[styles.scanArea, { borderColor: getFeedbackColor() || colors.foreground }]}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
              
              {scanResult === 'idle' && (
                <Animated.View
                  style={[
                    styles.scanLine,
                    { transform: [{ translateY: scanLineTranslateY }] },
                  ]}
                />
              )}
            </View>
          </View>
          <View style={styles.overlaySide} />
        </View>

        <View style={[styles.overlayBottom, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.statusContainer}>
            <Ionicons
              name={getFeedbackIcon() as any}
              size={32}
              color={getFeedbackColor() || colors.foreground}
            />
            <Text style={[styles.statusText, { color: getFeedbackColor() || colors.foreground }]}>
              {getFeedbackMessage()}
            </Text>
          </View>

          <Animated.View style={[styles.ticketInfoCard, { opacity: feedbackOpacity }]}>
            {ticketInfo && (
              <View style={[styles.ticketInfo, { borderLeftColor: getFeedbackColor() }]}>
                <View style={styles.ticketInfoRow}>
                  <Text style={styles.ticketInfoLabel}>Codice:</Text>
                  <Text style={styles.ticketInfoValue}>{ticketInfo.ticketCode}</Text>
                </View>
                <View style={styles.ticketInfoRow}>
                  <Text style={styles.ticketInfoLabel}>Titolare:</Text>
                  <Text style={styles.ticketInfoValue}>{ticketInfo.holderName}</Text>
                </View>
                <View style={styles.ticketInfoRow}>
                  <Text style={styles.ticketInfoLabel}>Tipo:</Text>
                  <Text style={styles.ticketInfoValue}>{ticketInfo.ticketType}</Text>
                </View>
                {ticketInfo.status && (
                  <View style={styles.ticketInfoRow}>
                    <Text style={styles.ticketInfoLabel}>Stato:</Text>
                    <Text style={[styles.ticketInfoValue, { color: getFeedbackColor() }]}>{ticketInfo.status}</Text>
                  </View>
                )}
              </View>
            )}
          </Animated.View>

          <TouchableOpacity
            style={styles.manualEntryButton}
            onPress={() => setShowManualEntry(true)}
            data-testid="button-manual-entry"
          >
            <Ionicons name="keypad-outline" size={20} color={colors.foreground} />
            <Text style={styles.manualEntryText}>Inserimento Manuale</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showManualEntry}
        animationType="slide"
        transparent
        onRequestClose={() => setShowManualEntry(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.manualEntryModal, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inserimento Manuale</Text>
              <TouchableOpacity onPress={() => setShowManualEntry(false)} data-testid="button-close-manual">
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              Inserisci il codice del biglietto se la scansione QR non funziona
            </Text>

            <TextInput
              style={styles.manualInput}
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="Codice biglietto"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              data-testid="input-manual-code"
            />

            <TouchableOpacity
              style={[styles.submitButton, !manualCode.trim() && styles.submitButtonDisabled]}
              onPress={handleManualSubmit}
              disabled={!manualCode.trim()}
              data-testid="button-submit-manual"
            >
              <Ionicons name="checkmark" size={20} color={colors.emeraldForeground} />
              <Text style={styles.submitButtonText}>Verifica Biglietto</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  permissionTitle: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  permissionText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  permissionButton: {
    backgroundColor: colors.emerald,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xl,
  },
  permissionButtonText: {
    color: colors.emeraldForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  backButton: {
    marginTop: spacing.md,
    padding: spacing.md,
  },
  backButtonText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  overlay: {
    flex: 1,
  },
  overlayTop: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  headerTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.emerald + '20',
  },
  statBadgeValue: {
    color: colors.emerald,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  statBadgeLabel: {
    color: colors.emerald,
    fontSize: fontSize.xs,
  },
  overlayMiddle: {
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  scanAreaContainer: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.emerald,
  },
  cornerTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: borderRadius.lg,
  },
  cornerTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: borderRadius.lg,
  },
  cornerBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: borderRadius.lg,
  },
  cornerBottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: borderRadius.lg,
  },
  scanLine: {
    height: 2,
    backgroundColor: colors.emerald,
    shadowColor: colors.emerald,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  statusContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  ticketInfoCard: {
    width: '90%',
    marginTop: spacing.lg,
  },
  ticketInfo: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderLeftWidth: 4,
  },
  ticketInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  ticketInfoLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  ticketInfoValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: spacing.lg,
  },
  manualEntryText: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  manualEntryModal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  modalDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.lg,
  },
  manualInput: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.emerald,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.emeraldForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
