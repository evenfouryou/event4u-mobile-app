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

  // PR (Promoter) APIs
  async getPrProfile(): Promise<PrProfile | null> {
    return this.get<PrProfile | null>('/api/pr/profile');
  }

  async getPrEvents(): Promise<PrEvent[]> {
    return this.get<PrEvent[]>('/api/pr/my-events');
  }

  async getPrEventById(eventId: string): Promise<PublicEvent> {
    return this.get<PublicEvent>(`/api/e4u/events/${eventId}`);
  }

  async getPrEventGuestLists(eventId: string): Promise<GuestList[]> {
    return this.get<GuestList[]>(`/api/pr/events/${eventId}/guest-lists`);
  }

  async getPrEventTables(eventId: string): Promise<EventTable[]> {
    return this.get<EventTable[]>(`/api/pr/events/${eventId}/tables`);
  }

  async getPrEventBookings(eventId: string): Promise<TableBooking[]> {
    return this.get<TableBooking[]>(`/api/pr/events/${eventId}/bookings`);
  }

  async getPrEventTicketStats(eventId: string): Promise<PrTicketStats> {
    return this.get<PrTicketStats>(`/api/pr/events/${eventId}/ticket-stats`);
  }

  async getPrEventRewards(eventId: string): Promise<PrReward[]> {
    return this.get<PrReward[]>(`/api/pr/events/${eventId}/rewards`);
  }

  async getPrEventActivityLogs(eventId: string): Promise<PrActivityLog[]> {
    return this.get<PrActivityLog[]>(`/api/pr/events/${eventId}/activity-logs`);
  }
}

// PR Types
export interface PrProfile {
  id: string;
  userId: number;
  prCode: string;
  companyId: number;
  isActive: boolean;
  commissionRate: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface PrEvent {
  id: string;
  eventId: string;
  eventName: string;
  eventImageUrl: string | null;
  eventStart: string;
  eventEnd: string;
  locationName: string;
  status?: string;
}

export interface GuestList {
  id: string;
  name: string;
  listType: string;
  currentCount: number;
  maxCapacity: number | null;
}

export interface EventTable {
  id: string;
  name: string;
  capacity: number;
  minSpend: number | null;
}

export interface TableBooking {
  id: string;
  tableId: string;
  status: string;
  guestName: string;
  guestCount: number;
}

export interface PrTicketStats {
  sold: number;
  revenue: number;
  commission: number;
}

export interface PrReward {
  id: string;
  name: string;
  description: string | null;
  targetType: string;
  targetValue: number;
  rewardType: string;
  rewardValue: number;
  progress?: {
    currentValue: number;
    targetValue: number;
    isCompleted: boolean;
    rewardClaimed: boolean;
  };
}

export interface PrActivityLog {
  id: string;
  activityType: string;
  entityData: string | null;
  reason: string | null;
  createdAt: string;
}

export const api = new ApiClient(API_BASE_URL);
export default api;
