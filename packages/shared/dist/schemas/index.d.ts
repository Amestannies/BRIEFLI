import { z } from 'zod';
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    mfaCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    mfaCode?: string | undefined;
}, {
    email: string;
    password: string;
    mfaCode?: string | undefined;
}>;
export declare const RegisterSchema: z.ZodObject<{
    firmName: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    firmName: string;
    firstName: string;
    lastName: string;
}, {
    email: string;
    password: string;
    firmName: string;
    firstName: string;
    lastName: string;
}>;
export declare const ResetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    token: string;
}, {
    password: string;
    token: string;
}>;
export declare const CreateCaseSchema: z.ZodObject<{
    title: z.ZodString;
    caseType: z.ZodEnum<["EVICTION", "NON_PAYMENT", "LEASE_DISPUTE", "HABITABILITY", "OTHER"]>;
    propertyAddress: z.ZodOptional<z.ZodString>;
    court: z.ZodOptional<z.ZodString>;
    opposingCounsel: z.ZodOptional<z.ZodString>;
    expectedCloseDate: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    caseType: "EVICTION" | "NON_PAYMENT" | "LEASE_DISPUTE" | "HABITABILITY" | "OTHER";
    propertyAddress?: string | undefined;
    court?: string | undefined;
    opposingCounsel?: string | undefined;
    expectedCloseDate?: string | undefined;
    description?: string | undefined;
}, {
    title: string;
    caseType: "EVICTION" | "NON_PAYMENT" | "LEASE_DISPUTE" | "HABITABILITY" | "OTHER";
    propertyAddress?: string | undefined;
    court?: string | undefined;
    opposingCounsel?: string | undefined;
    expectedCloseDate?: string | undefined;
    description?: string | undefined;
}>;
export declare const UpdateCaseSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    caseType: z.ZodOptional<z.ZodEnum<["EVICTION", "NON_PAYMENT", "LEASE_DISPUTE", "HABITABILITY", "OTHER"]>>;
    propertyAddress: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    court: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    opposingCounsel: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    expectedCloseDate: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
} & {
    status: z.ZodOptional<z.ZodEnum<["INTAKE", "ACTIVE", "PENDING_COURT", "JUDGMENT", "APPEAL", "CLOSED"]>>;
    judge: z.ZodOptional<z.ZodString>;
    caseNumber: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: "INTAKE" | "ACTIVE" | "PENDING_COURT" | "JUDGMENT" | "APPEAL" | "CLOSED" | undefined;
    title?: string | undefined;
    caseType?: "EVICTION" | "NON_PAYMENT" | "LEASE_DISPUTE" | "HABITABILITY" | "OTHER" | undefined;
    propertyAddress?: string | undefined;
    court?: string | undefined;
    opposingCounsel?: string | undefined;
    expectedCloseDate?: string | undefined;
    description?: string | undefined;
    judge?: string | undefined;
    caseNumber?: string | undefined;
}, {
    status?: "INTAKE" | "ACTIVE" | "PENDING_COURT" | "JUDGMENT" | "APPEAL" | "CLOSED" | undefined;
    title?: string | undefined;
    caseType?: "EVICTION" | "NON_PAYMENT" | "LEASE_DISPUTE" | "HABITABILITY" | "OTHER" | undefined;
    propertyAddress?: string | undefined;
    court?: string | undefined;
    opposingCounsel?: string | undefined;
    expectedCloseDate?: string | undefined;
    description?: string | undefined;
    judge?: string | undefined;
    caseNumber?: string | undefined;
}>;
export declare const CaseFiltersSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["INTAKE", "ACTIVE", "PENDING_COURT", "JUDGMENT", "APPEAL", "CLOSED"]>>;
    caseType: z.ZodOptional<z.ZodEnum<["EVICTION", "NON_PAYMENT", "LEASE_DISPUTE", "HABITABILITY", "OTHER"]>>;
    userId: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    status?: "INTAKE" | "ACTIVE" | "PENDING_COURT" | "JUDGMENT" | "APPEAL" | "CLOSED" | undefined;
    caseType?: "EVICTION" | "NON_PAYMENT" | "LEASE_DISPUTE" | "HABITABILITY" | "OTHER" | undefined;
    userId?: string | undefined;
    search?: string | undefined;
}, {
    status?: "INTAKE" | "ACTIVE" | "PENDING_COURT" | "JUDGMENT" | "APPEAL" | "CLOSED" | undefined;
    caseType?: "EVICTION" | "NON_PAYMENT" | "LEASE_DISPUTE" | "HABITABILITY" | "OTHER" | undefined;
    userId?: string | undefined;
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}>;
export declare const ConfirmUploadSchema: z.ZodObject<{
    fileKey: z.ZodString;
    caseId: z.ZodOptional<z.ZodString>;
    fileName: z.ZodString;
    mimeType: z.ZodString;
    fileSize: z.ZodNumber;
    folder: z.ZodDefault<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    fileKey: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    folder: string;
    tags: string[];
    caseId?: string | undefined;
}, {
    fileKey: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    caseId?: string | undefined;
    folder?: string | undefined;
    tags?: string[] | undefined;
}>;
export declare const UpdateDocumentSchema: z.ZodObject<{
    folder: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    fileName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    fileName?: string | undefined;
    folder?: string | undefined;
    tags?: string[] | undefined;
}, {
    fileName?: string | undefined;
    folder?: string | undefined;
    tags?: string[] | undefined;
}>;
export declare const CreateEventSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    eventType: z.ZodEnum<["COURT_HEARING", "DEADLINE", "MEETING", "DEPOSITION", "TASK"]>;
    startTime: z.ZodString;
    endTime: z.ZodString;
    location: z.ZodOptional<z.ZodString>;
    isAllDay: z.ZodDefault<z.ZodBoolean>;
    caseId: z.ZodOptional<z.ZodString>;
    attendeeIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    title: string;
    eventType: "COURT_HEARING" | "DEADLINE" | "MEETING" | "DEPOSITION" | "TASK";
    startTime: string;
    endTime: string;
    isAllDay: boolean;
    attendeeIds: string[];
    description?: string | undefined;
    caseId?: string | undefined;
    location?: string | undefined;
}, {
    title: string;
    eventType: "COURT_HEARING" | "DEADLINE" | "MEETING" | "DEPOSITION" | "TASK";
    startTime: string;
    endTime: string;
    description?: string | undefined;
    caseId?: string | undefined;
    location?: string | undefined;
    isAllDay?: boolean | undefined;
    attendeeIds?: string[] | undefined;
}>;
export declare const UpdateEventSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    eventType: z.ZodOptional<z.ZodEnum<["COURT_HEARING", "DEADLINE", "MEETING", "DEPOSITION", "TASK"]>>;
    startTime: z.ZodOptional<z.ZodString>;
    endTime: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    isAllDay: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    caseId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    attendeeIds: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    description?: string | undefined;
    caseId?: string | undefined;
    eventType?: "COURT_HEARING" | "DEADLINE" | "MEETING" | "DEPOSITION" | "TASK" | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    location?: string | undefined;
    isAllDay?: boolean | undefined;
    attendeeIds?: string[] | undefined;
}, {
    title?: string | undefined;
    description?: string | undefined;
    caseId?: string | undefined;
    eventType?: "COURT_HEARING" | "DEADLINE" | "MEETING" | "DEPOSITION" | "TASK" | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    location?: string | undefined;
    isAllDay?: boolean | undefined;
    attendeeIds?: string[] | undefined;
}>;
export declare const CreateTimeEntrySchema: z.ZodObject<{
    caseId: z.ZodString;
    description: z.ZodString;
    durationMinutes: z.ZodNumber;
    hourlyRate: z.ZodString;
    isBillable: z.ZodDefault<z.ZodBoolean>;
    date: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date: string;
    description: string;
    caseId: string;
    durationMinutes: number;
    hourlyRate: string;
    isBillable: boolean;
}, {
    date: string;
    description: string;
    caseId: string;
    durationMinutes: number;
    hourlyRate: string;
    isBillable?: boolean | undefined;
}>;
export declare const CreateInvoiceSchema: z.ZodObject<{
    caseId: z.ZodString;
    clientId: z.ZodString;
    timeEntryIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    lineItems: z.ZodArray<z.ZodObject<{
        description: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodString;
        amount: z.ZodString;
        timeEntryId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        quantity: number;
        unitPrice: string;
        amount: string;
        timeEntryId?: string | undefined;
    }, {
        description: string;
        quantity: number;
        unitPrice: string;
        amount: string;
        timeEntryId?: string | undefined;
    }>, "many">;
    dueDate: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    caseId: string;
    clientId: string;
    timeEntryIds: string[];
    lineItems: {
        description: string;
        quantity: number;
        unitPrice: string;
        amount: string;
        timeEntryId?: string | undefined;
    }[];
    dueDate: string;
    notes?: string | undefined;
}, {
    caseId: string;
    clientId: string;
    lineItems: {
        description: string;
        quantity: number;
        unitPrice: string;
        amount: string;
        timeEntryId?: string | undefined;
    }[];
    dueDate: string;
    timeEntryIds?: string[] | undefined;
    notes?: string | undefined;
}>;
export declare const CreateMilestoneSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    dueDate: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    title: string;
    order: number;
    description?: string | undefined;
    dueDate?: string | undefined;
}, {
    title: string;
    order: number;
    description?: string | undefined;
    dueDate?: string | undefined;
}>;
export declare const CreateClientSchema: z.ZodObject<{
    email: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    preferredLang: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    firstName: string;
    lastName: string;
    preferredLang: string;
    phone?: string | undefined;
    address?: string | undefined;
}, {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | undefined;
    address?: string | undefined;
    preferredLang?: string | undefined;
}>;
export declare const UpdateClientSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    address: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    preferredLang: z.ZodOptional<z.ZodDefault<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    email?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
    preferredLang?: string | undefined;
}, {
    email?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
    preferredLang?: string | undefined;
}>;
export declare const ClientFiltersSchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    search?: string | undefined;
}, {
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}>;
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
//# sourceMappingURL=index.d.ts.map