import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Avatar } from '@/components/Avatar';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { triggerHaptic } from '@/lib/haptics';

interface ProfileScreenProps {
  onBack: () => void;
}

export function ProfileScreen({ onBack }: ProfileScreenProps) {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

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

  return (
    <SafeArea style={styles.container}>
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
              <Ionicons name="pencil" size={18} color={colors.primary} />
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
            <Text style={styles.userName}>
              {formData.firstName} {formData.lastName}
            </Text>
            <Text style={styles.userEmail}>{formData.email}</Text>
          </View>

          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Informazioni Personali</Text>

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

            <Input
              label="Telefono"
              value={formData.phone}
              onChangeText={(v) => updateField('phone', v)}
              placeholder="+39 123 456 7890"
              keyboardType="phone-pad"
              editable={isEditing}
              leftIcon="call-outline"
              testID="input-phone"
            />
          </Card>

          <Card style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Informazioni Account</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Membro dal</Text>
                <Text style={styles.infoValue}>Gennaio 2026</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="ticket-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Biglietti acquistati</Text>
                <Text style={styles.infoValue}>12</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="star-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Livello fedeltà</Text>
                <Text style={styles.infoValue}>Gold Member</Text>
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
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.foreground,
    marginTop: spacing.md,
  },
  userEmail: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  formCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
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
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
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
});

export default ProfileScreen;
