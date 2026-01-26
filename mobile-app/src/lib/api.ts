const API_BASE_URL = 'https://manage.eventfouryou.com';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

export interface PublicEvent {
  id: string;
  eventId: string;
  eventName: string;
  eventImageUrl: string | null;
  eventStart: string;
  eventEnd: string;
  locationId: string;
  locationName: string;
  locationAddress: string | null;
  locationLatitude: number | null;
  locationLongitude: number | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  totalCapacity: number | null;
  ticketsSold: number;
  ticketingStatus: string;
  saleStartDate: string | null;
  saleEndDate: string | null;
  maxTicketsPerUser: number | null;
  requiresNominative: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  availableTickets: number;
  distance?: number | null;
}

export interface PublicEventDetail extends PublicEvent {
  sectors: Array<{
    id: string;
    name: string;
    price: number;
    capacity: number;
    sold: number;
    available: number;
  }>;
}

export interface Ticket {
  id: string;
  ticketCode: string;
  ticketType: string;
  ticketPrice: number;
  participantFirstName: string | null;
  participantLastName: string | null;
  status: string;
  emissionDate: string | null;
  emittedAt: string | null;
  qrCode: string | null;
  sectorName: string | null;
  eventName: string | null;
  eventStart: string | null;
  eventEnd: string | null;
  locationName: string | null;
  ticketedEventId: string;
}

export interface TicketsResponse {
  upcoming: Ticket[];
  past: Ticket[];
  cancelled?: Ticket[];
  total: number;
}

export interface Wallet {
  id: string;
  balance: number;
  currency: string;
  isActive: boolean;
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
  status: string;
}

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  fiscalCode: string | null;
  birthDate: string | null;
  gender: string | null;
  isVerified: boolean;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
}

export interface WalletTopUpConfirmResponse {
  success: boolean;
  transaction: WalletTransaction;
  newBalance: string;
}

export interface CheckoutPaymentIntentResponse {
  clientSecret: string;
  checkoutSessionId: string;
  totalAmount: number;
  currency: string;
}

export interface StripeConfigResponse {
  publishableKey: string;
}

export interface PrProfile {
  id: string;
  companyId: string;
  userId?: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  displayName?: string | null;
  prCode: string;
  commissionType?: string;
  commissionValue?: string;
  status?: string;
  createdAt?: string;
}

export interface PrWallet {
  balance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalPaidOut: number;
}

export interface PrTransaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
  status: string;
}

export interface PrEvent {
  id: string;
  eventId: string;
  eventName: string;
  eventImageUrl: string | null;
  eventStart: string;
  eventEnd: string;
  locationName: string;
  locationAddress?: string;
  guestCount?: number;
  tableCount?: number;
  ticketsSold?: number;
  earnings?: number;
  commission?: number;
}

export interface PrEventDetail extends PrEvent {
  prCode?: string;
}

export interface PrGuestList {
  id: string;
  name: string;
  listType: string;
  currentCount: number;
  maxCapacity: number | null;
}

export interface PrEventTable {
  id: string;
  name: string;
  capacity: number;
  minSpend: number | null;
  isBooked: boolean;
  booking?: {
    guestName: string;
    guestCount: number;
    status: string;
  };
}

export interface PrTicketStats {
  sold: number;
  revenue: number;
  commission: number;
}

export interface PrGuestListEntry {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  status: string;
  checkedInAt?: string;
}

class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.authToken) {
      requestHeaders['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  put<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  patch<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async getPublicEvents(params?: { limit?: number; offset?: number; categoryId?: string; userLat?: number; userLng?: number }): Promise<PublicEvent[]> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params?.userLat) queryParams.append('userLat', params.userLat.toString());
    if (params?.userLng) queryParams.append('userLng', params.userLng.toString());
    
    const query = queryParams.toString();
    return this.get<PublicEvent[]>(`/api/public/events${query ? `?${query}` : ''}`);
  }

