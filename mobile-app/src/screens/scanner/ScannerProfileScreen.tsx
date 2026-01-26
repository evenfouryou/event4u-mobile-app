import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';

interface ScannerProfileScreenProps {
  onBack: () => void;
  onLogout: () => void;
}

export function ScannerProfileScreen({ onBack, onLogout }: ScannerProfileScreenProps) {
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

  const handleLogout = async () => {
    triggerHaptic('medium');
    await logout();
    onLogout();
  };

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        title="Profilo Scanner"
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
        testID="header-scanner-profile"
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
              testID="avatar-scanner-profile"
            />
            <Text style={[styles.userName, { color: colors.foreground }]}>
              {formData.firstName} {formData.lastName}
            </Text>
            <Badge variant="teal" style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>SCANNER</Text>
            </Badge>
            <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{formData.email}</Text>
          </View>

          <Card style={styles.formCard}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Informazioni Personali</Text>

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

          {isEditing ? (
            <View style={styles.editActions}>
              <Button
                variant="outline"
                onPress={handleCancel}
                style={styles.cancelButton}
                testID="button-cancel"
              >
                Annulla
              </Button>
              <Button
                variant="default"
                onPress={handleSave}
                loading={loading}
                style={styles.saveButton}
                testID="button-save"
              >
                Salva
              </Button>
            </View>
          ) : (
            <Button
              variant="outline"
              onPress={handleLogout}
              style={styles.logoutButton}
              testID="button-logout"
            >
              <View style={styles.logoutContent}>
                <Ionicons name="log-out-outline" size={20} color={staticColors.destructive} />
                <Text style={styles.logoutText}>Esci</Text>
              </View>
            </Button>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  userName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    marginTop: spacing.md,
  },
  roleBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  roleBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: staticColors.primaryForeground,
  },
  userEmail: {
    fontSize: typography.fontSize.base,
  },
  formCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formHalf: {
    flex: 1,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  logoutButton: {
    borderColor: staticColors.destructive,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoutText: {
    color: staticColors.destructive,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
});
