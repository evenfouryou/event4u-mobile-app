import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { DigitalTicketTemplate } from '@/lib/api';

interface AdminDigitalTemplatesScreenProps {
  onBack: () => void;
}

export function AdminDigitalTemplatesScreen({ onBack }: AdminDigitalTemplatesScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [templates, setTemplates] = useState<DigitalTicketTemplate[]>([]);

  useEffect(() => {
    loadTemplates();
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

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdminDigitalTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Errore nel caricamento dei template digitali:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTemplates();
    setRefreshing(false);
  };

  const handleEditTemplate = (template: DigitalTicketTemplate) => {
    triggerHaptic('light');
    // Navigate to edit screen - implementation pending
    console.log('Modifica template:', template.id);
  };

  const handleToggleStatus = (template: DigitalTicketTemplate) => {
    triggerHaptic('medium');
    const newStatus = !template.isActive;
    api.updateAdminDigitalTemplate(template.id, { isActive: newStatus }).then(() => {
      setTemplates(prev =>
        prev.map(t => t.id === template.id ? { ...t, isActive: newStatus } : t)
      );
    }).catch(error => {
      console.error('Errore aggiornamento template:', error);
    });
  };

  const renderTemplatePreview = (template: DigitalTicketTemplate) => {
    return (
      <View 
        style={[
          styles.previewContainer,
          { backgroundColor: template.primaryColor }
        ]}
      >
        {/* Simple representation of the template */}
        <View style={styles.previewContent}>
          {template.logoUrl && (
            <View style={[
              styles.previewLogo,
              template.logoPosition === 'top-left' && styles.logoLeft,
              template.logoPosition === 'top-right' && styles.logoRight,
            ]}>
              <View style={[
                styles.logoPlaceholder,
                { 
                  width: template.logoSize === 'small' ? 24 : template.logoSize === 'large' ? 40 : 32,
                  height: template.logoSize === 'small' ? 24 : template.logoSize === 'large' ? 40 : 32,
                }
              ]}>
                <Ionicons name="image-outline" size={16} color={template.textColor} />
              </View>
            </View>
          )}
          
          {/* Event name preview */}
          {template.showEventName && (
            <Text style={[
              styles.previewTitle,
              { 
                color: template.textColor,
                fontSize: Math.min(template.titleFontSize * 0.5, 12)
              }
            ]}>
              Evento
            </Text>
          )}
          
          {/* QR preview */}
          <View style={[
            styles.qrPreview,
            { 
              width: Math.min(template.qrSize * 0.4, 40),
              height: Math.min(template.qrSize * 0.4, 40),
              backgroundColor: template.qrForegroundColor,
              borderRadius: template.qrStyle === 'square' ? 2 : template.qrStyle === 'rounded' ? 4 : 8,
            }
          ]}>
            <Ionicons name="qr-code" size={20} color={template.qrBackgroundColor} />
          </View>
        </View>
      </View>
    );
  };

  const renderTemplate = ({ item }: { item: DigitalTicketTemplate }) => (
    <Card style={styles.templateCard} testID={`template-card-${item.id}`}>
      <View style={styles.templatePreviewSection}>
        {renderTemplatePreview(item)}
      </View>

      <View style={styles.templateInfo}>
        <View style={styles.templateHeader}>
          <Text style={styles.templateName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.badgesContainer}>
            {item.isDefault && (
              <Badge variant="default" testID={`badge-default-${item.id}`}>
                Predefinito
              </Badge>
            )}
            <Badge 
              variant={item.isActive ? 'success' : 'secondary'} 
              testID={`badge-status-${item.id}`}
            >
              {item.isActive ? 'Attivo' : 'Inattivo'}
            </Badge>
          </View>
        </View>

        {item.description && (
          <Text style={styles.templateDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.templateDetails}>
          <View style={styles.detailItem}>
            <View style={[
              styles.colorBox,
              { backgroundColor: item.primaryColor }
            ]} />
            <Text style={styles.detailLabel}>Primario</Text>
          </View>
          <View style={styles.detailItem}>
            <View style={[
              styles.colorBox,
              { backgroundColor: item.secondaryColor }
            ]} />
            <Text style={styles.detailLabel}>Secondario</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="logo-rounded" size={14} color={colors.foreground} />
            <Text style={styles.detailLabel}>{item.logoPosition}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="qr-code-outline" size={14} color={colors.foreground} />
            <Text style={styles.detailLabel}>{item.qrSize}px</Text>
          </View>
        </View>

        <View style={styles.templateActions}>
          <Button
            variant="outline"
            size="sm"
            onPress={() => handleEditTemplate(item)}
            testID={`button-edit-${item.id}`}
          >
            <Ionicons name="create-outline" size={16} color={staticColors.foreground} />
            <Text style={styles.actionButtonText}>Modifica</Text>
          </Button>
          <Button
            variant={item.isActive ? 'secondary' : 'default'}
            size="sm"
            onPress={() => handleToggleStatus(item)}
            testID={`button-toggle-${item.id}`}
          >
            <Ionicons
              name={item.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
              size={16}
              color={item.isActive ? staticColors.foreground : staticColors.primaryForeground}
            />
            <Text style={[
              styles.actionButtonText,
              { color: item.isActive ? staticColors.foreground : staticColors.primaryForeground }
            ]}>
              {item.isActive ? 'Disattiva' : 'Attiva'}
            </Text>
          </Button>
        </View>
      </View>
    </Card>
  );

  if (showLoader) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header showLogo showBack onBack={onBack} testID="header-digital-templates" />
        <Loading text="Caricamento template digitali..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header showLogo showBack onBack={onBack} testID="header-digital-templates" />

      <View style={styles.statsSection}>
        <Text style={styles.title}>Template Biglietti Digitali</Text>
        <View style={styles.statsGrid}>
          <GlassCard style={styles.statCard} testID="stat-total">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
              <Ionicons name="layers" size={20} color={staticColors.primary} />
            </View>
            <Text style={styles.statValue}>{templates.length}</Text>
            <Text style={styles.statLabel}>Totali</Text>
          </GlassCard>

          <GlassCard style={styles.statCard} testID="stat-active">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
              <Ionicons name="checkmark-circle" size={20} color={staticColors.success} />
            </View>
            <Text style={styles.statValue}>{templates.filter(t => t.isActive).length}</Text>
            <Text style={styles.statLabel}>Attivi</Text>
          </GlassCard>

          <GlassCard style={styles.statCard} testID="stat-default">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.accent}20` }]}>
              <Ionicons name="star" size={20} color={staticColors.accent} />
            </View>
            <Text style={styles.statValue}>{templates.filter(t => t.isDefault).length}</Text>
            <Text style={styles.statLabel}>Predefiniti</Text>
          </GlassCard>
        </View>
      </View>

      {templates.length > 0 ? (
        <FlatList
          data={templates}
          renderItem={renderTemplate}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="layers-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessun template trovato</Text>
          <Text style={styles.emptyText}>
            Crea il primo template per iniziare a personalizzare i biglietti
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  statsSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontWeight: '500',
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  templateCard: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  templatePreviewSection: {
    height: 120,
    marginBottom: spacing.md,
  },
  previewContainer: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContent: {
    alignItems: 'center',
    gap: spacing.md,
  },
  previewLogo: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  logoLeft: {
    alignItems: 'flex-start',
  },
  logoRight: {
    alignItems: 'flex-end',
  },
  logoPlaceholder: {
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: {
    fontWeight: '600',
  },
  qrPreview: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateInfo: {
    paddingTop: spacing.md,
  },
  templateHeader: {
    marginBottom: spacing.md,
  },
  templateName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
    marginBottom: spacing.sm,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  templateDescription: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginBottom: spacing.md,
  },
  templateDetails: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.muted,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  colorBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  detailLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },
  templateActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
