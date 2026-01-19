import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

interface Printer {
  id: string;
  name: string;
  type: 'bluetooth' | 'wifi' | 'usb';
  isConnected: boolean;
  isDefault: boolean;
  paperSize: string;
  lastUsed?: string;
}

export function PrinterSettingsScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [isSearching, setIsSearching] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [printPreview, setPrintPreview] = useState(true);
  
  const [printers, setPrinters] = useState<Printer[]>([
    {
      id: '1',
      name: 'EPSON TM-T88VI',
      type: 'wifi',
      isConnected: true,
      isDefault: true,
      paperSize: '80mm',
      lastUsed: '2024-01-15',
    },
    {
      id: '2',
      name: 'Star TSP143IIILAN',
      type: 'wifi',
      isConnected: false,
      isDefault: false,
      paperSize: '80mm',
    },
  ]);

  const handleSearchPrinters = async () => {
    setIsSearching(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSearching(false);
    Alert.alert('Ricerca completata', 'Nessuna nuova stampante trovata');
  };

  const handleSetDefault = (printerId: string) => {
    setPrinters(prev =>
      prev.map(p => ({ ...p, isDefault: p.id === printerId }))
    );
  };

  const handleConnect = async (printerId: string) => {
    const printer = printers.find(p => p.id === printerId);
    if (!printer) return;

    setPrinters(prev =>
      prev.map(p =>
        p.id === printerId ? { ...p, isConnected: !p.isConnected } : p
      )
    );
  };

  const handleTestPrint = (printerId: string) => {
    Alert.alert('Stampa di prova', 'Stampa di prova inviata alla stampante');
  };

  const handleRemovePrinter = (printerId: string) => {
    Alert.alert(
      'Rimuovi Stampante',
      'Sei sicuro di voler rimuovere questa stampante?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rimuovi',
          style: 'destructive',
          onPress: () => {
            setPrinters(prev => prev.filter(p => p.id !== printerId));
          },
        },
      ]
    );
  };

  const getPrinterIcon = (type: Printer['type']) => {
    switch (type) {
      case 'bluetooth':
        return 'bluetooth';
      case 'wifi':
        return 'wifi';
      case 'usb':
        return 'cable-outline';
      default:
        return 'print';
    }
  };

  const renderPrinterCard = (printer: Printer, index: number) => (
    <View
      key={printer.id}
      style={[
        styles.printerCard,
        (isTablet || isLandscape) && {
          flex: 1,
          marginLeft: index % 2 === 1 ? spacing.md : 0,
        },
      ]}
    >
      <View style={styles.printerHeader}>
        <View style={[
          styles.printerIcon,
          printer.isConnected ? styles.printerIconConnected : styles.printerIconDisconnected
        ]}>
          <Ionicons
            name={getPrinterIcon(printer.type)}
            size={24}
            color={printer.isConnected ? colors.success : colors.mutedForeground}
          />
        </View>
        <View style={styles.printerInfo}>
          <View style={styles.printerNameRow}>
            <Text style={styles.printerName}>{printer.name}</Text>
            {printer.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Predefinita</Text>
              </View>
            )}
          </View>
          <Text style={styles.printerMeta}>
            {printer.type.toUpperCase()} • {printer.paperSize}
          </Text>
          <View style={styles.statusRow}>
            <View style={[
              styles.statusDot,
              { backgroundColor: printer.isConnected ? colors.success : colors.mutedForeground }
            ]} />
            <Text style={styles.statusText}>
              {printer.isConnected ? 'Connessa' : 'Disconnessa'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.printerActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleConnect(printer.id)}
          testID={`button-connect-${printer.id}`}
        >
          <Ionicons
            name={printer.isConnected ? 'link' : 'link-outline'}
            size={18}
            color={colors.teal}
          />
          <Text style={[styles.actionText, { color: colors.teal }]}>
            {printer.isConnected ? 'Disconnetti' : 'Connetti'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleTestPrint(printer.id)}
          disabled={!printer.isConnected}
          testID={`button-test-${printer.id}`}
        >
          <Ionicons
            name="print-outline"
            size={18}
            color={printer.isConnected ? colors.primary : colors.mutedForeground}
          />
          <Text style={[
            styles.actionText,
            { color: printer.isConnected ? colors.primary : colors.mutedForeground }
          ]}>
            Test
          </Text>
        </TouchableOpacity>

        {!printer.isDefault && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleSetDefault(printer.id)}
            testID={`button-default-${printer.id}`}
          >
            <Ionicons name="star-outline" size={18} color={colors.foreground} />
            <Text style={styles.actionText}>Predefinita</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleRemovePrinter(printer.id)}
          testID={`button-remove-${printer.id}`}
        >
          <Ionicons name="trash-outline" size={18} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPrinterRows = () => {
    if (!isTablet && !isLandscape) {
      return printers.map((printer, index) => renderPrinterCard(printer, index));
    }

    const rows = [];
    for (let i = 0; i < printers.length; i += 2) {
      rows.push(
        <View key={i} style={styles.printerRow}>
          {renderPrinterCard(printers[i], 0)}
          {printers[i + 1] && renderPrinterCard(printers[i + 1], 1)}
        </View>
      );
    }
    return rows;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          testID="button-back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stampanti</Text>
        <TouchableOpacity
          onPress={handleSearchPrinters}
          style={styles.searchButton}
          disabled={isSearching}
          testID="button-search-printers"
        >
          {isSearching ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="search" size={22} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isLandscape && styles.scrollContentLandscape,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stampanti Configurate</Text>
          
          {printers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="print-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>Nessuna stampante configurata</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleSearchPrinters}
                testID="button-add-printer"
              >
                <Text style={styles.addButtonText}>Cerca Stampanti</Text>
              </TouchableOpacity>
            </View>
          ) : (
            renderPrinterRows()
          )}
        </View>

        <View style={[styles.section, isTablet && styles.sectionTablet]}>
          <Text style={styles.sectionTitle}>Opzioni di Stampa</Text>
          <View style={styles.optionsCard}>
            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Ionicons name="flash-outline" size={22} color={colors.primary} />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Stampa Automatica</Text>
                  <Text style={styles.optionDescription}>
                    Stampa automaticamente alla vendita
                  </Text>
                </View>
              </View>
              <Switch
                value={autoPrint}
                onValueChange={setAutoPrint}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.foreground}
                testID="switch-auto-print"
              />
            </View>

            <View style={styles.optionDivider} />

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Ionicons name="eye-outline" size={22} color={colors.primary} />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Anteprima Stampa</Text>
                  <Text style={styles.optionDescription}>
                    Mostra anteprima prima di stampare
                  </Text>
                </View>
              </View>
              <Switch
                value={printPreview}
                onValueChange={setPrintPreview}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.foreground}
                testID="switch-print-preview"
              />
            </View>
          </View>
        </View>

        <View style={[styles.helpCard, isTablet && styles.helpCardTablet]}>
          <Ionicons name="help-circle" size={24} color={colors.teal} />
          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>Problemi con la stampante?</Text>
            <Text style={styles.helpText}>
              Assicurati che la stampante sia accesa e connessa alla stessa rete WiFi del dispositivo.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  headerLandscape: {
    paddingVertical: spacing.sm,
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
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  scrollContentLandscape: {
    paddingHorizontal: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTablet: {
    maxWidth: 600,
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
  emptyState: {
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
    marginBottom: spacing.lg,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  addButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primaryForeground,
  },
  printerRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  printerCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  printerHeader: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  printerIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  printerIconConnected: {
    backgroundColor: 'rgba(0, 206, 209, 0.1)',
  },
  printerIconDisconnected: {
    backgroundColor: colors.muted,
  },
  printerInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  printerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  printerName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  defaultBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  defaultBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  printerMeta: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  printerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  optionsCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.lg,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  optionDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  optionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 206, 209, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  helpCardTablet: {
    maxWidth: 600,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  helpText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
});
