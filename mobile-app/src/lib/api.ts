import { fetchManager } from './fetchManager';

const API_BASE_URL = 'https://manage.eventfouryou.com';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  cacheTTL?: number;
  forceRefresh?: boolean;
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
  private reAuthHandler: (() => Promise<boolean>) | null = null;
  private isReAuthenticating: boolean = false;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  setReAuthHandler(handler: () => Promise<boolean>) {
    this.reAuthHandler = handler;
  }

  clearCache(pattern?: string) {
    fetchManager.clearCache(pattern);
  }

  async request<T>(endpoint: string, options: RequestOptions = {}, isRetry: boolean = false): Promise<T> {
    const { method = 'GET', body, headers = {}, cacheTTL, forceRefresh } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.authToken) {
      requestHeaders['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      return await fetchManager.fetch<T>(
        `${this.baseUrl}${endpoint}`,
        {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          credentials: 'include',
        },
        {
          cacheTTL,
          forceRefresh,
          cacheKey: `${method}_${endpoint}`,
        }
      );
    } catch (error: any) {
      // If we get a 401/Unauthorized and we have a re-auth handler, try to re-authenticate
      if (!isRetry && this.reAuthHandler && !this.isReAuthenticating &&
          (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('Non autenticato'))) {
        console.log('[API] Got 401, attempting re-authentication...');
        this.isReAuthenticating = true;
        try {
          const success = await this.reAuthHandler();
          this.isReAuthenticating = false;
          if (success) {
            console.log('[API] Re-authentication successful, retrying request...');
            // Retry the request
            return this.request<T>(endpoint, options, true);
          }
        } catch (reAuthError) {
          this.isReAuthenticating = false;
          console.log('[API] Re-authentication failed:', reAuthError);
        }
      }
      throw error;
    }
  }

  get<T>(endpoint: string, options?: { cacheTTL?: number; forceRefresh?: boolean }) {
    return this.request<T>(endpoint, { method: 'GET', ...options });
  }

  post<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  // Direct POST that bypasses re-auth handler (used for login during re-authentication)
  async postDirect<T>(endpoint: string, body?: any): Promise<T> {
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    return fetchManager.fetch<T>(
      `${this.baseUrl}${endpoint}`,
      {
        method: 'POST',
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      },
      {
        cacheKey: `POST_${endpoint}_direct`,
      }
    );
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

  prefetchClientDashboard(): void {
    fetchManager.prefetchMultiple([
      { url: `${this.baseUrl}/api/public/account/wallet`, options: this.getRequestOptions(), fetchOptions: { cacheKey: 'GET_/api/public/account/wallet' } },
      { url: `${this.baseUrl}/api/public/account/tickets`, options: this.getRequestOptions(), fetchOptions: { cacheKey: 'GET_/api/public/account/tickets' } },
      { url: `${this.baseUrl}/api/pr/profile`, options: this.getRequestOptions(), fetchOptions: { cacheKey: 'GET_/api/pr/profile' } },
    ]);
  }

  prefetchPrDashboard(): void {
    fetchManager.prefetchMultiple([
      { url: `${this.baseUrl}/api/pr/profile`, options: this.getRequestOptions(), fetchOptions: { cacheKey: 'GET_/api/pr/profile' } },
      { url: `${this.baseUrl}/api/pr/wallet`, options: this.getRequestOptions(), fetchOptions: { cacheKey: 'GET_/api/pr/wallet' } },
      { url: `${this.baseUrl}/api/pr/my-events`, options: this.getRequestOptions(), fetchOptions: { cacheKey: 'GET_/api/pr/my-events' } },
    ]);
  }

  prefetchScannerDashboard(): void {
    fetchManager.prefetchMultiple([
      { url: `${this.baseUrl}/api/e4u/scanner/events`, options: this.getRequestOptions(), fetchOptions: { cacheKey: 'GET_/api/e4u/scanner/events' } },
      { url: `${this.baseUrl}/api/e4u/scanner/stats`, options: this.getRequestOptions(), fetchOptions: { cacheKey: 'GET_/api/e4u/scanner/stats' } },
    ]);
  }

  prefetchPublicEvents(limit: number = 50): void {
    const endpoint = `/api/public/events?limit=${limit}`;
    fetchManager.prefetch(`${this.baseUrl}${endpoint}`, this.getRequestOptions(), { cacheKey: `GET_${endpoint}` });
  }

  private getRequestOptions(): RequestInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return { method: 'GET', headers, credentials: 'include' };
  }

  async getPublicEvents(params?: { limit?: number; offset?: number; categoryId?: string; userLat?: number; userLng?: number }): Promise<PublicEvent[]> {
    // Build query string in consistent order for cache key matching
    const parts: string[] = [];
    if (params?.limit) parts.push(`limit=${params.limit}`);
    if (params?.offset) parts.push(`offset=${params.offset}`);
    if (params?.categoryId) parts.push(`categoryId=${params.categoryId}`);
    if (params?.userLat) parts.push(`userLat=${params.userLat}`);
    if (params?.userLng) parts.push(`userLng=${params.userLng}`);
    
    const query = parts.length > 0 ? `?${parts.join('&')}` : '';
    return this.get<PublicEvent[]>(`/api/public/events${query}`);
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
    console.log('[API] addPrGuest called:', eventId, data);
    console.log('[API] Auth token set:', !!this.authToken);
    const result = await this.post<any>(`/api/pr/events/${eventId}/guests`, data);
    console.log('[API] addPrGuest response:', result);
    
    // Check if we got an error response
    if (result?.error) {
      throw new Error(result.error);
    }
    
    // Ensure we have a valid result
    if (!result || !result.id) {
      console.error('[API] addPrGuest - No valid result:', result);
      throw new Error('Risposta server non valida');
    }
    
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

  async getScannerStatsBasic(): Promise<ScannerStats> {
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

  // Gestore API Methods
  async getGestoreDashboard(): Promise<GestoreDashboardStats> {
    try {
      return await this.get<GestoreDashboardStats>('/api/gestore/dashboard');
    } catch {
      return { activeEvents: 0, totalGuests: 0, monthlyRevenue: 0, pendingTickets: 0, upcomingEvents: [] };
    }
  }

  async getGestoreEvents(): Promise<GestoreEvent[]> {
    try {
      return await this.get<GestoreEvent[]>('/api/gestore/events');
    } catch {
      return [];
    }
  }

  async getGestoreEventDetail(eventId: string): Promise<GestoreEventDetail | null> {
    try {
      return await this.get<GestoreEventDetail>(`/api/gestore/events/${eventId}`);
    } catch {
      return null;
    }
  }

  async getGestoreStationDetail(stationId: string): Promise<GestoreStationDetail | null> {
    try {
      return await this.get<GestoreStationDetail>(`/api/gestore/stations/${stationId}`);
    } catch {
      return null;
    }
  }

  async createGestoreEvent(data: any): Promise<{ id: string }> {
    return this.post<{ id: string }>('/api/gestore/events', data);
  }

  async getGestoreInventory(): Promise<GestoreInventoryItem[]> {
    try {
      return await this.get<GestoreInventoryItem[]>('/api/gestore/inventory');
    } catch {
      return [];
    }
  }

  async getGestoreInventoryStats(): Promise<GestoreInventoryStats> {
    try {
      return await this.get<GestoreInventoryStats>('/api/gestore/inventory/stats');
    } catch {
      return { totalItems: 0, lowStockItems: 0, totalValue: 0, categoriesCount: 0 };
    }
  }

  async getGestoreProducts(): Promise<InventoryProduct[]> {
    try {
      return await this.get<InventoryProduct[]>('/api/gestore/inventory/products');
    } catch {
      return [];
    }
  }

  async getBeverageData(): Promise<BeverageData> {
    try {
      return await this.get<BeverageData>('/api/gestore/beverages');
    } catch {
      return { catalog: [], sales: [], stock: [] };
    }
  }

  async getGestoreCategories(): Promise<InventoryCategory[]> {
    try {
      return await this.get<InventoryCategory[]>('/api/gestore/inventory/categories');
    } catch {
      return [];
    }
  }

  async getGestorePriceLists(): Promise<PriceList[]> {
    try {
      return await this.get<PriceList[]>('/api/gestore/inventory/price-lists');
    } catch {
      return [];
    }
  }

  async getGestoreStaff(): Promise<GestoreStaffMember[]> {
    try {
      return await this.get<GestoreStaffMember[]>('/api/gestore/staff');
    } catch {
      return [];
    }
  }

  async getGestorePRs(): Promise<GestorePR[]> {
    try {
      return await this.get<GestorePR[]>('/api/gestore/prs');
    } catch {
      return [];
    }
  }

  async getGestorePRWallet(): Promise<PRWalletData> {
    try {
      return await this.get<PRWalletData>('/api/gestore/pr-wallet');
    } catch {
      return { balance: 0, totalEarnings: 0, pending: 0, withdrawn: 0, transactions: [] };
    }
  }

  async requestGestorePRPayout(): Promise<{ success: boolean; message: string }> {
    return this.post<{ success: boolean; message: string }>('/api/gestore/pr-wallet/payout');
  }

  async getGestorePRLists(): Promise<PRList[]> {
    try {
      return await this.get<PRList[]>('/api/gestore/pr-lists');
    } catch {
      return [];
    }
  }

  async getGestorePRRewards(): Promise<PRRewardsData> {
    try {
      return await this.get<PRRewardsData>('/api/gestore/pr-rewards');
    } catch {
      return { activeRewards: [], myRewards: [], leaderboard: [] };
    }
  }

  async getGestoreCompanies(): Promise<GestoreCompany[]> {
    try {
      return await this.get<GestoreCompany[]>('/api/gestore/companies');
    } catch {
      return [];
    }
  }

  async getGestoreLocations(): Promise<GestoreLocation[]> {
    try {
      return await this.get<GestoreLocation[]>('/api/gestore/locations');
    } catch {
      return [];
    }
  }

  async getGestoreLocationDetail(locationId: string): Promise<GestoreLocationDetail> {
    return this.get<GestoreLocationDetail>(`/api/gestore/locations/${locationId}`);
  }

  async getGestoreCampaigns(): Promise<MarketingCampaign[]> {
    try {
      return await this.get<MarketingCampaign[]>('/api/gestore/marketing/campaigns');
    } catch {
      return [];
    }
  }

  async getGestoreMarketingStats(): Promise<MarketingStats> {
    try {
      return await this.get<MarketingStats>('/api/gestore/marketing/stats');
    } catch {
      return { totalCampaigns: 0, activeCampaigns: 0, totalEmails: 0, openRate: 0 };
    }
  }

  async getGestoreAccountingStats(period: string): Promise<AccountingStats> {
    try {
      return await this.get<AccountingStats>(`/api/gestore/accounting/stats?period=${period}`);
    } catch {
      return { totalRevenue: 0, ticketRevenue: 0, tableRevenue: 0, consumptionRevenue: 0, expenses: 0, profit: 0 };
    }
  }

  async getGestoreTransactions(period: string): Promise<Transaction[]> {
    try {
      return await this.get<Transaction[]>(`/api/gestore/accounting/transactions?period=${period}`);
    } catch {
      return [];
    }
  }

  async getGestoreProfile(): Promise<GestoreProfile> {
    try {
      return await this.get<GestoreProfile>('/api/gestore/profile');
    } catch {
      return { id: '' };
    }
  }

  async updateGestoreProfile(data: any): Promise<GestoreProfile> {
    return this.patch<GestoreProfile>('/api/gestore/profile', data);
  }

  async getGestoreCompany(): Promise<Company | null> {
    try {
      return await this.get<Company>('/api/gestore/company');
    } catch {
      return null;
    }
  }

  async getGestoreStations(): Promise<GestoreStation[]> {
    try {
      return await this.get<GestoreStation[]>('/api/gestore/stations');
    } catch {
      return [];
    }
  }

  async getWarehouseItems(): Promise<WarehouseItem[]> {
    try {
      return await this.get<WarehouseItem[]>('/api/gestore/warehouse/items');
    } catch {
      return [];
    }
  }

  async getWarehouseMovements(): Promise<WarehouseMovement[]> {
    try {
      return await this.get<WarehouseMovement[]>('/api/gestore/warehouse/movements');
    } catch {
      return [];
    }
  }

  async getSuppliers(): Promise<Supplier[]> {
    try {
      return await this.get<Supplier[]>('/api/gestore/suppliers');
    } catch {
      return [];
    }
  }

  async getGestorePurchaseOrders(): Promise<GestorePurchaseOrder[]> {
    try {
      return await this.get<GestorePurchaseOrder[]>('/api/gestore/purchase-orders');
    } catch {
      return [];
    }
  }

  async getGestorePersonnel(role?: string): Promise<Personnel[]> {
    try {
      const query = role && role !== 'all' ? `?role=${role}` : '';
      return await this.get<Personnel[]>(`/api/gestore/personnel${query}`);
    } catch {
      return [];
    }
  }

  async getGestoreReportStats(period: string, type: string): Promise<ReportStats> {
    try {
      return await this.get<ReportStats>(`/api/gestore/reports?period=${period}&type=${type}`);
    } catch {
      return {
        totalRevenue: 0,
        revenueGrowth: 0,
        avgAttendance: 0,
        attendanceGrowth: 0,
        topProducts: [],
        eventPerformance: [],
        inventoryValue: 0,
        lowStockCount: 0,
        staffPerformance: [],
      };
    }
  }

  // Import API Methods
  async getImportHistory(): Promise<ImportData[]> {
    try {
      return await this.get<ImportData[]>('/api/gestore/imports');
    } catch {
      return [];
    }
  }

  async processImport(type: string, fileName: string): Promise<ImportData> {
    return this.post<ImportData>('/api/gestore/imports', { type, fileName });
  }

  // Printer API Methods
  async getPrinters(): Promise<PrinterConfig[]> {
    try {
      return await this.get<PrinterConfig[]>('/api/gestore/printers');
    } catch {
      return [];
    }
  }

  async addPrinter(data: { name: string; type: string; address: string; paperSize: string }): Promise<PrinterConfig> {
    return this.post<PrinterConfig>('/api/gestore/printers', data);
  }

  async testPrinter(printerId: string): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>(`/api/gestore/printers/${printerId}/test`, {});
  }

  async setDefaultPrinter(printerId: string): Promise<{ success: boolean }> {
    return this.patch<{ success: boolean }>(`/api/gestore/printers/${printerId}/default`, {});
  }

  async deletePrinter(printerId: string): Promise<{ success: boolean }> {
    return this.delete<{ success: boolean }>(`/api/gestore/printers/${printerId}`);
  }

  // Invoice API Methods
  async getInvoices(): Promise<Invoice[]> {
    try {
      return await this.get<Invoice[]>('/api/gestore/invoices');
    } catch {
      return [];
    }
  }

  async createInvoice(data: { customerName: string; amount: number; eventName?: string }): Promise<Invoice> {
    return this.post<Invoice>('/api/gestore/invoices', data);
  }

  async updateInvoiceStatus(invoiceId: string, status: 'paid' | 'pending' | 'overdue'): Promise<Invoice> {
    return this.patch<Invoice>(`/api/gestore/invoices/${invoiceId}`, { status });
  }

  // Event Page API Methods
  async getEventsList(): Promise<Array<{ id: string; name: string }>> {
    try {
      const events = await this.get<any[]>('/api/gestore/events');
      return events.map(e => ({ id: e.id, name: e.name || e.eventName }));
    } catch {
      return [];
    }
  }

  async getEventPageData(eventId: string): Promise<EventPageData> {
    return this.get<EventPageData>(`/api/gestore/events/${eventId}/page`);
  }

  async updateEventPage(eventId: string, data: { description: string; socialLinks: { facebook?: string; instagram?: string; twitter?: string }; images: string[] }): Promise<EventPageData> {
    return this.patch<EventPageData>(`/api/gestore/events/${eventId}/page`, data);
  }

  async toggleEventPagePublish(eventId: string): Promise<{ success: boolean; isPublished: boolean }> {
    return this.post<{ success: boolean; isPublished: boolean }>(`/api/gestore/events/${eventId}/page/toggle-publish`, {});
  }

  // SIAE API Methods
  async getSIAEDashboard(): Promise<SIAEDashboardStats> {
    try {
      return await this.get<SIAEDashboardStats>('/api/gestore/siae/dashboard');
    } catch {
      return {
        moduleEnabled: false,
        pendingReportsCount: 0,
        recentActivity: [],
        pendingRCACount: 0,
        monthlyRMGStatus: null,
        annualRPMStatus: null,
        transmissionErrors: [],
        pendingCorrections: 0,
      };
    }
  }

  async getSIAEEvents(status?: string): Promise<SIAEEvent[]> {
    try {
      const query = status && status !== 'all' ? `?status=${status}` : '';
      return await this.get<SIAEEvent[]>(`/api/gestore/siae/events${query}`);
    } catch {
      return [];
    }
  }

  async getSIAEReports(type: 'rca' | 'rmg' | 'rpm'): Promise<SIAEReport[]> {
    try {
      return await this.get<SIAEReport[]>(`/api/gestore/siae/reports?type=${type}`);
    } catch {
      return [];
    }
  }

  async getSIAETransactions(): Promise<SIAETransaction[]> {
    try {
      return await this.get<SIAETransaction[]>('/api/gestore/siae/transactions');
    } catch {
      return [];
    }
  }

  async exportSIAETransactionsXML(): Promise<void> {
    try {
      await this.post('/api/gestore/siae/transactions/export-xml');
    } catch (error) {
      console.error('Error exporting SIAE transactions XML:', error);
      throw error;
    }
  }

  async getNameChangeRequests(): Promise<NameChangeRequest[]> {
    try {
      return await this.get<NameChangeRequest[]>('/api/gestore/siae/name-changes');
    } catch {
      return [];
    }
  }

  async approveNameChangeGestore(id: string): Promise<void> {
    try {
      await this.post(`/api/gestore/siae/name-changes/${id}/approve`);
    } catch (error) {
      console.error('Error approving name change:', error);
      throw error;
    }
  }

  async rejectNameChangeGestore(id: string): Promise<void> {
    try {
      await this.post(`/api/gestore/siae/name-changes/${id}/reject`);
    } catch (error) {
      console.error('Error rejecting name change:', error);
      throw error;
    }
  }

  async getSIAECustomers(): Promise<SIAECustomer[]> {
    try {
      return await this.get<SIAECustomer[]>('/api/gestore/siae/customers');
    } catch {
      return [];
    }
  }

  async getSIAECards(): Promise<SIAECard[]> {
    try {
      return await this.get<SIAECard[]>('/api/gestore/siae/cards');
    } catch {
      return [];
    }
  }

  async getSIAETicketingData(eventId: string): Promise<SIAETicketingData> {
    try {
      return await this.get<SIAETicketingData>(`/api/gestore/siae/ticketing/${eventId}`);
    } catch {
      return {
        eventId,
        eventName: '',
        ticketsToday: 0,
        revenueToday: 0,
        availableSeats: 0,
        ticketTypes: [],
        recentEmissions: [],
      };
    }
  }

  async emitSIAETicket(eventId: string, data: {
    ticketTypeId: string;
    customerName?: string;
    customerFiscalCode?: string;
  }): Promise<{ success: boolean; ticketCode: string }> {
    return this.post(`/api/gestore/siae/ticketing/${eventId}/emit`, data);
  }

  async getSIAEBoxOfficeData(): Promise<SIAEBoxOfficeData> {
    try {
      return await this.get<SIAEBoxOfficeData>('/api/gestore/siae/box-office');
    } catch {
      return {
        drawerStatus: 'closed',
        cashInDrawer: 0,
        sessionTransactions: 0,
        sessionTotal: 0,
        ticketTypes: [],
      };
    }
  }

  async processSIAEBoxOfficeSale(data: {
    items: Array<{ ticketTypeId: string; quantity: number }>;
    paymentMethod: string;
    total: number;
  }): Promise<{ success: boolean; transactionId: string }> {
    return this.post('/api/gestore/siae/box-office/sale', data);
  }

  async toggleSIAEBoxOfficeDrawer(action: 'open' | 'close'): Promise<{ success: boolean }> {
    return this.post('/api/gestore/siae/box-office/drawer', { action });
  }

  async printSIAEBoxOfficeReceipt(): Promise<{ success: boolean }> {
    return this.post('/api/gestore/siae/box-office/print-receipt', {});
  }

  async getSIAESeatingData(eventId: string): Promise<SIAESeatingData> {
    try {
      return await this.get<SIAESeatingData>(`/api/gestore/siae/seating/${eventId}`);
    } catch {
      return {
        eventId,
        eventName: '',
        totalSeats: 0,
        soldSeats: 0,
        availableSeats: 0,
        blockedSeats: 0,
        sections: [],
        seats: [],
      };
    }
  }

  async updateSIAESeatStatus(eventId: string, seatId: string, status: 'available' | 'sold' | 'blocked'): Promise<{ success: boolean }> {
    return this.post(`/api/gestore/siae/seating/${eventId}/seats/${seatId}/status`, { status });
  }

  async getSIAETicketTypes(eventId: string): Promise<SIAETicketType[]> {
    try {
      return await this.get<SIAETicketType[]>(`/api/gestore/siae/events/${eventId}/ticket-types`);
    } catch {
      return [];
    }
  }

  async createSIAETicketType(eventId: string, data: {
    name: string;
    price: number;
    siaeCode: string;
    available: number;
    category: string;
    isActive: boolean;
  }): Promise<SIAETicketType> {
    return this.post(`/api/gestore/siae/events/${eventId}/ticket-types`, data);
  }

  async updateSIAETicketType(eventId: string, ticketTypeId: string, data: Partial<{
    name: string;
    price: number;
    siaeCode: string;
    available: number;
    category: string;
    isActive: boolean;
  }>): Promise<SIAETicketType> {
    return this.patch(`/api/gestore/siae/events/${eventId}/ticket-types/${ticketTypeId}`, data);
  }

  async deleteSIAETicketType(eventId: string, ticketTypeId: string): Promise<{ success: boolean }> {
    return this.delete(`/api/gestore/siae/events/${eventId}/ticket-types/${ticketTypeId}`);
  }

  async getSIAESubscriptions(): Promise<SIAESubscription[]> {
    try {
      return await this.get<SIAESubscription[]>('/api/gestore/siae/subscriptions');
    } catch {
      return [];
    }
  }

  async createSIAESubscription(data: {
    name: string;
    price: number;
    validFrom: string;
    validTo: string;
    eventsIncluded: number;
    isActive: boolean;
  }): Promise<SIAESubscription> {
    return this.post('/api/gestore/siae/subscriptions', data);
  }

  async updateSIAESubscription(subscriptionId: string, data: Partial<{
    name: string;
    price: number;
    validFrom: string;
    validTo: string;
    eventsIncluded: number;
    isActive: boolean;
  }>): Promise<SIAESubscription> {
    return this.patch(`/api/gestore/siae/subscriptions/${subscriptionId}`, data);
  }

  async deleteSIAESubscription(subscriptionId: string): Promise<{ success: boolean }> {
    return this.delete(`/api/gestore/siae/subscriptions/${subscriptionId}`);
  }

  async getSIAEResaleListings(): Promise<SIAEResaleListing[]> {
    try {
      return await this.get<SIAEResaleListing[]>('/api/gestore/siae/resales');
    } catch {
      return [];
    }
  }

  async approveSIAEResale(resaleId: string): Promise<SIAEResaleListing> {
    return this.post(`/api/gestore/siae/resales/${resaleId}/approve`, {});
  }

  async rejectSIAEResale(resaleId: string): Promise<SIAEResaleListing> {
    return this.post(`/api/gestore/siae/resales/${resaleId}/reject`, {});
  }

  // SIAE Transmissions Methods
  async getSIAETransmissions(): Promise<SIAETransmission[]> {
    try {
      return await this.get<SIAETransmission[]>('/api/gestore/siae/transmissions');
    } catch {
      return [];
    }
  }

  async retrySIAETransmission(transmissionId: string): Promise<{ success: boolean }> {
    return this.post(`/api/gestore/siae/transmissions/${transmissionId}/retry`, {});
  }

  async downloadSIAEReceipt(transmissionId: string): Promise<{ success: boolean }> {
    return this.post(`/api/gestore/siae/transmissions/${transmissionId}/download-receipt`, {});
  }

  // SIAE Audit Log Methods
  async getSIAEAuditLog(): Promise<SIAEAuditEntry[]> {
    try {
      return await this.get<SIAEAuditEntry[]>('/api/gestore/siae/audit-log');
    } catch {
      return [];
    }
  }

  async exportSIAEAuditLog(): Promise<{ success: boolean }> {
    return this.post('/api/gestore/siae/audit-log/export', {});
  }

  // SIAE Config Methods
  async getSIAEConfig(): Promise<SIAEConfig> {
    try {
      return await this.get<SIAEConfig>('/api/gestore/siae/config');
    } catch {
      return {
        codiceFiscale: '',
        partitaIVA: '',
        smartCardConnected: false,
        emailAddress: '',
        defaultCategories: [],
        printerConfigured: false,
        printerName: '',
      };
    }
  }

  async updateSIAEConfig(config: SIAEConfig): Promise<SIAEConfig> {
    return this.patch('/api/gestore/siae/config', config);
  }

  async testSIAEConnection(): Promise<{ success: boolean; message?: string }> {
    return this.post('/api/gestore/siae/config/test-connection', {});
  }

  async getSIAEC1Report(eventId: string, date: string): Promise<SIAEC1Report | null> {
    try {
      return await this.get<SIAEC1Report>(`/api/gestore/siae/reports/c1?eventId=${eventId}&date=${date}`);
    } catch {
      return null;
    }
  }

  async generateSIAEC1Report(eventId: string, date: string): Promise<SIAEC1Report> {
    return this.post('/api/gestore/siae/reports/c1/generate', { eventId, date });
  }

  async transmitSIAEC1Report(reportId: string): Promise<{ success: boolean }> {
    return this.post(`/api/gestore/siae/reports/c1/${reportId}/transmit`, {});
  }

  async previewSIAEC1ReportPDF(reportId: string): Promise<{ success: boolean }> {
    return this.get(`/api/gestore/siae/reports/c1/${reportId}/preview-pdf`);
  }

  async getSIAEC2Report(periodType: 'weekly' | 'monthly'): Promise<SIAEC2Report | null> {
    try {
      return await this.get<SIAEC2Report>(`/api/gestore/siae/reports/c2?periodType=${periodType}`);
    } catch {
      return null;
    }
  }

  async validateSIAEC2Report(reportId: string): Promise<{ success: boolean }> {
    return this.post(`/api/gestore/siae/reports/c2/${reportId}/validate`, {});
  }

  async exportSIAEC2ReportPDF(reportId: string): Promise<{ success: boolean }> {
    return this.post(`/api/gestore/siae/reports/c2/${reportId}/export-pdf`, {});
  }

  async exportSIAEC2ReportXML(reportId: string): Promise<{ success: boolean }> {
    return this.post(`/api/gestore/siae/reports/c2/${reportId}/export-xml`, {});
  }

  async getFloorPlan(eventId: string): Promise<FloorPlanData> {
    try {
      return await this.get<FloorPlanData>(`/api/gestore/events/${eventId}/floor-plan`);
    } catch {
      return {
        id: '',
        eventId,
        eventName: '',
        width: 400,
        height: 300,
        zones: [],
      };
    }
  }

  async getFloorPlanEditor(locationId: string): Promise<FloorPlanEditorData> {
    try {
      return await this.get<FloorPlanEditorData>(`/api/gestore/locations/${locationId}/floor-plan`);
    } catch {
      return {
        id: '',
        locationId,
        name: '',
        zones: [],
        tables: [],
        stages: [],
      };
    }
  }

  async saveFloorPlan(data: FloorPlanEditorData): Promise<FloorPlanEditorData> {
    return this.post<FloorPlanEditorData>(`/api/gestore/locations/${data.locationId}/floor-plan`, data);
  }

  // Scanner Management Methods
  async getGestoreScannerOperators(): Promise<ScannerOperator[]> {
    try {
      return await this.get<ScannerOperator[]>('/api/gestore/scanner/operators');
    } catch {
      return [];
    }
  }

  async getScannerHistory(filters?: { dateFrom?: string; dateTo?: string; eventId?: string; operatorId?: string }): Promise<ScanHistoryEntry[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.append('dateTo', filters.dateTo);
      if (filters?.eventId) params.append('eventId', filters.eventId);
      if (filters?.operatorId) params.append('operatorId', filters.operatorId);
      const query = params.toString() ? `?${params.toString()}` : '';
      return await this.get<ScanHistoryEntry[]>(`/api/gestore/scanner/history${query}`);
    } catch {
      return [];
    }
  }

  async getScannerStats(period?: 'today' | 'week' | 'month' | 'all'): Promise<GestoreScannerStats> {
    try {
      const query = period ? `?period=${period}` : '';
      return await this.get<GestoreScannerStats>(`/api/gestore/scanner/stats${query}`);
    } catch {
      return {
        totalScans: 0,
        successCount: 0,
        errorCount: 0,
        duplicateCount: 0,
        successRate: 0,
        scansPerHour: [],
        topOperators: [],
        byEvent: [],
      };
    }
  }

  // Admin SIAE Monitor Methods
  async getAdminSIAEMonitorStats(): Promise<AdminSIAEMonitorStats> {
    try {
      return await this.get<AdminSIAEMonitorStats>('/api/admin/siae/stats');
    } catch {
      return {
        totalEvents: 0,
        pendingReports: 0,
        transmissionErrors: 0,
        successRate: 0,
        totalGestori: 0,
        activeGestori: 0,
      };
    }
  }

  async getAdminSIAEActivities(): Promise<AdminSIAEActivity[]> {
    try {
      return await this.get<AdminSIAEActivity[]>('/api/admin/siae/activities');
    } catch {
      return [];
    }
  }

  // Event Table Methods
  async getEventTables(eventId: string): Promise<EventTable[]> {
    try {
      return await this.get<EventTable[]>(`/api/gestore/events/${eventId}/tables`);
    } catch {
      return [];
    }
  }

  async getEventTableStats(eventId: string): Promise<EventTableStats> {
    try {
      return await this.get<EventTableStats>(`/api/gestore/events/${eventId}/tables/stats`);
    } catch {
      return { total: 0, available: 0, reserved: 0, occupied: 0 };
    }
  }

  async reserveTable(eventId: string, tableId: string, guestName?: string): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>(`/api/gestore/events/${eventId}/tables/${tableId}/reserve`, { guestName });
  }

  async releaseTable(eventId: string, tableId: string): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>(`/api/gestore/events/${eventId}/tables/${tableId}/release`);
  }

  // Event Guest Methods
  async getEventGuests(eventId: string): Promise<EventGuest[]> {
    try {
      return await this.get<EventGuest[]>(`/api/gestore/events/${eventId}/guests`);
    } catch {
      return [];
    }
  }

  async getEventGuestStats(eventId: string): Promise<EventGuestStats> {
    try {
      return await this.get<EventGuestStats>(`/api/gestore/events/${eventId}/guests/stats`);
    } catch {
      return { total: 0, confirmed: 0, pending: 0, cancelled: 0, checkedIn: 0 };
    }
  }

  async sendGuestReminders(eventId: string, guestIds: string[]): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>(`/api/gestore/events/${eventId}/guests/send-reminders`, { guestIds });
  }

  async bulkCheckInGuests(eventId: string, guestIds: string[]): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>(`/api/gestore/events/${eventId}/guests/bulk-checkin`, { guestIds });
  }

  async getGestoreCashierStats(eventId?: string): Promise<CashierStats> {
    try {
      const query = eventId ? `?eventId=${eventId}` : '';
      return await this.get<CashierStats>(`/api/gestore/cashier/stats${query}`);
    } catch {
      return {
        transactionsCount: 0,
        totalSales: 0,
        avgTicketValue: 0,
        cashDrawerStatus: 'closed',
        cashBalance: 0,
        cardPayments: 0,
        cashPayments: 0,
      };
    }
  }

  async getConsumptionData(eventId?: string): Promise<ConsumptionData> {
    try {
      const query = eventId ? `?eventId=${eventId}` : '';
      return await this.get<ConsumptionData>(`/api/gestore/consumption${query}`);
    } catch {
      return {
        eventId: '',
        eventName: '',
        totalSales: 0,
        totalTransactions: 0,
        stations: [],
      };
    }
  }

  async getGestoreCashierTransactions(eventId?: string): Promise<CashierTransaction[]> {
    try {
      const query = eventId ? `?eventId=${eventId}` : '';
      return await this.get<CashierTransaction[]>(`/api/gestore/cashier/transactions${query}`);
    } catch {
      return [];
    }
  }

  async getGestoreCashierEvents(): Promise<CashierEvent[]> {
    try {
      return await this.get<CashierEvent[]>('/api/gestore/cashier/events');
    } catch {
      return [];
    }
  }

  async getNightFileData(eventId: string): Promise<NightFileData> {
    try {
      return await this.get<NightFileData>(`/api/gestore/night-file/${eventId}`);
    } catch {
      return {
        eventId,
        eventName: '',
        date: new Date().toISOString().split('T')[0],
        status: 'open',
        totalRevenue: 0,
        ticketsSold: 0,
        guestsEntered: 0,
        activeStations: 0,
        breakdown: [],
        cashReconciliation: { expected: 0, counted: 0, difference: 0 },
        staffSummary: [],
      };
    }
  }

  async getGestoreCompanyUsers(): Promise<CompanyUser[]> {
    try {
      return await this.get<CompanyUser[]>('/api/gestore/company-users');
    } catch {
      return [];
    }
  }

  // Admin API Methods
  async getAdminDashboard(): Promise<AdminDashboardStats> {
    try {
      return await this.get<AdminDashboardStats>('/api/admin/dashboard');
    } catch {
      return { totalGestori: 0, activeGestori: 0, totalEvents: 0, totalUsers: 0, monthlyRevenue: 0, recentGestori: [] };
    }
  }

  async getAdminGestori(): Promise<AdminGestore[]> {
    try {
      return await this.get<AdminGestore[]>('/api/admin/gestori');
    } catch {
      return [];
    }
  }

  async getAdminGestoreDetail(gestoreId: string): Promise<AdminGestoreDetail> {
    return this.get<AdminGestoreDetail>(`/api/admin/gestori/${gestoreId}`);
  }

  async getAdminEvents(): Promise<AdminEvent[]> {
    try {
      return await this.get<AdminEvent[]>('/api/admin/events');
    } catch {
      return [];
    }
  }

  async getAdminBillingStats(): Promise<BillingStats> {
    try {
      return await this.get<BillingStats>('/api/admin/billing/stats');
    } catch {
      return { totalRevenue: 0, monthlyRevenue: 0, activeSubscriptions: 0, pendingInvoices: 0 };
    }
  }

  async getAdminInvoices(): Promise<Invoice[]> {
    try {
      return await this.get<Invoice[]>('/api/admin/billing/invoices');
    } catch {
      return [];
    }
  }

  async getAdminCompanies(): Promise<AdminCompany[]> {
    try {
      return await this.get<AdminCompany[]>('/api/admin/companies');
    } catch {
      return [];
    }
  }

  async getAdminUsers(): Promise<AdminUser[]> {
    try {
      return await this.get<AdminUser[]>('/api/admin/users');
    } catch {
      return [];
    }
  }

  async getAdminEventDetail(eventId: string): Promise<AdminEventDetail> {
    return this.get<AdminEventDetail>(`/api/admin/events/${eventId}`);
  }

  async getNameChanges(): Promise<NameChangeRequest[]> {
    try {
      return await this.get<NameChangeRequest[]>('/api/admin/name-changes');
    } catch {
      return [];
    }
  }

  async approveNameChangeAdmin(id: string): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>(`/api/admin/name-changes/${id}/approve`);
  }

  async rejectNameChangeAdmin(id: string): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>(`/api/admin/name-changes/${id}/reject`);
  }
}

