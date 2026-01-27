import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api from '@/lib/api';

type TabType = 'models' | 'profiles' | 'agents';

interface AdminPrinterSettingsScreenProps {
  onBack: () => void;
}

interface PrinterModel {
  id: string;
  vendor: string;
  model: string;
  dpi: number;
  maxWidthMm: number;
  connectionType: string;
  driverNotes: string | null;
  isActive: boolean;
  createdAt: string;
}

interface PrinterProfile {
  id: string;
  companyId: string;
  agentId: string | null;
  printerModelId: string | null;
  name: string;
  paperWidthMm: number;
  paperHeightMm: number;
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  templateJson: any | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PrinterAgent {
  id: string;
  companyId: string;
  userId: string | null;
  deviceName: string;
  authToken: string | null;
  printerModelId: string | null;
  printerName: string | null;
  status: string;
  lastHeartbeat: string | null;
  capabilities: any | null;
  createdAt: string;
  updatedAt: string;
}

export function AdminPrinterSettingsScreen({ onBack }: AdminPrinterSettingsScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('models');
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [models, setModels] = useState<PrinterModel[]>([]);
  const [profiles, setProfiles] = useState<PrinterProfile[]>([]);
  const [agents, setAgents] = useState<PrinterAgent[]>([]);

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [modelsData, profilesData, agentsData] = await Promise.all([
        api.get<PrinterModel[]>('/api/printer-models').catch(() => []),
        api.get<PrinterProfile[]>('/api/printer-profiles').catch(() => []),
        api.get<PrinterAgent[]>('/api/printer-agents').catch(() => []),
      ]);
      setModels(modelsData || []);
      setProfiles(profilesData || []);
      setAgents(agentsData || []);
    } catch (error) {
      console.error('Error loading printer data:', error);
      Alert.alert('Errore', 'Impossibile caricare i dati stampanti');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Mai';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getConnectionStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'online':
        return <Badge variant="success">Online</Badge>;
      case 'printing':
        return <Badge variant="warning">Stampa</Badge>;
      case 'error':
        return <Badge variant="destructive">Errore</Badge>;
      default:
        return <Badge variant="secondary">Offline</Badge>;
    }
  };

  const getConnectionStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'online':
        return { icon: 'wifi', color: staticColors.success };
      case 'printing':
        return { icon: 'print', color: staticColors.warning };
      case 'error':
        return { icon: 'alert-circle', color: staticColors.destructive };
      default:
        return { icon: 'wifi-off', color: staticColors.mutedForeground };
    }
  };

  const TabButton = ({
    label,
    tab,
    icon,
  }: {
    label: string;
    tab: TabType;
    icon: string;
  }) => (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
        setActiveTab(tab);
      }}
      style={[
        styles.tabButton,
        activeTab === tab && { backgroundColor: staticColors.primary },
      ]}
      testID={`button-tab-${tab}`}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={activeTab === tab ? staticColors.background : colors.foreground}
      />
      <Text
        style={[
          styles.tabButtonText,
          {
            color:
              activeTab === tab ? staticColors.background : colors.foreground,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const ModelCard = ({ model }: { model: PrinterModel }) => (
    <Card
      {...{
        style: [styles.itemCard, { borderColor: colors.border }],
        testID: `card-model-${model.id}`,
      }}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleSection}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {model.vendor}
            </Text>
            <Text style={[styles.cardModel, { color: colors.mutedForeground }]}>
              {model.model}
            </Text>
          </View>
          <Badge variant={model.isActive ? 'success' : 'secondary'}>
            {model.isActive ? 'Attivo' : 'Inattivo'}
          </Badge>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons
              name="settings-outline"
              size={16}
              color={colors.mutedForeground}
            />
            <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
              {model.dpi} DPI
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons
              name="layers-outline"
              size={16}
              color={colors.mutedForeground}
            />
            <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
              Max {model.maxWidthMm}mm
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons
              name="cable-outline"
              size={16}
              color={colors.mutedForeground}
            />
            <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
              {model.connectionType}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );

  const ProfileCard = ({ profile }: { profile: PrinterProfile }) => (
    <Card
      {...{
        style: [styles.itemCard, { borderColor: colors.border }],
        testID: `card-profile-${profile.id}`,
      }}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleSection}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {profile.name}
            </Text>
            {profile.isDefault && (
              <Text style={[styles.cardBadgeText, { color: colors.mutedForeground }]}>
                (Default)
              </Text>
            )}
          </View>
          <Badge variant={profile.isActive ? 'success' : 'secondary'}>
            {profile.isActive ? 'Attivo' : 'Inattivo'}
          </Badge>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons
              name="document-outline"
              size={16}
              color={colors.mutedForeground}
            />
            <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
              {profile.paperWidthMm}×{profile.paperHeightMm}mm
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons
              name="expand-outline"
              size={16}
              color={colors.mutedForeground}
            />
            <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
              Margini: T{profile.marginTopMm} B{profile.marginBottomMm}mm
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );

  const AgentCard = ({ agent }: { agent: PrinterAgent }) => {
    const { icon, color } = getConnectionStatusIcon(agent.status);
    return (
      <Card
        {...{
          style: [styles.itemCard, { borderColor: colors.border }],
          testID: `card-agent-${agent.id}`,
        }}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleSection}>
              <View style={styles.deviceNameRow}>
                <Ionicons name={icon as any} size={18} color={color} />
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  {agent.deviceName}
                </Text>
              </View>
              <Text style={[styles.cardModel, { color: colors.mutedForeground }]}>
                {agent.printerName || 'Stampante non configurata'}
              </Text>
            </View>
            {getConnectionStatusBadge(agent.status)}
          </View>

          <View style={styles.cardDetails}>
            <View style={styles.detailRow}>
              <Ionicons
                name="time-outline"
                size={16}
                color={colors.mutedForeground}
              />
              <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                Ultimo heartbeat: {formatDate(agent.lastHeartbeat)}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  if (showLoader) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header showLogo showBack onBack={onBack} testID="header-printer-settings" />
        <Loading text="Caricamento impostazioni stampanti..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-printer-settings"
      />

      <View style={styles.tabsContainer}>
        <TabButton label="Modelli" tab="models" icon="print" />
        <TabButton label="Profili" tab="profiles" icon="document-outline" />
        <TabButton label="Agenti" tab="agents" icon="radio-button-on" />
      </View>

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
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {activeTab === 'models' && 'Modelli Stampante'}
          {activeTab === 'profiles' && 'Profili Stampa'}
          {activeTab === 'agents' && 'Agenti Stampa'}
        </Text>

        {activeTab === 'models' && (
          <View style={styles.listContainer}>
            {models.length > 0 ? (
              models.map((model) => <ModelCard key={model.id} model={model} />)
            ) : (
              <View style={styles.emptyStateContainer}>
                <Ionicons
                  name="print-outline"
                  size={48}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[styles.emptyStateText, { color: colors.mutedForeground }]}
                >
                  Nessun modello disponibile
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'profiles' && (
          <View style={styles.listContainer}>
            {profiles.length > 0 ? (
              profiles.map((profile) => (
                <ProfileCard key={profile.id} profile={profile} />
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <Ionicons
                  name="document-outline"
                  size={48}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[styles.emptyStateText, { color: colors.mutedForeground }]}
                >
                  Nessun profilo disponibile
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'agents' && (
          <View style={styles.listContainer}>
            {agents.length > 0 ? (
              agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <Ionicons
                  name="radio-button-on-outline"
                  size={48}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[styles.emptyStateText, { color: colors.mutedForeground }]}
                >
                  Nessun agente disponibile
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: staticColors.secondary,
  },
  tabButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  itemCard: {
    borderWidth: 1,
    padding: 0,
    marginBottom: spacing.md,
  },
  cardContent: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  cardTitleSection: {
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cardModel: {
    fontSize: typography.fontSize.sm,
  },
  cardBadgeText: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardDetails: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailText: {
    fontSize: typography.fontSize.sm,
  },
  emptyStateContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    marginTop: spacing.md,
  },
});
