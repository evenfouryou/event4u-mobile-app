import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Vibration, Dimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

export function ScannerScanScreen() {
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
            <Text style={styles.headerTitle} numberOfLines={1}>{eventTitle || 'Scansione'}</Text>
            <TouchableOpacity style={styles.headerButton} onPress={toggleFlash} data-testid="button-flash">
              <Ionicons name={flashEnabled ? 'flash' : 'flash-off'} size={24} color={colors.foreground} />
            </TouchableOpacity>
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
        </View>
      </View>
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
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xl,
  },
  permissionButtonText: {
    color: colors.primaryForeground,
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
    borderColor: colors.primary,
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
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
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
});
