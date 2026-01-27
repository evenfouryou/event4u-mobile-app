import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { PrinterConfig } from '@/lib/api';

type PrinterType = 'usb' | 'network' | 'bluetooth';
type PaperSize = 'A4' | 'thermal_80mm' | 'thermal_58mm';

interface GestorePrinterSettingsScreenProps {
  onBack: () => void;
}

export function GestorePrinterSettingsScreen({ onBack }: GestorePrinterSettingsScreenProps) {
  const { colors } = useTheme();
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPrinter, setNewPrinter] = useState({
    name: '',
    type: 'network' as PrinterType,
    address: '',
    paperSize: 'thermal_80mm' as PaperSize,
  });

  useEffect(() => {
    loadPrinters();
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadPrinters = async () => {
    try {
      setIsLoading(true);
      const data = await api.getPrinters();
      setPrinters(data);
    } catch (error) {
      console.error('Error loading printers:', error);
      setPrinters([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrinters();
    setRefreshing(false);
  };

  const handleTestPrint = async (printer: PrinterConfig) => {
    triggerHaptic('medium');
    Alert.alert(
      'Stampa Test',
      `Invio stampa di test a "${printer.name}"...`,
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Stampa', 
          onPress: async () => {
            try {
              await api.testPrinter(printer.id);
              Alert.alert('Successo', 'Stampa di test inviata con successo');
            } catch (error) {
              Alert.alert('Errore', 'Impossibile inviare la stampa di test');
            }
          }
        },
      ]
    );
  };

  const handleSetDefault = async (printer: PrinterConfig) => {
    triggerHaptic('light');
    try {
      await api.setDefaultPrinter(printer.id);
      setPrinters(printers.map(p => ({
        ...p,
        isDefault: p.id === printer.id,
      })));
      Alert.alert('Successo', `"${printer.name}" impostata come stampante predefinita`);
    } catch (error) {
      Alert.alert('Errore', 'Impossibile impostare la stampante predefinita');
    }
  };

  const handleDeletePrinter = (printer: PrinterConfig) => {
    triggerHaptic('medium');
    Alert.alert(
      'Elimina Stampante',
      `Sei sicuro di voler rimuovere "${printer.name}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Elimina', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deletePrinter(printer.id);
              setPrinters(printers.filter(p => p.id !== printer.id));
            } catch (error) {
              Alert.alert('Errore', 'Impossibile eliminare la stampante');
            }
          }
        },
      ]
    );
  };

  const handleAddPrinter = async () => {
    if (!newPrinter.name.trim() || !newPrinter.address.trim()) {
      Alert.alert('Errore', 'Compila tutti i campi obbligatori');
      return;
    }

    triggerHaptic('medium');
    try {
      const created = await api.addPrinter(newPrinter);
      setPrinters([...printers, created]);
      setShowAddModal(false);
      setNewPrinter({
        name: '',
        type: 'network',
        address: '',
        paperSize: 'thermal_80mm',
      });
      Alert.alert('Successo', 'Stampante aggiunta con successo');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile aggiungere la stampante');
    }
  };

  const getTypeLabel = (type: PrinterType): string => {
    switch (type) {
      case 'usb': return 'USB';
      case 'network': return 'Rete';
      case 'bluetooth': return 'Bluetooth';
    }
  };

  const getTypeIcon = (type: PrinterType): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'usb': return 'hardware-chip-outline';
      case 'network': return 'wifi-outline';
      case 'bluetooth': return 'bluetooth-outline';
    }
  };

  const getPaperSizeLabel = (size: PaperSize): string => {
    switch (size) {
      case 'A4': return 'A4';
      case 'thermal_80mm': return 'Termica 80mm';
      case 'thermal_58mm': return 'Termica 58mm';
    }
  };

  const getStatusBadge = (status: PrinterConfig['status']) => {
    switch (status) {
      case 'ready':
        return <Badge variant="success">Pronta</Badge>;
      case 'offline':
        return <Badge variant="secondary">Offline</Badge>;
      case 'error':
        return <Badge variant="destructive">Errore</Badge>;
    }
  };

  const totalQueueCount = printers.reduce((sum, p) => sum + p.queueCount, 0);

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-printers"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.headerSection}>
          <Text style={styles.title}>Stampanti</Text>
          <Text style={styles.subtitle}>Configura le stampanti per biglietti e ricevute</Text>
        </View>

        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
              <Ionicons name="print" size={20} color={staticColors.primary} />
            </View>
            <Text style={styles.statValue}>{printers.length}</Text>
            <Text style={styles.statLabel}>Stampanti</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
              <Ionicons name="layers" size={20} color={staticColors.teal} />
            </View>
            <Text style={styles.statValue}>{totalQueueCount}</Text>
            <Text style={styles.statLabel}>Coda Stampa</Text>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Stampanti Configurate</Text>
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setShowAddModal(true);
              }}
              style={styles.addButton}
              testID="button-add-printer"
            >
              <Ionicons name="add" size={18} color={staticColors.primary} />
              <Text style={styles.addButtonText}>Aggiungi Stampante</Text>
            </Pressable>
          </View>

          {showLoader ? (
            <Loading text="Caricamento stampanti..." />
          ) : printers.length > 0 ? (
            printers.map((printer) => (
              <Card key={printer.id} style={styles.printerCard} testID={`printer-${printer.id}`}>
                <View style={styles.printerHeader}>
                  <View style={styles.printerInfo}>
                    <View style={[styles.printerIcon, { backgroundColor: `${staticColors.primary}15` }]}>
                      <Ionicons name="print-outline" size={20} color={staticColors.primary} />
                    </View>
                    <View>
                      <View style={styles.printerNameRow}>
                        <Text style={styles.printerName}>{printer.name}</Text>
                        {printer.isDefault && (
                          <Badge variant="golden" size="sm">Predefinita</Badge>
                        )}
                      </View>
                      <Text style={styles.printerAddress}>{printer.address}</Text>
                    </View>
                  </View>
                  {getStatusBadge(printer.status)}
                </View>

                <View style={styles.printerDetails}>
                  <View style={styles.printerDetail}>
                    <Ionicons name={getTypeIcon(printer.type)} size={14} color={staticColors.mutedForeground} />
                    <Text style={styles.printerDetailText}>{getTypeLabel(printer.type)}</Text>
                  </View>
                  <View style={styles.printerDetail}>
                    <Ionicons name="document-outline" size={14} color={staticColors.mutedForeground} />
                    <Text style={styles.printerDetailText}>{getPaperSizeLabel(printer.paperSize)}</Text>
                  </View>
                  {printer.queueCount > 0 && (
                    <View style={styles.printerDetail}>
                      <Ionicons name="time-outline" size={14} color={staticColors.warning} />
                      <Text style={[styles.printerDetailText, { color: staticColors.warning }]}>
                        {printer.queueCount} in coda
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.printerActions}>
                  <Pressable
                    style={styles.printerActionButton}
                    onPress={() => handleTestPrint(printer)}
                    testID={`button-test-${printer.id}`}
                  >
                    <Ionicons name="print-outline" size={16} color={staticColors.foreground} />
                    <Text style={styles.printerActionText}>Stampa Test</Text>
                  </Pressable>

                  {!printer.isDefault && (
                    <Pressable
                      style={styles.printerActionButton}
                      onPress={() => handleSetDefault(printer)}
                      testID={`button-default-${printer.id}`}
                    >
                      <Ionicons name="star-outline" size={16} color={staticColors.foreground} />
                      <Text style={styles.printerActionText}>Predefinita</Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={styles.printerActionButtonDanger}
                    onPress={() => handleDeletePrinter(printer)}
                    testID={`button-delete-${printer.id}`}
                  >
                    <Ionicons name="trash-outline" size={16} color={staticColors.destructive} />
                  </Pressable>
                </View>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Ionicons name="print-outline" size={40} color={staticColors.mutedForeground} />
              <Text style={styles.emptyText}>Nessuna stampante configurata</Text>
              <Pressable
                style={styles.emptyAddButton}
                onPress={() => setShowAddModal(true)}
              >
                <Ionicons name="add" size={18} color={staticColors.primaryForeground} />
                <Text style={styles.emptyAddButtonText}>Aggiungi Stampante</Text>
              </Pressable>
            </Card>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeArea style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Aggiungi Stampante</Text>
            <Pressable onPress={() => setShowAddModal(false)} style={styles.modalClose}>
              <Ionicons name="close" size={24} color={staticColors.foreground} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nome Stampante *</Text>
              <TextInput
                style={styles.formInput}
                value={newPrinter.name}
                onChangeText={(text) => setNewPrinter({ ...newPrinter, name: text })}
                placeholder="Es. Stampante Cassa 1"
                placeholderTextColor={staticColors.mutedForeground}
                testID="input-printer-name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tipo Connessione</Text>
              <View style={styles.typeSelector}>
                {(['network', 'bluetooth', 'usb'] as PrinterType[]).map((type) => (
                  <Pressable
                    key={type}
                    style={[
                      styles.typeSelectorOption,
                      newPrinter.type === type && styles.typeSelectorOptionActive,
                    ]}
                    onPress={() => setNewPrinter({ ...newPrinter, type })}
                  >
                    <Ionicons
                      name={getTypeIcon(type)}
                      size={18}
                      color={newPrinter.type === type ? staticColors.primaryForeground : staticColors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.typeSelectorText,
                        newPrinter.type === type && styles.typeSelectorTextActive,
                      ]}
                    >
                      {getTypeLabel(type)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                {newPrinter.type === 'network' ? 'Indirizzo IP' : newPrinter.type === 'bluetooth' ? 'Indirizzo MAC' : 'Porta USB'} *
              </Text>
              <TextInput
                style={styles.formInput}
                value={newPrinter.address}
                onChangeText={(text) => setNewPrinter({ ...newPrinter, address: text })}
                placeholder={newPrinter.type === 'network' ? '192.168.1.100' : newPrinter.type === 'bluetooth' ? 'AA:BB:CC:DD:EE:FF' : 'USB001'}
                placeholderTextColor={staticColors.mutedForeground}
                autoCapitalize="none"
                testID="input-printer-address"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Formato Carta</Text>
              <View style={styles.paperSizeSelector}>
                {(['thermal_80mm', 'thermal_58mm', 'A4'] as PaperSize[]).map((size) => (
                  <Pressable
                    key={size}
                    style={[
                      styles.paperSizeOption,
                      newPrinter.paperSize === size && styles.paperSizeOptionActive,
                    ]}
                    onPress={() => setNewPrinter({ ...newPrinter, paperSize: size })}
                  >
                    <Text
                      style={[
                        styles.paperSizeText,
                        newPrinter.paperSize === size && styles.paperSizeTextActive,
                      ]}
                    >
                      {getPaperSizeLabel(size)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable
              style={styles.modalCancelButton}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Annulla</Text>
            </Pressable>
            <Pressable
              style={styles.modalConfirmButton}
              onPress={handleAddPrinter}
              testID="button-save-printer"
            >
              <Ionicons name="add" size={18} color={staticColors.primaryForeground} />
              <Text style={styles.modalConfirmButtonText}>Aggiungi</Text>
            </Pressable>
          </View>
        </SafeArea>
      </Modal>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.primary,
  },
  printerCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  printerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  printerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  printerIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  printerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  printerName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  printerAddress: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  printerDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  printerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  printerDetailText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  printerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  printerActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: borderRadius.md,
  },
  printerActionText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  printerActionButtonDanger: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: staticColors.destructive,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: staticColors.primary,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  emptyAddButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  modalClose: {
    padding: spacing.xs,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
    marginBottom: spacing.sm,
  },
  formInput: {
    backgroundColor: staticColors.card,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeSelectorOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: borderRadius.md,
    backgroundColor: staticColors.card,
  },
  typeSelectorOptionActive: {
    backgroundColor: staticColors.primary,
    borderColor: staticColors.primary,
  },
  typeSelectorText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  typeSelectorTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  paperSizeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  paperSizeOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: borderRadius.md,
    backgroundColor: staticColors.card,
  },
  paperSizeOptionActive: {
    backgroundColor: staticColors.primary,
    borderColor: staticColors.primary,
  },
  paperSizeText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  paperSizeTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: borderRadius.md,
  },
  modalCancelButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.mutedForeground,
  },
  modalConfirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: staticColors.primary,
    borderRadius: borderRadius.md,
  },
  modalConfirmButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
});

export default GestorePrinterSettingsScreen;
