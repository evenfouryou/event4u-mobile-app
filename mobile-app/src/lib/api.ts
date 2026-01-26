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
  eventStart: string;
  eventEnd: string;
  locationName: string;
  guestCount?: number;
  tableCount?: number;
  earnings?: number;
}

export interface PrEventDetail extends PrEvent {
  locationAddress?: string;
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
      eventStart: e.eventStart,
      eventEnd: e.eventEnd,
      locationName: e.locationName,
      guestCount: 0,
      tableCount: 0,
      earnings: 0,
    }));
  }

  async getPrEventDetail(eventId: string): Promise<PrEventDetail> {
    const event = await this.get<any>(`/api/pr/events/${eventId}`);
    return {
      id: event.id,
      eventId: event.id,
      eventName: event.name,
      eventStart: event.startDatetime,
      eventEnd: event.endDatetime,
      locationName: event.locationName || 'Location',
      locationAddress: event.locationAddress,
    };
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

  async addPrGuest(eventId: string, data: { firstName: string; lastName: string; phone?: string }): Promise<PrGuestListEntry> {
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
}

export const api = new ApiClient(API_BASE_URL);
export default api;
