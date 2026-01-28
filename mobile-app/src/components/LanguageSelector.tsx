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
    flag: {
      fontSize: compact ? 18 : 24,
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
    languageFlag: {
      fontSize: 28,
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
        <Text style={styles.flag}>{currentLang?.flag}</Text>
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
                <Text style={styles.languageFlag}>{lang.flag}</Text>
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
