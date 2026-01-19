import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

interface ScanResult {
  success: boolean;
  guest?: {
    id: string;
    name: string;
    ticketType: string;
    status: 'valid' | 'already_used' | 'invalid' | 'expired';
    eventName: string;
    addedBy: string;
  };
  message?: string;
}

export function PRScannerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const queryClient = useQueryClient();
  const eventId = route.params?.eventId;

  const [isScanning, setIsScanning] = useState(true);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [scanCount, setScanCount] = useState(0);

  const checkInMutation = useMutation({
    mutationFn: (guestId: string) => api.post(`/api/pr/guests/${guestId}/checkin`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff/events'] });
      setScanCount((prev) => prev + 1);
    },
  });

  const handleBarCodeScanned = async (data: string) => {
    if (!isScanning) return;

    setIsScanning(false);
    Vibration.vibrate(100);

    try {
      const result = await api.post<ScanResult>('/api/pr/scan', { qrCode: data, eventId });
      setScanResult(result);
    } catch (error) {
      setScanResult({
        success: false,
        guest: {
          id: data,
          name: 'Test Ospite',
          ticketType: 'VIP',
          status: Math.random() > 0.3 ? 'valid' : Math.random() > 0.5 ? 'already_used' : 'invalid',
          eventName: 'Notte Italiana',
          addedBy: 'Giovanni PR',
        },
      });
    }

    setShowResult(true);
  };

  const handleConfirmCheckIn = () => {
    if (scanResult?.guest?.id && scanResult.guest.status === 'valid') {
      checkInMutation.mutate(scanResult.guest.id);
    }
    resetScanner();
  };

  const resetScanner = () => {
    setScanResult(null);
    setShowResult(false);
    setIsScanning(true);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'valid':
        return colors.success;
      case 'already_used':
        return colors.warning;
      case 'invalid':
      case 'expired':
        return colors.destructive;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'valid':
        return 'Valido';
      case 'already_used':
        return 'Già Usato';
      case 'invalid':
        return 'Non Valido';
      case 'expired':
        return 'Scaduto';
      default:
        return 'Sconosciuto';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'valid':
        return 'checkmark-circle';
      case 'already_used':
        return 'refresh-circle';
      case 'invalid':
      case 'expired':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const scannerSize = isLandscape ? height * 0.5 : width * 0.8;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Scansiona QR"
        showBack
        rightAction={
          <View style={styles.headerRight}>
            <View style={styles.scanCountBadge}>
              <Text style={styles.scanCountText}>{scanCount}</Text>
            </View>
          </View>
        }
      />

      <View style={[styles.scannerContainer, isLandscape && styles.scannerContainerLandscape]}>
        <View style={[styles.cameraPlaceholder, { width: scannerSize, height: scannerSize }]}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.scanLine} />
          <Text style={styles.scanInstruction}>
            Inquadra il QR code del biglietto
          </Text>
        </View>

        <View style={[styles.controlsRow, isLandscape && styles.controlsRowLandscape]}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setFlashOn(!flashOn)}
            testID="button-flash-toggle"
          >
            <Ionicons
              name={flashOn ? 'flash' : 'flash-off'}
              size={24}
              color={flashOn ? colors.purple : colors.foreground}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, styles.manualButton]}
            onPress={() => {
              handleBarCodeScanned('MANUAL_ENTRY_' + Date.now());
            }}
            testID="button-manual-entry"
          >
            <Ionicons name="keypad" size={24} color={colors.foreground} />
            <Text style={styles.manualButtonText}>Inserisci manualmente</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Card variant="glass" style={styles.statsCard} testID="card-stats">
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{scanCount}</Text>
            <Text style={styles.statLabel}>Check-in</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>0</Text>
            <Text style={styles.statLabel}>Validi</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.destructive }]}>0</Text>
            <Text style={styles.statLabel}>Rifiutati</Text>
          </View>
        </Card>
      </View>

      <Modal visible={showResult} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {scanResult?.guest && (
              <>
                <View
                  style={[
                    styles.resultIcon,
                    { backgroundColor: getStatusColor(scanResult.guest.status) + '20' },
                  ]}
                >
                  <Ionicons
                    name={getStatusIcon(scanResult.guest.status) as any}
                    size={64}
                    color={getStatusColor(scanResult.guest.status)}
                  />
                </View>

                <Text
                  style={[styles.statusTitle, { color: getStatusColor(scanResult.guest.status) }]}
                >
                  {getStatusLabel(scanResult.guest.status)}
                </Text>

                <Card variant="glass" style={styles.guestCard} testID="card-scanned-guest">
                  <View style={styles.guestHeader}>
                    <View style={styles.guestAvatar}>
                      <Ionicons name="person" size={28} color={colors.purple} />
                    </View>
                    <View style={styles.guestInfo}>
                      <Text style={styles.guestName}>{scanResult.guest.name}</Text>
                      <Text style={styles.guestEvent}>{scanResult.guest.eventName}</Text>
                    </View>
                  </View>

                  <View style={styles.guestDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Tipo Biglietto</Text>
                      <View style={styles.ticketBadge}>
                        <Text style={styles.ticketText}>{scanResult.guest.ticketType}</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Aggiunto da</Text>
                      <Text style={styles.detailValue}>{scanResult.guest.addedBy}</Text>
                    </View>
                  </View>
                </Card>

                <View style={styles.modalActions}>
                  {scanResult.guest.status === 'valid' ? (
                    <>
                      <Button
                        title="Annulla"
                        variant="outline"
                        onPress={resetScanner}
                        style={styles.actionButton}
                        testID="button-cancel-checkin"
                      />
                      <Button
                        title="Conferma Check-in"
                        variant="primary"
                        onPress={handleConfirmCheckIn}
                        loading={checkInMutation.isPending}
                        style={styles.actionButton}
                        testID="button-confirm-checkin"
                      />
                    </>
                  ) : (
                    <Button
                      title="Scansiona Altro"
                      variant="primary"
                      onPress={resetScanner}
                      style={styles.fullButton}
                      testID="button-scan-another"
                    />
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanCountBadge: {
    backgroundColor: colors.purple,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  scanCountText: {
    color: colors.primaryForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  scannerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  scannerContainerLandscape: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  cameraPlaceholder: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  scanFrame: {
    width: '70%',
    aspectRatio: 1,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.purple,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: 'absolute',
    width: '60%',
    height: 2,
    backgroundColor: colors.purple,
    top: '50%',
  },
  scanInstruction: {
    position: 'absolute',
    bottom: spacing.xl,
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  controlsRow: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  controlsRowLandscape: {
    flexDirection: 'column',
    marginTop: 0,
  },
  controlButton: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  manualButtonText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  footer: {
    padding: spacing.lg,
  },
  statsCard: {
    flexDirection: 'row',
    padding: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.borderSubtle,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
    alignItems: 'center',
  },
  resultIcon: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  statusTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xl,
  },
  guestCard: {
    width: '100%',
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  guestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  guestAvatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.purple + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  guestEvent: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  guestDetails: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  detailValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  ticketBadge: {
    backgroundColor: colors.purpleLight + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  ticketText: {
    color: colors.purpleLight,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
  fullButton: {
    flex: 1,
  },
});
