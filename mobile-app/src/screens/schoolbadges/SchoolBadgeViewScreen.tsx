import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

interface BadgeData {
  id: string;
  code: string;
  studentName: string;
  studentId: string;
  className: string;
  schoolName: string;
  photoUrl?: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  lastVerified?: string;
}

export function SchoolBadgeViewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [loading, setLoading] = useState(true);
  const [badgeData, setBadgeData] = useState<BadgeData | null>(null);

  const badgeCode = route.params?.badgeCode;

  useEffect(() => {
    const fetchBadgeData = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setBadgeData({
        id: '1',
        code: badgeCode || 'SCH-2024-00123',
        studentName: 'Marco Rossi',
        studentId: 'STU-2024-456',
        className: '3A Scientifico',
        schoolName: 'Liceo Scientifico G. Galilei',
        validFrom: '2024-09-01',
        validUntil: '2025-08-31',
        isActive: true,
        lastVerified: new Date().toISOString(),
      });
      setLoading(false);
    };

    fetchBadgeData();
  }, [badgeCode]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isExpired = () => {
    if (!badgeData) return false;
    return new Date(badgeData.validUntil) < new Date();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]} edges={['top', 'bottom', 'left', 'right']}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento badge...</Text>
      </SafeAreaView>
    );
  }

  if (!badgeData) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]} edges={['top', 'bottom', 'left', 'right']}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.destructive} />
        <Text style={styles.errorText}>Badge non trovato</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
          testID="button-back-error"
        >
          <Text style={styles.retryButtonText}>Torna Indietro</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          testID="button-back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dettagli Badge</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isLandscape && styles.scrollContentLandscape,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[
          isLandscape && styles.landscapeLayout,
          isTablet && styles.tabletLayout,
        ]}>
          <View style={[
            styles.leftColumn,
            (isLandscape || isTablet) && styles.leftColumnWide,
          ]}>
            <View style={[
              styles.statusBanner,
              badgeData.isActive && !isExpired() ? styles.statusValid : styles.statusInvalid
            ]}>
              <Ionicons
                name={badgeData.isActive && !isExpired() ? 'checkmark-circle' : 'close-circle'}
                size={24}
                color={badgeData.isActive && !isExpired() ? colors.success : colors.destructive}
              />
              <Text style={[
                styles.statusText,
                { color: badgeData.isActive && !isExpired() ? colors.success : colors.destructive }
              ]}>
                {badgeData.isActive && !isExpired() ? 'Badge Valido' : 'Badge Non Valido'}
              </Text>
            </View>

            <View style={[styles.profileCard, isTablet && styles.profileCardTablet]}>
              <View style={styles.avatarContainer}>
                {badgeData.photoUrl ? (
                  <Image source={{ uri: badgeData.photoUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={48} color={colors.mutedForeground} />
                  </View>
                )}
              </View>
              <Text style={styles.studentName}>{badgeData.studentName}</Text>
              <Text style={styles.studentId}>{badgeData.studentId}</Text>
              
              <View style={styles.badgeRow}>
                <View style={styles.badgePill}>
                  <Ionicons name="school" size={14} color={colors.primary} />
                  <Text style={styles.badgePillText}>{badgeData.className}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[
            styles.rightColumn,
            (isLandscape || isTablet) && styles.rightColumnWide,
          ]}>
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Informazioni Badge</Text>
              
              <View style={[styles.detailCard, isTablet && styles.detailCardTablet]}>
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="barcode" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Codice Badge</Text>
                    <Text style={styles.detailValue}>{badgeData.code}</Text>
                  </View>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="business" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Istituto</Text>
                    <Text style={styles.detailValue}>{badgeData.schoolName}</Text>
                  </View>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="calendar" size={20} color={colors.teal} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Valido dal</Text>
                    <Text style={styles.detailValue}>{formatDate(badgeData.validFrom)}</Text>
                  </View>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="calendar-outline" size={20} color={isExpired() ? colors.destructive : colors.teal} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Scadenza</Text>
                    <Text style={[styles.detailValue, isExpired() && styles.expiredText]}>
                      {formatDate(badgeData.validUntil)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {badgeData.lastVerified && (
              <View style={styles.verificationInfo}>
                <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
                <Text style={styles.verificationText}>
                  Ultima verifica: {formatDate(badgeData.lastVerified)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerLandscape: {
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  scrollContentLandscape: {
    paddingHorizontal: spacing.xl,
  },
  landscapeLayout: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  tabletLayout: {
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  leftColumn: {
    flex: 1,
  },
  leftColumnWide: {
    flex: 1,
    maxWidth: 400,
  },
  rightColumn: {
    flex: 1,
  },
  rightColumnWide: {
    flex: 1,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
  },
  statusValid: {
    backgroundColor: 'rgba(0, 206, 209, 0.1)',
  },
  statusInvalid: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileCardTablet: {
    padding: spacing['2xl'],
  },
  avatarContainer: {
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentName: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  studentId: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  badgePillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  detailsSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  detailCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailCardTablet: {
    padding: spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  expiredText: {
    color: colors.destructive,
  },
  detailDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
    marginLeft: 56,
  },
  verificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  verificationText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  loadingText: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    marginTop: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.foreground,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primaryForeground,
  },
});