  async getPublicEventById(id: string): Promise<PublicEventDetail> {
    return this.get<PublicEventDetail>(`/api/public/events/${id}`);
  }

  async getMyTickets(): Promise<TicketsResponse> {
    return this.get<TicketsResponse>('/api/public/account/tickets');
  }

  async getTicketById(id: string): Promise<Ticket> {
    return this.get<Ticket>(`/api/public/account/tickets/${id}`);
  }

  async getWallet(): Promise<Wallet> {
    return this.get<Wallet>('/api/public/account/wallet');
  }

  async getWalletTransactions(limit?: number): Promise<{ transactions: WalletTransaction[] }> {
    const query = limit ? `?limit=${limit}` : '';
    return this.get<{ transactions: WalletTransaction[] }>(`/api/public/account/wallet/transactions${query}`);
  }

  async getMe(): Promise<Customer> {
    return this.get<Customer>('/api/public/account/me');
  }

  async getStripePublishableKey(): Promise<StripeConfigResponse> {
    return this.get<StripeConfigResponse>('/api/public/stripe/config');
  }

  async createWalletTopUp(amount: number): Promise<PaymentIntentResponse> {
    return this.post<PaymentIntentResponse>('/api/public/account/wallet/topup', { amount });
  }

  async confirmWalletTopUp(paymentIntentId: string): Promise<WalletTopUpConfirmResponse> {
    return this.post<WalletTopUpConfirmResponse>('/api/public/account/wallet/topup/confirm', { paymentIntentId });
  }

  async createWalletTopUpCheckout(amount: number): Promise<{ checkoutUrl: string; sessionId: string; amount: number }> {
    return this.post<{ checkoutUrl: string; sessionId: string; amount: number }>('/api/public/account/wallet/topup-checkout', { 
      amount,
      successUrl: 'https://manage.eventfouryou.com/wallet/topup/success?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://manage.eventfouryou.com/wallet/topup/cancel',
    });
  }

  async confirmWalletTopUpCheckout(sessionId: string): Promise<WalletTopUpConfirmResponse> {
    return this.post<WalletTopUpConfirmResponse>('/api/public/account/wallet/topup-checkout/confirm', { sessionId });
  }

  // Mobile checkout with Stripe Checkout Sessions (hosted page)
  async createMobileCheckout(items: Array<{
    ticketedEventId: string;
    sectorId: string;
    ticketTypeId?: string;
    quantity: number;
    unitPrice: number;
  }>): Promise<{
    checkoutUrl: string;
    sessionId: string;
    subtotal: number;
    commissionAmount: number;
    total: number;
    items: any[];
  }> {
    return this.post('/api/public/mobile/checkout', {
      items,
      successUrl: 'https://manage.eventfouryou.com/checkout/success?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://manage.eventfouryou.com/checkout/cancel',
    });
  }

  async confirmMobileCheckout(sessionId: string): Promise<{
    success: boolean;
    status: string;
    paymentIntentId?: string;
    total?: number;
    items?: any[];
    message: string;
  }> {
    return this.post('/api/public/mobile/checkout/confirm', { sessionId });
  }

  async createCheckoutPaymentIntent(eventId: string, tickets: Array<{ sectorId: string; quantity: number }>, participantData?: any): Promise<CheckoutPaymentIntentResponse> {
    return this.post<CheckoutPaymentIntentResponse>('/api/public/checkout/create-payment-intent', {
      eventId,
      tickets,
      participantData,
    });
  }

  async confirmCheckout(checkoutSessionId: string, paymentIntentId: string): Promise<{ success: boolean; tickets: Ticket[] }> {
    return this.post<{ success: boolean; tickets: Ticket[] }>('/api/public/checkout/confirm', {
      checkoutSessionId,
      paymentIntentId,
    });
  }

  // PR API Methods
  async getPrProfile(): Promise<PrProfile | null> {
    try {
      return await this.get<PrProfile>('/api/pr/profile');
    } catch {
      return null;
    }
  }