// Gestore Types
export interface GestoreDashboardStats {
  activeEvents: number;
  totalGuests: number;
  monthlyRevenue: number;
  pendingTickets: number;
  upcomingEvents: GestoreUpcomingEvent[];
}

export interface GestoreUpcomingEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  guestsCount: number;
  ticketsSold: number;
}

export interface GestoreEvent {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  location: string;
  status: string;
  ticketsSold: number;
  capacity?: number;
  revenue: number;
  imageUrl?: string;
}

export interface GestoreEventDetail extends GestoreEvent {
  description?: string;
  isPublic: boolean;
  ticketTypes: GestoreTicketType[];
  stations: GestoreStation[];
  staff: GestoreStaffMember[];
  // Additional stats for event hub
  guestsCount?: number;
  checkedIn?: number;
  ticketsAvailable?: number;
  ticketRevenue?: number;
  guestsCheckedIn?: number;
  guestLists?: Array<{ id: string; name: string; guestsCount: number; checkedIn: number }>;
  tablesTotal?: number;
  tablesBooked?: number;
  tablesRevenue?: number;
  tables?: Array<{ id: string; name: string; capacity: number; status: string; bookedBy?: string }>;
  staffCount?: number;
  scannersCount?: number;
  prCount?: number;
  productsCount?: number;
  stationsCount?: number;
  consumptionTotal?: number;
  expenses?: number;
  profit?: number;
  consumptionRevenue?: number;
}

