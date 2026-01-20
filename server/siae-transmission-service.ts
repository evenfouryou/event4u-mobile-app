/**
 * SIAE Transmission Service - Funzione centralizzata per creazione trasmissioni SIAE
 * 
 * Questo modulo centralizza la logica di creazione trasmissioni SIAE per:
 * - RCA (Riepilogo Controllo Accessi) - report evento
 * - RMG (Riepilogo Musica Generale) - report giornaliero
 * - RPM (Riepilogo Programmi Musicali) - report mensile
 * 
 * Conforme a Allegato B e C - Provvedimento Agenzia delle Entrate 04/03/2008
 */

import { createHash } from 'crypto';
import {
  generateRCAXml,
  generateC1Xml,
  generateSiaeFileName,
  type RCAParams,
  type RCAResult,
  type C1XmlParams,
  type C1XmlResult,
  type C1EventContext,
  type C1SubscriptionData,
  type SiaeEventForLog,
  type SiaeTicketForLog,
} from './siae-utils';
import { siaeStorage } from './siae-storage';
import type { SiaeTransmission, InsertSiaeTransmission } from '@shared/schema';

export type TransmissionReportType = 'rca' | 'rmg' | 'rpm' | 'daily' | 'monthly';

export interface CreateSiaeTransmissionParams {
  type: TransmissionReportType;
  companyId: string;
  eventId?: string;
  ticketedEventId?: string;
  reportDate: Date;
  systemCode: string;
  taxId: string;
  companyName: string;
  progressivo: number;
  isSubstitution?: boolean;
  originalTransmissionId?: string;
  rcaParams?: Omit<RCAParams, 'progressivo'>;
  c1Params?: {
    events: C1EventContext[];
    subscriptions?: C1SubscriptionData[];
  };
}

export interface CreateSiaeTransmissionResult {
  success: boolean;
  transmission?: SiaeTransmission;
  xml: string;
  fileName: string;
  stats: TransmissionStats;
  errors: string[];
  warnings: string[];
}

export interface TransmissionStats {
  ticketCount: number;
  totalRevenue: number;
  cancelledCount: number;
  eventsCount: number;
  subscriptionsCount: number;
}

function normalizeReportType(type: TransmissionReportType): 'rca' | 'giornaliero' | 'mensile' {
  switch (type) {
    case 'rca':
      return 'rca';
    case 'rmg':
    case 'daily':
      return 'giornaliero';
    case 'rpm':
    case 'monthly':
      return 'mensile';
    default:
      return 'rca';
  }
}

function getTransmissionType(type: TransmissionReportType): string {
  switch (type) {
    case 'rca':
      return 'rca';
    case 'rmg':
    case 'daily':
      return 'daily';
    case 'rpm':
    case 'monthly':
      return 'monthly';
    default:
      return 'daily';
  }
}

function calculateFileHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Funzione centralizzata per la creazione di trasmissioni SIAE con XML
 * 
 * Genera l'XML appropriato (RCA o C1), il nome file conforme Allegato C,
 * e crea il record di trasmissione nel database.
 * 
 * @param params - Parametri unificati per la creazione
 * @returns Oggetto con trasmissione, XML, fileName e statistiche
 */