  async getPrStats(): Promise<{
    totalGuests: number;
    totalTables: number;
    ticketsSold: number;
    totalRevenue: number;
    commissionEarned: number;
    activeEvents: number;
  }> {
    return this.get('/api/pr/stats');
  }

  async updatePrProfile(data: { displayName?: string; email?: string }): Promise<PrProfile> {
    return this.patch<PrProfile>('/api/pr/profile', data);
  }

  async getPrWallet(): Promise<PrWallet> {
    const result = await this.get<{
      totalEarnings: string;
      pendingEarnings: string;
      paidOutEarnings: string;
    }>('/api/pr/wallet');
    return {
      balance: Number(result.totalEarnings || 0) - Number(result.paidOutEarnings || 0),
      pendingBalance: Number(result.pendingEarnings || 0),
      totalEarnings: Number(result.totalEarnings || 0),
      totalPaidOut: Number(result.paidOutEarnings || 0),
    };
  }

  async getPrTransactions(): Promise<PrTransaction[]> {
    const rewards = await this.get<any[]>('/api/pr/rewards');
    return rewards.map((r: any) => ({
      id: r.id,
      type: 'reward',
      amount: Number(r.currentProgress || 0),
      description: r.name || 'Premio',
      createdAt: r.createdAt || new Date().toISOString(),
      status: r.isClaimed ? 'claimed' : 'pending',
    }));
  }

  async getPrEvents(): Promise<PrEvent[]> {
    const events = await this.get<any[]>('/api/pr/my-events');
    return events.map((e: any) => ({
      id: e.eventId,
      eventId: e.eventId,
      eventName: e.eventName,
      eventImageUrl: e.eventImageUrl || e.imageUrl || null,
      eventStart: e.eventStart,
      eventEnd: e.eventEnd,
      locationName: e.locationName,
      locationAddress: e.locationAddress,
      guestCount: e.guestCount || 0,
      tableCount: e.tableCount || 0,
      ticketsSold: e.ticketsSold || 0,
      earnings: e.earnings || 0,
      commission: e.commission || 0,
    }));
  }

  async getPrEventDetail(eventId: string): Promise<PrEventDetail> {
    const event = await this.get<any>(`/api/pr/events/${eventId}`);
    return {
      id: event.id,
      eventId: event.eventId || event.id,
      eventName: event.eventName || event.name,
      eventImageUrl: event.eventImageUrl || event.imageUrl || null,
      eventStart: event.eventStart || event.startDatetime,
      eventEnd: event.eventEnd || event.endDatetime,
      locationName: event.locationName || 'Location',
      locationAddress: event.locationAddress,
      guestCount: event.guestCount || 0,
      tableCount: event.tableCount || 0,
      ticketsSold: event.ticketsSold || 0,
      earnings: event.earnings || 0,
      commission: event.commission || 0,
      prCode: event.prCode,
    };
  }

  async getPrEventGuestLists(eventId: string): Promise<PrGuestList[]> {
    try {
      const result = await this.get<any>(`/api/pr/events/${eventId}/guest-lists`);
      const lists = Array.isArray(result) ? result : [];
      return lists.map((l: any) => ({
        id: l.id,
        name: l.name,
        listType: l.listType || 'default',
        currentCount: l.currentCount || 0,
        maxCapacity: l.maxCapacity,
      }));
    } catch {
      return [];
    }
  }

  async getPrEventTables(eventId: string): Promise<PrEventTable[]> {
    try {
      const result = await this.get<any>(`/api/pr/events/${eventId}/tables`);
      const tables = Array.isArray(result) ? result : [];
      return tables.map((t: any) => ({
        id: t.id,
        name: t.name,
        capacity: t.capacity || 0,
        minSpend: t.minSpend,
        isBooked: t.isBooked || false,
        booking: t.booking,
      }));
    } catch {
      return [];
    }
  }

