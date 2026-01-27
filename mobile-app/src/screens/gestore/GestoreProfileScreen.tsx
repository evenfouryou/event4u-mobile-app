import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { GestoreProfile, Company } from '@/lib/api';

interface GestoreProfileScreenProps {
  onBack: () => void;
}

export function GestoreProfileScreen({ onBack }: GestoreProfileScreenProps) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [profile, setProfile] = useState<GestoreProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    loadProfile();
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

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const [profileData, companyData] = await Promise.all([
        api.getGestoreProfile(),
        api.getGestoreCompany(),
      ]);
      setProfile(profileData);
      setCompany(companyData);
      setFormData({
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.updateGestoreProfile(formData);
      await loadProfile();
      setEditing(false);
      Alert.alert('Successo', 'Profilo aggiornato');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Errore', 'Impossibile salvare il profilo');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge variant="destructive">Super Admin</Badge>;
      case 'gestore':
        return <Badge variant="default">Gestore</Badge>;
      case 'organizer':
        return <Badge variant="success">Organizer</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  if (showLoader) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-profile" />
        <Loading text="Caricamento profilo..." />
      </SafeArea>
    );
  }

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-profile"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <Avatar
            name={`${profile?.firstName || ''} ${profile?.lastName || ''}`}
            size="xl"
            testID="avatar-profile"
          />
          <Text style={styles.profileName}>
            {profile?.firstName} {profile?.lastName}
          </Text>
          <Text style={styles.profileEmail}>{profile?.email}</Text>
          {profile?.role && getRoleBadge(profile.role)}
        </View>

        {company && (
          <Card style={styles.companyCard}>
            <View style={styles.companyHeader}>
              <View style={[styles.companyIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                <Ionicons name="business" size={24} color={staticColors.primary} />
              </View>
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{company.name}</Text>
                <Text style={styles.companyType}>{company.type || 'Azienda'}</Text>
              </View>
            </View>
            {company.vatNumber && (
              <View style={styles.companyDetail}>
                <Text style={styles.companyDetailLabel}>P.IVA:</Text>
                <Text style={styles.companyDetailValue}>{company.vatNumber}</Text>
              </View>
            )}
            {company.address && (
              <View style={styles.companyDetail}>
                <Text style={styles.companyDetailLabel}>Indirizzo:</Text>
                <Text style={styles.companyDetailValue}>{company.address}</Text>
              </View>
            )}
          </Card>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Informazioni Personali</Text>
            {!editing && (
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  setEditing(true);
                }}
                style={styles.editButton}
                testID="button-edit"
              >
                <Ionicons name="create-outline" size={20} color={staticColors.primary} />
                <Text style={styles.editButtonText}>Modifica</Text>
              </Pressable>
            )}
          </View>

          <Card style={styles.formCard}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nome</Text>
              {editing ? (
                <TextInput
                  style={styles.formInput}
                  value={formData.firstName}
                  onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                  placeholder="Nome"
                  placeholderTextColor={colors.mutedForeground}
                  testID="input-firstName"
                />
              ) : (
                <Text style={styles.formValue}>{profile?.firstName || '-'}</Text>
              )}
            </View>

            <View style={styles.formDivider} />

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Cognome</Text>
              {editing ? (
                <TextInput
                  style={styles.formInput}
                  value={formData.lastName}
                  onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                  placeholder="Cognome"
                  placeholderTextColor={colors.mutedForeground}
                  testID="input-lastName"
                />
              ) : (
                <Text style={styles.formValue}>{profile?.lastName || '-'}</Text>
              )}
            </View>

            <View style={styles.formDivider} />

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email</Text>
              <Text style={styles.formValue}>{profile?.email || '-'}</Text>
            </View>

            <View style={styles.formDivider} />

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Telefono</Text>
              {editing ? (
                <TextInput
                  style={styles.formInput}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="Telefono"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="phone-pad"
                  testID="input-phone"
                />
              ) : (
                <Text style={styles.formValue}>{profile?.phone || '-'}</Text>
              )}
            </View>

            {editing && (
              <View style={styles.formActions}>
                <Button
                  variant="outline"
                  onPress={() => {
                    setEditing(false);
                    setFormData({
                      firstName: profile?.firstName || '',
                      lastName: profile?.lastName || '',
                      email: profile?.email || '',
                      phone: profile?.phone || '',
                    });
                  }}
                  style={styles.cancelButton}
                  testID="button-cancel"
                >
                  Annulla
                </Button>
                <Button
                  variant="golden"
                  onPress={handleSave}
                  loading={saving}
                  style={styles.saveButton}
                  testID="button-save"
                >
                  Salva
                </Button>
              </View>
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistiche</Text>
          <View style={styles.statsGrid}>
            <GlassCard style={styles.statCard}>
              <Ionicons name="calendar" size={24} color={staticColors.primary} />
              <Text style={styles.statValue}>{profile?.eventsCount || 0}</Text>
              <Text style={styles.statLabel}>Eventi</Text>
            </GlassCard>

            <GlassCard style={styles.statCard}>
              <Ionicons name="people" size={24} color={staticColors.teal} />
              <Text style={styles.statValue}>{profile?.staffCount || 0}</Text>
              <Text style={styles.statLabel}>Staff</Text>
            </GlassCard>

            <GlassCard style={styles.statCard}>
              <Ionicons name="ticket" size={24} color={staticColors.golden} />
              <Text style={styles.statValue}>{profile?.ticketsSold || 0}</Text>
              <Text style={styles.statLabel}>Biglietti</Text>
            </GlassCard>
          </View>
        </View>
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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  profileName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
    marginTop: spacing.md,
  },
  profileEmail: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  companyCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  companyIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  companyType: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  companyDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
    marginTop: spacing.sm,
  },
  companyDetailLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  companyDetailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  editButtonText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.primary,
    fontWeight: '500',
  },
  formCard: {
    padding: spacing.md,
  },
  formGroup: {
    paddingVertical: spacing.sm,
  },
  formLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginBottom: spacing.xs,
  },
  formValue: {
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
    fontWeight: '500',
  },
  formInput: {
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  formDivider: {
    height: 1,
    backgroundColor: staticColors.border,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
});

export default GestoreProfileScreen;
