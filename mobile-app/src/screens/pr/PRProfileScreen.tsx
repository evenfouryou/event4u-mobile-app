import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Loading } from '@/components/Loading';
import { triggerHaptic } from '@/lib/haptics';
import api, { PrProfile } from '@/lib/api';

interface PRProfileScreenProps {
  onGoBack: () => void;
  onLogout: () => void;
}

export function PRProfileScreen({ onGoBack, onLogout }: PRProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PrProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profileData = await api.getPrProfile();
      setProfile(profileData);
      setDisplayName(profileData?.displayName || '');
      setEmail(profileData?.email || '');
    } catch (error) {
      console.error('Error loading PR profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.updatePrProfile({ displayName, email });
      await loadProfile();
      setEditing(false);
      triggerHaptic('success');
      Alert.alert('Successo', 'Profilo aggiornato');
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile aggiornare il profilo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading text="Caricamento profilo..." />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            onGoBack();
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Profilo PR</Text>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            setEditing(!editing);
          }}
          style={styles.editButton}
        >
          <Ionicons name={editing ? 'close' : 'create-outline'} size={24} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {profile?.firstName?.[0] || ''}{profile?.lastName?.[0] || ''}
            </Text>
          </View>
          <Text style={styles.profileName}>
            {profile?.displayName || `${profile?.firstName} ${profile?.lastName}`}
          </Text>
          <Badge variant="golden">
            <Text style={styles.prCodeBadge}>PR: {profile?.prCode}</Text>
          </Badge>
        </View>

        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>Informazioni Personali</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="person-outline" size={20} color={colors.mutedForeground} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Nome Completo</Text>
              <Text style={styles.infoValue}>{profile?.firstName} {profile?.lastName}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="call-outline" size={20} color={colors.mutedForeground} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Telefono</Text>
              <Text style={styles.infoValue}>{profile?.phone || '-'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="at" size={20} color={colors.mutedForeground} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Nome Visualizzato</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Il tuo nome visibile"
                  placeholderTextColor={colors.mutedForeground}
                />
              ) : (
                <Text style={styles.infoValue}>{profile?.displayName || '-'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail-outline" size={20} color={colors.mutedForeground} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="La tua email"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.infoValue}>{profile?.email || '-'}</Text>
              )}
            </View>
          </View>
        </Card>

        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>Informazioni Commissioni</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="cash-outline" size={20} color={colors.teal} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Tipo Commissione</Text>
              <Text style={styles.infoValue}>
                {profile?.commissionType === 'percentage' ? 'Percentuale' : 'Fisso'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="trending-up" size={20} color={colors.teal} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Valore Commissione</Text>
              <Text style={[styles.infoValue, { color: colors.teal }]}>
                {profile?.commissionType === 'percentage'
                  ? `${profile?.commissionValue}%`
                  : `€${profile?.commissionValue}`}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.mutedForeground} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Stato</Text>
              <Badge variant={profile?.status === 'active' ? 'success' : 'secondary'} size="sm">
                <Text style={styles.statusText}>
                  {profile?.status === 'active' ? 'Attivo' : 'Inattivo'}
                </Text>
              </Badge>
            </View>
          </View>
        </Card>

        {editing && (
          <Button
            variant="golden"
            onPress={handleSave}
            loading={saving}
            style={styles.saveButton}
          >
            Salva Modifiche
          </Button>
        )}

        <Button
          variant="destructive"
          onPress={() => {
            triggerHaptic('error');
            Alert.alert(
              'Conferma Logout',
              'Sei sicuro di voler uscire?',
              [
                { text: 'Annulla', style: 'cancel' },
                { text: 'Esci', style: 'destructive', onPress: onLogout },
              ]
            );
          }}
          style={styles.logoutButton}
        >
          <View style={styles.logoutContent}>
            <Ionicons name="log-out-outline" size={20} color={colors.destructiveForeground} />
            <Text style={styles.logoutText}>Esci</Text>
          </View>
        </Button>

        <View style={{ height: spacing.xxl }} />
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  profileName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  prCodeBadge: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  infoCard: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    fontWeight: '500',
  },
  input: {
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  saveButton: {
    marginBottom: spacing.md,
  },
  logoutButton: {
    marginTop: spacing.md,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoutText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.destructiveForeground,
  },
});
