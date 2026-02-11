import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert, Share, TextInput, Switch, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api from '@/lib/api';

interface TrackingLink {
  eventId: string;
  eventName: string;
  eventDate: string;
  trackingEnabled: boolean;
  trackingLink: string | null;
}

interface PageSettings {
  prCode: string;
  displayName: string | null;
  firstName: string;
  lastName: string;
  bio: string | null;
  profileImageUrl: string | null;
  pageEnabled: boolean;
  socialInstagram: string | null;
  socialTiktok: string | null;
  socialFacebook: string | null;
}

interface PRTrackingLinksScreenProps {
  onBack: () => void;
}

export function PRTrackingLinksScreen({ onBack }: PRTrackingLinksScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [prCode, setPrCode] = useState('');
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [pageSettings, setPageSettings] = useState<PageSettings | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [bio, setBio] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialTiktok, setSocialTiktok] = useState('');
  const [socialFacebook, setSocialFacebook] = useState('');
  const [pageEnabled, setPageEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [trackingData, settingsData] = await Promise.all([
        api.getPrTrackingLinks(),
        api.getPrPageSettings(),
      ]);
      setPrCode(trackingData.prCode);
      setLinks(trackingData.links);
      setPageSettings(settingsData);
      setBio(settingsData.bio || '');
      setDisplayName(settingsData.displayName || `${settingsData.firstName} ${settingsData.lastName}`);
      setSocialInstagram(settingsData.socialInstagram || '');
      setSocialTiktok(settingsData.socialTiktok || '');
      setSocialFacebook(settingsData.socialFacebook || '');
      setPageEnabled(settingsData.pageEnabled);
    } catch (error) {
      console.error('Error loading tracking links:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const copyLink = async (link: string, eventName: string) => {
    await Clipboard.setStringAsync(link);
    triggerHaptic('success');
    Alert.alert('Copiato!', `Link per "${eventName}" copiato negli appunti`);
  };

  const shareLink = async (link: string, eventName: string) => {
    try {
      await Share.share({
        message: `Prenota per ${eventName}: ${link}`,
        url: link,
      });
      triggerHaptic('success');
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const getPageUrl = () => `https://manage.eventfouryou.com/pr/${prCode}`;

  const copyPageLink = async () => {
    if (!prCode) return;
    const pageUrl = getPageUrl();
    await Clipboard.setStringAsync(pageUrl);
    triggerHaptic('success');
    Alert.alert('Copiato!', 'Link della tua pagina copiato');
  };

  const sharePageLink = async () => {
    if (!prCode) return;
    const pageUrl = getPageUrl();
    try {
      await Share.share({
        message: `Scopri i miei eventi: ${pageUrl}`,
        url: pageUrl,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.updatePrPageSettings({
        pageEnabled,
        bio,
        displayName,
        socialInstagram,
        socialTiktok,
        socialFacebook,
      });
      triggerHaptic('success');
      Alert.alert('Salvato!', 'Impostazioni pagina aggiornate');
      setEditMode(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile salvare');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={onBack} style={styles.backButton} testID="button-back">
            <Ionicons name="arrow-back" size={24} color={staticColors.foreground} />
          </Pressable>
          <Text style={styles.headerTitle}>Link e Pagina</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="hourglass-outline" size={48} color={staticColors.mutedForeground} />
          <Text style={styles.emptyText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={onBack} style={styles.backButton} testID="button-back">
          <Ionicons name="arrow-back" size={24} color={staticColors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Link e Pagina</Text>
        <Pressable onPress={() => setEditMode(!editMode)} testID="button-edit-mode">
          <Ionicons name={editMode ? "close" : "settings-outline"} size={24} color={staticColors.primary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={staticColors.primary} />}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Il Tuo Codice PR</Text>
          <Card style={styles.card}>
            <View style={styles.prCodeContainer}>
              <Text style={styles.prCode} testID="text-pr-code">{prCode}</Text>
              <Badge variant={pageEnabled ? "success" : "secondary"} size="sm">
                <Text style={styles.badgeText}>{pageEnabled ? 'Pagina Attiva' : 'Pagina Off'}</Text>
              </Badge>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>La Tua Pagina Pubblica</Text>

          {editMode ? (
            <Card style={styles.card}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Pagina Pubblica Attiva</Text>
                <Switch
                  value={pageEnabled}
                  onValueChange={setPageEnabled}
                  trackColor={{ false: staticColors.border, true: staticColors.primary + '80' }}
                  thumbColor={pageEnabled ? staticColors.primary : staticColors.mutedForeground}
                  testID="switch-page-enabled"
                />
              </View>

              <Text style={styles.inputLabel}>Nome Visualizzato</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Il tuo nome"
                placeholderTextColor={staticColors.mutedForeground}
                testID="input-display-name"
              />

              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Descrivi te stesso..."
                placeholderTextColor={staticColors.mutedForeground}
                multiline
                testID="input-bio"
              />

              <Text style={styles.inputLabel}>Instagram (username)</Text>
              <TextInput
                style={styles.input}
                value={socialInstagram}
                onChangeText={setSocialInstagram}
                placeholder="@tuousername"
                placeholderTextColor={staticColors.mutedForeground}
                testID="input-instagram"
              />

              <Text style={styles.inputLabel}>TikTok (username)</Text>
              <TextInput
                style={styles.input}
                value={socialTiktok}
                onChangeText={setSocialTiktok}
                placeholder="@tuousername"
                placeholderTextColor={staticColors.mutedForeground}
                testID="input-tiktok"
              />

              <Text style={styles.inputLabel}>Facebook (URL o username)</Text>
              <TextInput
                style={styles.input}
                value={socialFacebook}
                onChangeText={setSocialFacebook}
                placeholder="tuoprofilo"
                placeholderTextColor={staticColors.mutedForeground}
                testID="input-facebook"
              />

              <Button
                variant="default"
                onPress={saveSettings}
                loading={saving}
                style={{ marginTop: spacing.md }}
                testID="button-save-settings"
              >
                <Text style={styles.buttonText}>Salva Impostazioni</Text>
              </Button>
            </Card>
          ) : (
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                Linking.openURL(getPageUrl());
              }}
              testID="button-preview-page"
            >
              <Card style={styles.previewCard}>
                <LinearGradient
                  colors={[`${staticColors.primary}18`, `${staticColors.primary}08`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.previewGradient}
                >
                  <View style={styles.previewHeader}>
                    <View style={styles.previewAvatarRing}>
                      <Avatar
                        name={displayName}
                        source={pageSettings?.profileImageUrl}
                        size="lg"
                      />
                    </View>
                    <View style={styles.previewInfo}>
                      <Text style={styles.previewName} numberOfLines={1}>{displayName}</Text>
                      <Text style={styles.previewUrl} numberOfLines={1}>
                        manage.eventfouryou.com/pr/{prCode}
                      </Text>
                      <Badge
                        variant={pageEnabled ? 'success' : 'secondary'}
                        size="sm"
                        style={{ alignSelf: 'flex-start', marginTop: 4 }}
                      >
                        <Text style={styles.previewBadgeText}>
                          {pageEnabled ? 'Attiva' : 'Non attiva'}
                        </Text>
                      </Badge>
                    </View>
                  </View>

                  {bio ? (
                    <Text style={styles.previewBio} numberOfLines={2}>{bio}</Text>
                  ) : null}

                  {(socialInstagram || socialTiktok || socialFacebook) ? (
                    <View style={styles.previewSocials}>
                      {socialInstagram ? (
                        <View style={styles.previewSocialChip}>
                          <Ionicons name="logo-instagram" size={13} color={staticColors.mutedForeground} />
                          <Text style={styles.previewSocialText}>Instagram</Text>
                        </View>
                      ) : null}
                      {socialTiktok ? (
                        <View style={styles.previewSocialChip}>
                          <Ionicons name="logo-tiktok" size={13} color={staticColors.mutedForeground} />
                          <Text style={styles.previewSocialText}>TikTok</Text>
                        </View>
                      ) : null}
                      {socialFacebook ? (
                        <View style={styles.previewSocialChip}>
                          <Ionicons name="logo-facebook" size={13} color={staticColors.mutedForeground} />
                          <Text style={styles.previewSocialText}>Facebook</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </LinearGradient>

                <View style={styles.previewActions}>
                  <Pressable
                    style={styles.previewActionBtn}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      copyPageLink();
                    }}
                    testID="button-copy-page-link"
                  >
                    <Ionicons name="copy-outline" size={16} color={staticColors.primary} />
                    <Text style={styles.previewActionText}>Copia</Text>
                  </Pressable>
                  <View style={styles.previewActionDivider} />
                  <Pressable
                    style={styles.previewActionBtn}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      sharePageLink();
                    }}
                    testID="button-share-page-link"
                  >
                    <Ionicons name="share-social-outline" size={16} color={staticColors.primary} />
                    <Text style={styles.previewActionText}>Condividi</Text>
                  </Pressable>
                  <View style={styles.previewActionDivider} />
                  <Pressable
                    style={styles.previewActionBtn}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      Linking.openURL(getPageUrl());
                    }}
                    testID="button-open-page"
                  >
                    <Ionicons name="open-outline" size={16} color={staticColors.primary} />
                    <Text style={styles.previewActionText}>Apri</Text>
                  </Pressable>
                </View>

                {!pageEnabled && (
                  <View style={styles.previewDisabledBanner}>
                    <Ionicons name="eye-off-outline" size={14} color={staticColors.mutedForeground} />
                    <Text style={styles.previewDisabledText}>
                      Attiva la pagina dalle impostazioni per renderla visibile
                    </Text>
                  </View>
                )}
              </Card>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Link Tracciamento Eventi</Text>
          {links.length === 0 ? (
            <Card style={styles.card}>
              <View style={styles.emptyState}>
                <Ionicons name="link-outline" size={40} color={staticColors.mutedForeground} />
                <Text style={styles.emptyText}>Nessun evento con link attivo</Text>
              </View>
            </Card>
          ) : (
            links.map((link) => (
              <Card
                key={link.eventId}
                style={{
                  ...styles.card,
                  ...(link.trackingEnabled ? {} : styles.disabledCard)
                }}
              >
                <View style={styles.linkRow}>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventName} testID={`text-event-name-${link.eventId}`}>
                      {link.eventName}
                    </Text>
                    <Text style={styles.eventDate}>{formatDate(link.eventDate)}</Text>
                  </View>
                  {link.trackingEnabled && link.trackingLink ? (
                    <View style={styles.linkActions}>
                      <Pressable
                        style={styles.iconButton}
                        onPress={() => copyLink(link.trackingLink!, link.eventName)}
                        testID={`button-copy-${link.eventId}`}
                      >
                        <Ionicons name="copy-outline" size={20} color={staticColors.primary} />
                      </Pressable>
                      <Pressable
                        style={styles.iconButton}
                        onPress={() => shareLink(link.trackingLink!, link.eventName)}
                        testID={`button-share-${link.eventId}`}
                      >
                        <Ionicons name="share-social-outline" size={20} color={staticColors.primary} />
                      </Pressable>
                    </View>
                  ) : (
                    <Badge variant="secondary" size="sm">
                      <Text style={styles.badgeText}>Disattivato</Text>
                    </Badge>
                  )}
                </View>
                {!link.trackingEnabled && (
                  <Text style={styles.disabledText}>
                    Il gestore ha disattivato il link per questo evento
                  </Text>
                )}
              </Card>
            ))
          )}
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.sm,
  },
  card: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  prCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prCode: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.primary,
    letterSpacing: 2,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: 2,
  },
  eventDate: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  linkActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: staticColors.primary + '20',
  },
  disabledCard: {
    opacity: 0.5,
  },
  disabledText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  toggleLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
  },
  inputLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  previewCard: {
    padding: 0,
    overflow: 'hidden',
  },
  previewGradient: {
    padding: spacing.md,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  previewAvatarRing: {
    borderRadius: 30,
    borderWidth: 2,
    borderColor: `${staticColors.primary}40`,
    padding: 2,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  previewUrl: {
    fontSize: 11,
    color: staticColors.mutedForeground,
    marginTop: 1,
  },
  previewBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  previewBio: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  previewSocials: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  previewSocialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: `${staticColors.foreground}10`,
  },
  previewSocialText: {
    fontSize: 10,
    color: staticColors.mutedForeground,
  },
  previewActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  previewActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  previewActionText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
    color: staticColors.primary,
  },
  previewActionDivider: {
    width: 1,
    backgroundColor: staticColors.border,
  },
  previewDisabledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: `${staticColors.foreground}06`,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  previewDisabledText: {
    fontSize: 11,
    color: staticColors.mutedForeground,
    fontStyle: 'italic',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.sm,
  },
});
