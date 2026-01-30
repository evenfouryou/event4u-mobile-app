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
  ticketTypeCode?: string;
  ticketPrice: number;
  grossAmount?: number;
  participantFirstName: string | null;
  participantLastName: string | null;
  status: string;
  emissionDate: string | null;
  emittedAt: string | null;
  emissionDateTime?: string | null;
  qrCode: string | null;
  fiscalSealCode?: string | null;
  sectorName: string | null;
  eventName: string | null;
  eventStart: string | null;
  eventEnd: string | null;
  locationName: string | null;
  locationAddress?: string | null;
  ticketedEventId: string;
  organizerCompany?: string | null;
  ticketingManager?: string | null;
  progressiveNumber?: number | null;
  customText?: string | null;
}

export interface TicketsResponse {
  upcoming: Ticket[];
  past: Ticket[];
  cancelled?: Ticket[];
  total: number;
}

export interface MyReservation {
  id: string;
  eventId: string;
  eventName: string;
  eventDate: string | null;
  eventEndDate: string | null;
  locationName: string | null;
  locationAddress: string | null;
  listName: string;
  firstName: string;
  lastName: string;
  plusOnes: number;
  plusOnesNames: string[];
  qrCode: string | null;
  status: string;
  checkedInAt: string | null;
  createdAt: string | null;
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

export interface StripeModeResponse {
  mode: string;
  isProduction: boolean;
}

export interface StripeTransactionData {
  id: string;
  transactionCode: string;
  ticketedEventId: string;
  customerId: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod?: string;
  totalAmount: number;
  ticketsCount: number;
  createdAt: string;
  updatedAt: string;
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
    id: string;
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

  async getMyReservations(): Promise<MyReservation[]> {
    // Use the new public endpoint that authenticates via customer session/bearer token
    const entries = await this.get<Array<{
      id: string;
      eventName: string;
      eventDate: string | null;
      listName: string;
      venueName: string;
      qrCode: string | null;
      status: string;
      firstName: string;
      lastName: string;
      plusOnes: number;
    }>>('/api/public/account/list-entries');
    
    // Map to MyReservation format
    return entries.map(entry => ({
      id: entry.id,
      eventId: '',
      eventName: entry.eventName,
      eventDate: entry.eventDate,
      eventEndDate: null,
      locationName: entry.venueName,
      locationAddress: null,
      listName: entry.listName,
      firstName: entry.firstName,
      lastName: entry.lastName,
      plusOnes: entry.plusOnes || 0,
      plusOnesNames: [],
      qrCode: entry.qrCode,
      status: entry.status,
      checkedInAt: null,
      createdAt: null
    }));
  }

  async getTicketById(id: string): Promise<Ticket> {
    return this.get<Ticket>(`/api/public/account/tickets/${id}`);
  }

  async requestNameChange(ticketId: string, data: {
    newFirstName: string;
    newLastName: string;
    newEmail: string;
    newFiscalCode: string;
    newDocumentType: string;
    newDocumentNumber: string;
    newDateOfBirth: string;
  }): Promise<{
    message: string;
    nameChangeId: string;
    fee: string;
    paymentStatus: string;
    requiresPayment: boolean;
  }> {
    return this.post('/api/public/account/name-change', {
      ticketId,
      ...data,
    });
  }

  async getWallet(): Promise<Wallet> {
    return this.get<Wallet>('/api/public/account/wallet');
  }

  async createResaleListing(ticketId: string, resalePrice: number): Promise<{ success: boolean; resaleId: string }> {
    return this.post('/api/public/account/resale', { ticketId, resalePrice });
  }

  async cancelResaleListing(resaleId: string): Promise<{ success: boolean }> {
    return this.delete(`/api/public/account/resale/${resaleId}`);
  }

  async getMyResales(): Promise<{ resales: any[] }> {
    return this.get('/api/public/account/resales');
  }

  async checkHasPrProfile(): Promise<{ hasPrProfile: boolean; prCode: string | null }> {
    try {
      return await this.get<{ hasPrProfile: boolean; prCode: string | null }>('/api/customer/has-pr-profile');
    } catch {
      return { hasPrProfile: false, prCode: null };
    }
  }

  async switchToPrMode(): Promise<{ success: boolean; prCode?: string; error?: string }> {
    return this.post('/api/customer/switch-to-pr', {});
  }

  async getWalletTransactions(limit?: number): Promise<{ transactions: WalletTransaction[] }> {
    const query = limit ? `?limit=${limit}` : '';
    return this.get<{ transactions: WalletTransaction[] }>(`/api/public/account/wallet/transactions${query}`);
  }

