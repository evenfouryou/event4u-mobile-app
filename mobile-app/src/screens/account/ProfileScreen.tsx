import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Avatar } from '@/components/Avatar';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api from '@/lib/api';

interface ProfileScreenProps {
  onBack: () => void;
}

export function ProfileScreen({ onBack }: ProfileScreenProps) {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  
  // Phone change states
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneStep, setPhoneStep] = useState<'input' | 'otp'>('input');
  const [newPhonePrefix, setNewPhonePrefix] = useState('+39');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    triggerHaptic('medium');

    setTimeout(() => {
      triggerHaptic('success');
      setIsEditing(false);
      setLoading(false);
      Alert.alert('Successo', 'Profilo aggiornato con successo');
    }, 1500);
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    setIsEditing(false);
    triggerHaptic('light');
  };

  const openPhoneModal = () => {
    setNewPhoneNumber(user?.phone || '');
    setNewPhonePrefix('+39');
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
      const result = await api.requestPhoneChange(newPhoneNumber, newPhonePrefix);
      
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
      await api.verifyPhoneChange(otpCode);
      triggerHaptic('success');
      Alert.alert('Successo', 'Numero di telefono aggiornato');
      setFormData(prev => ({ ...prev, phone: newPhoneNumber }));
      setShowPhoneModal(false);
      setPhoneStep('input');
    } catch (error: any) {
      triggerHaptic('error');
      Alert.alert('Errore', error.message || 'Codice OTP non valido');
    } finally {
      setPhoneLoading(false);
    }
  };

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        title="Profilo"
        showBack
        onBack={onBack}
        rightElement={
          !isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              onPress={() => {
                triggerHaptic('light');
                setIsEditing(true);
              }}
              testID="button-edit-profile"
            >
              <Ionicons name="pencil" size={18} color={staticColors.primary} />
            </Button>
          ) : null
        }
        testID="header-profile"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarSection}>
            <Avatar
              name={`${formData.firstName} ${formData.lastName}`}
              size="xl"
              testID="avatar-profile"
            />
            <Text style={[styles.userName, { color: staticColors.foreground }]}>
              {formData.firstName} {formData.lastName}
            </Text>
            <Text style={[styles.userEmail, { color: staticColors.mutedForeground }]}>{formData.email}</Text>
          </View>

          <Card style={styles.formCard}>
            <Text style={[styles.sectionTitle, { color: staticColors.foreground }]}>Informazioni Personali</Text>

            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Input
                  label="Nome"
                  value={formData.firstName}
                  onChangeText={(v) => updateField('firstName', v)}
                  placeholder="Nome"
                  editable={isEditing}
                  leftIcon="person-outline"
                  testID="input-firstName"
                />
              </View>
              <View style={styles.formHalf}>
                <Input
                  label="Cognome"
                  value={formData.lastName}
                  onChangeText={(v) => updateField('lastName', v)}
                  placeholder="Cognome"
                  editable={isEditing}
                  testID="input-lastName"
                />
              </View>
            </View>

            <Input
              label="Email"
              value={formData.email}
              onChangeText={(v) => updateField('email', v)}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={isEditing}
              leftIcon="mail-outline"
              testID="input-email"
            />

            <View style={styles.phoneRow}>
              <View style={styles.phoneInput}>
                <Input
                  label="Telefono"
                  value={formData.phone ? `${newPhonePrefix} ${formData.phone}` : ''}
                  placeholder="+39 123 456 7890"
                  keyboardType="phone-pad"
                  editable={false}
                  leftIcon="call-outline"
                  testID="input-phone"
                />
              </View>
              <Pressable
                onPress={openPhoneModal}
                style={[styles.phoneEditButton, { backgroundColor: `${staticColors.primary}15` }]}
                testID="button-change-phone"
              >
                <Ionicons name="create-outline" size={20} color={staticColors.primary} />
              </Pressable>
            </View>
          </Card>

          <Card style={styles.infoCard}>
            <Text style={[styles.sectionTitle, { color: staticColors.foreground }]}>Informazioni Account</Text>
            
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: `${staticColors.primary}15` }]}>
                <Ionicons name="calendar-outline" size={20} color={staticColors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: staticColors.mutedForeground }]}>Membro dal</Text>
                <Text style={[styles.infoValue, { color: staticColors.foreground }]}>Gennaio 2026</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: staticColors.border }]} />

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: `${staticColors.primary}15` }]}>
                <Ionicons name="ticket-outline" size={20} color={staticColors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: staticColors.mutedForeground }]}>Biglietti acquistati</Text>
                <Text style={[styles.infoValue, { color: staticColors.foreground }]}>12</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: staticColors.border }]} />

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: `${staticColors.primary}15` }]}>
                <Ionicons name="star-outline" size={20} color={staticColors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: staticColors.mutedForeground }]}>Livello fedeltà</Text>
                <Text style={[styles.infoValue, { color: staticColors.foreground }]}>Gold Member</Text>
              </View>
            </View>
          </Card>

          {isEditing && (
            <View style={styles.buttonRow}>
              <Button
                variant="outline"
                size="lg"
                onPress={handleCancel}
                style={styles.cancelButton}
                testID="button-cancel"
              >
                Annulla
              </Button>
              <Button
                variant="golden"
                size="lg"
                onPress={handleSave}
                loading={loading}
                style={styles.saveButton}
                testID="button-save"
              >
                Salva Modifiche
              </Button>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

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
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  userName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    marginTop: spacing.md,
  },
  userEmail: {
    fontSize: typography.fontSize.base,
    marginTop: spacing.xs,
  },
  formCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formHalf: {
    flex: 1,
  },
  infoCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  phoneInput: {
    flex: 1,
  },
  phoneEditButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
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

export default ProfileScreen;
