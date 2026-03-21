"use strict";
// ============================================================
// Briefli — Shared Constants
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_CODES = exports.JWT_REFRESH_EXPIRY = exports.JWT_ACCESS_EXPIRY = exports.PAGINATION_MAX_LIMIT = exports.PAGINATION_DEFAULT_LIMIT = exports.MAX_FILE_SIZE_BYTES = exports.ALLOWED_MIME_TYPES = exports.MILESTONE_TEMPLATES = exports.INVOICE_STATUS_COLORS = exports.INVOICE_STATUS_LABELS = exports.USER_ROLE_LABELS = exports.EVENT_TYPE_COLORS = exports.EVENT_TYPE_LABELS = exports.CASE_TYPE_LABELS = exports.CASE_STATUS_COLORS = exports.CASE_STATUS_LABELS = void 0;
exports.CASE_STATUS_LABELS = {
    INTAKE: 'Intake',
    ACTIVE: 'Active',
    PENDING_COURT: 'Pending Court',
    JUDGMENT: 'Judgment',
    APPEAL: 'Appeal',
    CLOSED: 'Closed',
};
exports.CASE_STATUS_COLORS = {
    INTAKE: 'bg-gray-100 text-gray-700',
    ACTIVE: 'bg-blue-100 text-blue-700',
    PENDING_COURT: 'bg-yellow-100 text-yellow-700',
    JUDGMENT: 'bg-orange-100 text-orange-700',
    APPEAL: 'bg-purple-100 text-purple-700',
    CLOSED: 'bg-green-100 text-green-700',
};
exports.CASE_TYPE_LABELS = {
    EVICTION: 'Eviction',
    NON_PAYMENT: 'Non-Payment',
    LEASE_DISPUTE: 'Lease Dispute',
    HABITABILITY: 'Habitability',
    OTHER: 'Other',
};
exports.EVENT_TYPE_LABELS = {
    COURT_HEARING: 'Court Hearing',
    DEADLINE: 'Deadline',
    MEETING: 'Meeting',
    DEPOSITION: 'Deposition',
    TASK: 'Task',
};
exports.EVENT_TYPE_COLORS = {
    COURT_HEARING: '#ef4444',
    DEADLINE: '#f97316',
    MEETING: '#3b82f6',
    DEPOSITION: '#8b5cf6',
    TASK: '#6b7280',
};
exports.USER_ROLE_LABELS = {
    ATTORNEY: 'Attorney',
    PARALEGAL: 'Paralegal',
    ADMIN: 'Admin',
    STAFF: 'Staff',
    CLIENT: 'Client',
};
exports.INVOICE_STATUS_LABELS = {
    DRAFT: 'Draft',
    SENT: 'Sent',
    VIEWED: 'Viewed',
    PAID: 'Paid',
    OVERDUE: 'Overdue',
    VOID: 'Void',
};
exports.INVOICE_STATUS_COLORS = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SENT: 'bg-blue-100 text-blue-700',
    VIEWED: 'bg-indigo-100 text-indigo-700',
    PAID: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
    VOID: 'bg-gray-100 text-gray-500',
};
// Milestone templates per case type
exports.MILESTONE_TEMPLATES = {
    EVICTION: [
        'Notice to Quit',
        'Complaint Filed',
        'Summons Issued',
        'Service of Process',
        'Court Hearing',
        'Judgment',
        'Warrant of Removal',
        'Lockout',
    ],
    NON_PAYMENT: [
        'Demand Notice',
        'Complaint Filed',
        'Hearing Scheduled',
        'Hearing',
        'Judgment',
        'Collection Action',
    ],
    LEASE_DISPUTE: [
        'Initial Consultation',
        'Demand Letter',
        'Response Period',
        'Mediation',
        'Filing if Needed',
        'Resolution',
    ],
    HABITABILITY: [
        'Inspection Request',
        'Notice to Landlord',
        'Response Period',
        'Agency Complaint',
        'Hearing',
        'Resolution',
    ],
};
exports.ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
];
exports.MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
exports.PAGINATION_DEFAULT_LIMIT = 20;
exports.PAGINATION_MAX_LIMIT = 100;
exports.JWT_ACCESS_EXPIRY = '15m';
exports.JWT_REFRESH_EXPIRY = '30d';
exports.ERROR_CODES = {
    // Auth
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    MFA_REQUIRED: 'MFA_REQUIRED',
    MFA_INVALID: 'MFA_INVALID',
    // Cases
    CASE_NOT_FOUND: 'CASE_NOT_FOUND',
    CASE_NO_ATTORNEY: 'CASE_NO_ATTORNEY',
    CASE_CONFLICT: 'CASE_CONFLICT',
    // Documents
    DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
    INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    // General
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    FIRM_ISOLATION_VIOLATION: 'FIRM_ISOLATION_VIOLATION',
    NOT_FOUND: 'NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
};
//# sourceMappingURL=index.js.map