// ============================================================
// Briefli — Shared TypeScript Types
// Mirror of Prisma enums + API response shapes
// ============================================================

// --- Enums ---

export type PlanType = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export type UserRole = 'ATTORNEY' | 'PARALEGAL' | 'ADMIN' | 'STAFF' | 'CLIENT';

export type CaseType =
  | 'EVICTION'
  | 'NON_PAYMENT'
  | 'LEASE_DISPUTE'
  | 'HABITABILITY'
  | 'OTHER';

export type Discipline = 'LANDLORD_TENANT';

export type CaseStatus =
  | 'INTAKE'
  | 'ACTIVE'
  | 'PENDING_COURT'
  | 'JUDGMENT'
  | 'APPEAL'
  | 'CLOSED';

export type EventType =
  | 'COURT_HEARING'
  | 'DEADLINE'
  | 'MEETING'
  | 'DEPOSITION'
  | 'TASK';

export type InvoiceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'VIEWED'
  | 'PAID'
  | 'OVERDUE'
  | 'VOID';

export type SignatureStatus = 'NONE' | 'PENDING' | 'SIGNED' | 'DECLINED';

export type NotificationType =
  | 'EVENT_REMINDER'
  | 'DOCUMENT_UPLOADED'
  | 'CLIENT_DOCUMENT_UPLOADED'
  | 'INVOICE_PAID'
  | 'INVOICE_OVERDUE'
  | 'ECOURTS_DOCKET_UPDATE'
  | 'MILESTONE_OVERDUE'
  | 'NOTARIZATION_COMPLETE'
  | 'PORTAL_MESSAGE';

// --- Core Entity Types ---

export interface Firm {
  id: string;
  name: string;
  slug: string;
  plan: PlanType;
  logoUrl: string | null;
  primaryColor: string | null;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  firmId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  barNumber: string | null;
  avatarUrl: string | null;
  mfaEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Case {
  id: string;
  firmId: string;
  caseNumber: string | null;
  internalRef: string;
  title: string;
  caseType: CaseType;
  discipline: Discipline;
  status: CaseStatus;
  court: string | null;
  judge: string | null;
  opposingCounsel: string | null;
  propertyAddress: string | null;
  openDate: string;
  expectedCloseDate: string | null;
  closedDate: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  firmId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  address: string | null;
  portalEnabled: boolean;
  preferredLang: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  firmId: string;
  caseId: string | null;
  uploadedById: string;
  clientId: string | null;
  fileName: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  folder: string;
  tags: string[];
  version: number;
  parentDocId: string | null;
  isNotarized: boolean;
  signatureStatus: SignatureStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  firmId: string;
  caseId: string | null;
  createdById: string;
  title: string;
  description: string | null;
  eventType: EventType;
  startTime: string;
  endTime: string;
  location: string | null;
  isAllDay: boolean;
  attendeeIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  caseId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completedAt: string | null;
  completedById: string | null;
  order: number;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  firmId: string;
  caseId: string;
  userId: string;
  description: string;
  durationMinutes: number;
  hourlyRate: string;
  isBillable: boolean;
  invoiceId: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  firmId: string;
  caseId: string;
  clientId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: string;
  tax: string;
  total: string;
  dueDate: string;
  paidAt: string | null;
  stripePaymentId: string | null;
  pdfKey: string | null;
  lineItems: InvoiceLineItem[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: string;
  amount: string;
  timeEntryId?: string;
}

export interface Notification {
  id: string;
  userId: string;
  firmId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// --- API Response Shapes ---

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
  error?: never;
}

export interface ApiError {
  data?: never;
  error: {
    statusCode: number;
    message: string;
    code: string;
    timestamp: string;
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
