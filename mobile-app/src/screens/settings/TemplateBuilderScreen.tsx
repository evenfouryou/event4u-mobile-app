import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

interface TemplateField {
  id: string;
  type: 'text' | 'qrcode' | 'barcode' | 'image' | 'line';
  label: string;
  value: string;
  x: number;
  y: number;
}

interface Template {
  id: string;
  name: string;
  type: 'ticket' | 'receipt' | 'badge';
  paperSize: string;
  fields: TemplateField[];
  createdAt: string;
}

export function TemplateBuilderScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [activeTab, setActiveTab] = useState<'templates' | 'create'>('templates');
  const [templateName, setTemplateName] = useState('');
  const [selectedType, setSelectedType] = useState<Template['type']>('ticket');
  
  const [templates, setTemplates] = useState<Template[]>([
    { id: '1', name: 'Biglietto Standard', type: 'ticket', paperSize: '80mm', fields: [], createdAt: '2024-01-15' },
    { id: '2', name: 'Ricevuta Vendita', type: 'receipt', paperSize: '80mm', fields: [], createdAt: '2024-01-10' },
    { id: '3', name: 'Badge Evento', type: 'badge', paperSize: '54x86mm', fields: [], createdAt: '2024-02-01' },
  ]);

  const templateTypes = [
    { value: 'ticket', label: 'Biglietto', icon: 'ticket-outline' as const },
    { value: 'receipt', label: 'Ricevuta', icon: 'receipt-outline' as const },
    { value: 'badge', label: 'Badge', icon: 'id-card-outline' as const },
  ];

  const availableFields = [
    { type: 'text', label: 'Testo', icon: 'text-outline' as const },
    { type: 'qrcode', label: 'QR Code', icon: 'qr-code-outline' as const },
    { type: 'barcode', label: 'Codice a Barre', icon: 'barcode-outline' as const },
    { type: 'image', label: 'Immagine', icon: 'image-outline' as const },
    { type: 'line', label: 'Linea', icon: 'remove-outline' as const },
  ];

  const handleCreateTemplate = () => {
    if (!templateName.trim()) {
      Alert.alert('Errore', 'Inserisci un nome per il template');
      return;
    }
    
    const newTemplate: Template = {
      id: Date.now().toString(),
      name: templateName,
      type: selectedType,
      paperSize: selectedType === 'badge' ? '54x86mm' : '80mm',
      fields: [],
      createdAt: new Date().toISOString(),
    };
    
    setTemplates([newTemplate, ...templates]);
    setTemplateName('');
    setActiveTab('templates');
    Alert.alert('Successo', 'Template creato con successo');
  };

  const handleEditTemplate = (template: Template) => {
    Alert.alert('Modifica Template', `Modifica del template "${template.name}" in sviluppo`);
  };

  const handleDeleteTemplate = (templateId: string) => {
    Alert.alert(
      'Elimina Template',
      'Sei sicuro di voler eliminare questo template?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: () => {
            setTemplates(prev => prev.filter(t => t.id !== templateId));
          },
        },
      ]
    );
  };

  const handleDuplicateTemplate = (template: Template) => {
    const duplicate: Template = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copia)`,
      createdAt: new Date().toISOString(),
    };
    setTemplates([duplicate, ...templates]);
  };

  const getTypeIcon = (type: Template['type']) => {
    switch (type) {
      case 'ticket': return 'ticket-outline';
      case 'receipt': return 'receipt-outline';
      case 'badge': return 'id-card-outline';
    }
  };

  const renderTemplateCard = (template: Template, index: number) => (
    <View
      key={template.id}
      style={[
        styles.templateCard,
        (isTablet || isLandscape) && {
          flex: 1,
          marginLeft: index % 2 === 1 ? spacing.md : 0,
        },
      ]}
    >
      <View style={styles.templateHeader}>
        <View style={styles.templateIcon}>
          <Ionicons name={getTypeIcon(template.type)} size={24} color={colors.primary} />
        </View>
        <View style={styles.templateInfo}>
          <Text style={styles.templateName}>{template.name}</Text>
          <Text style={styles.templateMeta}>
            {template.type === 'ticket' ? 'Biglietto' : 
             template.type === 'receipt' ? 'Ricevuta' : 'Badge'} • {template.paperSize}
          </Text>
        </View>
      </View>
      
      <View style={styles.templateActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleEditTemplate(template)}
          testID={`button-edit-${template.id}`}
        >
          <Ionicons name="create-outline" size={18} color={colors.teal} />
          <Text style={[styles.actionBtnText, { color: colors.teal }]}>Modifica</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDuplicateTemplate(template)}
          testID={`button-duplicate-${template.id}`}
        >
          <Ionicons name="copy-outline" size={18} color={colors.foreground} />
          <Text style={styles.actionBtnText}>Duplica</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDeleteTemplate(template.id)}
          testID={`button-delete-${template.id}`}
        >
          <Ionicons name="trash-outline" size={18} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTemplateRows = () => {
    if (!isTablet && !isLandscape) {
      return templates.map((template, index) => renderTemplateCard(template, index));
    }

    const rows = [];
    for (let i = 0; i < templates.length; i += 2) {
      rows.push(
        <View key={i} style={styles.templateRow}>
          {renderTemplateCard(templates[i], 0)}
          {templates[i + 1] && renderTemplateCard(templates[i + 1], 1)}
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
        <Text style={styles.headerTitle}>Template Builder</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={[styles.tabBar, isTablet && styles.tabBarTablet]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'templates' && styles.tabActive]}
          onPress={() => setActiveTab('templates')}
          testID="tab-templates"
        >
          <Text style={[styles.tabText, activeTab === 'templates' && styles.tabTextActive]}>
            Template
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'create' && styles.tabActive]}
          onPress={() => setActiveTab('create')}
          testID="tab-create"
        >
          <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>
            Crea Nuovo
          </Text>
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
        {activeTab === 'templates' ? (
          <>
            {templates.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={64} color={colors.mutedForeground} />
                <Text style={styles.emptyText}>Nessun template creato</Text>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => setActiveTab('create')}
                  testID="button-create-first"
                >
                  <Text style={styles.createButtonText}>Crea il tuo primo template</Text>
                </TouchableOpacity>
              </View>
            ) : (
              renderTemplateRows()
            )}
          </>
        ) : (
          <View style={isTablet ? styles.createFormTablet : undefined}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nome Template</Text>
              <TextInput
                style={styles.input}
                placeholder="Es: Biglietto VIP"
                placeholderTextColor={colors.mutedForeground}
                value={templateName}
                onChangeText={setTemplateName}
                testID="input-template-name"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tipo Template</Text>
              <View style={styles.typeGrid}>
                {templateTypes.map(type => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeCard,
                      selectedType === type.value && styles.typeCardActive
                    ]}
                    onPress={() => setSelectedType(type.value as Template['type'])}
                    testID={`type-${type.value}`}
                  >
                    <Ionicons
                      name={type.icon}
                      size={28}
                      color={selectedType === type.value ? colors.primary : colors.mutedForeground}
                    />
                    <Text style={[
                      styles.typeLabel,
                      selectedType === type.value && styles.typeLabelActive
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Campi Disponibili</Text>
              <Text style={styles.sectionDescription}>
                Questi campi potranno essere aggiunti al template
              </Text>
              <View style={styles.fieldsGrid}>
                {availableFields.map(field => (
                  <View key={field.type} style={styles.fieldItem}>
                    <Ionicons name={field.icon} size={20} color={colors.teal} />
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCreateTemplate}
              activeOpacity={0.8}
              testID="button-create-template"
            >
              <Ionicons name="add-circle" size={24} color={colors.primaryForeground} />
              <Text style={styles.primaryButtonText}>Crea Template</Text>
            </TouchableOpacity>
          </View>
        )}
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
  placeholder: {
    width: 40,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  tabBarTablet: {
    maxWidth: 400,
    alignSelf: 'center',
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.mutedForeground,
  },
  tabTextActive: {
    color: colors.primary,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  createButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primaryForeground,
  },
  templateRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  templateCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  templateName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  templateMeta: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  templateActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
  },
  actionBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  createFormTablet: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
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
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  typeLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.mutedForeground,
  },
  typeLabelActive: {
    color: colors.primary,
  },
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  fieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(0, 206, 209, 0.1)',
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    color: colors.teal,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primaryForeground,
  },
});
