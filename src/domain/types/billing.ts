/**
 * Billing & Subscriptions Domain Types — Strict Internal Types
 */

import type {
  SubscriptionPlanId,
  SubscriptionStatus,
  SaaSSubscription,
  PaymentMethodType,
  PaymentIntent,
  PaymentIntentStatus,
  BillingInvoice,
  PaymentGatewayEvent,
  SetupState,
  SetupStatus,
  SaaSPlanDefinition,
  SaaSRegistrationPayload,
} from '../contracts';

export type {
  SubscriptionPlanId,
  SubscriptionStatus,
  SaaSSubscription,
  PaymentMethodType,
  PaymentIntent,
  PaymentIntentStatus,
  BillingInvoice,
  PaymentGatewayEvent,
  SetupState,
  SetupStatus,
  SaaSPlanDefinition,
  SaaSRegistrationPayload,
};

// ============================================
// STRICT VERSIONS
// ============================================

export interface StrictPaymentIntent {
  id: string;
  organizationId: string;
  programId?: string;
  subscriptionId?: string;
  planId: SubscriptionPlanId;
  amountCents: number;
  currency: string;
  status: PaymentIntentStatus;
  gatewayProvider: string;
  gatewayTransactionId?: string;
  gatewayPayload?: Record<string, unknown>;
  webhookReceivedAt?: string;
  reconciledAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  
  isExpired?: boolean;
  timeRemainingMs?: number;
}

export interface StrictBillingInvoice {
  id: string;
  organizationId: string;
  subscriptionId: string;
  invoiceNumber: string;
  description: string;
  amountCents: number;
  currency: string;
  status: 'paid' | 'open' | 'failed' | 'refunded';
  paymentMethod: PaymentMethodType;
  gatewayTransactionId: string;
  autoRenewalCycle: boolean;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
  
  lineItems?: InvoiceLineItem[];
  billingAddress?: BillingAddress;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  periodStart?: string;
  periodEnd?: string;
}

export interface BillingAddress {
  name: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  taxId?: string;
}

export interface StrictPaymentGatewayEvent {
  id: string;
  organizationId: string;
  subscriptionId?: string;
  provider: string;
  eventType: string;
  status: string;
  payload: Record<string, unknown>;
  createdAt: string;
  
  processed: boolean;
  processedAt?: string;
  error?: string;
  retryCount: number;
}

export interface StrictSetupState {
  id: string;
  organizationId: string;
  programId: string;
  status: SetupStatus;
  version: number;
  steps: Record<string, SetupStep>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
}

export interface SetupStep {
  status: 'pending' | 'completed' | 'failed';
  completedAt?: string;
  error?: string;
  data?: Record<string, unknown>;
}

export interface StrictSaaSPlanDefinition {
  id: SubscriptionPlanId;
  name: string;
  tagline: string;
  monthlyPriceCents: number;
  annualPriceCents?: number;
  maxShows: number;
  maxUsers: number;
  features: string[];
  highlighted?: boolean;
  limits?: PlanLimits;
}

export interface PlanLimits {
  episodesPerMonth?: number;
  storageGB?: number;
  aiGenerationsPerMonth?: number;
  teamMembers?: number;
  customDomains?: boolean;
  apiAccess?: boolean;
  sso?: boolean;
  auditLogs?: boolean;
}

// ============================================
// OPERATIONS
// ============================================

export interface SubscriptionCreateInput {
  organizationId: string;
  showId?: string;
  planId: SubscriptionPlanId;
  billingCycle: 'monthly' | 'annual';
  paymentMethodType: PaymentMethodType;
  paymentMethodToken: string;
  autoRenew?: boolean;
  trialDays?: number;
  metadata?: Record<string, unknown>;
}

export interface SubscriptionUpdateInput {
  planId?: SubscriptionPlanId;
  billingCycle?: 'monthly' | 'annual';
  autoRenew?: boolean;
  paymentMethodToken?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface SubscriptionRenewalResult {
  subscription: SaaSSubscription;
  paymentIntent: PaymentIntent;
  invoice: BillingInvoice;
  success: boolean;
  error?: string;
}

// ============================================
// WEBHOOK
// ============================================

export interface WebhookPayload {
  provider: string;
  eventType: string;
  timestamp: string;
  data: Record<string, unknown>;
  signature: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  eventId: string;
  action: 'subscription_updated' | 'payment_succeeded' | 'payment_failed' | 'subscription_canceled' | 'invoice_created' | 'ignored';
  error?: string;
}

// ============================================
// VIEW MODELS
// ============================================

export interface BillingOverview {
  plans: StrictSaaSPlanDefinition[];
  subscriptions: SubscriptionSummary[];
  paymentMethods: PaymentMethodSummary[];
  recentInvoices: BillingInvoiceSummary[];
  mrrCents: number;
  nextBillingDate?: string;
}

export interface SubscriptionSummary {
  id: string;
  planId: SubscriptionPlanId;
  planName: string;
  showId?: string;
  showTitle?: string;
  status: SubscriptionStatus;
  billingCycle: 'monthly' | 'annual';
  amountCents: number;
  currency: string;
  autoRenew: boolean;
  currentPeriodEnd: string;
  canceledAt?: string;
}

export interface PaymentMethodSummary {
  id: string;
  type: PaymentMethodType;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export interface BillingInvoiceSummary {
  id: string;
  invoiceNumber: string;
  amountCents: number;
  currency: string;
  status: 'paid' | 'open' | 'failed' | 'refunded';
  dueDate: string;
  paidAt?: string;
}