export interface GestoreTicketType {
  id: string;
  name: string;
  price: number;
  capacity: number;
  sold: number;
  available?: number;
  quantity?: number;
}

export interface GestoreStation {
  id: string;
  name: string;
  type: string;
  status: string;
  eventId?: string;
  eventName?: string;
  staffCount?: number;
  productsCount?: number;
  inventoryStatus?: 'ok' | 'low' | 'empty';
}

export interface GestoreStationDetail {
  id: string;
  name: string;
  type: 'bar' | 'food' | 'entrance' | 'vip' | 'cloakroom';
  eventId?: string;
  eventName?: string;
  status: 'active' | 'inactive';
  totalSales: number;
  transactionCount: number;
  staff: Array<{id: string; name: string; role: string; shift: string}>;
  products: Array<{id: string; name: string; price: number; stock: number; category: string}>;
}

export interface WarehouseItem {
  id: string;
  name: string;
  currentQty: number;
  minQty: number;
  unit?: string;
  location?: string;
  categoryId?: string;
  categoryName?: string;
}

export interface WarehouseMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'transfer';
  quantity: number;
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

export interface Supplier {
  id: string;
  companyName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  status?: 'active' | 'inactive';
  lastOrderDate?: string;
  totalOrders?: number;
}

export interface GestorePurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  createdAt: string;
  expectedDelivery?: string;
  totalAmount: number;
  itemsCount: number;
  status: 'pending' | 'approved' | 'delivered' | 'cancelled';
  notes?: string;
}

