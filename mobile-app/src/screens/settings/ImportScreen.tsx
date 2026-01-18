import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';

interface ImportHistory {
  id: string;
  filename: string;
  type: 'csv' | 'xlsx';
  recordsImported: number;
  importedAt: string;
  status: 'success' | 'partial' | 'failed';
}

export function ImportScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [isImporting, setIsImporting] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([
    {
      id: '1',
      filename: 'partecipanti_evento.csv',
      type: 'csv',
      recordsImported: 245,
      importedAt: '2024-01-15T10:30:00Z',
      status: 'success',
    },
    {
      id: '2',
      filename: 'prodotti_bar.xlsx',
      type: 'xlsx',
      recordsImported: 58,
      importedAt: '2024-01-10T14:15:00Z',
      status: 'success',
    },
    {
      id: '3',
      filename: 'listino_prezzi.csv',
      type: 'csv',
      recordsImported: 0,
      importedAt: '2024-01-08T09:00:00Z',
      status: 'failed',
    },
  ]);

  const importTypes = [
    {
      id: 'participants',
      title: 'Partecipanti',
      description: 'Importa lista partecipanti da CSV/Excel',
      icon: 'people-outline' as const,
      color: colors.primary,
    },
    {
      id: 'products',
      title: 'Prodotti',
      description: 'Importa catalogo prodotti beverage',
      icon: 'wine-outline' as const,
      color: colors.teal,
    },
    {
      id: 'prices',
      title: 'Listini Prezzi',
      description: 'Importa listini prezzi eventi',
      icon: 'pricetags-outline' as const,
      color: '#8B5CF6',
    },
    {
      id: 'staff',
      title: 'Staff',
      description: 'Importa elenco collaboratori',
      icon: 'people-circle-outline' as const,
      color: '#F59E0B',
    },
  ];

  const handleSelectFile = async (importType: string) => {
    setIsImporting(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newImport: ImportHistory = {
      id: Date.now().toString(),
      filename: `import_${importType}_${Date.now()}.csv`,
      type: 'csv',
      recordsImported: Math.floor(Math.random() * 100) + 10,
      importedAt: new Date().toISOString(),
      status: 'success',
    };
    
    setImportHistory([newImport, ...importHistory]);
    setIsImporting(false);
    
    Alert.alert('Importazione Completata', `${newImport.recordsImported} record importati con successo`);
  };

  const handleDownloadTemplate = (type: string) => {
    Alert.alert('Download Template', `Il template per "${type}" verrà scaricato`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: ImportHistory['status']) => {
    switch (status) {
      case 'success': return colors.success;
      case 'partial': return colors.warning;
      case 'failed': return colors.destructive;
    }
  };

  const getStatusText = (status: ImportHistory['status']) => {
    switch (status) {
      case 'success': return 'Completato';
      case 'partial': return 'Parziale';
      case 'failed': return 'Fallito';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          data-testid="button-back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Importa Dati</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        {isImporting && (
          <View style={styles.importingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.importingText}>Importazione in corso...</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={colors.teal} />
          <Text style={styles.infoText}>
            Importa dati da file CSV o Excel. Scarica prima il template per assicurarti che il formato sia corretto.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo di Importazione</Text>
          {importTypes.map(type => (
            <View key={type.id} style={styles.importTypeCard}>
              <View style={[styles.typeIcon, { backgroundColor: `${type.color}20` }]}>
                <Ionicons name={type.icon} size={24} color={type.color} />
              </View>
              <View style={styles.typeInfo}>
                <Text style={styles.typeTitle}>{type.title}</Text>
                <Text style={styles.typeDescription}>{type.description}</Text>
              </View>
              <View style={styles.typeActions}>
                <TouchableOpacity
                  style={styles.templateButton}
                  onPress={() => handleDownloadTemplate(type.id)}
                  data-testid={`button-template-${type.id}`}
                >
                  <Ionicons name="download-outline" size={16} color={colors.foreground} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.importButton}
                  onPress={() => handleSelectFile(type.id)}
                  disabled={isImporting}
                  data-testid={`button-import-${type.id}`}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cronologia Importazioni</Text>
          {importHistory.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="time-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>Nessuna importazione recente</Text>
            </View>
          ) : (
            importHistory.map(item => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyIcon}>
                  <Ionicons
                    name={item.type === 'csv' ? 'document-text-outline' : 'grid-outline'}
                    size={20}
                    color={colors.mutedForeground}
                  />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyFilename} numberOfLines={1}>{item.filename}</Text>
                  <Text style={styles.historyMeta}>
                    {item.recordsImported} record • {formatDate(item.importedAt)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {getStatusText(item.status)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Formati Supportati</Text>
          <View style={styles.formatsRow}>
            <View style={styles.formatBadge}>
              <Text style={styles.formatText}>CSV</Text>
            </View>
            <View style={styles.formatBadge}>
              <Text style={styles.formatText}>XLSX</Text>
            </View>
            <View style={styles.formatBadge}>
              <Text style={styles.formatText}>XLS</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  importingOverlay: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  importingText: {
    fontSize: fontSize.base,
    color: colors.foreground,
    marginTop: spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 206, 209, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.foreground,
    lineHeight: 18,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
    marginLeft: spacing.sm,
  },
  importTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  typeTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  typeDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  typeActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  templateButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  importButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    marginTop: spacing.md,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  historyFilename: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  historyMeta: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  helpSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  helpTitle: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  formatsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formatBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
  },
  formatText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
});
