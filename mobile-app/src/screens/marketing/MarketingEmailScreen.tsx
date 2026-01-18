import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Button, Header } from '../../components';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  previewText: string;
  category: 'promotional' | 'event' | 'newsletter' | 'transactional';
  lastModified: string;
  usageCount: number;
}

interface EmailCampaign {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  recipients: number;
  sentCount: number;
  openRate: number;
  clickRate: number;
  scheduledAt?: string;
  sentAt?: string;
}

interface Segment {
  id: string;
  name: string;
  count: number;
}

const CATEGORY_CONFIG = {
  promotional: { label: 'Promo', color: colors.primary },
  event: { label: 'Evento', color: colors.teal },
  newsletter: { label: 'Newsletter', color: colors.warning },
  transactional: { label: 'Transazionale', color: '#8B5CF6' },
};

export default function MarketingEmailScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates'>('campaigns');
  const [refreshing, setRefreshing] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    subject: '',
    segmentId: '',
  });

  const { data: campaigns, refetch: refetchCampaigns } = useQuery<EmailCampaign[]>({
    queryKey: ['/api/marketing/email/campaigns'],
  });

  const { data: templates, refetch: refetchTemplates } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/marketing/email/templates'],
  });

  const { data: segments } = useQuery<Segment[]>({
    queryKey: ['/api/marketing/segments'],
  });

  const sendCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      return fetch(`/api/marketing/email/campaigns/${campaignId}/send`, {
        method: 'POST',
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/email/campaigns'] });
      Alert.alert('Successo', 'Campagna inviata!');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchCampaigns(), refetchTemplates()]);
    setRefreshing(false);
  }, [refetchCampaigns, refetchTemplates]);

  const mockCampaigns: EmailCampaign[] = campaigns || [
    { id: '1', name: 'Weekend Party Blast', templateId: 't1', templateName: 'Party Promo', status: 'sent', recipients: 2500, sentCount: 2480, openRate: 32.5, clickRate: 5.2, sentAt: '2026-01-17 18:00' },
    { id: '2', name: 'VIP January Offers', templateId: 't2', templateName: 'VIP Template', status: 'scheduled', recipients: 800, sentCount: 0, openRate: 0, clickRate: 0, scheduledAt: '2026-01-20 10:00' },
    { id: '3', name: 'New Year Newsletter', templateId: 't3', templateName: 'Monthly Newsletter', status: 'draft', recipients: 5000, sentCount: 0, openRate: 0, clickRate: 0 },
    { id: '4', name: 'Flash Sale Alert', templateId: 't1', templateName: 'Party Promo', status: 'sending', recipients: 3200, sentCount: 1500, openRate: 0, clickRate: 0 },
  ];

  const mockTemplates: EmailTemplate[] = templates || [
    { id: '1', name: 'Party Promo', subject: '🎉 This Weekend at Event4U!', previewText: 'Don\'t miss the biggest party...', category: 'promotional', lastModified: '2026-01-15', usageCount: 12 },
    { id: '2', name: 'VIP Template', subject: 'Exclusive VIP Access', previewText: 'As a valued VIP member...', category: 'promotional', lastModified: '2026-01-10', usageCount: 8 },
    { id: '3', name: 'Monthly Newsletter', subject: 'Event4U Monthly Update', previewText: 'Here\'s what happened...', category: 'newsletter', lastModified: '2026-01-01', usageCount: 24 },
    { id: '4', name: 'Event Invitation', subject: 'You\'re Invited!', previewText: 'We have a special event...', category: 'event', lastModified: '2026-01-12', usageCount: 15 },
    { id: '5', name: 'Order Confirmation', subject: 'Your Order Confirmation', previewText: 'Thank you for your purchase...', category: 'transactional', lastModified: '2025-12-20', usageCount: 450 },
  ];

  const mockSegments: Segment[] = segments || [
    { id: '1', name: 'Tutti gli iscritti', count: 5200 },
    { id: '2', name: 'VIP Members', count: 850 },
    { id: '3', name: 'Attivi ultimi 30 giorni', count: 2300 },
    { id: '4', name: 'Mai acquistato', count: 1200 },
  ];

  const getStatusConfig = (status: EmailCampaign['status']) => {
    switch (status) {
      case 'draft': return { label: 'Bozza', color: colors.mutedForeground, icon: 'document-outline' };
      case 'scheduled': return { label: 'Programmata', color: colors.warning, icon: 'time-outline' };
      case 'sending': return { label: 'Invio...', color: colors.primary, icon: 'paper-plane-outline' };
      case 'sent': return { label: 'Inviata', color: colors.teal, icon: 'checkmark-circle-outline' };
      case 'failed': return { label: 'Fallita', color: colors.destructive, icon: 'alert-circle-outline' };
    }
  };

  const renderCampaignCard = ({ item }: { item: EmailCampaign }) => {
    const statusConfig = getStatusConfig(item.status);

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('CampaignDetail', { campaignId: item.id })}
        activeOpacity={0.8}
        data-testid={`card-campaign-${item.id}`}
      >
        <Card variant="glass" style={styles.campaignCard}>
          <View style={styles.campaignHeader}>
            <View style={styles.campaignInfo}>
              <Text style={styles.campaignName}>{item.name}</Text>
              <Text style={styles.templateName}>Template: {item.templateName}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}20` }]}>
              <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>

          <View style={styles.campaignMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.metaText}>{item.recipients.toLocaleString()} destinatari</Text>
            </View>
            {item.scheduledAt && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.metaText}>{item.scheduledAt}</Text>
              </View>
            )}
          </View>

          {item.status === 'sent' && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.sentCount.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Inviate</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.teal }]}>{item.openRate}%</Text>
                <Text style={styles.statLabel}>Aperture</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{item.clickRate}%</Text>
                <Text style={styles.statLabel}>Click</Text>
              </View>
            </View>
          )}

          {item.status === 'sending' && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(item.sentCount / item.recipients) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {item.sentCount.toLocaleString()} / {item.recipients.toLocaleString()}
              </Text>
            </View>
          )}

          {item.status === 'draft' && (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('EditCampaign', { campaignId: item.id })}
                data-testid={`button-edit-${item.id}`}
              >
                <Ionicons name="create-outline" size={16} color={colors.foreground} />
                <Text style={styles.actionButtonText}>Modifica</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.sendButton]}
                onPress={() => sendCampaignMutation.mutate(item.id)}
                data-testid={`button-send-${item.id}`}
              >
                <Ionicons name="paper-plane" size={16} color={colors.primaryForeground} />
                <Text style={styles.sendButtonText}>Invia</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  const renderTemplateCard = ({ item }: { item: EmailTemplate }) => {
    const categoryConfig = CATEGORY_CONFIG[item.category];

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedTemplate(item);
          setShowComposeModal(true);
        }}
        activeOpacity={0.8}
        data-testid={`card-template-${item.id}`}
      >
        <Card variant="glass" style={styles.templateCard}>
          <View style={styles.templateHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: `${categoryConfig.color}20` }]}>
              <Text style={[styles.categoryText, { color: categoryConfig.color }]}>
                {categoryConfig.label}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('EditTemplate', { templateId: item.id })}
              data-testid={`button-edit-template-${item.id}`}
            >
              <Ionicons name="create-outline" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <Text style={styles.templateName}>{item.name}</Text>
          <Text style={styles.templateSubject}>{item.subject}</Text>
          <Text style={styles.templatePreview} numberOfLines={2}>{item.previewText}</Text>

          <View style={styles.templateMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.metaText}>{item.lastModified}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="mail-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.metaText}>{item.usageCount} utilizzi</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Email Marketing"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateTemplate')}
            data-testid="button-create-template"
          >
            <Ionicons name="add" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'campaigns' && styles.tabActive]}
          onPress={() => setActiveTab('campaigns')}
          data-testid="tab-campaigns"
        >
          <Ionicons
            name="paper-plane-outline"
            size={18}
            color={activeTab === 'campaigns' ? colors.primary : colors.mutedForeground}
          />
          <Text style={[styles.tabText, activeTab === 'campaigns' && styles.tabTextActive]}>
            Campagne
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'templates' && styles.tabActive]}
          onPress={() => setActiveTab('templates')}
          data-testid="tab-templates"
        >
          <Ionicons
            name="document-text-outline"
            size={18}
            color={activeTab === 'templates' ? colors.primary : colors.mutedForeground}
          />
          <Text style={[styles.tabText, activeTab === 'templates' && styles.tabTextActive]}>
            Template
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'campaigns' && (
        <FlatList
          data={mockCampaigns}
          renderItem={renderCampaignCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        />
      )}

      {activeTab === 'templates' && (
        <FlatList
          data={mockTemplates}
          renderItem={renderTemplateCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        />
      )}

      <Modal
        visible={showComposeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowComposeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuova Campagna</Text>
              <TouchableOpacity onPress={() => setShowComposeModal(false)} data-testid="button-close-modal">
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedTemplate && (
                <Card variant="outline" style={styles.selectedTemplateCard}>
                  <Text style={styles.selectedTemplateLabel}>Template selezionato</Text>
                  <Text style={styles.selectedTemplateName}>{selectedTemplate.name}</Text>
                  <Text style={styles.selectedTemplateSubject}>{selectedTemplate.subject}</Text>
                </Card>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nome Campagna</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Es: Promo Weekend Gennaio"
                  placeholderTextColor={colors.mutedForeground}
                  value={newCampaign.name}
                  onChangeText={(text) => setNewCampaign({ ...newCampaign, name: text })}
                  data-testid="input-campaign-name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Oggetto Email</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Es: 🎉 Questo weekend ti aspettiamo!"
                  placeholderTextColor={colors.mutedForeground}
                  value={newCampaign.subject}
                  onChangeText={(text) => setNewCampaign({ ...newCampaign, subject: text })}
                  data-testid="input-subject"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Destinatari</Text>
                {mockSegments.map((segment) => (
                  <TouchableOpacity
                    key={segment.id}
                    style={[
                      styles.segmentOption,
                      newCampaign.segmentId === segment.id && styles.segmentOptionActive,
                    ]}
                    onPress={() => setNewCampaign({ ...newCampaign, segmentId: segment.id })}
                    data-testid={`segment-${segment.id}`}
                  >
                    <View style={styles.segmentInfo}>
                      <Text style={styles.segmentName}>{segment.name}</Text>
                      <Text style={styles.segmentCount}>{segment.count.toLocaleString()} contatti</Text>
                    </View>
                    {newCampaign.segmentId === segment.id && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                onPress={() => {
                  setShowComposeModal(false);
                  navigation.navigate('CampaignEditor', { ...newCampaign, templateId: selectedTemplate?.id });
                }}
                disabled={!newCampaign.name || !newCampaign.segmentId}
                data-testid="button-create-campaign"
              >
                <Text style={styles.buttonText}>Crea Campagna</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowComposeModal(true)}
        activeOpacity={0.8}
        data-testid="button-fab-compose"
      >
        <Ionicons name="create" size={24} color={colors.primaryForeground} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  tabActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  tabText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  tabTextActive: {
    color: colors.primary,
  },
  listContent: {
    padding: spacing.lg,
  },
  campaignCard: {
    paddingVertical: spacing.lg,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  campaignInfo: {
    flex: 1,
  },
  campaignName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  templateName: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  campaignMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  statsRow: {
    flexDirection: 'row',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  progressContainer: {
    gap: spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  actionButtonText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sendButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  templateCard: {
    paddingVertical: spacing.lg,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  categoryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  templateSubject: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  templatePreview: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  templateMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  selectedTemplateCard: {
    marginBottom: spacing.lg,
  },
  selectedTemplateLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  selectedTemplateName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  selectedTemplateSubject: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  formInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  segmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  segmentOptionActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  segmentInfo: {},
  segmentName: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  segmentCount: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  modalActions: {
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  buttonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