export async function createSiaeTransmissionWithXml(
  params: CreateSiaeTransmissionParams
): Promise<CreateSiaeTransmissionResult> {
  const {
    type,
    companyId,
    eventId,
    ticketedEventId,
    reportDate,
    systemCode,
    taxId,
    companyName,
    progressivo,
    isSubstitution = false,
    originalTransmissionId,
    rcaParams,
    c1Params,
  } = params;

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!systemCode || systemCode.length !== 8) {
    errors.push(`Codice sistema SIAE non valido (8 caratteri richiesti). Ricevuto: "${systemCode}"`);
    return {
      success: false,
      xml: '',
      fileName: '',
      stats: { ticketCount: 0, totalRevenue: 0, cancelledCount: 0, eventsCount: 0, subscriptionsCount: 0 },
      errors,
      warnings,
    };
  }

  const normalizedType = normalizeReportType(type);
  const transmissionType = getTransmissionType(type);

  let xml = '';
  let stats: TransmissionStats = {
    ticketCount: 0,
    totalRevenue: 0,
    cancelledCount: 0,
    eventsCount: 0,
    subscriptionsCount: 0,
  };

  try {
    if (normalizedType === 'rca') {
      if (!rcaParams) {
        errors.push('rcaParams obbligatori per report RCA');
        return {
          success: false,
          xml: '',
          fileName: '',
          stats,
          errors,
          warnings,
        };
      }

      const rcaResult: RCAResult = generateRCAXml({
        ...rcaParams,
        progressivo,
      });

      if (!rcaResult.success) {
        return {
          success: false,
          xml: '',
          fileName: '',
          stats,
          errors: rcaResult.errors,
          warnings: rcaResult.warnings,
        };
      }

      xml = rcaResult.xml;
      stats = {
        ticketCount: rcaResult.ticketCount,
        totalRevenue: rcaResult.activeGrossAmount,
        cancelledCount: rcaResult.cancelledCount,
        eventsCount: 1,
        subscriptionsCount: 0,
      };
      warnings.push(...rcaResult.warnings);

    } else {
      if (!c1Params) {
        errors.push('c1Params obbligatori per report RMG/RPM');
        return {
          success: false,
          xml: '',
          fileName: '',
          stats,
          errors,
          warnings,
        };
      }

      const c1XmlParams: C1XmlParams = {
        reportKind: normalizedType,
        companyId,
        reportDate,
        resolvedSystemCode: systemCode,
        progressivo,
        taxId,
        businessName: companyName,
        events: c1Params.events,
        subscriptions: c1Params.subscriptions,
      };

      const c1Result: C1XmlResult = generateC1Xml(c1XmlParams);

      xml = c1Result.xml;
      stats = {
        ticketCount: c1Result.stats.ticketsCount,
        totalRevenue: c1Result.stats.totalRevenue,
        cancelledCount: 0,
        eventsCount: c1Result.stats.eventsCount,
        subscriptionsCount: c1Result.stats.subscriptionsCount,
      };
    }
  } catch (error: any) {
    errors.push(`Errore generazione XML: ${error.message}`);
    return {
      success: false,
      xml: '',
      fileName: '',
      stats,
      errors,
      warnings,
    };
  }

  let fileName: string;
  try {
    fileName = generateSiaeFileName(normalizedType, reportDate, progressivo, null);
  } catch (error: any) {
    errors.push(`Errore generazione nome file: ${error.message}`);
    return {
      success: false,
      xml,
      fileName: '',
      stats,
      errors,
      warnings,
    };
  }

  const fileHash = calculateFileHash(xml);

  const transmissionData: InsertSiaeTransmission = {
    companyId,
    ticketedEventId: ticketedEventId || null,
    transmissionType,
    periodDate: reportDate,
    fileName,
    fileContent: xml,
    fileHash,
    systemCode,
    status: 'pending',
    progressivoInvio: progressivo,
    codiceIntervento: isSubstitution ? 'COR' : 'ORD',
    riferimentoTrasmissioneOriginale: originalTransmissionId || null,
  };

  let transmission: SiaeTransmission;
  try {
    transmission = await siaeStorage.createSiaeTransmission(transmissionData);
  } catch (error: any) {
    errors.push(`Errore salvataggio trasmissione: ${error.message}`);
    return {
      success: false,
      xml,
      fileName,
      stats,
      errors,
      warnings,
    };
  }

  console.log(`[SIAE-Service] Trasmissione creata: ${transmission.id}, tipo=${transmissionType}, file=${fileName}`);

  return {
    success: true,
    transmission,
    xml,
    fileName,
    stats,
    errors,
    warnings,
  };
}

export {
  type RCAParams,
  type RCAResult,
  type C1XmlParams,
  type C1XmlResult,
  type C1EventContext,
  type C1SubscriptionData,
  type SiaeEventForLog,
  type SiaeTicketForLog,
};
