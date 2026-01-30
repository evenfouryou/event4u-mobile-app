import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { PrProfile } from '@/lib/api';

interface PRProfileScreenProps {
  onGoBack: () => void;
  onLogout: () => void;
}

export function PRProfileScreen({ onGoBack, onLogout }: PRProfileScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PrProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Phone change states
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneStep, setPhoneStep] = useState<'input' | 'otp'>('input');
  const [newPhonePrefix, setNewPhonePrefix] = useState('+39');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);

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
      const profileData = await api.getPrProfile();
      setProfile(profileData);
      setDisplayName(profileData?.displayName || '');
      setEmail(profileData?.email || '');
    } catch (error) {
      console.error('Error loading PR profile:', error);
    } finally {
      setIsLoading(false);
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

  const openPhoneModal = () => {
    setNewPhoneNumber(profile?.phone || '');
    setNewPhonePrefix(profile?.phonePrefix || '+39');
    setOtpCode('');
    setPhoneStep('input');
    setShowPhoneModal(true);
    triggerHaptic('light');
  };

  const handleRequestPhoneOtp = async () => {
    if (!newPhoneNumber || newPhoneNumber.length < 9) {
      Alert.alert('Errore', 'Inserisci un numero di telefono valido');
      return;
    }
    
    setPhoneLoading(true);
    try {
      const result = await api.requestPrPhoneChange(newPhoneNumber, newPhonePrefix);
      
      if (result.samePhone) {
        triggerHaptic('success');
        Alert.alert('Confermato', 'Il numero di telefono è già corretto');
        setShowPhoneModal(false);
        return;
      }
      
      triggerHaptic('success');
      Alert.alert('OTP Inviato', 'Controlla il tuo nuovo numero per il codice');
      setPhoneStep('otp');
    } catch (error: any) {
      triggerHaptic('error');
      Alert.alert('Errore', error.message || 'Errore nell\'invio OTP');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!otpCode || otpCode.length < 4) {
      Alert.alert('Errore', 'Inserisci il codice OTP');
      return;
    }
    
    setPhoneLoading(true);
    try {
      await api.verifyPrPhoneChange(otpCode);
      triggerHaptic('success');
      Alert.alert('Successo', 'Numero di telefono aggiornato');
      await loadProfile();
      setShowPhoneModal(false);
      setPhoneStep('input');
    } catch (error: any) {
      triggerHaptic('error');
      Alert.alert('Errore', error.message || 'Codice OTP non valido');
    } finally {
      setPhoneLoading(false);
    }
  };

  const formatPhoneDisplay = (prefix?: string, phone?: string): string => {
    if (!phone) return '-';
    if (phone.startsWith('+')) return phone;
    return `${prefix || '+39'}${phone}`;
  };

  if (showLoader) {
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
          <Ionicons name="arrow-back" size={24} color={staticColors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Profilo PR</Text>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            setEditing(!editing);
          }}
          style={styles.editButton}
        >
          <Ionicons name={editing ? 'close' : 'create-outline'} size={24} color={staticColors.primary} />
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
            {profile?.displayName || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || '-'}
          </Text>
          <Badge variant="golden">
            <Text style={styles.prCodeBadge}>PR: {profile?.prCode}</Text>
          </Badge>
        </View>

        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>Informazioni Personali</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="person-outline" size={20} color={staticColors.mutedForeground} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Nome Completo</Text>
              <Text style={styles.infoValue}>{`${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || '-'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="call-outline" size={20} color={staticColors.mutedForeground} />
            </View>
            <View style={[styles.infoContent, { flex: 1 }]}>
              <Text style={styles.infoLabel}>Telefono</Text>
              <Text style={styles.infoValue}>{formatPhoneDisplay(profile?.phonePrefix, profile?.phone)}</Text>
            </View>
            <Pressable
              onPress={openPhoneModal}
              style={[styles.phoneEditBtn, { backgroundColor: `${staticColors.primary}15` }]}
              testID="button-change-phone"
            >
              <Ionicons name="create-outline" size={18} color={staticColors.primary} />
            </Pressable>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="at" size={20} color={staticColors.mutedForeground} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Nome Visualizzato</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Il tuo nome visibile"
                  placeholderTextColor={staticColors.mutedForeground}
                />
              ) : (
                <Text style={styles.infoValue}>{profile?.displayName || '-'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail-outline" size={20} color={staticColors.mutedForeground} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="La tua email"
                  placeholderTextColor={staticColors.mutedForeground}
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
              <Ionicons name="cash-outline" size={20} color={staticColors.teal} />
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
              <Ionicons name="trending-up" size={20} color={staticColors.teal} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Valore Commissione</Text>
              <Text style={[styles.infoValue, { color: staticColors.teal }]}>
                {profile?.commissionType === 'percentage'
                  ? `${profile?.commissionValue}%`
                  : `€${profile?.commissionValue}`}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color={staticColors.mutedForeground} />
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
            <Ionicons name="log-out-outline" size={20} color={staticColors.destructiveForeground} />
            <Text style={styles.logoutText}>Esci</Text>
          </View>
        </Button>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <Modal
        visible={showPhoneModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhoneModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContent, { backgroundColor: staticColors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: staticColors.foreground }]}>
                {phoneStep === 'input' ? 'Cambia Numero Telefono' : 'Verifica OTP'}
              </Text>
              <Pressable onPress={() => setShowPhoneModal(false)} testID="button-close-phone-modal">
                <Ionicons name="close" size={24} color={staticColors.mutedForeground} />
              </Pressable>
            </View>

            {phoneStep === 'input' ? (
              <>
                <Text style={[styles.modalDescription, { color: staticColors.mutedForeground }]}>
                  Inserisci il nuovo numero di telefono. Riceverai un codice OTP per verificare.
                </Text>
                <View style={styles.phonePrefixRow}>
                  <View style={styles.prefixContainer}>
                    <Input
                      label="Prefisso"
                      value={newPhonePrefix}
                      onChangeText={setNewPhonePrefix}
                      keyboardType="phone-pad"
                      testID="input-phone-prefix"
                    />
                  </View>
                  <View style={styles.phoneNumberContainer}>
                    <Input
                      label="Numero"
                      value={newPhoneNumber}
                      onChangeText={setNewPhoneNumber}
                      placeholder="333 1234567"
                      keyboardType="phone-pad"
                      testID="input-new-phone"
                    />
                  </View>
                </View>
                <Button
                  variant="golden"
                  size="lg"
                  onPress={handleRequestPhoneOtp}
                  loading={phoneLoading}
                  style={styles.modalButton}
                  testID="button-request-otp"
                >
                  Invia Codice OTP
                </Button>
              </>
            ) : (
              <>
                <Text style={[styles.modalDescription, { color: staticColors.mutedForeground }]}>
                  Inserisci il codice OTP inviato a {newPhonePrefix} {newPhoneNumber}
                </Text>
                <Input
                  label="Codice OTP"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder="123456"
                  keyboardType="number-pad"
                  maxLength={6}
                  testID="input-otp"
                />
                <Button
                  variant="golden"
                  size="lg"
                  onPress={handleVerifyPhoneOtp}
                  loading={phoneLoading}
                  style={styles.modalButton}
                  testID="button-verify-otp"
                >
                  Verifica e Salva
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onPress={() => setPhoneStep('input')}
                  style={styles.modalButton}
                  testID="button-back-to-input"
                >
                  Torna Indietro
                </Button>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
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
    color: staticColors.foreground,
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
    backgroundColor: staticColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '700',
    color: staticColors.primaryForeground,
  },
  profileName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  prCodeBadge: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  infoCard: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
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
    backgroundColor: staticColors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
    fontWeight: '500',
  },
  input: {
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: staticColors.border,
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
    color: staticColors.destructiveForeground,
  },
  phoneEditBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  modalDescription: {
    fontSize: typography.fontSize.base,
    marginBottom: spacing.lg,
  },
  phonePrefixRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  prefixContainer: {
    width: 100,
  },
  phoneNumberContainer: {
    flex: 1,
  },
  modalButton: {
    marginTop: spacing.md,
  },
});