  async getPrEventStats(eventId: string): Promise<PrTicketStats> {
    try {
      const result = await this.get<any>(`/api/pr/events/${eventId}/ticket-stats`);
      return {
        sold: result?.sold || 0,
        revenue: result?.revenue || 0,
        commission: result?.commission || 0,
      };
    } catch {
      return { sold: 0, revenue: 0, commission: 0 };
    }
  }

  async addPrGuestsBatch(listId: string, eventId: string, guests: Array<{ firstName: string; lastName: string; phone: string; gender?: string; email?: string; plusOnes?: number }>): Promise<{ created: PrGuestListEntry[]; errors: string[] }> {
    const result = await this.post<any>(`/api/pr/guest-lists/${listId}/entries/batch`, {
      entries: guests.map(g => ({ ...g, eventId })),
    });
    return {
      created: result.created || [],
      errors: result.errors || [],
    };
  }

  async bookPrTable(eventId: string, data: { tableId: string; customerName: string; customerPhone?: string; guestCount: number; notes?: string }): Promise<any> {
    return this.post<any>(`/api/pr/events/${eventId}/bookings`, data);
  }

  async getPrEventGuests(eventId: string): Promise<PrGuestListEntry[]> {
    const result = await this.get<any>(`/api/pr/events/${eventId}/guest-entries`);
    const entries = Array.isArray(result) ? result : (result?.entries || []);
    return entries.map((e: any) => ({
      id: e.id,
      firstName: e.firstName || '',
      lastName: e.lastName || '',
      phone: e.phone,
      email: e.email,
      status: e.status || 'pending',
      checkedInAt: e.checkedInAt,
    }));
  }

  async addPrGuest(eventId: string, data: { firstName: string; lastName: string; phone?: string; gender?: 'M' | 'F'; listId?: string }): Promise<PrGuestListEntry> {
    const result = await this.post<any>(`/api/pr/events/${eventId}/guests`, data);
    return {
      id: result.id,
      firstName: result.firstName || data.firstName,
      lastName: result.lastName || data.lastName,
      phone: result.phone || data.phone,
      email: result.email,
      status: result.status || 'pending',
    };
  }

  async requestPrPayout(): Promise<{ success: boolean; message: string }> {
    return this.post<{ success: boolean; message: string }>('/api/pr/wallet/payout');
  }
  
  async searchRegisteredUsers(query: string): Promise<Array<{ id: string; firstName: string; lastName: string; phone: string }>> {
    try {
      const results = await this.get<any[]>(`/api/users/search?q=${encodeURIComponent(query)}`);
      return (results || []).map(u => ({
        id: u.id || String(u.userId),
        firstName: u.firstName || u.first_name || '',
        lastName: u.lastName || u.last_name || '',
        phone: u.phone || u.phoneNumber || '',
      }));
    } catch (error) {
      return [];
    }
  }
  
