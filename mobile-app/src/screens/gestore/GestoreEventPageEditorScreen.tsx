import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert, TextInput, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { EventPageData } from '@/lib/api';

interface GestoreEventPageEditorScreenProps {
  onBack: () => void;
  eventId?: string;
}

interface EventOption {
  id: string;
  name: string;
}

export function GestoreEventPageEditorScreen({ onBack, eventId }: GestoreEventPageEditorScreenProps) {
  const { colors } = useTheme();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(eventId || null);
  const [pageData, setPageData] = useState<EventPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [editedDescription, setEditedDescription] = useState('');
  const [editedSocialLinks, setEditedSocialLinks] = useState({
    facebook: '',
    instagram: '',
    twitter: '',
  });

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadEventPage(selectedEventId);
    }
  }, [selectedEventId]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadEvents = async () => {
    try {
      const data = await api.getEventsList();
      setEvents(data);
      if (data.length > 0 && !selectedEventId) {
        setSelectedEventId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    } finally {
      if (!selectedEventId) {
        setIsLoading(false);
      }
    }
  };

  const loadEventPage = async (eventId: string) => {
    try {
      setIsLoading(true);
      const data = await api.getEventPageData(eventId);
      setPageData(data);
      setEditedDescription(data.description);
      setEditedSocialLinks({
        facebook: data.socialLinks.facebook || '',
        instagram: data.socialLinks.instagram || '',
        twitter: data.socialLinks.twitter || '',
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading event page:', error);
      setPageData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    if (!selectedEventId) return;
    setRefreshing(true);
    await loadEventPage(selectedEventId);
    setRefreshing(false);
  };

  const handleDescriptionChange = (text: string) => {
    setEditedDescription(text);
    setHasChanges(true);
  };

  const handleSocialLinkChange = (platform: 'facebook' | 'instagram' | 'twitter', value: string) => {
    setEditedSocialLinks(prev => ({ ...prev, [platform]: value }));
    setHasChanges(true);
  };

  const handleAddImage = () => {
    triggerHaptic('light');
    Alert.alert(
      'Aggiungi Immagine',
      'Seleziona la fonte dell\'immagine',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Galleria', onPress: () => Alert.alert('Info', 'Seleziona immagine dalla galleria') },
        { text: 'Fotocamera', onPress: () => Alert.alert('Info', 'Scatta una nuova foto') },
      ]
    );
  };

  const handleRemoveImage = (imageUrl: string) => {
    if (!pageData) return;
    triggerHaptic('medium');
    Alert.alert(
      'Rimuovi Immagine',
      'Sei sicuro di voler rimuovere questa immagine?',
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Rimuovi', 
          style: 'destructive',
          onPress: () => {
            setPageData({
              ...pageData,
              images: pageData.images.filter(img => img !== imageUrl),
            });
            setHasChanges(true);
          }
        },
      ]
    );
  };

  const handlePreview = () => {
    triggerHaptic('light');
    Alert.alert('Anteprima', 'Apertura anteprima pagina evento...');
  };

  const handleSave = async () => {
    if (!selectedEventId || !pageData) return;
    
    triggerHaptic('medium');
    setIsSaving(true);
    
    try {
      await api.updateEventPage(selectedEventId, {
        description: editedDescription,
        socialLinks: {
          facebook: editedSocialLinks.facebook || undefined,
          instagram: editedSocialLinks.instagram || undefined,
          twitter: editedSocialLinks.twitter || undefined,
        },
        images: pageData.images,
      });
      setHasChanges(false);
      Alert.alert('Successo', 'Modifiche salvate con successo');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare le modifiche');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedEventId || !pageData) return;
    
    triggerHaptic('medium');
    
    const action = pageData.isPublished ? 'ritirare' : 'pubblicare';
    Alert.alert(
      pageData.isPublished ? 'Ritira Pagina' : 'Pubblica Pagina',
      `Sei sicuro di voler ${action} la pagina evento?`,
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: pageData.isPublished ? 'Ritira' : 'Pubblica', 
          onPress: async () => {
            try {
              await api.toggleEventPagePublish(selectedEventId);
              setPageData({
                ...pageData,
                isPublished: !pageData.isPublished,
              });
              Alert.alert('Successo', pageData.isPublished ? 'Pagina ritirata' : 'Pagina pubblicata');
            } catch (error) {
              Alert.alert('Errore', 'Operazione non riuscita');
            }
          }
        },
      ]
    );
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

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-page-editor"
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
          <Text style={styles.title}>Editor Pagina Evento</Text>
          <Text style={styles.subtitle}>Personalizza la pagina pubblica del tuo evento</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Seleziona Evento</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventsContainer}
          >
            {events.map((event) => (
              <Pressable
                key={event.id}
                onPress={() => {
                  triggerHaptic('selection');
                  setSelectedEventId(event.id);
                }}
                style={[
                  styles.eventChip,
                  selectedEventId === event.id && styles.eventChipActive,
                ]}
                testID={`event-${event.id}`}
              >
                <Text
                  style={[
                    styles.eventChipText,
                    selectedEventId === event.id && styles.eventChipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {event.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {showLoader ? (
          <Loading text="Caricamento pagina..." />
        ) : pageData ? (
          <>
            <View style={styles.section}>
              <View style={styles.statusRow}>
                <View style={styles.statusInfo}>
                  <Badge variant={pageData.isPublished ? 'success' : 'secondary'}>
                    {pageData.isPublished ? 'Pubblicata' : 'Bozza'}
                  </Badge>
                  <Text style={styles.lastModified}>
                    Ultima modifica: {formatDate(pageData.lastModified)}
                  </Text>
                </View>
                <View style={styles.statusActions}>
                  <Pressable
                    style={styles.previewButton}
                    onPress={handlePreview}
                    testID="button-preview"
                  >
                    <Ionicons name="eye-outline" size={18} color={staticColors.foreground} />
                  </Pressable>
                  <Pressable
                    style={[
                      styles.publishButton,
                      pageData.isPublished && styles.unpublishButton,
                    ]}
                    onPress={handlePublish}
                    testID="button-publish"
                  >
                    <Ionicons 
                      name={pageData.isPublished ? 'cloud-offline-outline' : 'cloud-upload-outline'} 
                      size={16} 
                      color={pageData.isPublished ? staticColors.destructive : staticColors.primaryForeground} 
                    />
                    <Text style={[
                      styles.publishButtonText,
                      pageData.isPublished && styles.unpublishButtonText,
                    ]}>
                      {pageData.isPublished ? 'Ritira' : 'Pubblica'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Descrizione</Text>
              <Card style={styles.editorCard}>
                <TextInput
                  style={styles.descriptionInput}
                  value={editedDescription}
                  onChangeText={handleDescriptionChange}
                  placeholder="Inserisci la descrizione dell'evento..."
                  placeholderTextColor={staticColors.mutedForeground}
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                  testID="input-description"
                />
                <View style={styles.editorToolbar}>
                  <View style={styles.toolbarButtons}>
                    <Pressable style={styles.toolbarButton}>
                      <Ionicons name="text" size={18} color={staticColors.mutedForeground} />
                    </Pressable>
                    <Pressable style={styles.toolbarButton}>
                      <Text style={styles.toolbarBold}>B</Text>
                    </Pressable>
                    <Pressable style={styles.toolbarButton}>
                      <Text style={styles.toolbarItalic}>I</Text>
                    </Pressable>
                    <Pressable style={styles.toolbarButton}>
                      <Ionicons name="list" size={18} color={staticColors.mutedForeground} />
                    </Pressable>
                    <Pressable style={styles.toolbarButton}>
                      <Ionicons name="link" size={18} color={staticColors.mutedForeground} />
                    </Pressable>
                  </View>
                  <Text style={styles.charCount}>{editedDescription.length} caratteri</Text>
                </View>
              </Card>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Galleria</Text>
                <Pressable
                  onPress={handleAddImage}
                  style={styles.addImageButton}
                  testID="button-add-image"
                >
                  <Ionicons name="add" size={16} color={staticColors.primary} />
                  <Text style={styles.addImageText}>Aggiungi</Text>
                </Pressable>
              </View>
              
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.galleryContainer}
              >
                {pageData.images.length > 0 ? (
                  pageData.images.map((imageUrl, index) => (
                    <View key={index} style={styles.galleryItem}>
                      <Image 
                        source={{ uri: imageUrl }} 
                        style={styles.galleryImage}
                        resizeMode="cover"
                      />
                      <Pressable
                        style={styles.removeImageButton}
                        onPress={() => handleRemoveImage(imageUrl)}
                        testID={`button-remove-image-${index}`}
                      >
                        <Ionicons name="close" size={14} color={staticColors.foreground} />
                      </Pressable>
                    </View>
                  ))
                ) : (
                  <Card style={styles.emptyGalleryCard}>
                    <Ionicons name="images-outline" size={32} color={staticColors.mutedForeground} />
                    <Text style={styles.emptyGalleryText}>Nessuna immagine</Text>
                  </Card>
                )}
                
                <Pressable style={styles.addImageCard} onPress={handleAddImage}>
                  <Ionicons name="add" size={32} color={staticColors.primary} />
                  <Text style={styles.addImageCardText}>Aggiungi</Text>
                </Pressable>
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Link Social</Text>
              <Card style={styles.socialCard}>
                <View style={styles.socialInput}>
                  <View style={[styles.socialIcon, { backgroundColor: '#1877F220' }]}>
                    <Ionicons name="logo-facebook" size={18} color="#1877F2" />
                  </View>
                  <TextInput
                    style={styles.socialInputField}
                    value={editedSocialLinks.facebook}
                    onChangeText={(text) => handleSocialLinkChange('facebook', text)}
                    placeholder="URL pagina Facebook"
                    placeholderTextColor={staticColors.mutedForeground}
                    autoCapitalize="none"
                    keyboardType="url"
                    testID="input-facebook"
                  />
                </View>

                <View style={styles.socialDivider} />

                <View style={styles.socialInput}>
                  <View style={[styles.socialIcon, { backgroundColor: '#E4405F20' }]}>
                    <Ionicons name="logo-instagram" size={18} color="#E4405F" />
                  </View>
                  <TextInput
                    style={styles.socialInputField}
                    value={editedSocialLinks.instagram}
                    onChangeText={(text) => handleSocialLinkChange('instagram', text)}
                    placeholder="URL profilo Instagram"
                    placeholderTextColor={staticColors.mutedForeground}
                    autoCapitalize="none"
                    keyboardType="url"
                    testID="input-instagram"
                  />
                </View>

                <View style={styles.socialDivider} />

                <View style={styles.socialInput}>
                  <View style={[styles.socialIcon, { backgroundColor: '#1DA1F220' }]}>
                    <Ionicons name="logo-twitter" size={18} color="#1DA1F2" />
                  </View>
                  <TextInput
                    style={styles.socialInputField}
                    value={editedSocialLinks.twitter}
                    onChangeText={(text) => handleSocialLinkChange('twitter', text)}
                    placeholder="URL profilo Twitter/X"
                    placeholderTextColor={staticColors.mutedForeground}
                    autoCapitalize="none"
                    keyboardType="url"
                    testID="input-twitter"
                  />
                </View>
              </Card>
            </View>

            {hasChanges && (
              <View style={styles.saveSection}>
                <Pressable
                  style={styles.saveButton}
                  onPress={handleSave}
                  disabled={isSaving}
                  testID="button-save"
                >
                  {isSaving ? (
                    <Text style={styles.saveButtonText}>Salvataggio...</Text>
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color={staticColors.primaryForeground} />
                      <Text style={styles.saveButtonText}>Salva Modifiche</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </>
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="document-outline" size={40} color={staticColors.mutedForeground} />
            <Text style={styles.emptyText}>Seleziona un evento per modificarne la pagina</Text>
          </Card>
        )}
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
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.mutedForeground,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  eventsContainer: {
    gap: spacing.sm,
  },
  eventChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
    marginRight: spacing.sm,
    maxWidth: 180,
  },
  eventChipActive: {
    backgroundColor: staticColors.primary,
  },
  eventChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  eventChipTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  lastModified: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  statusActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  previewButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: staticColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: staticColors.primary,
    borderRadius: borderRadius.md,
  },
  unpublishButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: staticColors.destructive,
  },
  publishButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  unpublishButtonText: {
    color: staticColors.destructive,
  },
  editorCard: {
    padding: 0,
    overflow: 'hidden',
  },
  descriptionInput: {
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
    minHeight: 160,
    lineHeight: 24,
  },
  editorToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
    backgroundColor: staticColors.secondary,
  },
  toolbarButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toolbarButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  toolbarBold: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: staticColors.mutedForeground,
  },
  toolbarItalic: {
    fontSize: typography.fontSize.base,
    fontStyle: 'italic',
    color: staticColors.mutedForeground,
  },
  charCount: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addImageText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.primary,
  },
  galleryContainer: {
    gap: spacing.sm,
  },
  galleryItem: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGalleryCard: {
    width: 200,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  emptyGalleryText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  addImageCard: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: staticColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addImageCardText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.primary,
    fontWeight: '500',
  },
  socialCard: {
    padding: 0,
    overflow: 'hidden',
  },
  socialInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  socialIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialInputField: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
  },
  socialDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginLeft: 60,
  },
  saveSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: staticColors.primary,
    borderRadius: borderRadius.lg,
  },
  saveButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  emptyCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
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

export default GestoreEventPageEditorScreen;