export interface GestoreStaffMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  status: string;
  eventsAssigned: number;
}

export interface ScannerOperator {
  id: string;
  name: string;
  email?: string;
  isActive: boolean;
  totalScans?: number;
  eventsCount?: number;
  permissions?: string[];
}

// Alias for backward compatibility
export type StaffMember = GestoreStaffMember;

export interface GestoreInventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  unitPrice: number;
  status: string;
}

export interface InventoryProduct {
  id: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  currentStock: number;
  minStock: number;
  unitPrice: number;
  status: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  productsCount: number;
  icon?: string;
}

export interface PriceList {
  id: string;
  name: string;
  description?: string;
  productsCount: number;
  status: 'active' | 'inactive' | 'draft';
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GestoreInventoryStats {
  totalItems: number;
  lowStockItems: number;
  totalValue: number;
  categoriesCount: number;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  type: string;
  status: string;
  sentCount?: number;
  openCount?: number;
  clickCount?: number;
  scheduledAt?: string;
}

export interface MarketingStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalEmails: number;
  openRate: number;
}

export interface AccountingStats {
  totalRevenue: number;
  ticketRevenue: number;
  tableRevenue: number;
  consumptionRevenue: number;
  expenses: number;
  profit: number;
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

export interface GestoreProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  eventsCount?: number;
  staffCount?: number;
  ticketsSold?: number;
}

