import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

interface BadgeTemplate {
  id: string;
  name: string;
  schoolName: string;
  activeCount: number;
  createdAt: string;
}

export function SchoolBadgeManagerScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<BadgeTemplate[]>([
    { id: '1', name: 'Badge Standard', schoolName: 'Liceo Scientifico Roma', activeCount: 450, createdAt: '2024-01-15' },
    { id: '2', name: 'Badge Docenti', schoolName: 'Liceo Scientifico Roma', activeCount: 52, createdAt: '2024-01-10' },
    { id: '3', name: 'Badge Visitatori', schoolName: 'Istituto Tecnico Milano', activeCount: 28, createdAt: '2024-02-01' },
  ]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.schoolName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTemplate = () => {
    navigation.navigate('SchoolBadgeTemplateCreate');
  };

  const handleTemplatePress = (template: BadgeTemplate) => {
    navigation.navigate('SchoolBadgeTemplateDetail', { templateId: template.id });
  };

  const numColumns = isTablet || isLandscape ? 2 : 1;

  const renderTemplateCard = (template: BadgeTemplate, index: number) => (
    <TouchableOpacity
      key={template.id}
      style={[
        styles.templateCard,
        (isTablet || isLandscape) && {
          flex: 1,
          marginLeft: index % 2 === 1 ? spacing.md : 0,
          maxWidth: '48%',
        },
      ]}
      onPress={() => handleTemplatePress(template)}
      activeOpacity={0.8}
      testID={`template-card-${template.id}`}
    >
      <View style={styles.templateIcon}>
        <Ionicons name="document-text" size={28} color={colors.primary} />
      </View>
      <View style={styles.templateContent}>
        <Text style={styles.templateName}>{template.name}</Text>
        <Text style={styles.templateSchool}>{template.schoolName}</Text>
        <View style={styles.templateMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={colors.teal} />
            <Text style={styles.metaText}>{template.activeCount} attivi</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color={colors.mutedForeground} />
    </TouchableOpacity>
  );

  const renderTemplateRows = () => {
    if (!isTablet && !isLandscape) {
      return filteredTemplates.map((template) => renderTemplateCard(template, 0));
    }

    const rows = [];
    for (let i = 0; i < filteredTemplates.length; i += 2) {
      rows.push(
        <View key={i} style={styles.templateRow}>
          {renderTemplateCard(filteredTemplates[i], 0)}
          {filteredTemplates[i + 1] && renderTemplateCard(filteredTemplates[i + 1], 1)}
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
        <Text style={styles.headerTitle}>Gestione Badge Scolastici</Text>
        <TouchableOpacity
          onPress={handleCreateTemplate}
          style={styles.addButton}
          testID="button-create-template"
        >
          <Ionicons name="add" size={24} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, isLandscape && styles.searchContainerLandscape]}>
        <View style={[styles.searchBar, isTablet && styles.searchBarTablet]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca template..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search"
          />
        </View>
      </View>

      <View style={[styles.statsRow, isLandscape && styles.statsRowLandscape]}>
        <View style={[styles.statCard, isTablet && styles.statCardTablet]}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
            <Ionicons name="id-card" size={24} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{templates.length}</Text>
          <Text style={styles.statLabel}>Template</Text>
        </View>
        <View style={[styles.statCard, isTablet && styles.statCardTablet]}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(0, 206, 209, 0.15)' }]}>
            <Ionicons name="people" size={24} color={colors.teal} />
          </View>
          <Text style={styles.statValue}>{templates.reduce((sum, t) => sum + t.activeCount, 0)}</Text>
          <Text style={styles.statLabel}>Badge Attivi</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isLandscape && styles.scrollContentLandscape,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={styles.sectionTitle}>Template Disponibili</Text>
        
        {renderTemplateRows()}

        {filteredTemplates.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={64} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessun template trovato</Text>
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
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchContainerLandscape: {
    paddingHorizontal: spacing.xl,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  searchBarTablet: {
    maxWidth: 500,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statsRowLandscape: {
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statCardTablet: {
    maxWidth: 200,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  templateRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
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
  templateIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateContent: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  templateName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  templateSchool: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  templateMeta: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.teal,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    marginTop: spacing.md,
  },
});
