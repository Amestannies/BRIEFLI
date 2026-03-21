import { z } from 'zod';

// ============================================================
// Briefli — Shared Zod Validation Schemas
// ============================================================

// --- Auth ---

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  mfaCode: z.string().length(6).optional(),
});

export const RegisterSchema = z.object({
  firmName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});

export const ResetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
});

// --- Cases ---

export const CreateCaseSchema = z.object({
  title: z.string().min(1).max(200),
  caseType: z.enum(['EVICTION', 'NON_PAYMENT', 'LEASE_DISPUTE', 'HABITABILITY', 'OTHER']),
  propertyAddress: z.string().optional(),
  court: z.string().optional(),
  opposingCounsel: z.string().optional(),
  expectedCloseDate: z.string().datetime().optional(),
  description: z.string().optional(),
});

export const UpdateCaseSchema = CreateCaseSchema.partial().extend({
  status: z
    .enum(['INTAKE', 'ACTIVE', 'PENDING_COURT', 'JUDGMENT', 'APPEAL', 'CLOSED'])
    .optional(),
  judge: z.string().optional(),
  caseNumber: z.string().optional(),
});

export const CaseFiltersSchema = z.object({
  status: z
    .enum(['INTAKE', 'ACTIVE', 'PENDING_COURT', 'JUDGMENT', 'APPEAL', 'CLOSED'])
    .optional(),
  caseType: z.enum(['EVICTION', 'NON_PAYMENT', 'LEASE_DISPUTE', 'HABITABILITY', 'OTHER']).optional(),
  userId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// --- Documents ---

export const ConfirmUploadSchema = z.object({
  fileKey: z.string(),
  caseId: z.string().optional(),
  fileName: z.string(),
  mimeType: z.string(),
  fileSize: z.number().int().positive(),
  folder: z.string().default('general'),
  tags: z.array(z.string()).default([]),
});

export const UpdateDocumentSchema = z.object({
  folder: z.string().optional(),
  tags: z.array(z.string()).optional(),
  fileName: z.string().optional(),
});

// --- Calendar ---

export const CreateEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  eventType: z.enum(['COURT_HEARING', 'DEADLINE', 'MEETING', 'DEPOSITION', 'TASK']),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: z.string().optional(),
  isAllDay: z.boolean().default(false),
  caseId: z.string().optional(),
  attendeeIds: z.array(z.string()).default([]),
});

export const UpdateEventSchema = CreateEventSchema.partial();

// --- Billing ---

export const CreateTimeEntrySchema = z.object({
  caseId: z.string(),
  description: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  hourlyRate: z.string().regex(/^\d+(\.\d{1,2})?$/),
  isBillable: z.boolean().default(true),
  date: z.string().datetime(),
});

export const CreateInvoiceSchema = z.object({
  caseId: z.string(),
  clientId: z.string(),
  timeEntryIds: z.array(z.string()).default([]),
  lineItems: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        timeEntryId: z.string().optional(),
      }),
    )
    .min(1),
  dueDate: z.string().datetime(),
  notes: z.string().optional(),
});

// --- Milestones ---

export const CreateMilestoneSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  order: z.number().int().min(0),
});

// --- Client ---

export const CreateClientSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string().optional(),
  address: z.string().optional(),
  preferredLang: z.string().default('en'),
});

export const UpdateClientSchema = CreateClientSchema.partial();

export const ClientFiltersSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// --- Type exports ---
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type CreateCaseInput = z.infer<typeof CreateCaseSchema>;
export type UpdateCaseInput = z.infer<typeof UpdateCaseSchema>;
export type CaseFiltersInput = z.infer<typeof CaseFiltersSchema>;
export type ConfirmUploadInput = z.infer<typeof ConfirmUploadSchema>;
export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type CreateTimeEntryInput = z.infer<typeof CreateTimeEntrySchema>;
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;
