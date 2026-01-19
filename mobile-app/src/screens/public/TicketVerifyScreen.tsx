import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Vibration, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { api } from '../../lib/api';

interface TicketVerifyResult {
  valid: boolean;
  ticketCode?: string;
  eventName?: string;
  ticketType?: string;
  holderName?: string;
  usedAt?: string;
  message?: string;
}

export function TicketVerifyScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TicketVerifyResult | null>(null);

  const hasPermission = permission?.granted ?? null;

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);
    Vibration.vibrate(100);
    await verifyTicket(result.data);
  };

  const verifyTicket = async (code: string) => {
    setLoading(true);
    try {
      const response = await api.post<TicketVerifyResult>('/api/tickets/verify', { code });
      setResult(response);
    } catch (error: any) {
      setResult({
        valid: false,
        message: error.message || 'Errore nella verifica del biglietto',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualVerify = () => {
    if (!manualCode.trim()) {
      Alert.alert('Errore', 'Inserisci un codice valido');
      return;
    }
    verifyTicket(manualCode.trim());
  };

  const handleReset = () => {
    setScanned(false);
    setResult(null);
    setManualCode('');
  };

  const renderPermissionDenied = () => (
    <View style={styles.centerContent} testID="container-permission-denied">
      <Ionicons name="camera-outline" size={64} color={colors.mutedForeground} />
      <Text style={styles.permissionTitle}>Accesso alla fotocamera negato</Text>
      <Text style={styles.permissionText}>
        Per scansionare i codici QR, consenti l'accesso alla fotocamera nelle impostazioni
      </Text>
      <Button
        title="Inserisci codice manualmente"
        variant="outline"
        onPress={() => setShowManualInput(true)}
        style={styles.manualButton}
        testID="button-manual-input-fallback"
      />
    </View>
  );

  const renderResult = () => (
    <View 
      style={[
        styles.resultContainer,
        isLandscape && styles.resultContainerLandscape,
        isTablet && styles.resultContainerTablet,
      ]}
      testID="container-result"
    >
      <Card
        variant={result?.valid ? 'glass' : 'default'}
        style={[
          styles.resultCard,
          result?.valid ? styles.resultCardValid : styles.resultCardInvalid,
          isTablet && styles.resultCardTablet,
        ]}
        testID="card-result"
      >
        <View
          style={[
            styles.resultIconContainer,
            { backgroundColor: result?.valid ? colors.success + '20' : colors.error + '20' },
          ]}
          testID={result?.valid ? "icon-valid" : "icon-invalid"}
        >
          <Ionicons
            name={result?.valid ? 'checkmark-circle' : 'close-circle'}
            size={isTablet ? 80 : 64}
            color={result?.valid ? colors.success : colors.error}
          />
        </View>

        <Text 
          style={[
            styles.resultTitle, 
            { color: result?.valid ? colors.success : colors.error },
            isTablet && styles.resultTitleTablet,
          ]}
          testID="text-result-title"
        >
          {result?.valid ? 'Biglietto Valido' : 'Biglietto Non Valido'}
        </Text>

        {result?.message && (
          <Text style={styles.resultMessage} testID="text-result-message">{result.message}</Text>
        )}

        {result?.valid && result.eventName && (
          <View style={styles.ticketDetails} testID="container-ticket-details">
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Evento</Text>
              <Text style={styles.detailValue} testID="text-event-name">{result.eventName}</Text>
            </View>
            {result.ticketType && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tipo</Text>
                <Text style={styles.detailValue} testID="text-ticket-type">{result.ticketType}</Text>
              </View>
            )}
            {result.holderName && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Intestatario</Text>
                <Text style={styles.detailValue} testID="text-holder-name">{result.holderName}</Text>
              </View>
            )}
            {result.ticketCode && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Codice</Text>
                <Text style={styles.detailValue} testID="text-ticket-code">{result.ticketCode}</Text>
              </View>
            )}
          </View>
        )}
      </Card>

      <Button
        title="Scansiona un altro biglietto"
        variant="primary"
        onPress={handleReset}
        style={[styles.resetButton, isTablet && styles.resetButtonTablet]}
        icon={<Ionicons name="scan-outline" size={20} color={colors.primaryForeground} />}
        testID="button-scan-another"
      />
    </View>
  );

  const scannerFrameSize = isTablet ? 320 : isLandscape ? 200 : 250;

  const renderScanner = () => (
    <View 
      style={[styles.scannerContainer, isLandscape && styles.scannerContainerLandscape]}
      testID="container-scanner"
    >
      {isLandscape ? (
        <View style={styles.landscapeScannerLayout}>
          <View style={styles.landscapeCameraSection}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              testID="camera-view"
            />
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerMask} />
              <View style={styles.scannerMiddle}>
                <View style={styles.scannerMask} />
                <View style={[styles.scannerFrame, { width: scannerFrameSize, height: scannerFrameSize }]}>
                  <View style={[styles.corner, styles.cornerTopLeft]} />
                  <View style={[styles.corner, styles.cornerTopRight]} />
                  <View style={[styles.corner, styles.cornerBottomLeft]} />
                  <View style={[styles.corner, styles.cornerBottomRight]} />
                </View>
                <View style={styles.scannerMask} />
              </View>
              <View style={styles.scannerMask} />
            </View>
          </View>
          <View style={styles.landscapeControlsSection}>
            <Text style={styles.scannerHintLandscape}>
              Inquadra il codice QR del biglietto
            </Text>
            <TouchableOpacity
              style={styles.manualInputToggleLandscape}
              onPress={() => setShowManualInput(true)}
              testID="button-manual-input"
            >
              <Ionicons name="keypad-outline" size={24} color={colors.primary} />
              <Text style={styles.manualInputTextLandscape}>Inserisci codice manualmente</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            testID="camera-view"
          />

          <View style={styles.scannerOverlay}>
            <View style={styles.scannerMask} />
            <View style={styles.scannerMiddle}>
              <View style={styles.scannerMask} />
              <View style={[styles.scannerFrame, { width: scannerFrameSize, height: scannerFrameSize }]}>
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
              </View>
              <View style={styles.scannerMask} />
            </View>
            <View style={styles.scannerMask} />
          </View>

          <View style={styles.scannerFooter}>
            <Text style={styles.scannerHint}>
              Inquadra il codice QR del biglietto
            </Text>
            <TouchableOpacity
              style={styles.manualInputToggle}
              onPress={() => setShowManualInput(true)}
              testID="button-manual-input"
            >
              <Ionicons name="keypad-outline" size={20} color={colors.primary} />
              <Text style={styles.manualInputText}>Inserisci codice manualmente</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  const renderManualInput = () => (
    <View 
      style={[
        styles.manualInputContainer,
        isLandscape && styles.manualInputContainerLandscape,
        isTablet && styles.manualInputContainerTablet,
      ]}
      testID="container-manual-input"
    >
      <Card 
        variant="glass" 
        style={[
          styles.manualInputCard,
          isTablet && styles.manualInputCardTablet,
        ]}
        testID="card-manual-input"
      >
        <Text style={[styles.manualInputTitle, isTablet && styles.manualInputTitleTablet]}>
          Inserisci il codice del biglietto
        </Text>
        <TextInput
          style={[styles.input, isTablet && styles.inputTablet]}
          value={manualCode}
          onChangeText={setManualCode}
          placeholder="Es. ABC123XYZ"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="characters"
          autoCorrect={false}
          testID="input-ticket-code"
        />
        <View style={[styles.manualInputActions, isLandscape && styles.manualInputActionsLandscape]}>
          <Button
            title="Annulla"
            variant="outline"
            onPress={() => {
              setShowManualInput(false);
              setManualCode('');
            }}
            style={styles.cancelButton}
            testID="button-cancel"
          />
          <Button
            title="Verifica"
            variant="primary"
            onPress={handleManualVerify}
            loading={loading}
            style={styles.verifyButton}
            testID="button-verify"
          />
        </View>
      </Card>
    </View>
  );

  return (
    <SafeAreaView 
      style={styles.container} 
      edges={['top', 'bottom', 'left', 'right']}
      testID="screen-ticket-verify"
    >
      <Header
        title="Verifica Biglietto"
        showBack
        onBack={() => navigation.goBack()}
        transparent={!result && !showManualInput && hasPermission}
        testID="header-ticket-verify"
      />

      {hasPermission === false && renderPermissionDenied()}
      {hasPermission === null && (
        <View style={styles.centerContent} testID="container-loading">
          <Text style={styles.loadingText}>Richiesta permessi...</Text>
        </View>
      )}
      {hasPermission && !result && !showManualInput && renderScanner()}
      {showManualInput && !result && renderManualInput()}
      {result && renderResult()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  permissionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  loadingText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  manualButton: {
    marginTop: spacing.md,
  },
  scannerContainer: {
    flex: 1,
  },
  scannerContainerLandscape: {
    flexDirection: 'row',
  },
  landscapeScannerLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  landscapeCameraSection: {
    flex: 1,
    position: 'relative',
  },
  landscapeControlsSection: {
    width: 280,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  scannerMask: {
    flex: 1,
    backgroundColor: colors.overlay.medium,
  },
  scannerMiddle: {
    flexDirection: 'row',
  },
  scannerFrame: {
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scannerFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    padding: spacing.xl,
    paddingBottom: spacing.xl,
    backgroundColor: colors.overlay.dark,
  },
  scannerHint: {
    fontSize: fontSize.base,
    color: colors.foreground,
    marginBottom: spacing.lg,
  },
  scannerHintLandscape: {
    fontSize: fontSize.lg,
    color: colors.foreground,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  manualInputToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  manualInputToggleLandscape: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  manualInputText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  manualInputTextLandscape: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  manualInputContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  manualInputContainerLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualInputContainerTablet: {
    padding: spacing['2xl'],
  },
  manualInputCard: {
    padding: spacing.xl,
  },
  manualInputCardTablet: {
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
    padding: spacing['2xl'],
  },
  manualInputTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  manualInputTitleTablet: {
    fontSize: fontSize.xl,
    marginBottom: spacing.xl,
  },
  input: {
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.xl,
    fontSize: fontSize.lg,
    color: colors.foreground,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  inputTablet: {
    height: 64,
    fontSize: fontSize.xl,
    marginBottom: spacing.xl,
  },
  manualInputActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  manualInputActionsLandscape: {
    justifyContent: 'center',
  },
  cancelButton: {
    flex: 1,
  },
  verifyButton: {
    flex: 1,
  },
  resultContainer: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  resultContainerLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  resultContainerTablet: {
    padding: spacing['2xl'],
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  resultCard: {
    padding: spacing['2xl'],
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  resultCardValid: {
    borderColor: colors.success + '40',
  },
  resultCardInvalid: {
    borderColor: colors.error + '40',
  },
  resultCardTablet: {
    padding: spacing['2xl'],
  },
  resultIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  resultTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  resultTitleTablet: {
    fontSize: fontSize['3xl'],
  },
  resultMessage: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  ticketDetails: {
    width: '100%',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.foreground,
    fontWeight: fontWeight.medium,
  },
  resetButton: {
    width: '100%',
  },
  resetButtonTablet: {
    maxWidth: 400,
    alignSelf: 'center',
  },
});
