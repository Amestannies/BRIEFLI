"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateClientSchema = exports.CreateMilestoneSchema = exports.CreateInvoiceSchema = exports.CreateTimeEntrySchema = exports.UpdateEventSchema = exports.CreateEventSchema = exports.UpdateDocumentSchema = exports.ConfirmUploadSchema = exports.CaseFiltersSchema = exports.UpdateCaseSchema = exports.CreateCaseSchema = exports.ResetPasswordSchema = exports.RegisterSchema = exports.LoginSchema = void 0;
const zod_1 = require("zod");
// ============================================================
// Briefli — Shared Zod Validation Schemas
// ============================================================
// --- Auth ---
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    mfaCode: zod_1.z.string().length(6).optional(),
});
exports.RegisterSchema = zod_1.z.object({
    firmName: zod_1.z.string().min(2).max(100),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
    firstName: zod_1.z.string().min(1).max(50),
    lastName: zod_1.z.string().min(1).max(50),
});
exports.ResetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string(),
    password: zod_1.z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
});
// --- Cases ---
exports.CreateCaseSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    caseType: zod_1.z.enum(['EVICTION', 'NON_PAYMENT', 'LEASE_DISPUTE', 'HABITABILITY', 'OTHER']),
    propertyAddress: zod_1.z.string().optional(),
    court: zod_1.z.string().optional(),
    opposingCounsel: zod_1.z.string().optional(),
    expectedCloseDate: zod_1.z.string().datetime().optional(),
    description: zod_1.z.string().optional(),
});
exports.UpdateCaseSchema = exports.CreateCaseSchema.partial().extend({
    status: zod_1.z
        .enum(['INTAKE', 'ACTIVE', 'PENDING_COURT', 'JUDGMENT', 'APPEAL', 'CLOSED'])
        .optional(),
    judge: zod_1.z.string().optional(),
    caseNumber: zod_1.z.string().optional(),
});
exports.CaseFiltersSchema = zod_1.z.object({
    status: zod_1.z
        .enum(['INTAKE', 'ACTIVE', 'PENDING_COURT', 'JUDGMENT', 'APPEAL', 'CLOSED'])
        .optional(),
    caseType: zod_1.z.enum(['EVICTION', 'NON_PAYMENT', 'LEASE_DISPUTE', 'HABITABILITY', 'OTHER']).optional(),
    userId: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
});
// --- Documents ---
exports.ConfirmUploadSchema = zod_1.z.object({
    fileKey: zod_1.z.string(),
    caseId: zod_1.z.string().optional(),
    fileName: zod_1.z.string(),
    mimeType: zod_1.z.string(),
    fileSize: zod_1.z.number().int().positive(),
    folder: zod_1.z.string().default('general'),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.UpdateDocumentSchema = zod_1.z.object({
    folder: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    fileName: zod_1.z.string().optional(),
});
// --- Calendar ---
exports.CreateEventSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().optional(),
    eventType: zod_1.z.enum(['COURT_HEARING', 'DEADLINE', 'MEETING', 'DEPOSITION', 'TASK']),
    startTime: zod_1.z.string().datetime(),
    endTime: zod_1.z.string().datetime(),
    location: zod_1.z.string().optional(),
    isAllDay: zod_1.z.boolean().default(false),
    caseId: zod_1.z.string().optional(),
    attendeeIds: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.UpdateEventSchema = exports.CreateEventSchema.partial();
// --- Billing ---
exports.CreateTimeEntrySchema = zod_1.z.object({
    caseId: zod_1.z.string(),
    description: zod_1.z.string().min(1),
    durationMinutes: zod_1.z.number().int().positive(),
    hourlyRate: zod_1.z.string().regex(/^\d+(\.\d{1,2})?$/),
    isBillable: zod_1.z.boolean().default(true),
    date: zod_1.z.string().datetime(),
});
exports.CreateInvoiceSchema = zod_1.z.object({
    caseId: zod_1.z.string(),
    clientId: zod_1.z.string(),
    timeEntryIds: zod_1.z.array(zod_1.z.string()).default([]),
    lineItems: zod_1.z
        .array(zod_1.z.object({
        description: zod_1.z.string(),
        quantity: zod_1.z.number().positive(),
        unitPrice: zod_1.z.string().regex(/^\d+(\.\d{1,2})?$/),
        amount: zod_1.z.string().regex(/^\d+(\.\d{1,2})?$/),
        timeEntryId: zod_1.z.string().optional(),
    }))
        .min(1),
    dueDate: zod_1.z.string().datetime(),
    notes: zod_1.z.string().optional(),
});
// --- Milestones ---
exports.CreateMilestoneSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().optional(),
    dueDate: zod_1.z.string().datetime().optional(),
    order: zod_1.z.number().int().min(0),
});
// --- Client ---
exports.CreateClientSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    firstName: zod_1.z.string().min(1).max(50),
    lastName: zod_1.z.string().min(1).max(50),
    phone: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    preferredLang: zod_1.z.string().default('en'),
});
//# sourceMappingURL=index.js.map