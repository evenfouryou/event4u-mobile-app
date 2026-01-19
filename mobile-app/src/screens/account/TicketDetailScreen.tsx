import React from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { api } from '../../lib/api';

interface TicketDetail {
  id: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventAddress: string;
  ticketType: string;
  ticketCode: string;
  status: 'valid' | 'used' | 'cancelled';
  holderName: string;
  holderFirstName: string | null;
  holderLastName: string | null;
  purchaseDate: string;
  price: number;
  canNameChange: boolean;
  canResale: boolean;
  isFromNameChange: boolean;
  fiscalSealCode: string | null;
  progressiveNumber: number | null;
  sectorName: string | null;
  ticketTypeCode: string | null;
  hoursToEvent: number | null;
}

type RouteParams = {
  TicketDetail: { ticketId: string };
};

export function TicketDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'TicketDetail'>>();
  const { ticketId } = route.params;
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['/api/public/account/tickets', ticketId],
    queryFn: () => api.get<TicketDetail>(`/api/public/account/tickets/${ticketId}`),
  });

  const statusColors = {
    valid: colors.success,
    used: colors.mutedForeground,
    cancelled: colors.destructive,
  };

  const statusLabels = {
    valid: 'Valido',
    used: 'Utilizzato',
    cancelled: 'Annullato',
  };

  if (isLoading || !ticket) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header 
          title="Dettaglio biglietto" 
          showBack 
          onBack={() => navigation.goBack()} 
          testID="header-ticket-detail"
        />
        <View style={styles.loadingContainer} testID="loading-container">
          <Text style={styles.loadingText} testID="text-loading">Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header 
        title="Dettaglio biglietto" 
        showBack 
        onBack={() => navigation.goBack()}
        testID="header-ticket-detail"
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          isTablet && styles.contentTablet,
          isLandscape && styles.contentLandscape,
        ]}
        testID="scroll-view-ticket-detail"
      >
        <View style={[
          styles.contentWrapper,
          isTablet && { maxWidth: 600, alignSelf: 'center', width: '100%' },
        ]}>
          <Card style={styles.qrCard} testID="card-qr-code">
            <View style={styles.qrHeader}>
              <View 
                style={[styles.statusBadge, { backgroundColor: statusColors[ticket.status] + '20' }]}
                testID={`badge-status-${ticket.status}`}
              >
                <View style={[styles.statusDot, { backgroundColor: statusColors[ticket.status] }]} />
                <Text style={[styles.statusText, { color: statusColors[ticket.status] }]}>
                  {statusLabels[ticket.status]}
                </Text>
              </View>
            </View>
            
            {ticket.status === 'valid' ? (
              <View style={styles.qrContainer} testID="container-qr-valid">
                <QRCode
                  value={ticket.ticketCode}
                  size={200}
                  backgroundColor="white"
                  color="black"
                />
                <Text style={styles.ticketCode} testID="text-ticket-code">{ticket.ticketCode}</Text>
              </View>
            ) : (
              <View style={styles.qrDisabled} testID="container-qr-disabled">
                <Ionicons 
                  name={ticket.status === 'used' ? 'checkmark-circle' : 'close-circle'} 
                  size={80} 
                  color={statusColors[ticket.status]} 
                />
                <Text style={styles.qrDisabledText} testID="text-qr-disabled">
                  {ticket.status === 'used' ? 'Biglietto già utilizzato' : 'Biglietto annullato'}
                </Text>
              </View>
            )}
          </Card>

          <Card style={styles.eventCard} testID="card-event-info">
            <Text style={styles.eventTitle} testID="text-event-title">{ticket.eventTitle}</Text>
            <Text style={styles.ticketType} testID="text-ticket-type">{ticket.ticketType}</Text>
            
            <View style={styles.divider} />
            
            <View style={styles.detailRow} testID="row-event-date">
              <Ionicons name="calendar-outline" size={20} color={colors.mutedForeground} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Data</Text>
                <Text style={styles.detailValue} testID="text-event-date">{ticket.eventDate}</Text>
              </View>
            </View>
            
            <View style={styles.detailRow} testID="row-event-time">
              <Ionicons name="time-outline" size={20} color={colors.mutedForeground} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Orario</Text>
                <Text style={styles.detailValue} testID="text-event-time">{ticket.eventTime}</Text>
              </View>
            </View>
            
            <View style={styles.detailRow} testID="row-event-location">
              <Ionicons name="location-outline" size={20} color={colors.mutedForeground} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Luogo</Text>
                <Text style={styles.detailValue} testID="text-event-location">{ticket.eventLocation}</Text>
                <Text style={styles.detailSubvalue} testID="text-event-address">{ticket.eventAddress}</Text>
              </View>
            </View>
          </Card>

          <Card style={styles.infoCard} testID="card-ticket-info">
            <Text style={styles.sectionTitle}>Informazioni biglietto</Text>
            
            <View style={styles.infoRow} testID="row-holder">
              <Text style={styles.infoLabel}>Intestatario</Text>
              <Text style={styles.infoValue} testID="text-holder-name">
                {ticket.isFromNameChange ? 'Dati riservati' : ticket.holderName}
              </Text>
            </View>
            
            {ticket.sectorName && (
              <View style={styles.infoRow} testID="row-sector">
                <Text style={styles.infoLabel}>Settore</Text>
                <Text style={styles.infoValue} testID="text-sector-name">{ticket.sectorName}</Text>
              </View>
            )}
            
            <View style={styles.infoRow} testID="row-purchase-date">
              <Text style={styles.infoLabel}>Data acquisto</Text>
              <Text style={styles.infoValue} testID="text-purchase-date">{ticket.purchaseDate}</Text>
            </View>
            
            <View style={styles.infoRow} testID="row-price">
              <Text style={styles.infoLabel}>Prezzo</Text>
              <Text style={styles.infoValue} testID="text-price">€{ticket.price.toFixed(2)}</Text>
            </View>
            
            {ticket.fiscalSealCode && (
              <View style={styles.infoRow} testID="row-fiscal-seal">
                <Text style={styles.infoLabel}>Contrassegno SIAE</Text>
                <Text style={styles.infoValue} testID="text-fiscal-seal">{ticket.fiscalSealCode}</Text>
              </View>
            )}
            
            {ticket.progressiveNumber && (
              <View style={styles.infoRow} testID="row-progressive-number">
                <Text style={styles.infoLabel}>Numero progressivo</Text>
                <Text style={styles.infoValue} testID="text-progressive-number">{ticket.progressiveNumber}</Text>
              </View>
            )}
          </Card>

          {ticket.status === 'valid' && !ticket.isFromNameChange && (
            <View style={styles.actions} testID="container-actions">
              {ticket.canNameChange && (
                <Button
                  title="Cambia nominativo"
                  variant="outline"
                  onPress={() => navigation.navigate('NameChange', { ticketId: ticket.id })}
                  icon={<Ionicons name="swap-horizontal-outline" size={20} color={colors.foreground} />}
                  testID="button-name-change"
                />
              )}
              {ticket.canResale && (
                <Button
                  title="Metti in vendita"
                  variant="primary"
                  onPress={() => navigation.navigate('ResaleListing', { ticketId: ticket.id })}
                  icon={<Ionicons name="pricetag-outline" size={20} color={colors.primaryForeground} />}
                  testID="button-resale"
                />
              )}
            </View>
          )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  contentTablet: {
    paddingHorizontal: spacing.xl,
  },
  contentLandscape: {
    paddingHorizontal: spacing.lg,
  },
  contentWrapper: {
    gap: spacing.md,
  },
  qrCard: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  qrHeader: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  qrContainer: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
  },
  ticketCode: {
    color: '#000',
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
    marginTop: spacing.md,
    letterSpacing: 2,
  },
  qrDisabled: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  qrDisabledText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    marginTop: spacing.md,
  },
  eventCard: {
    padding: spacing.lg,
  },
  eventTitle: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  ticketType: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginTop: 2,
  },
  detailSubvalue: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  infoCard: {
    padding: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  infoValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