  async getMe(): Promise<Customer> {
    return this.get<Customer>('/api/public/account/me');
  }

  async requestPhoneChange(newPhone: string, newPhonePrefix: string = '+39'): Promise<{ success: boolean; samePhone?: boolean; message: string }> {
    return this.post('/api/public/customers/phone/request-change', { newPhone, newPhonePrefix });
  }

  async verifyPhoneChange(otp: string): Promise<{ success: boolean; message: string }> {
    return this.post('/api/public/customers/phone/verify-change', { otp });
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

  async uploadPresignedUrl(objectPath: string): Promise<{ signedUrl: string; objectPath: string }> {
    return this.post<{ signedUrl: string; objectPath: string }>('/api/storage/upload-url', { objectPath });
  }

  async updateProfileImage(objectPath: string): Promise<{ success: boolean; profileImageUrl: string }> {
    return this.post<{ success: boolean; profileImageUrl: string }>('/api/public/account/profile/image', { objectPath });
  }

  async getMyIdentityDocuments(): Promise<{ documents: IdentityDocument[] }> {
    return this.get<{ documents: IdentityDocument[] }>('/api/identity-documents/my');
  }

  async getIdentityVerificationStatus(): Promise<IdentityVerificationStatus> {
    return this.get<IdentityVerificationStatus>('/api/identity-documents/verification-status');
  }

  async getIdentityDocumentUploadUrls(documentType: string, includeSelfie?: boolean): Promise<IdentityDocumentUploadUrls> {
    const params = new URLSearchParams();
    params.set('documentType', documentType);
    if (includeSelfie) params.set('selfie', 'true');
    return this.get<IdentityDocumentUploadUrls>(`/api/identity-documents/upload-urls?${params}`);
  }

  async submitIdentityDocument(data: {
    documentType: string;
    frontImageUrl: string;
    backImageUrl?: string;
    selfieImageUrl?: string;
    enableOcr?: boolean;
  }): Promise<{ success: boolean; document: IdentityDocument }> {
    return this.post<{ success: boolean; document: IdentityDocument }>('/api/identity-documents', data);
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

  async requestPrPhoneChange(newPhone: string, newPhonePrefix: string = '+39'): Promise<{ success: boolean; samePhone?: boolean; message: string }> {
    return this.post('/api/pr/phone/request-change', { newPhone, newPhonePrefix });
  }

  async verifyPrPhoneChange(otp: string): Promise<{ success: boolean; message: string }> {
    return this.post('/api/pr/phone/verify-change', { otp });
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

  // ==================== PR CANCELLATION REQUESTS ====================
  
  async requestGuestCancellation(listEntryId: string, requestReason?: string): Promise<{ success: boolean; message: string }> {
    return await this.post('/api/pr/cancellation-requests', {
      reservationType: 'list_entry',
      listEntryId,
      requestReason,
    });
  }

  async requestTableCancellation(tableReservationId: string, requestReason?: string): Promise<{ success: boolean; message: string }> {
    return await this.post('/api/pr/cancellation-requests', {
      reservationType: 'table_reservation',
      tableReservationId,
      requestReason,
    });
  }

  async getPrCancellationRequests(eventId: string): Promise<any[]> {
    try {
      return await this.get<any[]>(`/api/pr/cancellation-requests?eventId=${eventId}`);
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
    const response = await this.post<any>('/api/e4u/scan', { eventId, qrCode: code });
    return {
      success: response.success ?? true,
      message: response.message || 'Check-in completato',
      entryType: response.type === 'list' ? 'list' : response.type === 'table' ? 'table' : 'ticket',
      guestName: response.person 
        ? `${response.person.firstName || ''} ${response.person.lastName || ''}`.trim()
        : response.entry 
          ? `${response.entry.firstName || ''} ${response.entry.lastName || ''}`.trim()
          : response.guest
            ? `${response.guest.firstName || ''} ${response.guest.lastName || ''}`.trim()
            : undefined,
      guestCount: response.person?.guestCount || response.person?.plusOnes || response.entry?.plusOnes || 1,
      listName: response.person?.listName || response.listName,
      tableName: response.person?.tableTypeName || response.tableName,
      alreadyCheckedIn: response.alreadyCheckedIn,
      checkedInAt: response.checkedInAt,
    };
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
    const endpoint = entryType === 'list' 
      ? `/api/e4u/entries/${entryId}/check-in`
      : `/api/e4u/guests/${entryId}/check-in`;
    
    const response = await this.post<any>(endpoint, {});
    return {
      success: true,
      message: response.message || 'Check-in completato',
      entryType,
      guestName: `${response.firstName || ''} ${response.lastName || ''}`.trim(),
      guestCount: response.plusOnes || response.guestCount || 1,
      listName: response.listName,
      tableName: response.tableName,
      alreadyCheckedIn: response.status === 'checked_in',
      checkedInAt: response.checkedInAt,
    };
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

  async getSIAEResales(): Promise<SIAEResale[]> {
    try {
      return await this.get<SIAEResale[]>('/api/siae/resales/all');
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

  async getSIAESubscriptions(): Promise<SIAESubscription[]> {
    try {
      return await this.get<SIAESubscription[]>('/api/siae/subscriptions');
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
      return await this.get<SIAETransmission[]>('/api/admin/siae/transmissions');
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

  async getSIAEAuditLogs(companyId?: string): Promise<SiaeAuditLog[]> {
    try {
      const endpoint = companyId
        ? `/api/admin/siae/companies/${companyId}/audit-logs`
        : '/api/siae/companies/audit-logs';
      return await this.get<SiaeAuditLog[]>(endpoint);
    } catch (error) {
      console.error('Error fetching SIAE audit logs:', error);
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

  async getSIAESystemConfig(): Promise<any> {
    try {
      return await this.get('/api/siae/config');
    } catch {
      return null;
    }
  }

  async updateSIAESystemConfig(config: any): Promise<any> {
    return this.patch('/api/siae/config', config);
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
      return await this.get<AdminEvent[]>('/api/events');
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
      return await this.get<AdminCompany[]>('/api/companies');
    } catch {
      return [];
    }
  }

  async getAdminCompanyDetail(companyId: string): Promise<any> {
    try {
      return await this.get(`/api/companies/${companyId}`);
    } catch {
      return null;
    }
  }

  async getAdminUsers(): Promise<AdminUser[]> {
    try {
      return await this.get<AdminUser[]>('/api/users');
    } catch {
      return [];
    }
  }

  async getAdminUserDetail(userId: string): Promise<any> {
    try {
      return await this.get(`/api/users/${userId}`);
    } catch {
      return null;
    }
  }

  async getAdminEventDetail(eventId: string): Promise<AdminEventDetail> {
    return this.get<AdminEventDetail>(`/api/events/${eventId}`);
  }

  async getNameChanges(params?: { companyId?: string; eventId?: string; status?: string; page?: number }): Promise<{ nameChanges: SIAENameChange[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.companyId) queryParams.append('companyId', params.companyId);
      if (params?.eventId) queryParams.append('eventId', params.eventId);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.page) queryParams.append('page', String(params.page));
      const query = queryParams.toString();
      return await this.get<{ nameChanges: SIAENameChange[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/api/siae/admin/name-changes${query ? `?${query}` : ''}`);
    } catch {
      return { nameChanges: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
    }
  }

  async getNameChangesFilters(): Promise<{ companies: { id: string; name: string }[]; events: { id: string; name: string; companyId: string }[]; statuses: string[] }> {
    try {
      return await this.get('/api/siae/admin/name-changes/filters');
    } catch {
      return { companies: [], events: [], statuses: [] };
    }
  }

  async approveNameChange(id: string): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>(`/api/siae/admin/name-changes/${id}/process`, { action: 'approve' });
  }

  async rejectNameChange(id: string, rejectionReason?: string): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>(`/api/siae/admin/name-changes/${id}/process`, { action: 'reject', rejectionReason });
  }

  // Admin Billing API
  async getAdminBillingPlans(): Promise<BillingPlan[]> {
    try {
      return await this.get<BillingPlan[]>('/api/admin/billing/plans');
    } catch {
      return [];
    }
  }

  async createAdminBillingPlan(plan: Omit<BillingPlan, 'id'>): Promise<BillingPlan> {
    return this.post<BillingPlan>('/api/admin/billing/plans', plan);
  }

  async updateAdminBillingPlan(id: string, plan: Partial<BillingPlan>): Promise<BillingPlan> {
    return this.put<BillingPlan>(`/api/admin/billing/plans/${id}`, plan);
  }

  async deleteAdminBillingPlan(id: string): Promise<void> {
    return this.delete(`/api/admin/billing/plans/${id}`);
  }

  async getAdminBillingOrganizers(): Promise<BillingOrganizer[]> {
    try {
      return await this.get<BillingOrganizer[]>('/api/admin/billing/organizers');
    } catch {
      return [];
    }
  }

  async getAdminBillingOrganizerDetail(companyId: string): Promise<BillingOrganizerDetail> {
    return this.get<BillingOrganizerDetail>(`/api/admin/billing/organizers/${companyId}`);
  }

  async updateOrganizerSubscription(companyId: string, data: { planId: string }): Promise<void> {
    return this.put(`/api/admin/billing/organizers/${companyId}/subscription`, data);
  }

  async updateOrganizerCommissions(companyId: string, data: { ticketCommission: number; walletCommission: number }): Promise<void> {
    return this.put(`/api/admin/billing/organizers/${companyId}/commissions`, data);
  }

  async getAdminBillingInvoicesAll(): Promise<AdminBillingInvoice[]> {
    try {
      return await this.get<AdminBillingInvoice[]>('/api/admin/billing/invoices');
    } catch {
      return [];
    }
  }

  async markInvoicePaid(invoiceId: string): Promise<void> {
    return this.put(`/api/admin/billing/invoices/${invoiceId}/mark-paid`);
  }

  async getAdminBillingReports(period?: string): Promise<BillingReportData> {
    try {
      const params = period ? `?period=${period}` : '';
      return await this.get<BillingReportData>(`/api/admin/billing/reports/sales${params}`);
    } catch {
      return { totalSales: 0, totalCommissions: 0, byOrganizer: [], byMonth: [] };
    }
  }

  // Admin Stripe API
  async getStripeTransactions(): Promise<StripeTransactionData[]> {
    try {
      return await this.get<StripeTransactionData[]>('/api/siae/transactions');
    } catch {
      return [];
    }
  }

  async getStripeMode(): Promise<StripeModeResponse> {
    try {
      return await this.get<StripeModeResponse>('/api/public/stripe-mode');
    } catch {
      return { mode: 'sandbox', isProduction: false };
    }
  }

  // Admin Site Settings API
  async getAdminSiteSettings(): Promise<SiteSettings> {
    try {
      return await this.get<SiteSettings>('/api/admin/site-settings');
    } catch {
      return { maintenanceMode: false, allowRegistrations: true, defaultLanguage: 'it' };
    }
  }

  async updateAdminSiteSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    return this.patch<SiteSettings>('/api/admin/site-settings', settings);
  }

  // Admin SIAE Extended API
  async getAdminSIAEApprovals(): Promise<SIAEApproval[]> {
    try {
      return await this.get<SIAEApproval[]>('/api/admin/siae/approvals');
    } catch {
      return [];
    }
  }

  async approveAdminSIAE(id: string): Promise<void> {
    return this.post(`/api/admin/siae/approvals/${id}/approve`);
  }

  async rejectAdminSIAE(id: string, reason: string): Promise<void> {
    return this.post(`/api/admin/siae/approvals/${id}/reject`, { reason });
  }

  async getAdminSIAECards(): Promise<SIAECard[]> {
    try {
      return await this.get<SIAECard[]>('/api/admin/siae/cards');
    } catch {
      return [];
    }
  }

  async getAdminSIAETables(): Promise<SIAETable[]> {
    try {
      return await this.get<SIAETable[]>('/api/admin/siae/tables');
    } catch {
      return [];
    }
  }

  async updateAdminSIAETable(id: string, data: Partial<SIAETable>): Promise<SIAETable> {
    return this.put<SIAETable>(`/api/admin/siae/tables/${id}`, data);
  }

  async getAdminSIAETicketTypes(): Promise<(SIAETicketType & { companyId?: string })[]> {
    try {
      return await this.get<(SIAETicketType & { companyId?: string })[]>('/api/siae/ticket-types');
    } catch {
      return [];
    }
  }

  async getAdminSIAEBoxOfficeSessions(): Promise<(SiaeBoxOfficeSession & { userName?: string; emissionChannelName?: string })[]> {
    try {
      return await this.get<(SiaeBoxOfficeSession & { userName?: string; emissionChannelName?: string })[]>('/api/siae/admin/box-office/sessions');
    } catch {
      return [];
    }
  }

  async getAdminDigitalTemplates(): Promise<DigitalTicketTemplate[]> {
    try {
      return await this.get<DigitalTicketTemplate[]>('/api/digital-templates');
    } catch {
      return [];
    }
  }

  async updateAdminDigitalTemplate(id: string, data: Partial<DigitalTicketTemplate>): Promise<DigitalTicketTemplate> {
    return this.put<DigitalTicketTemplate>(`/api/digital-templates/${id}`, data);
  }

  // Gestore Marketing API - Loyalty
  async getGestoreLoyaltyPrograms(): Promise<LoyaltyProgram[]> {
    try {
      return await this.get<LoyaltyProgram[]>('/api/gestore/loyalty/programs');
    } catch {
      return [];
    }
  }

  async createLoyaltyProgram(program: Omit<LoyaltyProgram, 'id'>): Promise<LoyaltyProgram> {
    return this.post<LoyaltyProgram>('/api/gestore/loyalty/programs', program);
  }

  async updateLoyaltyProgram(id: string, program: Partial<LoyaltyProgram>): Promise<LoyaltyProgram> {
    return this.put<LoyaltyProgram>(`/api/gestore/loyalty/programs/${id}`, program);
  }

  async getLoyaltyRewards(programId: string): Promise<LoyaltyReward[]> {
    try {
      return await this.get<LoyaltyReward[]>(`/api/gestore/loyalty/programs/${programId}/rewards`);
    } catch {
      return [];
    }
  }

  async createLoyaltyReward(programId: string, reward: Omit<LoyaltyReward, 'id'>): Promise<LoyaltyReward> {
    return this.post<LoyaltyReward>(`/api/gestore/loyalty/programs/${programId}/rewards`, reward);
  }

  async getLoyaltyStats(): Promise<LoyaltyStats> {
    try {
      return await this.get<LoyaltyStats>('/api/gestore/loyalty/stats');
    } catch {
      return { totalMembers: 0, activeMembers: 0, pointsIssued: 0, pointsRedeemed: 0, rewardsRedeemed: 0 };
    }
  }

  // Gestore Marketing API - Referral
  async getGestoreReferralProgram(): Promise<ReferralProgram | null> {
    try {
      return await this.get<ReferralProgram>('/api/gestore/referral/program');
    } catch {
      return null;
    }
  }

  async createReferralProgram(program: Omit<ReferralProgram, 'id'>): Promise<ReferralProgram> {
    return this.post<ReferralProgram>('/api/gestore/referral/program', program);
  }

  async updateReferralProgram(id: string, program: Partial<ReferralProgram>): Promise<ReferralProgram> {
    return this.put<ReferralProgram>(`/api/gestore/referral/program/${id}`, program);
  }

  async getReferralStats(): Promise<ReferralStats> {
    try {
      return await this.get<ReferralStats>('/api/gestore/referral/stats');
    } catch {
      return { totalReferrals: 0, successfulReferrals: 0, pendingReferrals: 0, totalPointsAwarded: 0 };
    }
  }

  async getReferralLeaderboard(): Promise<ReferralLeader[]> {
    try {
      return await this.get<ReferralLeader[]>('/api/gestore/referral/leaderboard');
    } catch {
      return [];
    }
  }

  // Gestore Product Bundles API
  async getGestoreProductBundles(): Promise<ProductBundle[]> {
    try {
      return await this.get<ProductBundle[]>('/api/bundles');
    } catch {
      return [];
    }
  }

  async createProductBundle(bundle: Omit<ProductBundle, 'id'>): Promise<ProductBundle> {
    return this.post<ProductBundle>('/api/bundles', bundle);
  }

  async updateProductBundle(id: string, bundle: Partial<ProductBundle>): Promise<ProductBundle> {
    return this.put<ProductBundle>(`/api/bundles/${id}`, bundle);
  }

  async deleteProductBundle(id: string): Promise<void> {
    return this.delete(`/api/bundles/${id}`);
  }

  async getProductBundleStats(): Promise<BundleStats> {
    try {
      return await this.get<BundleStats>('/api/bundles/stats');
    } catch {
      return { totalBundles: 0, activeBundles: 0, totalSold: 0, totalRevenue: 0 };
    }
  }

  // Gestore Event Hub API
  async getEventHubData(eventId: string): Promise<EventHubData> {
    return this.get<EventHubData>(`/api/gestore/events/${eventId}/hub`);
  }

  async getEventHubTicketing(eventId: string): Promise<EventHubTicketing> {
    return this.get<EventHubTicketing>(`/api/gestore/events/${eventId}/hub/ticketing`);
  }

  async getEventHubGuests(eventId: string): Promise<EventHubGuest[]> {
    return this.get<EventHubGuest[]>(`/api/gestore/events/${eventId}/hub/guests`);
  }

  async getEventHubTables(eventId: string): Promise<EventHubTable[]> {
    return this.get<EventHubTable[]>(`/api/gestore/events/${eventId}/hub/tables`);
  }

  async getEventHubStaff(eventId: string): Promise<EventHubStaff[]> {
    return this.get<EventHubStaff[]>(`/api/gestore/events/${eventId}/hub/staff`);
  }

  async getEventHubInventory(eventId: string): Promise<EventHubInventory> {
    return this.get<EventHubInventory>(`/api/gestore/events/${eventId}/hub/inventory`);
  }

  async getEventHubFinance(eventId: string): Promise<EventHubFinance> {
    return this.get<EventHubFinance>(`/api/gestore/events/${eventId}/hub/finance`);
  }

  // Gestore Event Formats API
  async getEventFormats(): Promise<EventFormat[]> {
    try {
      return await this.get<EventFormat[]>('/api/gestore/event-formats');
    } catch {
      return [];
    }
  }

  async createEventFormat(format: Omit<EventFormat, 'id'>): Promise<EventFormat> {
    return this.post<EventFormat>('/api/gestore/event-formats', format);
  }

  async updateEventFormat(id: string, format: Partial<EventFormat>): Promise<EventFormat> {
    return this.put<EventFormat>(`/api/gestore/event-formats/${id}`, format);
  }

  async deleteEventFormat(id: string): Promise<void> {
    return this.delete(`/api/gestore/event-formats/${id}`);
  }

  // Gestore Warehouse Returns API
  async getWarehouseReturns(eventId?: string): Promise<WarehouseReturn[]> {
    try {
      const params = eventId ? `?eventId=${eventId}` : '';
      return await this.get<WarehouseReturn[]>(`/api/gestore/warehouse/returns${params}`);
    } catch {
      return [];
    }
  }

  async createWarehouseReturn(data: CreateWarehouseReturn): Promise<WarehouseReturn> {
    return this.post<WarehouseReturn>('/api/gestore/warehouse/returns', data);
  }

  async getWarehouseReturnStats(): Promise<WarehouseReturnStats> {
    try {
      return await this.get<WarehouseReturnStats>('/api/gestore/warehouse/returns/stats');
    } catch {
      return { totalReturns: 0, pendingReturns: 0, completedReturns: 0, totalItemsReturned: 0 };
    }
  }

  // Gestore Marketing Dashboard API
  async getMarketingDashboardStats(): Promise<MarketingDashboardStats> {
    try {
      return await this.get<MarketingDashboardStats>('/api/gestore/marketing/dashboard');
    } catch {
      return { 
        totalCustomers: 0, 
        activeCustomers: 0, 
        emailsSent: 0, 
        emailOpenRate: 0, 
        loyaltyMembers: 0, 
        referralCount: 0 
      };
    }
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

export interface SIAENameChange {
  id: string;
  originalTicketId: string;
  newTicketId: string | null;
  newFirstName: string;
  newLastName: string;
  newEmail: string | null;
  fee: string | null;
  paymentStatus: string;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
  processedAt: string | null;
  sigilloFiscaleOriginale: string | null;
  ticket: {
    id: string;
    ticketCode: string;
    participantFirstName: string | null;
    participantLastName: string | null;
    ticketedEventId: string;
    sigilloFiscale: string | null;
  };
  ticketedEvent: {
    id: string;
    eventId: string;
    companyId: string;
    nameChangeFee: string | null;
  };
  event: {
    id: string;
    name: string;
    startDatetime: string;
  };
  company: {
    id: string;
    name: string;
  };
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

export interface SIAEResale {
  id: string;
  originalTicketId: string;
  newTicketId: string | null;
  sellerId: string;
  buyerId: string | null;
  originalPrice: string | number;
  resalePrice: string | number;
  platformFee: string | number;
  prezzoMassimo: string | number | null;
  causaleRivendita: string;
  causaleDettaglio: string | null;
  venditoreVerificato: boolean;
  venditoreDocumentoTipo: string | null;
  acquirenteVerificato: boolean;
  status: 'pending' | 'listed' | 'sold' | 'fulfilled' | 'cancelled' | 'paid' | 'reserved' | 'expired' | 'rejected';
  ticketCode?: string;
  eventName?: string;
  eventDate?: string;
  sectorName?: string;
  sellerName?: string;
  buyerName?: string | null;
  createdAt?: string;
  updatedAt?: string;
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

export interface SIAESubscription {
  id: string;
  subscriptionCode: string;
  customerId: string;
  holderFirstName: string;
  holderLastName: string;
  status: 'active' | 'pending' | 'expired' | 'cancelled';
  validFrom: string;
  validTo: string;
  eventsCount: number;
  totalAmount: number | string;
  companyId?: string;
  companyName?: string;
  eventName?: string;
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

export interface SiaeBoxOfficeSession {
  id: string;
  userId: string;
  emissionChannelId: string;
  locationId: string | null;
  openedAt: string;
  closedAt: string | null;
  cashTotal: string | number;
  cardTotal: string | number;
  ticketsSold: number;
  ticketsCancelled: number;
  expectedCash: string | number | null;
  actualCash: string | number | null;
  difference: string | number | null;
  status: 'open' | 'closed' | 'reconciled';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
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
  reportType: 'RCA' | 'RMG' | 'RPM' | string;
  status: 'sent' | 'pending' | 'error' | 'confirmed' | 'accepted' | 'rejected' | 'draft' | string;
  eventId?: string;
  eventName?: string;
  companyName?: string;
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

// SIAE Audit Log Types (detailed audit log for admin)
export interface SiaeAuditLog {
  id: string;
  companyId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string | null;
  oldData: string | null;
  newData: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  fiscalSealCode: string | null;
  cardCode: string | null;
  createdAt: string;
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

// Admin Billing Types - OrganizerPlan from backend schema
export interface BillingPlan {
  id: string;
  name: string;
  type: 'monthly' | 'per_event';
  price: string;
  durationDays: number | null;
  eventsIncluded: number | null;
  description: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BillingOrganizer {
  id: string;
  companyId: string;
  companyName: string;
  planId?: string;
  planName?: string;
  status: 'active' | 'suspended' | 'trial';
  monthlyRevenue: number;
  totalEvents: number;
  walletBalance: number;
  lastPayment?: string;
}

export interface BillingOrganizerDetail extends BillingOrganizer {
  ticketCommission: number;
  walletCommission: number;
  invoices: AdminBillingInvoice[];
  paymentHistory: PaymentRecord[];
}

export interface AdminBillingInvoice {
  id: string;
  invoiceNumber: string;
  companyId: string;
  companyName: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  method: string;
  status: string;
}

export interface BillingReportData {
  totalSales: number;
  totalCommissions: number;
  byOrganizer: OrganizerSalesData[];
  byMonth: MonthlySalesData[];
}

export interface OrganizerSalesData {
  companyId: string;
  companyName: string;
  totalSales: number;
  commissions: number;
  ticketsSold: number;
}

export interface MonthlySalesData {
  month: string;
  sales: number;
  commissions: number;
  ticketsSold: number;
}

// Admin Site Settings Types
export interface SiteSettings {
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  defaultLanguage: string;
  supportEmail?: string;
  termsUrl?: string;
  privacyUrl?: string;
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  cookie_consent_enabled?: boolean;
  cookie_consent_text?: string;
  privacy_policy_url?: string;
  terms_of_service_url?: string;
  contact_email?: string;
  support_phone?: string;
}

// Admin SIAE Extended Types
export interface SIAEApproval {
  id: string;
  companyId: string;
  companyName: string;
  requestType: 'activation' | 'config_change' | 'certificate_renewal';
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  details: string;
  documentUrl?: string;
}

export interface SIAECard {
  id: string;
  serialNumber: string;
  companyId: string;
  companyName: string;
  status: 'active' | 'expired' | 'revoked';
  issueDate: string;
  expiryDate: string;
  certificateType: string;
}

export interface SIAETable {
  id: string;
  tableName: string;
  code: string;
  description: string;
  category: string;
  isActive: boolean;
  lastUpdated: string;
}

export interface DigitalTicketTemplate {
  id: string;
  companyId?: string | null;
  name: string;
  description?: string | null;
  isDefault: boolean;
  isActive: boolean;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  logoUrl?: string | null;
  logoPosition: 'top-left' | 'top-center' | 'top-right';
  logoSize: 'small' | 'medium' | 'large';
  qrSize: number;
  qrPosition: 'center' | 'bottom-center' | 'bottom-left';
  qrStyle: 'square' | 'rounded' | 'dots';
  qrForegroundColor: string;
  qrBackgroundColor: string;
  backgroundStyle: 'solid' | 'gradient' | 'pattern';
  gradientDirection: 'to-bottom' | 'to-right' | 'radial';
  showEventName: boolean;
  showEventDate: boolean;
  showEventTime: boolean;
  showVenue: boolean;
  showPrice: boolean;
  showTicketType: boolean;
  showSector: boolean;
  showSeat: boolean;
  showBuyerName: boolean;
  showFiscalSeal: boolean;
  showPerforatedEdge: boolean;
  fontFamily: string;
  titleFontSize: number;
  bodyFontSize: number;
  createdAt: string;
  updatedAt: string;
}

// Gestore Marketing - Loyalty Types
export interface LoyaltyProgram {
  id: string;
  name: string;
  description: string;
  pointsPerEuro: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  membersCount: number;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  type: 'discount' | 'freebie' | 'upgrade' | 'experience';
  value: number;
  imageUrl?: string;
  availableQuantity: number;
  redeemedCount: number;
  isActive: boolean;
}

export interface LoyaltyStats {
  totalMembers: number;
  activeMembers: number;
  pointsIssued: number;
  pointsRedeemed: number;
  rewardsRedeemed: number;
}

// Gestore Marketing - Referral Types
export interface ReferralProgram {
  id: string;
  name: string;
  description: string;
  referrerReward: number;
  refereeReward: number;
  rewardType: 'points' | 'discount' | 'credit';
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalPointsAwarded: number;
}

export interface ReferralLeader {
  rank: number;
  userId: string;
  userName: string;
  referralCount: number;
  pointsEarned: number;
}

// Gestore Product Bundle Types
export interface ProductBundle {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  imageUrl?: string;
  items: BundleItem[];
  isActive: boolean;
  soldCount: number;
  startDate?: string;
  endDate?: string;
  eventId?: string;
}

export interface BundleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
}

export interface BundleStats {
  totalBundles: number;
  activeBundles: number;
  totalSold: number;
  totalRevenue: number;
}

// Gestore Event Hub Types
export interface EventHubData {
  event: {
    id: string;
    name: string;
    date: string;
    location: string;
    status: 'upcoming' | 'live' | 'ended';
  };
  overview: {
    ticketsSold: number;
    totalCapacity: number;
    revenue: number;
    guestsCheckedIn: number;
    tablesBooked: number;
    staffOnDuty: number;
  };
}

export interface EventHubTicketing {
  soldByType: { type: string; count: number; revenue: number }[];
  salesTimeline: { hour: string; count: number }[];
  recentSales: { time: string; type: string; amount: number }[];
}

export interface EventHubGuest {
  id: string;
  name: string;
  email: string;
  ticketType: string;
  checkedIn: boolean;
  checkInTime?: string;
}

export interface EventHubTable {
  id: string;
  name: string;
  capacity: number;
  status: 'available' | 'reserved' | 'occupied';
  reservedBy?: string;
}

export interface EventHubStaff {
  id: string;
  name: string;
  role: string;
  station?: string;
  status: 'active' | 'break' | 'offline';
}

export interface EventHubInventory {
  stations: { name: string; itemsSold: number; revenue: number }[];
  lowStock: { item: string; remaining: number; station: string }[];
  consumption: { item: string; consumed: number; percentage: number }[];
}

export interface EventHubFinance {
  totalRevenue: number;
  ticketRevenue: number;
  barRevenue: number;
  tableRevenue: number;
  expenses: number;
  netProfit: number;
  paymentMethods: { method: string; amount: number }[];
}

// Gestore Event Format Types
export interface EventFormat {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  defaultDuration: number;
  defaultCapacity: number;
  ticketTypes: string[];
  isActive: boolean;
  eventsCount: number;
}

// Gestore Warehouse Return Types
export interface WarehouseReturn {
  id: string;
  eventId: string;
  eventName: string;
  returnDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  items: WarehouseReturnItem[];
  notes?: string;
  processedBy?: string;
}

export interface WarehouseReturnItem {
  productId: string;
  productName: string;
  quantitySent: number;
  quantityReturned: number;
  quantityConsumed: number;
  stationName: string;
}

export interface CreateWarehouseReturn {
  eventId: string;
  items: { productId: string; quantityReturned: number; stationId: string }[];
  notes?: string;
}

export interface WarehouseReturnStats {
  totalReturns: number;
  pendingReturns: number;
  completedReturns: number;
  totalItemsReturned: number;
}

// Marketing Dashboard Types
export interface MarketingDashboardStats {
  totalCustomers: number;
  activeCustomers: number;
  emailsSent: number;
  emailOpenRate: number;
  loyaltyMembers: number;
  referralCount: number;
}

export interface IdentityDocument {
  id: string;
  documentType: string;
  documentNumber: string | null;
  verificationStatus: 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired';
  verificationMethod: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  ocrEnabled: boolean;
  ocrStatus: string | null;
  ocrConfidenceScore: string | null;
  isExpired: boolean;
  expiryDate: string | null;
  createdAt: string;
}

export interface IdentityDocumentUploadUrls {
  front: { uploadUrl: string; objectPath: string };
  back?: { uploadUrl: string; objectPath: string };
  selfie?: { uploadUrl: string; objectPath: string };
}

export interface IdentityVerificationStatus {
  verified: boolean;
  deadline: string | null;
  daysRemaining: number | null;
  blocked: boolean;
}

export const api = new ApiClient(API_BASE_URL);
export default api;