  async getPrEventPrizes(eventId: string): Promise<Array<{ id: string; name: string; description?: string; quantity: number; claimed: number }>> {
    try {
      const results = await this.get<any[]>(`/api/pr/events/${eventId}/prizes`);
      return (results || []).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        quantity: p.quantity || 0,
        claimed: p.claimed || 0,
      }));
    } catch (error) {
      return [];
    }
  }
  
  async getPrEventLinks(eventId: string): Promise<Array<{ id: string; title: string; url: string; type: 'website' | 'instagram' | 'facebook' | 'tiktok' | 'spotify' | 'other' }>> {
    try {
      const results = await this.get<any[]>(`/api/pr/events/${eventId}/links`);
      return (results || []).map(l => ({
        id: l.id,
        title: l.title || l.name,
        url: l.url,
        type: l.type || 'other',
      }));
    } catch (error) {
      return [];
    }
  }

  // ==================== SCANNER API ====================
  
  async getScannerProfile(): Promise<ScannerProfile | null> {
    try {
      return await this.get<ScannerProfile>('/api/e4u/scanner/profile');
    } catch (error) {
      return null;
    }
  }

  async getScannerEvents(): Promise<ScannerEvent[]> {
    try {
      const results = await this.get<any[]>('/api/e4u/scanner/events');
      return (results || []).map(e => ({
        id: e.id,
        eventId: e.eventId,
        eventName: e.eventName || e.event?.name,
        eventImageUrl: e.eventImageUrl || e.event?.imageUrl,
        eventStart: e.eventStart || e.event?.startDate,
        eventEnd: e.eventEnd || e.event?.endDate,
        locationName: e.locationName || e.event?.location?.name,
        locationAddress: e.locationAddress || e.event?.location?.address,
        canScanLists: e.canScanLists ?? true,
        canScanTables: e.canScanTables ?? true,
        canScanTickets: e.canScanTickets ?? true,
        totalGuests: e.totalGuests || 0,
        checkedIn: e.checkedIn || 0,
      }));
    } catch (error) {
      return [];
    }
  }

  async getScannerEventDetails(eventId: string): Promise<ScannerEventDetails | null> {
    try {
      return await this.get<ScannerEventDetails>(`/api/e4u/scanner/events/${eventId}`);
    } catch (error) {
      return null;
    }
  }

  async getScannerStats(): Promise<ScannerStats> {
    try {
      return await this.get<ScannerStats>('/api/e4u/scanner/stats');
    } catch (error) {
      return { totalScans: 0, todayScans: 0, eventsAssigned: 0 };
    }
  }

  async scanEntry(eventId: string, code: string): Promise<ScanResult> {
    return this.post<ScanResult>('/api/reservations/scan', { eventId, code });
  }

  async searchGuests(eventId: string, query: string): Promise<GuestSearchResult[]> {
    try {
      const results = await this.get<any[]>(`/api/e4u/scanner/search/${eventId}?q=${encodeURIComponent(query)}`);
      return (results || []).map(g => ({
        id: g.id,
        type: g.type || 'list',
        firstName: g.firstName,
        lastName: g.lastName,
        phone: g.phone,
        status: g.status,
        listName: g.listName,
        tableName: g.tableName,
        guestCount: g.guestCount,
        checkedInAt: g.checkedInAt,
      }));
    } catch (error) {
      return [];
    }
  }

  async manualCheckIn(eventId: string, entryId: string, entryType: 'list' | 'table'): Promise<ScanResult> {
    return this.post<ScanResult>('/api/reservations/scan', { 
      eventId, 
      entryId,
      entryType,
      manual: true 
    });
  }

  async denyAccess(entryId: string, reason?: string): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>(`/api/reservations/deny-access/${entryId}`, { reason });
  }
}

// Scanner Types
export interface ScannerProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  companyId: string;
  companyName: string;
}

export interface ScannerEvent {
  id: string;
  eventId: string;
  eventName: string;
  eventImageUrl: string | null;
  eventStart: string;
  eventEnd: string;
  locationName: string;
  locationAddress: string | null;
  canScanLists: boolean;
  canScanTables: boolean;
  canScanTickets: boolean;
  totalGuests: number;
  checkedIn: number;
}

export interface ScannerEventDetails extends ScannerEvent {
  lists: Array<{ id: string; name: string; totalEntries: number; checkedIn: number }>;
  tables: Array<{ id: string; name: string; capacity: number; bookedBy: string | null; checkedIn: boolean }>;
}

export interface ScannerStats {
  totalScans: number;
  todayScans: number;
  eventsAssigned: number;
}

export interface ScanResult {
  success: boolean;
  message: string;
  entryType?: 'list' | 'table' | 'ticket';
  guestName?: string;
  guestCount?: number;
  listName?: string;
  tableName?: string;
  alreadyCheckedIn?: boolean;
  checkedInAt?: string;
}

export interface GuestSearchResult {
  id: string;
  type: 'list' | 'table';
  firstName: string;
  lastName: string;
  phone?: string;
  status: string;
  listName?: string;
  tableName?: string;
  guestCount?: number;
  checkedInAt?: string | null;
}

export const api = new ApiClient(API_BASE_URL);
export default api;