export interface Company {
  id: string;
  name: string;
  type?: string;
  vatNumber?: string;
  address?: string;
}

export interface GestorePR {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  prCode?: string;
  status: string;
  invites?: number;
  conversions?: number;
  earnings?: number;
  eventsCount?: number;
}

export interface GestoreCompany {
  id: string;
  name: string;
  vatNumber?: string;
  status: string;
  eventsCount?: number;
  staffCount?: number;
  locationsCount?: number;
}

export interface GestoreLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  capacity: number;
  eventsCount: number;
  status: 'active' | 'inactive';
  imageUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface GestoreLocationDetail extends GestoreLocation {
  description?: string;
  amenities: string[];
  parkingSpots: number;
  accessibilityFeatures: string[];
  events: Array<{id: string; name: string; date: string; status: string}>;
  floorPlanUrl?: string;
}

// Admin Types
export interface AdminDashboardStats {
  totalGestori: number;
  activeGestori: number;
  totalEvents: number;
  totalUsers: number;
  monthlyRevenue: number;
  recentGestori: AdminRecentGestore[];
}

export interface AdminRecentGestore {
  id: string;
  name: string;
  companyName: string;
  eventsCount: number;
  status: string;
}

export interface AdminGestore {
  id: string;
  name: string;
  email?: string;
  companyName?: string;
  status: string;
  eventsCount?: number;
  ticketsSold?: number;
  revenue?: number;
  siaeEnabled?: boolean;
}

