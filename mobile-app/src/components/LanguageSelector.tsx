import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage, LANGUAGES, LanguageCode } from '@/contexts/LanguageContext';
import { spacing, typography, borderRadius } from '@/lib/theme';
import { triggerHaptic } from '@/lib/haptics';

interface LanguageSelectorProps {
  compact?: boolean;
}

export function LanguageSelector({ compact = false }: LanguageSelectorProps) {
  const { colors } = useTheme();
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);

  const currentLang = LANGUAGES.find(l => l.code === currentLanguage);

  const handleSelectLanguage = async (code: LanguageCode) => {
    triggerHaptic('medium');
    await changeLanguage(code);
    setModalVisible(false);
  };

  const styles = StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    buttonCompact: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    isoCodeBadge: {
      backgroundColor: `${colors.primary}20`,
      paddingHorizontal: compact ? 6 : 8,
      paddingVertical: compact ? 2 : 4,
      borderRadius: borderRadius.sm,
    },
    isoCodeText: {
      fontSize: compact ? typography.fontSize.xs : typography.fontSize.sm,
      fontWeight: '700',
      color: colors.primary,
    },
    langName: {
      fontSize: compact ? typography.fontSize.sm : typography.fontSize.base,
      color: colors.foreground,
      fontWeight: '500',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      width: '80%',
      maxWidth: 300,
    },
    modalTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: '700',
      color: colors.foreground,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    languageOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      gap: spacing.md,
    },
    languageOptionSelected: {
      backgroundColor: `${colors.primary}20`,
    },
    languageIsoBadge: {
      backgroundColor: `${colors.primary}20`,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: borderRadius.sm,
      minWidth: 44,
      alignItems: 'center',
    },
    languageIsoText: {
      fontSize: typography.fontSize.base,
      fontWeight: '700',
      color: colors.primary,
    },
    languageName: {
      fontSize: typography.fontSize.base,
      color: colors.foreground,
      fontWeight: '500',
      flex: 1,
    },
    checkIcon: {
      marginLeft: 'auto',
    },
    closeButton: {
      marginTop: spacing.lg,
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    closeButtonText: {
      fontSize: typography.fontSize.base,
      color: colors.mutedForeground,
    },
  });

  return (
    <>
      <Pressable
        style={[styles.button, compact && styles.buttonCompact]}
        onPress={() => {
          triggerHaptic('light');
          setModalVisible(true);
        }}
        testID="button-language-selector"
      >
        <View style={styles.isoCodeBadge}>
          <Text style={styles.isoCodeText}>{currentLang?.isoCode}</Text>
        </View>
        {!compact && <Text style={styles.langName}>{currentLang?.name}</Text>}
        <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('languages.selectLanguage')}</Text>
            
            {LANGUAGES.map((lang) => (
              <Pressable
                key={lang.code}
                style={[
                  styles.languageOption,
                  currentLanguage === lang.code && styles.languageOptionSelected,
                ]}
                onPress={() => handleSelectLanguage(lang.code)}
                testID={`button-language-${lang.code}`}
              >
                <View style={styles.languageIsoBadge}>
                  <Text style={styles.languageIsoText}>{lang.isoCode}</Text>
                </View>
                <Text style={styles.languageName}>{lang.name}</Text>
                {currentLanguage === lang.code && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={colors.primary}
                    style={styles.checkIcon}
                  />
                )}
              </Pressable>
            ))}

            <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>{t('common.close')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
