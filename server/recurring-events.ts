import { randomUUID } from 'crypto';
import type { Event } from '../shared/schema';

export interface RecurringEventParams {
  baseEvent: Partial<Event>;
  pattern: 'daily' | 'weekly' | 'monthly';
  interval: number;
  count?: number;
  endDate?: Date;
  generateWindowDays?: number; // Default 90 days
}

export interface GeneratedEvent {
  companyId: string;
  locationId: string;
  name: string;
  startDatetime: Date;
  endDatetime: Date;
  capacity?: number | null;
  status: string;
  priceListId?: string | null;
  actualRevenue?: string | null;
  notes?: string | null;
  seriesId: string;
  isRecurring: boolean;
  recurrencePattern: string;
  recurrenceInterval: number;
  recurrenceCount?: number | null;
  recurrenceEndDate?: Date | null;
  parentEventId?: string | null;
}

export function generateRecurringEvents(params: RecurringEventParams): GeneratedEvent[] {
  const {
    baseEvent,
    pattern,
    interval,
    count,
    endDate,
    generateWindowDays = 90
  } = params;

  if (!baseEvent.startDatetime || !baseEvent.endDatetime) {
    throw new Error('Base event must have startDatetime and endDatetime');
  }

  const seriesId = randomUUID();
  const events: GeneratedEvent[] = [];
  const startDate = new Date(baseEvent.startDatetime);
  const endDateTime = new Date(baseEvent.endDatetime);
  const eventDuration = endDateTime.getTime() - startDate.getTime();
  
  // Calculate max generation date relative to series start, not current time
  // This ensures we always include the first occurrence even if it's far in future
  const maxGenerateDate = new Date(startDate);
  maxGenerateDate.setDate(maxGenerateDate.getDate() + generateWindowDays);

  let currentDate = new Date(startDate);
  let occurrenceIndex = 0;

  while (true) {
    // Check if we've reached count limit
    if (count !== undefined && occurrenceIndex >= count) {
      break;
    }

    // Check if we've reached end date
    if (endDate && currentDate > endDate) {
      break;
    }

    // Check if we've reached generation window limit (relative to series start)
    if (occurrenceIndex > 0 && currentDate > maxGenerateDate) {
      break;
    }

    // Calculate end datetime for this occurrence
    const occurrenceEndDate = new Date(currentDate.getTime() + eventDuration);

    // Create event occurrence (omit id, createdAt, updatedAt as they're auto-generated)
    const eventOccurrence: GeneratedEvent = {
      companyId: baseEvent.companyId!,
      locationId: baseEvent.locationId!,
      name: baseEvent.name!,
      status: baseEvent.status || 'draft',
      capacity: baseEvent.capacity ?? null,
      priceListId: baseEvent.priceListId ?? null,
      actualRevenue: baseEvent.actualRevenue ?? null,
      notes: baseEvent.notes ?? null,
      seriesId,
      isRecurring: true, // All events in series are recurring
      recurrencePattern: pattern,
      recurrenceInterval: interval,
      recurrenceCount: count ?? null,
      recurrenceEndDate: endDate ?? null,
      parentEventId: null, // Will be set after first event is created
      startDatetime: new Date(currentDate),
      endDatetime: occurrenceEndDate,
    };

    events.push(eventOccurrence);
    occurrenceIndex++;

    // Calculate next occurrence date
    switch (pattern) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + interval);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (interval * 7));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + interval);
        break;
      default:
        throw new Error(`Unknown recurrence pattern: ${pattern}`);
    }
  }

  return events;
}

export function shouldRegenerateEvents(
  existingEvents: Event[],
  generateWindowDays: number = 90
): boolean {
  if (existingEvents.length === 0) {
    return true;
  }

  // Sort by start date
  const sortedEvents = [...existingEvents].sort(
    (a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
  );

  const lastEvent = sortedEvents[sortedEvents.length - 1];
  const lastEventDate = new Date(lastEvent.startDatetime);
  
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + 30); // Regenerate if last event is within 30 days

  return lastEventDate < thresholdDate;
}

export function getSeriesEndCondition(
  count?: number,
  endDate?: Date
): { type: 'count' | 'date' | 'never'; value?: number | Date } {
  if (count !== undefined && count > 0) {
    return { type: 'count', value: count };
  }
  if (endDate) {
    return { type: 'date', value: endDate };
  }
  return { type: 'never' };
}
