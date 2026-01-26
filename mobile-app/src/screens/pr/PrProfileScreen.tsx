import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert, TextInput, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, gradients } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { triggerHaptic } from '@/lib/haptics';

interface PrProfile {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  prCode: string;
  email?: string;
  phone?: string;
  status: string;
}

interface Company {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface PrProfileScreenProps {
  onGoBack: () => void;
  onLogout: () => void;
}

export function PrProfileScreen({ onGoBack, onLogout }: PrProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);

  const [profile, setProfile] = useState<PrProfile | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API calls
      setProfile({
        id: '1',
        firstName: 'Mario',
        lastName: 'Rossi',
        displayName: 'Mario R.',
        prCode: 'PR2024001',
        email: 'mario.rossi@email.com',
        phone: '+39 333 1234567',
        status: 'active',
      });
      setCompanies([
        { id: '1', name: 'Club Paradise', isCurrent: true },
        { id: '2', name: 'Warehouse Events', isCurrent: false },
      ]);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Errore', 'Compila tutti i campi');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Errore', 'La nuova password deve avere almeno 8 caratteri');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Errore', 'Le password non coincidono');
      return;
    }

    try {
      setChangingPassword(true);
      // API call here
      triggerHaptic('success');
      Alert.alert('Password aggiornata!', 'La tua password è stata cambiata.');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      Alert.alert('Errore', 'Password attuale non corretta.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSwitchCompany = async (companyId: string) => {
    try {
      triggerHaptic('light');
      // API call here
      setCompanies(prev => prev.map(c => ({ ...c, isCurrent: c.id === companyId })));
      setShowCompanyPicker(false);
      Alert.alert('Azienda cambiata!', 'Ora stai lavorando per la nuova azienda.');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile cambiare azienda.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Conferma uscita',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Esci', style: 'destructive', onPress: onLogout },
      ]
    );
  };

  const getInitials = () => {
    if (profile?.firstName && profile?.lastName) {
      return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
    }
    return 'PR';
  };

  const hasMultipleCompanies = companies.length > 1;
  const currentCompany = companies.find(c => c.isCurrent);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            onGoBack();
          }}
          style={styles.backButton}
          testID="button-back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <View>
          <Text style={styles.title}>Profilo</Text>
          <Text style={styles.subtitle}>Gestisci il tuo account</Text>
        </View>
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
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <LinearGradient
              colors={[colors.primary, '#F59E0B']}
              style={styles.avatarGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </LinearGradient>
            <Text style={styles.profileName}>
              {profile?.displayName || `${profile?.firstName} ${profile?.lastName}`}
            </Text>
            <Badge variant="golden" style={styles.prBadge} testID="badge-pr-code">
              <Ionicons name="star" size={12} color={colors.primaryForeground} />
              <Text style={styles.prBadgeText}>{profile?.prCode}</Text>
            </Badge>
          </View>

          <View style={styles.separator} />

          {/* Profile Info */}
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <View style={styles.infoItemLeft}>
                <Ionicons name="person" size={20} color={colors.mutedForeground} />
                <View>
                  <Text style={styles.infoLabel}>Nome completo</Text>
                  <Text style={styles.infoValue}>{profile?.firstName} {profile?.lastName}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoItemLeft}>
                <Ionicons name="call" size={20} color={colors.mutedForeground} />
                <View>
                  <Text style={styles.infoLabel}>Telefono</Text>
                  <Text style={styles.infoValue}>{profile?.phone || 'Non impostato'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoItemLeft}>
                <Ionicons name="mail" size={20} color={colors.mutedForeground} />
                <View>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{profile?.email || 'Non impostata'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoItemLeft}>
                <Ionicons name="shield-checkmark" size={20} color={colors.mutedForeground} />
                <View>
                  <Text style={styles.infoLabel}>Stato</Text>
                  <Badge variant="success">
                    {profile?.status === 'active' ? 'Attivo' : profile?.status}
                  </Badge>
                </View>
              </View>
            </View>
          </View>
        </Card>

        {/* Company Switcher */}
        {hasMultipleCompanies && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Azienda</Text>
            </View>
            <Text style={styles.sectionDescription}>Cambia azienda di riferimento</Text>
            
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setShowCompanyPicker(true);
              }}
              style={styles.companySelectorButton}
              testID="button-select-company"
            >
              <View style={styles.companySelectorLeft}>
                <Ionicons name="business-outline" size={20} color={colors.foreground} />
                <Text style={styles.companySelectorText}>{currentCompany?.name}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
            </Pressable>
          </Card>
        )}

        {/* Security Section */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="lock-closed" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Sicurezza</Text>
          </View>

          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setShowPasswordModal(true);
            }}
            style={styles.actionItem}
            testID="button-change-password"
          >
            <View style={styles.actionItemLeft}>
              <Ionicons name="key" size={20} color={colors.foreground} />
              <Text style={styles.actionItemText}>Cambia password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </Pressable>
        </Card>

        {/* Logout Button */}
        <Button
          variant="destructive"
          style={styles.logoutButton}
          onPress={handleLogout}
          testID="button-logout"
        >
          <Ionicons name="log-out" size={20} color="#ffffff" />
          <Text style={styles.logoutButtonText}>Esci</Text>
        </Button>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cambia Password</Text>
            <Pressable
              onPress={() => setShowPasswordModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Password attuale</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showCurrentPassword}
                style={styles.passwordInput}
                testID="input-current-password"
              />
              <Pressable
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                style={styles.passwordToggle}
              >
                <Ionicons
                  name={showCurrentPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Nuova password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showNewPassword}
                style={styles.passwordInput}
                testID="input-new-password"
              />
              <Pressable
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={styles.passwordToggle}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Conferma nuova password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                style={styles.passwordInput}
                testID="input-confirm-password"
              />
            </View>

            <View style={styles.modalButtons}>
              <Button
                variant="outline"
                style={styles.modalButton}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annulla</Text>
              </Button>
              <Button
                variant="primary"
                style={styles.modalButton}
                onPress={handleChangePassword}
                disabled={changingPassword}
                testID="button-save-password"
              >
                <Text style={styles.saveButtonText}>
                  {changingPassword ? 'Salvataggio...' : 'Cambia password'}
                </Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Company Picker Modal */}
      <Modal
        visible={showCompanyPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCompanyPicker(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleziona Azienda</Text>
            <Pressable
              onPress={() => setShowCompanyPicker(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            {companies.map(company => (
              <Pressable
                key={company.id}
                onPress={() => handleSwitchCompany(company.id)}
                style={[styles.companyItem, company.isCurrent && styles.companyItemActive]}
                testID={`company-${company.id}`}
              >
                <View style={styles.companyItemLeft}>
                  <Ionicons name="business" size={20} color={colors.foreground} />
                  <Text style={styles.companyItemText}>{company.name}</Text>
                </View>
                {company.isCurrent && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
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
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  profileCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  profileName: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  prBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  infoList: {
    gap: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
  },
  infoItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.foreground,
  },
  sectionCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  sectionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  companySelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
  },
  companySelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  companySelectorText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.foreground,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
  },
  actionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionItemText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.foreground,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  logoutButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalContent: {
    padding: spacing.md,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.foreground,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordInput: {
    flex: 1,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  passwordToggle: {
    padding: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  modalButton: {
    flex: 1,
  },
  cancelButtonText: {
    color: colors.foreground,
    fontWeight: '500',
  },
  saveButtonText: {
    color: colors.primaryForeground,
    fontWeight: '600',
  },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  companyItemActive: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  companyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  companyItemText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.foreground,
  },
});