export interface AdminGestoreCompany {
  id: string;
  name: string;
  vatNumber?: string;
  status: string;
  eventsCount?: number;
  locationsCount?: number;
  siaeEnabled?: boolean;
}

export interface AdminGestoreEvent {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  locationName?: string;
  status: string;
  ticketsSold?: number;
  revenue?: number;
}

export interface AdminGestoreUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
}

export interface AdminGestoreDetail extends AdminGestore {
  phone?: string;
  createdAt?: string;
  companiesCount?: number;
  usersCount?: number;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscriptionExpiresAt?: string;
  companies?: AdminGestoreCompany[];
  events?: AdminGestoreEvent[];
  users?: AdminGestoreUser[];
}

export interface AdminEvent {
  id: string;
  name: string;
  startDate: string;
  gestoreName?: string;
  location?: string;
  status: string;
  ticketsSold?: number;
  revenue?: number;
  capacity?: number;
}

export interface AdminCompany {
  id: string;
  name: string;
  gestoreName?: string;
  gestoreId?: string;
  vatNumber?: string;
  status: string;
  eventsCount?: number;
  locationsCount?: number;
  siaeEnabled?: boolean;
  createdAt?: string;
}

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt?: string;
  createdAt?: string;
  companyName?: string;
}

export interface AdminEventDetail {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  status: string;
  gestoreName?: string;
  locationName?: string;
  capacity?: number;
  ticketsSold?: number;
  ticketsAvailable?: number;
  ticketRevenue?: number;
  revenue?: number;
  tablesTotal?: number;
  tablesBooked?: number;
  tablesRevenue?: number;
  staffCount?: number;
  scannersCount?: number;
  prCount?: number;
  guestsCount?: number;
  checkedIn?: number;
  consumptionRevenue?: number;
  expenses?: number;
  profit?: number;
  createdAt?: string;
  ticketTypes?: Array<{
    id: string;
    name: string;
    price: number;
    capacity: number;
    sold: number;
  }>;
  tables?: Array<{
    id: string;
    name: string;
    capacity: number;
    status: string;
    bookedBy?: string;
  }>;
  staff?: Array<{
    id: string;
    name: string;
    role: string;
    email?: string;
    phone?: string;
    status: string;
  }>;
}

