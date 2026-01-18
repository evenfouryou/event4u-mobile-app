import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Vibration } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();

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
    <View style={styles.centerContent}>
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
      />
    </View>
  );

  const renderResult = () => (
    <View style={styles.resultContainer}>
      <Card
        variant={result?.valid ? 'glass' : 'default'}
        style={[
          styles.resultCard,
          result?.valid ? styles.resultCardValid : styles.resultCardInvalid,
        ]}
      >
        <View
          style={[
            styles.resultIconContainer,
            { backgroundColor: result?.valid ? colors.success + '20' : colors.error + '20' },
          ]}
        >
          <Ionicons
            name={result?.valid ? 'checkmark-circle' : 'close-circle'}
            size={64}
            color={result?.valid ? colors.success : colors.error}
          />
        </View>

        <Text style={[styles.resultTitle, { color: result?.valid ? colors.success : colors.error }]}>
          {result?.valid ? 'Biglietto Valido' : 'Biglietto Non Valido'}
        </Text>

        {result?.message && (
          <Text style={styles.resultMessage}>{result.message}</Text>
        )}

        {result?.valid && result.eventName && (
          <View style={styles.ticketDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Evento</Text>
              <Text style={styles.detailValue}>{result.eventName}</Text>
            </View>
            {result.ticketType && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tipo</Text>
                <Text style={styles.detailValue}>{result.ticketType}</Text>
              </View>
            )}
            {result.holderName && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Intestatario</Text>
                <Text style={styles.detailValue}>{result.holderName}</Text>
              </View>
            )}
            {result.ticketCode && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Codice</Text>
                <Text style={styles.detailValue}>{result.ticketCode}</Text>
              </View>
            )}
          </View>
        )}
      </Card>

      <Button
        title="Scansiona un altro biglietto"
        variant="primary"
        onPress={handleReset}
        style={styles.resetButton}
        icon={<Ionicons name="scan-outline" size={20} color={colors.primaryForeground} />}
      />
    </View>
  );

  const renderScanner = () => (
    <View style={styles.scannerContainer}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      <View style={styles.scannerOverlay}>
        <View style={styles.scannerMask} />
        <View style={styles.scannerMiddle}>
          <View style={styles.scannerMask} />
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          <View style={styles.scannerMask} />
        </View>
        <View style={styles.scannerMask} />
      </View>

      <View style={[styles.scannerFooter, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Text style={styles.scannerHint}>
          Inquadra il codice QR del biglietto
        </Text>
        <TouchableOpacity
          style={styles.manualInputToggle}
          onPress={() => setShowManualInput(true)}
        >
          <Ionicons name="keypad-outline" size={20} color={colors.primary} />
          <Text style={styles.manualInputText}>Inserisci codice manualmente</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderManualInput = () => (
    <View style={styles.manualInputContainer}>
      <Card variant="glass" style={styles.manualInputCard}>
        <Text style={styles.manualInputTitle}>Inserisci il codice del biglietto</Text>
        <TextInput
          style={styles.input}
          value={manualCode}
          onChangeText={setManualCode}
          placeholder="Es. ABC123XYZ"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <View style={styles.manualInputActions}>
          <Button
            title="Annulla"
            variant="outline"
            onPress={() => {
              setShowManualInput(false);
              setManualCode('');
            }}
            style={styles.cancelButton}
          />
          <Button
            title="Verifica"
            variant="primary"
            onPress={handleManualVerify}
            loading={loading}
            style={styles.verifyButton}
          />
        </View>
      </Card>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Verifica Biglietto"
        showBack
        onBack={() => navigation.goBack()}
        transparent={!result && !showManualInput && hasPermission}
      />

      {hasPermission === false && renderPermissionDenied()}
      {hasPermission === null && (
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Richiesta permessi...</Text>
        </View>
      )}
      {hasPermission && !result && !showManualInput && renderScanner()}
      {showManualInput && !result && renderManualInput()}
      {result && renderResult()}
    </View>
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
    width: 250,
    height: 250,
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
    backgroundColor: colors.overlay.dark,
  },
  scannerHint: {
    fontSize: fontSize.base,
    color: colors.foreground,
    marginBottom: spacing.lg,
  },
  manualInputToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  manualInputText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  manualInputContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  manualInputCard: {
    padding: spacing.xl,
  },
  manualInputTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.lg,
    textAlign: 'center',
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
  manualInputActions: {
    flexDirection: 'row',
    gap: spacing.md,
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
});
