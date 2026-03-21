'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ArrowLeft, Scale, Info } from 'lucide-react';
import { CreateCaseSchema, type CreateCaseInput, CASE_TYPE_LABELS } from '@briefli/shared';
import { cn } from '@briefli/ui';
import { createCase } from '@/hooks/useCases';

const CASE_TYPES = Object.entries(CASE_TYPE_LABELS) as [string, string][];

const COURTS = [
  'Housing Court — Manhattan',
  'Housing Court — Brooklyn',
  'Housing Court — Queens',
  'Housing Court — Bronx',
  'Housing Court — Staten Island',
  'Superior Court',
  'District Court',
  'Other',
];

const MILESTONE_PREVIEWS: Record<string, string[]> = {
  EVICTION: ['Notice to Quit', 'Complaint Filed', 'Summons Issued', 'Court Hearing', 'Judgment', '…'],
  NON_PAYMENT: ['Demand Notice', 'Complaint Filed', 'Hearing Scheduled', 'Judgment', '…'],
  LEASE_DISPUTE: ['Initial Consultation', 'Demand Letter', 'Mediation', 'Resolution', '…'],
  HABITABILITY: ['Inspection Request', 'Notice to Landlord', 'Agency Complaint', 'Hearing', '…'],
  OTHER: ['Intake', 'Investigation', 'Filing', 'Resolution', '…'],
};

export default function NewCasePage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateCaseInput>({
    resolver: zodResolver(CreateCaseSchema),
    defaultValues: { caseType: 'EVICTION' },
  });

  const caseType = watch('caseType');
  const milestonePreview = MILESTONE_PREVIEWS[caseType] ?? [];

  const onSubmit = async (data: CreateCaseInput) => {
    setServerError(null);
    try {
      // Convert expectedCloseDate to ISO if present
      const payload = {
        ...data,
        expectedCloseDate: data.expectedCloseDate
          ? new Date(data.expectedCloseDate as unknown as string).toISOString()
          : undefined,
      };
      const newCase = await createCase(payload as unknown as Record<string, unknown>);
      router.push(`/cases/${newCase.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setServerError(e.response?.data?.error?.message ?? 'Failed to create case. Please try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Back + Header */}
      <div>
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Cases
        </Link>
        <h1
          className="text-3xl font-bold text-foreground"
          style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}
        >
          New Case
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          A milestone workflow will be generated automatically based on the case type.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Case Info */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground text-sm">Case Information</h2>
          </div>
          <div className="px-6 py-5 space-y-4">

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Case Title <span className="text-destructive">*</span>
              </label>
              <input
                {...register('title')}
                type="text"
                placeholder="e.g. Johnson v. Park Ave Properties"
                className={cn('input-field', errors.title && 'border-destructive focus:ring-destructive')}
              />
              {errors.title && <p className="text-destructive text-xs mt-1">{errors.title.message}</p>}
            </div>

            {/* Case Type */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Case Type <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CASE_TYPES.map(([key, label]) => (
                  <label
                    key={key}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-sm',
                      caseType === key
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-border hover:border-primary/40 text-foreground',
                    )}
                  >
                    <input {...register('caseType')} type="radio" value={key} className="sr-only" />
                    <span className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                      caseType === key ? 'border-primary' : 'border-muted-foreground/40',
                    )}>
                      {caseType === key && <span className="w-2 h-2 rounded-full bg-primary block" />}
                    </span>
                    {label}
                  </label>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Milestone Preview */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex items-start gap-3">
          <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-primary mb-1.5">Auto-generated workflow for {CASE_TYPE_LABELS[caseType]}</p>
            <div className="flex flex-wrap gap-1.5">
              {milestonePreview.map((m, i) => (
                <span key={i} className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Property & Court */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/20">
            <h2 className="font-semibold text-foreground text-sm">Property &amp; Court Details</h2>
          </div>
          <div className="px-6 py-5 space-y-4">

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Property Address</label>
              <input
                {...register('propertyAddress')}
                type="text"
                placeholder="123 Main St, New York, NY 10001"
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Court</label>
                <select {...register('court')} className="input-field">
                  <option value="">Select court…</option>
                  {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Expected Close Date</label>
                <input {...register('expectedCloseDate')} type="date" className="input-field" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Opposing Counsel</label>
              <input
                {...register('opposingCounsel')}
                type="text"
                placeholder="Attorney or firm representing opposing party"
                className="input-field"
              />
            </div>

          </div>
        </div>

        {/* Description */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/20">
            <h2 className="font-semibold text-foreground text-sm">Description</h2>
          </div>
          <div className="px-6 py-5">
            <textarea
              {...register('description')}
              rows={4}
              placeholder="Brief summary of the case — key facts, background, or special instructions…"
              className="input-field resize-none"
            />
          </div>
        </div>

        {/* Error */}
        {serverError && (
          <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3">
            {serverError}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <Link href="/cases" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'inline-flex items-center gap-2 bg-primary text-white rounded-full px-6 py-2.5 text-sm font-semibold',
              'transition-all hover:opacity-90 active:scale-[0.98]',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            {isSubmitting ? 'Creating…' : 'Create Case →'}
          </button>
        </div>

      </form>
    </div>
  );
}