export interface NameChangeRequest {
  id: string;
  originalFirstName: string;
  originalLastName: string;
  newFirstName: string;
  newLastName: string;
  ticketCode?: string;
  eventName?: string;
  eventId?: string;
  requesterName?: string;
  requesterId?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
  processedAt?: string;
  processedBy?: string;
}

export interface BillingStats {
  totalRevenue: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  pendingInvoices: number;
}

export interface Invoice {
  id: string;
  number: string;
  clientName: string;
  amount: number;
  status: string;
  date: string;
}

// Personnel Types
export interface Personnel {
  id: string;
  name: string;
  role: 'bartender' | 'security' | 'promoter' | 'scanner' | 'cashier' | 'staff';
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
  eventsAssigned: number;
  rating?: number;
  avatarUrl?: string;
  lastActiveAt?: string;
}

// SIAE Types
export type SIAEReportStatus = 'pending' | 'sent' | 'approved' | 'error';

export interface SIAEDashboardStats {
  moduleEnabled: boolean;
  pendingReportsCount: number;
  recentActivity: Array<{
    id: string;
    type: 'rca' | 'rmg' | 'rpm';
    description: string;
    status: SIAEReportStatus;
    date: string;
  }>;
  pendingRCACount: number;
  monthlyRMGStatus: SIAEReportStatus | null;
  annualRPMStatus: SIAEReportStatus | null;
  transmissionErrors: Array<{
    id: string;
    reportType: 'rca' | 'rmg' | 'rpm';
    errorMessage: string;
    date: string;
  }>;
  pendingCorrections: number;
}

export interface SIAEEvent {
  id: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  venueName: string;
  ticketCount: number;
  rcaStatus: SIAEReportStatus;
  rcaTransmissionDate: string | null;
  rcaResponseDate: string | null;
  rcaProtocolNumber: string | null;
}

export interface SIAEReport {
  id: string;
  type: 'rca' | 'rmg' | 'rpm';
  status: SIAEReportStatus;
  transmissionDate: string | null;
  responseDate: string | null;
  protocolNumber: string | null;
  eventId?: string;
  eventName?: string;
  date?: string;
  eventsCount?: number;
  month?: number;
  year?: number;
  totalTickets?: number;
  totalRevenue?: number;
  errorMessage?: string;
}

export interface SIAEC1Report {
  id: string;
  eventId: string;
  eventName: string;
  reportDate: string;
  openTime: string;
  closeTime: string;
  ticketsSold: number;
  totalRevenue: number;
  refunds: number;
  refundAmount: number;
  cancellations: number;
  cancellationAmount: number;
  signatureStatus: 'pending' | 'signed' | 'error';
  transmissionStatus: 'draft' | 'sent' | 'confirmed' | 'error';
}

export interface SIAEC2Report {
  id: string;
  periodType: 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  totalEvents: number;
  totalTickets: number;
  totalRevenue: number;
  totalRefunds: number;
  revenueByDay: Array<{ date: string; amount: number }>;
  ticketsByCategory: Array<{ category: string; count: number; revenue: number }>;
  validationStatus: 'valid' | 'invalid' | 'pending';
  validationErrors?: string[];
}

export interface SIAETransaction {
  id: string;
  transactionDate: string;
  type: 'sale' | 'refund' | 'cancellation';
  amount: number;
  fiscalSeal: string;
  ticketCode: string;
  eventId: string;
  eventName: string;
}

export interface SIAENameChangeRequest {
  id: string;
  ticketCode: string;
  eventName: string;
  originalName: string;
  newName: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  fee: number;
  documentUrl?: string;
}

export interface SIAECustomer {
  id: string;
  firstName: string;
  lastName: string;
  fiscalCode: string | null;
  cardNumber: string | null;
  registrationDate: string;
  status: 'active' | 'suspended' | 'expired';
  address?: string;
  phone?: string;
  email?: string;
  documentType?: string;
  documentNumber?: string;
}

export interface SIAECard {
  id: string;
  cardNumber: string;
  customerId: string;
  customerName: string;
  activationDate: string | null;
  expiryDate: string | null;
  status: 'active' | 'pending' | 'expired';
}

export interface SIAESeat {
  id: string;
  row: string;
  seatNumber: number;
  section: string;
  status: 'available' | 'sold' | 'blocked';
  ticketCode?: string;
  holderName?: string;
}

export interface SIAESeatingData {
  eventId: string;
  eventName: string;
  totalSeats: number;
  soldSeats: number;
  availableSeats: number;
  blockedSeats: number;
  sections: string[];
  seats: SIAESeat[];
}

export interface SIAETicketType {
  id: string;
  name: string;
  price: number;
  siaeCode: string;
  available: number;
  sold: number;
  isActive: boolean;
  category: string;
}

export interface SIAETicketingData {
  eventId: string;
  eventName: string;
  ticketsToday: number;
  revenueToday: number;
  availableSeats: number;
  ticketTypes: Array<{id: string; name: string; price: number; available: number}>;
  recentEmissions: Array<{id: string; ticketCode: string; type: string; customerName?: string; timestamp: string}>;
}

export interface SIAEBoxOfficeData {
  drawerStatus: 'open' | 'closed';
  cashInDrawer: number;
  sessionTransactions: number;
  sessionTotal: number;
  ticketTypes: Array<{id: string; name: string; price: number}>;
}

export interface SIAESubscription {
  id: string;
  name: string;
  price: number;
  validFrom: string;
  validTo: string;
  eventsIncluded: number;
  subscribersCount: number;
  isActive: boolean;
  totalRevenue: number;
}

export interface SIAEResaleListing {
  id: string;
  ticketCode: string;
  eventName: string;
  originalPrice: number;
  resalePrice: number;
  sellerName: string;
  status: 'pending' | 'active' | 'sold' | 'expired';
  commission: number;
  listedDate: string;
  soldDate?: string;
}

export interface FloorPlanZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: 'available' | 'occupied' | 'selected' | 'reserved';
  totalSeats: number;
  availableSeats: number;
  price: number;
  description?: string;
}

export interface FloorPlanData {
  id: string;
  eventId: string;
  eventName: string;
  imageUrl?: string;
  width: number;
  height: number;
  zones: FloorPlanZone[];
}

// Reports Types
export interface ReportStats {
  totalRevenue: number;
  revenueGrowth: number;
  avgAttendance: number;
  attendanceGrowth: number;
  topProducts: Array<{ id: string; name: string; quantity: number; revenue: number }>;
  eventPerformance: Array<{ id: string; name: string; ticketsSold: number; revenue: number; rating: number }>;
  inventoryValue: number;
  lowStockCount: number;
  staffPerformance: Array<{ id: string; name: string; role: string; scans: number; rating: number }>;
}

