import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

export function SchoolBadgeScannerScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [isScanning, setIsScanning] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);

  const SCANNER_SIZE = isLandscape ? Math.min(height * 0.6, 300) : width * 0.7;

  useEffect(() => {
    setTimeout(() => {
      setHasPermission(true);
    }, 500);
  }, []);

  const handleBarCodeScanned = (data: string) => {
    setIsScanning(false);
    
    if (data.includes('INVALID')) {
      navigation.navigate('SchoolBadgeError', { reason: 'Badge non valido o danneggiato' });
    } else {
      navigation.navigate('SchoolBadgeView', { badgeCode: data });
    }
  };

  const simulateScan = () => {
    handleBarCodeScanned('SCH-2024-00123');
  };

  const handleManualEntry = () => {
    navigation.navigate('SchoolBadgeVerify');
  };

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]} edges={['top', 'bottom', 'left', 'right']}>
        <Text style={styles.permissionText}>Richiesta permessi fotocamera...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            testID="button-back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.permissionDenied}>
          <Ionicons name="camera-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.permissionTitle}>Accesso Fotocamera Negato</Text>
          <Text style={styles.permissionMessage}>
            Per scansionare i badge è necessario concedere l'accesso alla fotocamera
          </Text>
          <TouchableOpacity
            style={styles.settingsButton}
            testID="button-settings"
          >
            <Text style={styles.settingsButtonText}>Apri Impostazioni</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraPlaceholder}>
        <View style={styles.scannerOverlay}>
          <View style={[
            styles.overlayTop,
            { height: isLandscape ? (height - SCANNER_SIZE) / 2 - 30 : (height - SCANNER_SIZE) / 2 - 50 }
          ]} />
          
          <View style={[styles.overlayMiddle, { height: SCANNER_SIZE }]}>
            <View style={styles.overlaySide} />
            
            <View style={[styles.scannerFrame, { width: SCANNER_SIZE, height: SCANNER_SIZE }]}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
              
              {isScanning && <View style={styles.scanLine} />}
            </View>
            
            <View style={styles.overlaySide} />
          </View>
          
          <View style={styles.overlayBottom}>
            <Text style={styles.scanInstructions}>
              Posiziona il QR code del badge all'interno del riquadro
            </Text>
          </View>
        </View>
      </View>

      <SafeAreaView style={styles.controlsWrapper} edges={['top', 'bottom', 'left', 'right']}>
        <View style={[styles.topControls, isLandscape && styles.topControlsLandscape]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.controlButton}
            testID="button-close"
          >
            <Ionicons name="close" size={28} color={colors.foreground} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Scansiona Badge</Text>
          
          <TouchableOpacity
            onPress={toggleFlash}
            style={styles.controlButton}
            testID="button-flash"
          >
            <Ionicons
              name={flashEnabled ? 'flash' : 'flash-outline'}
              size={24}
              color={flashEnabled ? colors.primary : colors.foreground}
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.bottomControls, isLandscape && styles.bottomControlsLandscape]}>
          <View style={[styles.bottomControlsInner, isTablet && styles.bottomControlsInnerTablet]}>
            <TouchableOpacity
              style={styles.simulateButton}
              onPress={simulateScan}
              activeOpacity={0.8}
              testID="button-simulate-scan"
            >
              <Ionicons name="qr-code" size={24} color={colors.primaryForeground} />
              <Text style={styles.simulateButtonText}>Simula Scansione</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manualButton}
              onPress={handleManualEntry}
              activeOpacity={0.8}
              testID="button-manual-entry"
            >
              <Ionicons name="keypad" size={20} color={colors.foreground} />
              <Text style={styles.manualButtonText}>Inserisci manualmente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a2e',
  },
  controlsWrapper: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerOverlay: {
    flex: 1,
  },
  overlayTop: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scannerFrame: {
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: colors.teal,
    top: '50%',
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  scanInstructions: {
    fontSize: fontSize.base,
    color: colors.foreground,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  topControlsLandscape: {
    paddingTop: spacing.sm,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  bottomControls: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  bottomControlsLandscape: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  bottomControlsInner: {
    gap: spacing.md,
  },
  bottomControlsInnerTablet: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  simulateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  simulateButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primaryForeground,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  manualButtonText: {
    fontSize: fontSize.sm,
    color: colors.foreground,
  },
  permissionText: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  permissionDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  permissionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  permissionMessage: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  settingsButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  settingsButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primaryForeground,
  },
});
