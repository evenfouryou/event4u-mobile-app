import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Vibration, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { api } from '../../lib/api';

type ScanResult = 'idle' | 'valid' | 'invalid' | 'duplicate' | 'scanning';

interface TicketInfo {
  ticketCode: string;
  holderName: string;
  ticketType: string;
  status: string;
  message?: string;
}

export function ScannerScanScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const SCAN_AREA_SIZE = isLandscape ? Math.min(height * 0.5, width * 0.35) : width * 0.7;

  const { eventId, eventTitle } = route.params || {};
  const [permission, requestPermission] = useCameraPermissions();
  const [scanResult, setScanResult] = useState<ScanResult>('idle');
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);

  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  const scanMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await api.post('/api/scanner/validate', {
        eventId,
        ticketCode: code,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.valid) {
        setScanResult('valid');
        Vibration.vibrate([0, 100, 50, 100]);
      } else if (data.duplicate) {
        setScanResult('duplicate');
        Vibration.vibrate([0, 200, 100, 200]);
      } else {
        setScanResult('invalid');
        Vibration.vibrate([0, 500]);
      }
      setTicketInfo(data.ticket || { ticketCode: scannedCode || '', holderName: 'N/A', ticketType: 'N/A', status: data.message || 'Errore' });
      showFeedback();
      queryClient.invalidateQueries({ queryKey: ['/api/scanner/stats/today', eventId] });
    },
    onError: () => {
      setScanResult('invalid');
      Vibration.vibrate([0, 500]);
      setTicketInfo({ ticketCode: scannedCode || '', holderName: 'N/A', ticketType: 'N/A', status: 'Errore di connessione' });
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

  const showFeedback = () => {
    Animated.sequence([
      Animated.timing(feedbackOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
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

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanResult !== 'idle') return;

    const code = result.data;
    setScannedCode(code);
    setScanResult('scanning');
    scanMutation.mutate(code);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.permissionText} testID="text-loading">Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <View style={[styles.permissionContainer, isTablet && { maxWidth: 500 }]}>
          <Ionicons name="camera-off-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.permissionTitle} testID="text-permission-title">Permesso Camera Richiesto</Text>
          <Text style={styles.permissionText} testID="text-permission-description">
            Per scansionare i biglietti QR, è necessario consentire l'accesso alla fotocamera.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} testID="button-allow-camera">
            <Text style={styles.permissionButtonText}>Consenti Accesso</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={handleClose} testID="button-go-back">
            <Text style={styles.backButtonText}>Torna Indietro</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getFeedbackColor = () => {
    switch (scanResult) {
      case 'valid':
        return colors.success;
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
    <View style={styles.container} testID="screen-scanner-scan">
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={flashEnabled}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanResult === 'idle' ? handleBarCodeScanned : undefined}
        testID="camera-view"
      />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom', 'left', 'right']}>
        {isLandscape ? (
          <View style={styles.landscapeLayout}>
            <View style={styles.landscapeHeader}>
              <TouchableOpacity style={styles.headerButton} onPress={handleClose} testID="button-close">
                <Ionicons name="close" size={28} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={styles.headerTitle} numberOfLines={1} testID="text-event-title">{eventTitle || 'Scansione'}</Text>
              <TouchableOpacity style={styles.headerButton} onPress={toggleFlash} testID="button-flash">
                <Ionicons name={flashEnabled ? 'flash' : 'flash-off'} size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.landscapeContent}>
              <View style={styles.landscapeScanArea}>
                <View style={[styles.scanArea, { width: SCAN_AREA_SIZE, height: SCAN_AREA_SIZE, borderColor: getFeedbackColor() || colors.foreground }]}>
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
              
              <View style={styles.landscapeInfo}>
                <View style={styles.statusContainer}>
                  <Ionicons
                    name={getFeedbackIcon() as any}
                    size={32}
                    color={getFeedbackColor() || colors.foreground}
                  />
                  <Text style={[styles.statusText, { color: getFeedbackColor() || colors.foreground }]} testID="text-status">
                    {getFeedbackMessage()}
                  </Text>
                </View>

                <Animated.View style={[styles.ticketInfoCard, { opacity: feedbackOpacity }]}>
                  {ticketInfo && (
                    <View style={[styles.ticketInfo, { borderLeftColor: getFeedbackColor() }]} testID="card-ticket-info">
                      <View style={styles.ticketInfoRow}>
                        <Text style={styles.ticketInfoLabel}>Codice:</Text>
                        <Text style={styles.ticketInfoValue} testID="text-ticket-code">{ticketInfo.ticketCode}</Text>
                      </View>
                      <View style={styles.ticketInfoRow}>
                        <Text style={styles.ticketInfoLabel}>Titolare:</Text>
                        <Text style={styles.ticketInfoValue} testID="text-ticket-holder">{ticketInfo.holderName}</Text>
                      </View>
                      <View style={styles.ticketInfoRow}>
                        <Text style={styles.ticketInfoLabel}>Tipo:</Text>
                        <Text style={styles.ticketInfoValue} testID="text-ticket-type">{ticketInfo.ticketType}</Text>
                      </View>
                      {ticketInfo.status && (
                        <View style={styles.ticketInfoRow}>
                          <Text style={styles.ticketInfoLabel}>Stato:</Text>
                          <Text style={[styles.ticketInfoValue, { color: getFeedbackColor() }]} testID="text-ticket-status">{ticketInfo.status}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </Animated.View>
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.overlayTop}>
              <View style={styles.header}>
                <TouchableOpacity style={styles.headerButton} onPress={handleClose} testID="button-close">
                  <Ionicons name="close" size={28} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1} testID="text-event-title">{eventTitle || 'Scansione'}</Text>
                <TouchableOpacity style={styles.headerButton} onPress={toggleFlash} testID="button-flash">
                  <Ionicons name={flashEnabled ? 'flash' : 'flash-off'} size={24} color={colors.foreground} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.overlayMiddle}>
              <View style={styles.overlaySide} />
              <View style={[styles.scanAreaContainer, { width: SCAN_AREA_SIZE, height: SCAN_AREA_SIZE }]}>
                <View style={[styles.scanArea, { width: SCAN_AREA_SIZE, height: SCAN_AREA_SIZE, borderColor: getFeedbackColor() || colors.foreground }]}>
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

            <View style={styles.overlayBottom}>
              <View style={styles.statusContainer}>
                <Ionicons
                  name={getFeedbackIcon() as any}
                  size={32}
                  color={getFeedbackColor() || colors.foreground}
                />
                <Text style={[styles.statusText, { color: getFeedbackColor() || colors.foreground }]} testID="text-status">
                  {getFeedbackMessage()}
                </Text>
              </View>

              <Animated.View style={[styles.ticketInfoCard, { opacity: feedbackOpacity }]}>
                {ticketInfo && (
                  <View style={[styles.ticketInfo, { borderLeftColor: getFeedbackColor() }]} testID="card-ticket-info">
                    <View style={styles.ticketInfoRow}>
                      <Text style={styles.ticketInfoLabel}>Codice:</Text>
                      <Text style={styles.ticketInfoValue} testID="text-ticket-code">{ticketInfo.ticketCode}</Text>
                    </View>
                    <View style={styles.ticketInfoRow}>
                      <Text style={styles.ticketInfoLabel}>Titolare:</Text>
                      <Text style={styles.ticketInfoValue} testID="text-ticket-holder">{ticketInfo.holderName}</Text>
                    </View>
                    <View style={styles.ticketInfoRow}>
                      <Text style={styles.ticketInfoLabel}>Tipo:</Text>
                      <Text style={styles.ticketInfoValue} testID="text-ticket-type">{ticketInfo.ticketType}</Text>
                    </View>
                    {ticketInfo.status && (
                      <View style={styles.ticketInfoRow}>
                        <Text style={styles.ticketInfoLabel}>Stato:</Text>
                        <Text style={[styles.ticketInfoValue, { color: getFeedbackColor() }]} testID="text-ticket-status">{ticketInfo.status}</Text>
                      </View>
                    )}
                  </View>
                )}
              </Animated.View>
            </View>
          </>
        )}
      </SafeAreaView>
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
    alignSelf: 'center',
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
  headerTitle: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  overlayMiddle: {
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  scanAreaContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
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
    maxWidth: 400,
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
  landscapeLayout: {
    flex: 1,
  },
  landscapeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  landscapeContent: {
    flex: 1,
    flexDirection: 'row',
  },
  landscapeScanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  landscapeInfo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
});