// Import Types
export interface ImportData {
  id: string;
  type: 'products' | 'customers' | 'prices' | 'guests';
  fileName: string;
  importDate: string;
  recordsCount: number;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
}

// Printer Types
export interface PrinterConfig {
  id: string;
  name: string;
  type: 'usb' | 'network' | 'bluetooth';
  address: string;
  isDefault: boolean;
  paperSize: 'A4' | 'thermal_80mm' | 'thermal_58mm';
  status: 'ready' | 'offline' | 'error';
  queueCount: number;
}

// Invoice Types
export interface GestoreInvoice {
  id: string;
  number: string;
  customerName: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  eventId?: string;
  eventName?: string;
}

// Event Page Types
export interface EventPageData {
  eventId: string;
  eventName: string;
  description: string;
  images: string[];
  socialLinks: { facebook?: string; instagram?: string; twitter?: string };
  isPublished: boolean;
  lastModified: string;
}

// Cashier Types
export interface CashierStats {
  transactionsCount: number;
  totalSales: number;
  avgTicketValue: number;
  cashDrawerStatus: 'open' | 'closed' | 'balanced';
  cashBalance: number;
  cardPayments: number;
  cashPayments: number;
}

export interface CashierTransaction {
  id: string;
  time: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'wallet' | 'other';
  items: number;
  status: 'completed' | 'pending' | 'refunded';
  customerName?: string;
  receiptNumber?: string;
}

export interface CashierEvent {
  id: string;
  name: string;
  date: string;
  status: 'active' | 'upcoming' | 'ended';
}

export interface NightFileData {
  eventId: string;
  eventName: string;
  date: string;
  status: 'open' | 'closing' | 'closed';
  totalRevenue: number;
  ticketsSold: number;
  guestsEntered: number;
  activeStations: number;
  breakdown: Array<{category: string; amount: number; transactions: number}>;
  cashReconciliation: {expected: number; counted: number; difference: number};
  staffSummary: Array<{name: string; role: string; hours: number; tips: number}>;
}

export interface ConsumptionData {
  eventId: string;
  eventName: string;
  totalSales: number;
  totalTransactions: number;
  stations: Array<{
    id: string;
    name: string;
    type: string;
    sales: number;
    transactions: number;
    topProducts: Array<{ name: string; quantity: number }>;
  }>;
}

// Company User Types
export interface CompanyUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'admin' | 'manager' | 'staff' | 'scanner' | 'cashier' | 'pr';
  status: 'active' | 'inactive' | 'pending';
  lastLoginAt?: string;
  avatarUrl?: string;
  createdAt?: string;
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

export interface ScanHistoryEntry {
  id: string;
  timestamp: string;
  eventId: string;
  eventName: string;
  ticketCode: string;
  ticketType: string;
  result: 'success' | 'error' | 'duplicate';
  operatorId: string;
  operatorName: string;
  errorMessage?: string;
}

export interface GestoreScannerStats {
  totalScans: number;
  successCount: number;
  errorCount: number;
  duplicateCount: number;
  successRate: number;
  scansPerHour: Array<{ hour: string; count: number }>;
  topOperators: Array<{ name: string; scans: number; successRate: number }>;
  byEvent: Array<{ eventName: string; scans: number; successRate: number }>;
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

// Admin SIAE Monitor Types
export interface AdminSIAEMonitorStats {
  totalEvents: number;
  pendingReports: number;
  transmissionErrors: number;
  successRate: number;
  totalGestori: number;
  activeGestori: number;
}

export interface AdminSIAEActivity {
  id: string;
  gestoreId: string;
  gestoreName: string;
  eventId?: string;
  eventName?: string;
  reportType: 'rca' | 'rmg' | 'rpm';
  status: SIAEReportStatus;
  timestamp: string;
}

// Event Table Types
export interface EventTable {
  id: string;
  number: string;
  capacity: number;
  status: 'available' | 'reserved' | 'occupied';
  guestName?: string;
  guestId?: string;
  minSpend?: number;
}

export interface EventTableStats {
  total: number;
  available: number;
  reserved: number;
  occupied: number;
}

// Event Guest Types
export interface EventGuest {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  type: 'vip' | 'regular' | 'comp';
  ticketType?: string;
  checkedIn: boolean;
  checkedInAt?: string;
}

export interface EventGuestStats {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  checkedIn: number;
}

// Beverage Data Types
export interface BeverageCatalogItem {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
}

export interface BeverageSalesItem {
  beverageId: string;
  name: string;
  quantitySold: number;
  revenue: number;
}

export interface BeverageStockItem {
  beverageId: string;
  name: string;
  currentStock: number;
  minStock: number;
  status: 'ok' | 'low' | 'out';
}

export interface BeverageData {
  catalog: BeverageCatalogItem[];
  sales: BeverageSalesItem[];
  stock: BeverageStockItem[];
}

export interface PRWalletTransaction {
  id: string;
  type: 'commission' | 'payout' | 'bonus';
  amount: number;
  date: string;
  description: string;
}

export interface PRWalletData {
  balance: number;
  totalEarnings: number;
  pending: number;
  withdrawn: number;
  transactions: PRWalletTransaction[];
}

export interface PRList {
  id: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  prName: string;
  guestsCount: number;
  confirmedCount: number;
  status: 'active' | 'closed';
}

export interface PRActiveReward {
  id: string;
  name: string;
  target: number;
  current: number;
  prize: string;
}

export interface PREarnedReward {
  id: string;
  name: string;
  earnedAt: string;
  prize: string;
}

export interface PRLeaderboardEntry {
  rank: number;
  prName: string;
  points: number;
}

export interface PRRewardsData {
  activeRewards: PRActiveReward[];
  myRewards: PREarnedReward[];
  leaderboard: PRLeaderboardEntry[];
}

export interface FloorPlanEditorZone {
  id: string;
  type: string;
  name: string;
  points: { x: number; y: number }[];
  color: string;
  capacity: number;
}

export interface FloorPlanEditorTable {
  id: string;
  name: string;
  x: number;
  y: number;
  seats: number;
  shape: 'round' | 'square';
}

export interface FloorPlanEditorStage {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FloorPlanEditorData {
  id: string;
  locationId: string;
  name: string;
  zones: FloorPlanEditorZone[];
  tables: FloorPlanEditorTable[];
  stages: FloorPlanEditorStage[];
}

// SIAE Transmission Types
export interface SIAETransmission {
  id: string;
  transmissionDate: string;
  reportType: 'RCA' | 'RMG' | 'RPM';
  status: 'sent' | 'pending' | 'error' | 'confirmed';
  eventId?: string;
  eventName?: string;
  errorMessage?: string;
  xmlContent?: string;
}

// SIAE Audit Entry Types
export interface SIAEAuditEntry {
  id: string;
  timestamp: string;
  operation: 'emission' | 'refund' | 'cancellation' | 'name_change';
  userId: string;
  userName: string;
  ticketCode: string;
  amount: number;
  details?: string;
}

// SIAE Config Types
export interface SIAEConfig {
  codiceFiscale: string;
  partitaIVA: string;
  smartCardConnected: boolean;
  emailAddress: string;
  defaultCategories: string[];
  printerConfigured: boolean;
  printerName?: string;
}

export const api = new ApiClient(API_BASE_URL);
export default api;
