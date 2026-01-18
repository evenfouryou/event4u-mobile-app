import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';

interface DigitalTemplate {
  id: string;
  name: string;
  style: 'modern' | 'classic' | 'minimal';
  primaryColor: string;
  hasAnimation: boolean;
  createdAt: string;
}

export function DigitalTemplateBuilderScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'templates' | 'create'>('templates');
  const [templateName, setTemplateName] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<DigitalTemplate['style']>('modern');
  const [selectedColor, setSelectedColor] = useState('#FFD700');
  const [hasAnimation, setHasAnimation] = useState(true);
  
  const [templates, setTemplates] = useState<DigitalTemplate[]>([
    { id: '1', name: 'Biglietto Gold', style: 'modern', primaryColor: '#FFD700', hasAnimation: true, createdAt: '2024-01-15' },
    { id: '2', name: 'Pass VIP', style: 'classic', primaryColor: '#8B5CF6', hasAnimation: false, createdAt: '2024-01-10' },
  ]);

  const styles_list = [
    { value: 'modern', label: 'Moderno', icon: 'sparkles-outline' as const },
    { value: 'classic', label: 'Classico', icon: 'diamond-outline' as const },
    { value: 'minimal', label: 'Minimale', icon: 'square-outline' as const },
  ];

  const colorOptions = [
    { value: '#FFD700', label: 'Oro' },
    { value: '#00CED1', label: 'Teal' },
    { value: '#8B5CF6', label: 'Viola' },
    { value: '#EF4444', label: 'Rosso' },
    { value: '#22C55E', label: 'Verde' },
    { value: '#3B82F6', label: 'Blu' },
  ];

  const handleCreateTemplate = () => {
    if (!templateName.trim()) {
      Alert.alert('Errore', 'Inserisci un nome per il template');
      return;
    }
    
    const newTemplate: DigitalTemplate = {
      id: Date.now().toString(),
      name: templateName,
      style: selectedStyle,
      primaryColor: selectedColor,
      hasAnimation,
      createdAt: new Date().toISOString(),
    };
    
    setTemplates([newTemplate, ...templates]);
    setTemplateName('');
    setActiveTab('templates');
    Alert.alert('Successo', 'Template digitale creato con successo');
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

  const handlePreview = (template: DigitalTemplate) => {
    Alert.alert('Anteprima', `Anteprima del template "${template.name}" in sviluppo`);
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
        <Text style={styles.headerTitle}>Template Digitali</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'templates' && styles.tabActive]}
          onPress={() => setActiveTab('templates')}
          data-testid="tab-templates"
        >
          <Text style={[styles.tabText, activeTab === 'templates' && styles.tabTextActive]}>
            Template
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'create' && styles.tabActive]}
          onPress={() => setActiveTab('create')}
          data-testid="tab-create"
        >
          <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>
            Crea Nuovo
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'templates' ? (
          <>
            <View style={styles.infoCard}>
              <Ionicons name="phone-portrait-outline" size={24} color={colors.teal} />
              <Text style={styles.infoText}>
                I template digitali vengono mostrati sui dispositivi dei partecipanti come biglietti elettronici
              </Text>
            </View>

            {templates.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="phone-portrait-outline" size={64} color={colors.mutedForeground} />
                <Text style={styles.emptyText}>Nessun template digitale</Text>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => setActiveTab('create')}
                  data-testid="button-create-first"
                >
                  <Text style={styles.createButtonText}>Crea template</Text>
                </TouchableOpacity>
              </View>
            ) : (
              templates.map(template => (
                <View key={template.id} style={styles.templateCard}>
                  <View style={styles.previewContainer}>
                    <View style={[styles.previewBadge, { backgroundColor: template.primaryColor }]}>
                      <Ionicons name="ticket" size={24} color="#000" />
                    </View>
                  </View>
                  
                  <View style={styles.templateInfo}>
                    <Text style={styles.templateName}>{template.name}</Text>
                    <View style={styles.templateMeta}>
                      <View style={styles.metaBadge}>
                        <Text style={styles.metaBadgeText}>
                          {template.style === 'modern' ? 'Moderno' :
                           template.style === 'classic' ? 'Classico' : 'Minimale'}
                        </Text>
                      </View>
                      {template.hasAnimation && (
                        <View style={[styles.metaBadge, styles.animationBadge]}>
                          <Ionicons name="sparkles" size={12} color={colors.teal} />
                          <Text style={[styles.metaBadgeText, { color: colors.teal }]}>Animato</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.templateActions}>
                    <TouchableOpacity
                      style={styles.actionIcon}
                      onPress={() => handlePreview(template)}
                      data-testid={`button-preview-${template.id}`}
                    >
                      <Ionicons name="eye-outline" size={20} color={colors.teal} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionIcon}
                      onPress={() => handleDeleteTemplate(template.id)}
                      data-testid={`button-delete-${template.id}`}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nome Template</Text>
              <TextInput
                style={styles.input}
                placeholder="Es: Pass Platinum"
                placeholderTextColor={colors.mutedForeground}
                value={templateName}
                onChangeText={setTemplateName}
                data-testid="input-template-name"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stile</Text>
              <View style={styles.styleGrid}>
                {styles_list.map(style => (
                  <TouchableOpacity
                    key={style.value}
                    style={[
                      styles.styleCard,
                      selectedStyle === style.value && styles.styleCardActive
                    ]}
                    onPress={() => setSelectedStyle(style.value as DigitalTemplate['style'])}
                    data-testid={`style-${style.value}`}
                  >
                    <Ionicons
                      name={style.icon}
                      size={28}
                      color={selectedStyle === style.value ? colors.primary : colors.mutedForeground}
                    />
                    <Text style={[
                      styles.styleLabel,
                      selectedStyle === style.value && styles.styleLabelActive
                    ]}>
                      {style.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Colore Primario</Text>
              <View style={styles.colorGrid}>
                {colorOptions.map(color => (
                  <TouchableOpacity
                    key={color.value}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color.value },
                      selectedColor === color.value && styles.colorOptionActive
                    ]}
                    onPress={() => setSelectedColor(color.value)}
                    data-testid={`color-${color.label.toLowerCase()}`}
                  >
                    {selectedColor === color.value && (
                      <Ionicons name="checkmark" size={20} color="#000" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setHasAnimation(!hasAnimation)}
                data-testid="toggle-animation"
              >
                <View style={styles.optionInfo}>
                  <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>Animazioni</Text>
                    <Text style={styles.optionDescription}>
                      Aggiungi effetti animati al biglietto
                    </Text>
                  </View>
                </View>
                <View style={[styles.checkbox, hasAnimation && styles.checkboxActive]}>
                  {hasAnimation && <Ionicons name="checkmark" size={16} color="#000" />}
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCreateTemplate}
              activeOpacity={0.8}
              data-testid="button-create-template"
            >
              <Ionicons name="add-circle" size={24} color={colors.primaryForeground} />
              <Text style={styles.primaryButtonText}>Crea Template Digitale</Text>
            </TouchableOpacity>
          </>
        )}
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
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
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
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 206, 209, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.foreground,
    lineHeight: 18,
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
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewContainer: {
    marginRight: spacing.lg,
  },
  previewBadge: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  templateMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.sm,
  },
  animationBadge: {
    backgroundColor: 'rgba(0, 206, 209, 0.1)',
  },
  metaBadgeText: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  templateActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
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
  styleGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  styleCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  styleCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  styleLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.mutedForeground,
  },
  styleLabelActive: {
    color: colors.primary,
  },
  colorGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionActive: {
    borderWidth: 3,
    borderColor: colors.foreground,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
