import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
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
  purchaseDate: string;
  price: number;
  canTransfer: boolean;
  canResale: boolean;
}

type RouteParams = {
  TicketDetail: { ticketId: string };
};

export function TicketDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'TicketDetail'>>();
  const insets = useSafeAreaInsets();
  const { ticketId } = route.params;

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['/api/tickets', ticketId],
    queryFn: () => api.get<TicketDetail>(`/api/tickets/${ticketId}`),
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
      <View style={styles.container}>
        <Header title="Dettaglio biglietto" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        title="Dettaglio biglietto" 
        showBack 
        onBack={() => navigation.goBack()} 
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        <Card style={styles.qrCard}>
          <View style={styles.qrHeader}>
            <View style={[styles.statusBadge, { backgroundColor: statusColors[ticket.status] + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColors[ticket.status] }]} />
              <Text style={[styles.statusText, { color: statusColors[ticket.status] }]}>
                {statusLabels[ticket.status]}
              </Text>
            </View>
          </View>
          
          {ticket.status === 'valid' ? (
            <View style={styles.qrContainer}>
              <QRCode
                value={ticket.ticketCode}
                size={200}
                backgroundColor="white"
                color="black"
              />
              <Text style={styles.ticketCode}>{ticket.ticketCode}</Text>
            </View>
          ) : (
            <View style={styles.qrDisabled}>
              <Ionicons 
                name={ticket.status === 'used' ? 'checkmark-circle' : 'close-circle'} 
                size={80} 
                color={statusColors[ticket.status]} 
              />
              <Text style={styles.qrDisabledText}>
                {ticket.status === 'used' ? 'Biglietto già utilizzato' : 'Biglietto annullato'}
              </Text>
            </View>
          )}
        </Card>

        <Card style={styles.eventCard}>
          <Text style={styles.eventTitle}>{ticket.eventTitle}</Text>
          <Text style={styles.ticketType}>{ticket.ticketType}</Text>
          
          <View style={styles.divider} />
          
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.mutedForeground} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Data</Text>
              <Text style={styles.detailValue}>{ticket.eventDate}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color={colors.mutedForeground} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Orario</Text>
              <Text style={styles.detailValue}>{ticket.eventTime}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color={colors.mutedForeground} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Luogo</Text>
              <Text style={styles.detailValue}>{ticket.eventLocation}</Text>
              <Text style={styles.detailSubvalue}>{ticket.eventAddress}</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Informazioni biglietto</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Intestatario</Text>
            <Text style={styles.infoValue}>{ticket.holderName}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Data acquisto</Text>
            <Text style={styles.infoValue}>{ticket.purchaseDate}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Prezzo</Text>
            <Text style={styles.infoValue}>€{ticket.price.toFixed(2)}</Text>
          </View>
        </Card>

        {ticket.status === 'valid' && (
          <View style={styles.actions}>
            {ticket.canTransfer && (
              <Button
                title="Cambia nominativo"
                variant="outline"
                onPress={() => navigation.navigate('NameChange', { ticketId: ticket.id })}
                icon={<Ionicons name="swap-horizontal-outline" size={20} color={colors.foreground} />}
              />
            )}
            {ticket.canResale && (
              <Button
                title="Metti in vendita"
                variant="primary"
                onPress={() => navigation.navigate('ResaleListing', { ticketId: ticket.id })}
                icon={<Ionicons name="pricetag-outline" size={20} color={colors.primaryForeground} />}
              />
            )}
          </View>
        )}
      </ScrollView>
    </View>
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
