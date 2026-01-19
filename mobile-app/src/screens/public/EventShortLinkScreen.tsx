import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { api } from '../../lib/api';

type RouteParams = {
  EventShortLink: {
    shortCode: string;
  };
};

interface EventData {
  id: number;
  name: string;
}

export function EventShortLinkScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'EventShortLink'>>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const shortCode = route.params?.shortCode;

  const contentMaxWidth = isTablet ? 500 : undefined;

  useEffect(() => {
    if (!shortCode) {
      setError('Codice evento non valido');
      setLoading(false);
      return;
    }

    const fetchEvent = async () => {
      try {
        const event = await api.get<EventData>(`/api/events/shortlink/${shortCode}`);
        if (event && event.id) {
          navigation.replace('EventDetail', { eventId: event.id });
        } else {
          setError('Evento non trovato');
        }
      } catch (err: any) {
        setError(err.message || 'Impossibile caricare l\'evento');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [shortCode, navigation]);

  const handleGoHome = () => {
    navigation.navigate('Home');
  };

  const handleExploreEvents = () => {
    navigation.navigate('Events');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <View style={[
          styles.centerContent,
          isTablet && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
          isLandscape && styles.landscapeContent,
        ]} testID="container-loading">
          <View style={styles.loadingIconContainer} testID="container-loading-icon">
            <Ionicons name="calendar" size={48} color={colors.primary} />
          </View>
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} testID="indicator-loading" />
          <Text style={styles.loadingText} testID="text-loading">Caricamento evento...</Text>
          <Text style={styles.loadingSubtext} testID="text-loading-subtext">Attendere prego</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <View style={[
          styles.centerContent,
          isTablet && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
          isLandscape && styles.landscapeContent,
        ]} testID="container-error">
          <Card variant="glass" style={styles.errorCard} testID="card-error">
            <View style={styles.errorIconContainer}>
              <Ionicons name="alert-circle" size={64} color={colors.error} />
            </View>
            <Text style={styles.errorTitle} testID="text-error-title">Evento non trovato</Text>
            <Text style={styles.errorMessage} testID="text-error-message">{error}</Text>
            <Text style={styles.errorHint} testID="text-error-hint">
              Il link potrebbe essere scaduto o l'evento potrebbe non essere più disponibile.
            </Text>
          </Card>

          <View style={styles.actionsContainer}>
            <Button
              title="Esplora Eventi"
              variant="primary"
              onPress={handleExploreEvents}
              style={styles.actionButton}
              icon={<Ionicons name="search-outline" size={20} color={colors.primaryForeground} />}
              testID="button-explore-events"
            />
            <Button
              title="Torna alla Home"
              variant="outline"
              onPress={handleGoHome}
              style={styles.actionButton}
              icon={<Ionicons name="home-outline" size={20} color={colors.foreground} />}
              testID="button-go-home"
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  landscapeContent: {
    paddingHorizontal: spacing['2xl'],
  },
  loadingIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  loader: {
    marginBottom: spacing.lg,
  },
  loadingText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  loadingSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  errorCard: {
    padding: spacing['2xl'],
    alignItems: 'center',
    marginBottom: spacing.xl,
    width: '100%',
  },
  errorIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.error + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: fontSize.base,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  errorHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionsContainer: {
    width: '100%',
    gap: spacing.md,
  },
  actionButton: {
    width: '100%',
  },
});
