import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { ImportData } from '@/lib/api';

type ImportType = 'products' | 'customers' | 'prices' | 'guests';

interface GestoreImportScreenProps {
  onBack: () => void;
}

export function GestoreImportScreen({ onBack }: GestoreImportScreenProps) {
  const { colors } = useTheme();
  const [importHistory, setImportHistory] = useState<ImportData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeType, setActiveType] = useState<ImportType>('products');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ valid: number; invalid: number; errors: string[] } | null>(null);

  useEffect(() => {
    loadImportHistory();
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

  const loadImportHistory = async () => {
    try {
      setIsLoading(true);
      const data = await api.getImportHistory();
      setImportHistory(data);
    } catch (error) {
      console.error('Error loading import history:', error);
      setImportHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadImportHistory();
    setRefreshing(false);
  };

  const handleDownloadTemplate = (type: ImportType) => {
    triggerHaptic('light');
    Alert.alert(
      'Scarica Template',
      `Il template per ${getTypeLabel(type)} verrà scaricato sul tuo dispositivo.`,
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Scarica', onPress: () => {
          Alert.alert('Successo', 'Template scaricato con successo');
        }},
      ]
    );
  };

  const handleSelectFile = () => {
    triggerHaptic('light');
    setSelectedFile('import_data.csv');
    setPreviewData({
      valid: 145,
      invalid: 3,
      errors: [
        'Riga 23: Campo "prezzo" mancante',
        'Riga 45: Formato data non valido',
        'Riga 89: Codice prodotto duplicato',
      ],
    });
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;
    triggerHaptic('medium');
    Alert.alert(
      'Conferma Importazione',
      `Stai per importare ${previewData?.valid || 0} record validi. Continuare?`,
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Importa', 
          onPress: async () => {
            try {
              await api.processImport(activeType, selectedFile);
              Alert.alert('Successo', 'Importazione completata con successo');
              setSelectedFile(null);
              setPreviewData(null);
              loadImportHistory();
            } catch (error) {
              Alert.alert('Errore', 'Errore durante l\'importazione');
            }
          }
        },
      ]
    );
  };

  const getTypeLabel = (type: ImportType): string => {
    switch (type) {
      case 'products': return 'Prodotti';
      case 'customers': return 'Clienti';
      case 'prices': return 'Prezzi';
      case 'guests': return 'Liste Ospiti';
    }
  };

  const getTypeIcon = (type: ImportType): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'products': return 'cube-outline';
      case 'customers': return 'people-outline';
      case 'prices': return 'pricetag-outline';
      case 'guests': return 'list-outline';
    }
  };

  const getStatusBadge = (status: ImportData['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="success">Completato</Badge>;
      case 'partial':
        return <Badge variant="warning">Parziale</Badge>;
      case 'failed':
        return <Badge variant="destructive">Fallito</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const types: { id: ImportType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'products', label: 'Prodotti', icon: 'cube-outline' },
    { id: 'customers', label: 'Clienti', icon: 'people-outline' },
    { id: 'prices', label: 'Prezzi', icon: 'pricetag-outline' },
    { id: 'guests', label: 'Liste Ospiti', icon: 'list-outline' },
  ];

  const filteredHistory = importHistory.filter(item => item.type === activeType);

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-import"
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
          <Text style={styles.title}>Importa Dati</Text>
          <Text style={styles.subtitle}>Importa dati da file esterni nel sistema</Text>
        </View>

        <Text style={styles.sectionLabel}>Tipo Importazione</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typesContainer}
        >
          {types.map((type) => (
            <Pressable
              key={type.id}
              onPress={() => {
                triggerHaptic('selection');
                setActiveType(type.id);
                setSelectedFile(null);
                setPreviewData(null);
              }}
              style={[
                styles.typeChip,
                activeType === type.id && styles.typeChipActive,
              ]}
              testID={`type-${type.id}`}
            >
              <Ionicons
                name={type.icon}
                size={16}
                color={activeType === type.id ? staticColors.primaryForeground : staticColors.mutedForeground}
              />
              <Text
                style={[
                  styles.typeChipText,
                  activeType === type.id && styles.typeChipTextActive,
                ]}
              >
                {type.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Carica File</Text>
            <Pressable
              onPress={() => handleDownloadTemplate(activeType)}
              style={styles.templateButton}
              testID="button-download-template"
            >
              <Ionicons name="download-outline" size={16} color={staticColors.primary} />
              <Text style={styles.templateButtonText}>Scarica Template</Text>
            </Pressable>
          </View>

          <Card style={styles.uploadCard} testID="upload-area">
            <Pressable onPress={handleSelectFile} style={styles.uploadArea}>
              <View style={styles.uploadIconContainer}>
                <Ionicons name="cloud-upload-outline" size={40} color={staticColors.primary} />
              </View>
              <Text style={styles.uploadTitle}>
                {selectedFile ? selectedFile : 'Seleziona o trascina un file'}
              </Text>
              <Text style={styles.uploadSubtext}>
                Formati supportati: CSV, XLSX, XLS
              </Text>
              {!selectedFile && (
                <Pressable style={styles.selectFileButton} onPress={handleSelectFile}>
                  <Text style={styles.selectFileButtonText}>Seleziona File</Text>
                </Pressable>
              )}
            </Pressable>
          </Card>

          {previewData && (
            <Card style={styles.previewCard} testID="preview-card">
              <Text style={styles.previewTitle}>Anteprima Validazione</Text>
              
              <View style={styles.previewStats}>
                <View style={styles.previewStat}>
                  <View style={[styles.previewStatIcon, { backgroundColor: `${staticColors.success}20` }]}>
                    <Ionicons name="checkmark-circle" size={20} color={staticColors.success} />
                  </View>
                  <Text style={styles.previewStatValue}>{previewData.valid}</Text>
                  <Text style={styles.previewStatLabel}>Record Validi</Text>
                </View>
                <View style={styles.previewStat}>
                  <View style={[styles.previewStatIcon, { backgroundColor: `${staticColors.destructive}20` }]}>
                    <Ionicons name="close-circle" size={20} color={staticColors.destructive} />
                  </View>
                  <Text style={styles.previewStatValue}>{previewData.invalid}</Text>
                  <Text style={styles.previewStatLabel}>Errori</Text>
                </View>
              </View>

              {previewData.errors.length > 0 && (
                <View style={styles.errorsSection}>
                  <Text style={styles.errorsTitle}>Dettaglio Errori</Text>
                  {previewData.errors.map((error, index) => (
                    <View key={index} style={styles.errorItem}>
                      <Ionicons name="warning" size={14} color={staticColors.warning} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.previewActions}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => {
                    setSelectedFile(null);
                    setPreviewData(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Annulla</Text>
                </Pressable>
                <Pressable
                  style={styles.confirmButton}
                  onPress={handleConfirmImport}
                  testID="button-confirm-import"
                >
                  <Ionicons name="checkmark" size={18} color={staticColors.primaryForeground} />
                  <Text style={styles.confirmButtonText}>Conferma Importazione</Text>
                </Pressable>
              </View>
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cronologia Importazioni</Text>
          
          {showLoader ? (
            <Loading text="Caricamento..." />
          ) : filteredHistory.length > 0 ? (
            filteredHistory.map((item) => (
              <Card key={item.id} style={styles.historyCard} testID={`history-${item.id}`}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyInfo}>
                    <View style={[styles.historyIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                      <Ionicons name={getTypeIcon(item.type)} size={18} color={staticColors.primary} />
                    </View>
                    <View>
                      <Text style={styles.historyFileName}>{item.fileName}</Text>
                      <Text style={styles.historyDate}>{formatDate(item.importDate)}</Text>
                    </View>
                  </View>
                  {getStatusBadge(item.status)}
                </View>
                <View style={styles.historyStats}>
                  <Text style={styles.historyStatsText}>
                    {item.recordsCount} record importati
                  </Text>
                  {item.errors && item.errors.length > 0 && (
                    <Text style={styles.historyErrorsText}>
                      {item.errors.length} errori
                    </Text>
                  )}
                </View>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Ionicons name="folder-open-outline" size={40} color={staticColors.mutedForeground} />
              <Text style={styles.emptyText}>Nessuna importazione per {getTypeLabel(activeType)}</Text>
            </Card>
          )}
        </View>
      </ScrollView>
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
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.mutedForeground,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typesContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
    marginRight: spacing.sm,
  },
  typeChipActive: {
    backgroundColor: staticColors.primary,
  },
  typeChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  typeChipTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
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
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  templateButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.primary,
  },
  uploadCard: {
    padding: 0,
  },
  uploadArea: {
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: staticColors.border,
    borderRadius: borderRadius.lg,
    margin: spacing.sm,
  },
  uploadIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${staticColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  uploadTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  uploadSubtext: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  selectFileButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: staticColors.primary,
    borderRadius: borderRadius.md,
  },
  selectFileButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  previewCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  previewTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  previewStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  previewStat: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.md,
  },
  previewStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  previewStatValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  previewStatLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  errorsSection: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: `${staticColors.warning}10`,
    borderRadius: borderRadius.md,
  },
  errorsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.warning,
    marginBottom: spacing.sm,
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  errorText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  previewActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: borderRadius.md,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.mutedForeground,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: staticColors.primary,
    borderRadius: borderRadius.md,
  },
  confirmButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  historyCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyFileName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  historyDate: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  historyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  historyStatsText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  historyErrorsText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.destructive,
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
});

export default GestoreImportScreen;
