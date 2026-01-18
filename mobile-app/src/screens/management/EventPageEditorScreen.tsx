import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize } from '../../theme';
import { Card, Button, Header } from '../../components';
import { api } from '../../lib/api';

interface EventPageConfig {
  eventId: string;
  eventName: string;
  slug: string;
  isPublished: boolean;
  headerImage: string | null;
  description: string;
  showLineup: boolean;
  showGallery: boolean;
  showLocation: boolean;
  showCountdown: boolean;
  primaryColor: string;
  accentColor: string;
  socialLinks: {
    instagram: string;
    facebook: string;
    twitter: string;
    website: string;
  };
  customSections: CustomSection[];
}

interface CustomSection {
  id: string;
  title: string;
  content: string;
  order: number;
  isVisible: boolean;
}

const colorPresets = [
  { label: 'Gold', value: '#FFD700' },
  { label: 'Teal', value: '#00CED1' },
  { label: 'Purple', value: '#9333EA' },
  { label: 'Pink', value: '#EC4899' },
  { label: 'Orange', value: '#F97316' },
  { label: 'Blue', value: '#3B82F6' },
];

export function EventPageEditorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const eventId = route.params?.eventId;

  const [config, setConfig] = useState<EventPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPageConfig();
  }, [eventId]);

  const loadPageConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<any>(`/api/events/${eventId}/page-config`);
      setConfig({
        eventId: data.eventId?.toString() || eventId,
        eventName: data.eventName || data.name || '',
        slug: data.slug || '',
        isPublished: data.isPublished ?? false,
        headerImage: data.headerImage || null,
        description: data.description || '',
        showLineup: data.showLineup ?? true,
        showGallery: data.showGallery ?? true,
        showLocation: data.showLocation ?? true,
        showCountdown: data.showCountdown ?? true,
        primaryColor: data.primaryColor || colors.primary,
        accentColor: data.accentColor || colors.teal,
        socialLinks: {
          instagram: data.socialLinks?.instagram || '',
          facebook: data.socialLinks?.facebook || '',
          twitter: data.socialLinks?.twitter || '',
          website: data.socialLinks?.website || '',
        },
        customSections: (data.customSections || []).map((s: any, i: number) => ({
          id: s.id?.toString() || i.toString(),
          title: s.title || '',
          content: s.content || '',
          order: s.order ?? i,
          isVisible: s.isVisible ?? true,
        })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (field: keyof EventPageConfig, value: any) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
    setHasChanges(true);
  };

  const updateSocialLink = (platform: string, value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      socialLinks: { ...config.socialLinks, [platform]: value },
    });
    setHasChanges(true);
  };

  const addCustomSection = () => {
    if (!config) return;
    const newSection: CustomSection = {
      id: Date.now().toString(),
      title: 'Nuova Sezione',
      content: '',
      order: config.customSections.length,
      isVisible: true,
    };
    setConfig({ ...config, customSections: [...config.customSections, newSection] });
    setHasChanges(true);
  };

  const updateCustomSection = (index: number, field: keyof CustomSection, value: any) => {
    if (!config) return;
    const updated = [...config.customSections];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({ ...config, customSections: updated });
    setHasChanges(true);
  };

  const removeCustomSection = (index: number) => {
    if (!config) return;
    Alert.alert(
      'Rimuovi Sezione',
      'Sei sicuro di voler rimuovere questa sezione?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rimuovi',
          style: 'destructive',
          onPress: () => {
            setConfig({
              ...config,
              customSections: config.customSections.filter((_, i) => i !== index),
            });
            setHasChanges(true);
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!config || !hasChanges) return;

    try {
      setSaving(true);
      setError(null);
      await api.put(`/api/events/${eventId}/page-config`, config);
      setHasChanges(false);
      Alert.alert('Salvato', 'Configurazione pagina salvata');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!config) return;
    
    const action = config.isPublished ? 'Nascondi' : 'Pubblica';
    Alert.alert(
      `${action} Pagina`,
      `Vuoi ${action.toLowerCase()} la pagina evento?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: action,
          onPress: async () => {
            try {
              await api.patch(`/api/events/${eventId}/page-config`, { isPublished: !config.isPublished });
              updateConfig('isPublished', !config.isPublished);
            } catch (e) {
              Alert.alert('Errore', 'Impossibile cambiare stato pubblicazione');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Editor Pagina" showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  if (error || !config) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Editor Pagina" showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{error || 'Configurazione non trovata'}</Text>
          <Button title="Riprova" onPress={loadPageConfig} style={styles.retryButton} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title="Editor Pagina"
        subtitle={config.eventName}
        showBack
        onBack={() => {
          if (hasChanges) {
            Alert.alert(
              'Modifiche non salvate',
              'Vuoi uscire senza salvare?',
              [
                { text: 'Annulla', style: 'cancel' },
                { text: 'Esci', style: 'destructive', onPress: () => navigation.goBack() },
              ]
            );
          } else {
            navigation.goBack();
          }
        }}
        rightAction={
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => navigation.navigate('EventPagePreview', { eventId })}
            data-testid="button-preview"
          >
            <Ionicons name="eye-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.section} variant="elevated">
          <View style={styles.publishRow}>
            <View style={styles.publishInfo}>
              <Text style={styles.sectionTitle}>Stato Pubblicazione</Text>
              <Text style={styles.publishStatus}>
                {config.isPublished ? 'Pagina pubblicata' : 'Pagina nascosta'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.publishButton, { backgroundColor: config.isPublished ? colors.success : colors.surface }]}
              onPress={handlePublish}
              data-testid="button-publish"
            >
              <Ionicons
                name={config.isPublished ? 'eye' : 'eye-off'}
                size={20}
                color={config.isPublished ? colors.foreground : colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>URL Slug</Text>
            <View style={styles.slugContainer}>
              <Text style={styles.slugPrefix}>/eventi/</Text>
              <TextInput
                style={styles.slugInput}
                value={config.slug}
                onChangeText={(v) => updateConfig('slug', v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="nome-evento"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                data-testid="input-slug"
              />
            </View>
          </View>
        </Card>

        <Card style={styles.section} variant="elevated">
          <Text style={styles.sectionTitle}>Descrizione</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={config.description}
            onChangeText={(v) => updateConfig('description', v)}
            placeholder="Descrizione della pagina evento..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            data-testid="input-description"
          />
        </Card>

        <Card style={styles.section} variant="elevated">
          <Text style={styles.sectionTitle}>Sezioni</Text>
          
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Mostra Lineup</Text>
            <Switch
              value={config.showLineup}
              onValueChange={(v) => updateConfig('showLineup', v)}
              trackColor={{ false: colors.surface, true: `${colors.primary}50` }}
              thumbColor={config.showLineup ? colors.primary : colors.mutedForeground}
            />
          </View>
          
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Mostra Galleria</Text>
            <Switch
              value={config.showGallery}
              onValueChange={(v) => updateConfig('showGallery', v)}
              trackColor={{ false: colors.surface, true: `${colors.primary}50` }}
              thumbColor={config.showGallery ? colors.primary : colors.mutedForeground}
            />
          </View>
          
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Mostra Location</Text>
            <Switch
              value={config.showLocation}
              onValueChange={(v) => updateConfig('showLocation', v)}
              trackColor={{ false: colors.surface, true: `${colors.primary}50` }}
              thumbColor={config.showLocation ? colors.primary : colors.mutedForeground}
            />
          </View>
          
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Mostra Countdown</Text>
            <Switch
              value={config.showCountdown}
              onValueChange={(v) => updateConfig('showCountdown', v)}
              trackColor={{ false: colors.surface, true: `${colors.primary}50` }}
              thumbColor={config.showCountdown ? colors.primary : colors.mutedForeground}
            />
          </View>
        </Card>

        <Card style={styles.section} variant="elevated">
          <Text style={styles.sectionTitle}>Colori</Text>
          
          <Text style={styles.colorLabel}>Colore Primario</Text>
          <View style={styles.colorGrid}>
            {colorPresets.map((preset) => (
              <TouchableOpacity
                key={preset.value}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: preset.value },
                  config.primaryColor === preset.value && styles.colorSwatchSelected,
                ]}
                onPress={() => updateConfig('primaryColor', preset.value)}
                data-testid={`color-primary-${preset.label}`}
              />
            ))}
          </View>

          <Text style={[styles.colorLabel, { marginTop: spacing.md }]}>Colore Accento</Text>
          <View style={styles.colorGrid}>
            {colorPresets.map((preset) => (
              <TouchableOpacity
                key={preset.value}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: preset.value },
                  config.accentColor === preset.value && styles.colorSwatchSelected,
                ]}
                onPress={() => updateConfig('accentColor', preset.value)}
                data-testid={`color-accent-${preset.label}`}
              />
            ))}
          </View>
        </Card>

        <Card style={styles.section} variant="elevated">
          <Text style={styles.sectionTitle}>Social Links</Text>
          
          <View style={styles.socialRow}>
            <Ionicons name="logo-instagram" size={20} color={colors.mutedForeground} />
            <TextInput
              style={styles.socialInput}
              value={config.socialLinks.instagram}
              onChangeText={(v) => updateSocialLink('instagram', v)}
              placeholder="@username"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.socialRow}>
            <Ionicons name="logo-facebook" size={20} color={colors.mutedForeground} />
            <TextInput
              style={styles.socialInput}
              value={config.socialLinks.facebook}
              onChangeText={(v) => updateSocialLink('facebook', v)}
              placeholder="facebook.com/page"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.socialRow}>
            <Ionicons name="globe-outline" size={20} color={colors.mutedForeground} />
            <TextInput
              style={styles.socialInput}
              value={config.socialLinks.website}
              onChangeText={(v) => updateSocialLink('website', v)}
              placeholder="https://..."
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </Card>

        <Card style={styles.section} variant="elevated">
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sezioni Personalizzate</Text>
            <TouchableOpacity style={styles.addSectionButton} onPress={addCustomSection} data-testid="button-add-section">
              <Ionicons name="add" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {config.customSections.length === 0 ? (
            <Text style={styles.emptyText}>Nessuna sezione personalizzata</Text>
          ) : (
            config.customSections.map((section, index) => (
              <View key={section.id} style={styles.customSection}>
                <View style={styles.customSectionHeader}>
                  <TextInput
                    style={styles.sectionTitleInput}
                    value={section.title}
                    onChangeText={(v) => updateCustomSection(index, 'title', v)}
                    placeholder="Titolo sezione"
                    placeholderTextColor={colors.mutedForeground}
                  />
                  <TouchableOpacity onPress={() => removeCustomSection(index)}>
                    <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.textInput, styles.sectionContent]}
                  value={section.content}
                  onChangeText={(v) => updateCustomSection(index, 'content', v)}
                  placeholder="Contenuto..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={3}
                />
              </View>
            ))
          )}
        </Card>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {hasChanges && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button
            title={saving ? 'Salvataggio...' : 'Salva Modifiche'}
            onPress={handleSave}
            disabled={saving}
            style={styles.saveButton}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.destructive,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
  },
  previewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  publishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  publishInfo: {
    flex: 1,
  },
  publishStatus: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  publishButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  slugContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.glass.border,
    overflow: 'hidden',
  },
  slugPrefix: {
    paddingHorizontal: spacing.md,
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    backgroundColor: colors.surface,
  },
  slugInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  textInput: {
    backgroundColor: colors.glass.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleLabel: {
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  colorLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: colors.foreground,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  socialInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  addSectionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customSection: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitleInput: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
    marginRight: spacing.md,
  },
  sectionContent: {
    height: 80,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.glass.background,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  saveButton: {
    width: '100%',
  },
  bottomPadding: {
    height: spacing['4xl'],
  },
});
