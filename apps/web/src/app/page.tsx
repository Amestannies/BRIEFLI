'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LogoWithText, BriefcaseLogo } from '@/components/ui/logo';
import {
  Briefcase,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Shield,
  ChevronRight,
  Menu,
  X,
  Scale,
  Clock,
  BarChart3,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

/* ─── Navbar ─────────────────────────────────────────── */
function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/">
          <LogoWithText dark size={26} />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {['Features', 'How it Works', 'Pricing'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s/g, '-')}`}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/portal/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 flex items-center gap-1.5 border border-gray-200 rounded-full hover:bg-gray-50">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            Client Portal
          </Link>
          <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors px-4 py-2">
            Sign in
          </Link>
          <Link href="/register" className="text-sm font-semibold bg-primary text-white rounded-full px-5 py-2.5 hover:opacity-90 transition-opacity">
            Get started free →
          </Link>
        </div>

        <button className="md:hidden p-2 text-gray-600" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-4">
          {['Features', 'How it Works', 'Pricing'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/\s/g, '-')}`} className="block text-sm font-medium text-gray-700" onClick={() => setOpen(false)}>
              {item}
            </a>
          ))}
          <div className="pt-2 flex flex-col gap-2 border-t border-gray-100">
            <Link href="/portal/login" className="text-sm font-medium text-gray-600 text-center py-2 border border-gray-200 rounded-lg flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              Client Portal Access
            </Link>
            <Link href="/login" className="text-sm font-medium text-gray-700 text-center py-2">Sign in</Link>
            <Link href="/register" className="text-sm font-semibold bg-primary text-white rounded-full px-5 py-2.5 text-center">Get started free →</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─── App Mockup ─────────────────────────────────────── */
function AppMockup() {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="absolute -inset-4 bg-primary/20 rounded-3xl blur-2xl opacity-60" />
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/20">
        <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-3">
            <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-500 text-center font-medium">app.briefli.com</div>
          </div>
        </div>

        <div className="flex h-72 bg-[#F4F6FA]">
          <div className="w-44 bg-[#121845] flex flex-col p-3 gap-1 flex-shrink-0">
            <div className="flex items-center gap-2 px-2 py-2 mb-2">
              <BriefcaseLogo size={18} className="text-white" />
              <span className="text-white text-sm font-bold" style={{ fontFamily: 'Georgia, serif' }}>Briefli</span>
            </div>
            {[
              { icon: BarChart3, label: 'Dashboard', active: true },
              { icon: Briefcase, label: 'Cases' },
              { icon: Users, label: 'Clients' },
              { icon: Calendar, label: 'Calendar' },
              { icon: DollarSign, label: 'Billing' },
            ].map(({ icon: Icon, label, active }) => (
              <div key={label} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium ${active ? 'bg-white/15 text-white' : 'text-blue-200/60'}`}>
                <Icon className="w-3 h-3" />
                {label}
              </div>
            ))}
          </div>

          <div className="flex-1 p-4 overflow-hidden">
            <p className="text-xs font-semibold text-gray-500 mb-3">Dashboard</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Active Cases', value: '24', color: 'text-primary' },
                { label: 'This Month', value: '$18.4k', color: 'text-green-700' },
                { label: 'Deadlines', value: '6', color: 'text-amber-700' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-lg p-2.5 shadow-sm">
                  <p className="text-[10px] text-gray-500 mb-1">{label}</p>
                  <p className={`text-sm font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Recent Cases</p>
              </div>
              {[
                { name: 'Johnson v. Riverside Prop.', status: 'Active', type: 'Eviction' },
                { name: 'Martinez Housing Trust', status: 'Hearing', type: 'Lease Dispute' },
                { name: 'Chen v. Park Ave LLC', status: 'Active', type: 'Non-Payment' },
              ].map(({ name, status, type }) => (
                <div key={name} className="px-3 py-2 flex items-center gap-2 border-b border-gray-50 last:border-0">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Scale className="w-2.5 h-2.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-gray-800 truncate">{name}</p>
                    <p className="text-[9px] text-gray-400">{type}</p>
                  </div>
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${status === 'Hearing' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: Briefcase, title: 'Smart Case Management', desc: 'Track every case from intake to resolution. Automated milestones, document management, and real-time status updates keep your firm on top of every matter.' },
  { icon: DollarSign, title: 'Automated Billing', desc: 'Log time, generate invoices, and get paid faster. Integrated time tracking and one-click invoicing reduces billing overhead by up to 70%.' },
  { icon: Users, title: 'Client Portal', desc: 'Give clients 24/7 access to their case status, documents, and invoices. Reduce phone calls and build stronger client relationships.' },
  { icon: Calendar, title: 'Deadline Tracking', desc: 'Never miss a court date. Automated reminders sync with Google Calendar and Outlook so your team is always prepared.' },
  { icon: FileText, title: 'Document Management', desc: 'Securely store, organise, and share case documents. Full-text search, version history, and client sharing built in.' },
  { icon: Shield, title: 'eCourts Integration', desc: 'Direct integration with eCourts filing systems. File documents, check case status, and import court data without leaving Briefli.' },
];

const STEPS = [
  { num: '01', title: 'Set up your firm', desc: 'Create your firm profile, invite your team, and configure your practice areas in under 10 minutes.' },
  { num: '02', title: 'Import your cases', desc: 'Import existing cases from spreadsheets or start fresh. Add clients, documents, and deadlines instantly.' },
  { num: '03', title: 'Grow with confidence', desc: 'Track revenue, monitor performance, and scale your practice with data-driven insights.' },
];

function PortalAccessSection() {
  return (
    <section className="py-20 px-6 bg-[#F4F6FA]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Portal Access</p>
          <h2
            className="text-4xl font-bold text-gray-900 mb-3 leading-tight"
            style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}
          >
            Your role, your door.
          </h2>
          <p className="text-gray-500 max-w-md mx-auto">Briefli has separate, secure access points for attorneys and their clients.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Attorneys card */}
          <div className="bg-[#121845] rounded-2xl p-8 flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-5">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">I&apos;m an Attorney</h3>
            <p className="text-sm text-blue-200/70 leading-relaxed mb-6 flex-1">
              Manage cases, track time, generate invoices, and collaborate with your team — all in one place.
            </p>
            <div className="space-y-2">
              <Link
                href="/register"
                className="w-full block text-center bg-primary text-white rounded-full px-6 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Start free trial →
              </Link>
              <Link
                href="/login"
                className="w-full block text-center bg-white/10 text-white rounded-full px-6 py-3 text-sm font-semibold hover:bg-white/20 transition-colors"
              >
                Sign in to your firm
              </Link>
            </div>
          </div>

          {/* Clients card */}
          <div className="bg-white rounded-2xl p-8 flex flex-col border border-gray-200">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-5">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">I&apos;m a Client</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-6 flex-1">
              View your case status, upload documents, pay invoices, and message your attorney — securely, 24/7.
            </p>
            <div className="space-y-2">
              <Link
                href="/portal/login"
                className="w-full block text-center bg-amber-500 text-white rounded-full px-6 py-3 text-sm font-semibold hover:bg-amber-600 transition-colors"
              >
                Access Client Portal
              </Link>
              <p className="text-xs text-gray-400 text-center pt-1">Use the access code your attorney sent you</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 bg-gradient-to-b from-[#F4F6FA] to-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-xs font-semibold mb-6 border border-primary/20">
              <Scale className="w-3.5 h-3.5" />
              Built for landlord-tenant law firms
            </div>
            <h1
              className="text-6xl md:text-7xl font-bold text-gray-900 leading-[1.05] mb-6 max-w-4xl mx-auto"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}
            >
              Every case.
              <br />
              <span className="text-primary">Perfectly managed.</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-xl mx-auto leading-relaxed mb-10">
              Briefli is the modern practice management platform built exclusively for landlord-tenant attorneys. Close more cases, get paid faster.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register" className="bg-primary text-white rounded-full px-8 py-3.5 text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg shadow-primary/25">
                Start free trial <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login" className="bg-white text-gray-700 rounded-full px-8 py-3.5 text-sm font-semibold hover:bg-gray-50 transition-colors border border-gray-200">
                Sign in to your firm
              </Link>
            </div>
            <p className="text-xs text-gray-400 mt-4">No credit card required · 14-day free trial</p>
          </div>
          <AppMockup />
        </div>
      </section>

      {/* Trusted by */}
      <section className="py-14 border-y border-gray-100 bg-white px-6">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">Trusted by attorneys across the US</p>
          <div className="flex flex-wrap items-center justify-center gap-10">
            {['Harrison & Cole LLP', 'Meridian Legal', 'Park Ave Counsel', 'The Tenant Law Group', 'Riverside Legal Partners'].map((firm) => (
              <span key={firm} className="text-sm font-semibold tracking-tight text-gray-400 hover:text-gray-600 transition-colors cursor-default">{firm}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Features</p>
            <h2
              className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 max-w-2xl mx-auto leading-tight"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}
            >
              Everything your firm needs, nothing it doesn&apos;t.
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">Purpose-built for landlord-tenant law — not a generic platform stretched to fit.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-[#F4F6FA] rounded-2xl p-6 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6 bg-[#121845]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-blue-300 uppercase tracking-widest mb-3">How it Works</p>
            <h2
              className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}
            >
              Up and running in minutes.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="text-center md:text-left">
                <p className="text-6xl font-bold text-white/10 mb-4 leading-none" style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}>{num}</p>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-blue-200/70 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/register" className="bg-primary text-white rounded-full px-8 py-3.5 text-sm font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2 shadow-lg shadow-primary/30">
              Get started now <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#F4F6FA] rounded-3xl p-12 md:p-16 relative overflow-hidden">
            <div className="absolute top-6 left-10 text-9xl text-primary/10 leading-none select-none" style={{ fontFamily: 'Georgia, serif' }}>"</div>
            <div className="relative">
              <div className="flex gap-1 mb-6">{[...Array(5)].map((_, i) => <span key={i} className="text-amber-400 text-lg">★</span>)}</div>
              <blockquote
                className="text-2xl md:text-3xl font-medium text-gray-900 leading-snug mb-8 max-w-2xl"
                style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}
              >
                &ldquo;Briefli cut our admin time in half. We went from spreadsheets and sticky notes to a fully organised firm in one week. I wish we&apos;d found it sooner.&rdquo;
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-lg">S</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Sarah Mitchell</p>
                  <p className="text-sm text-gray-500">Managing Partner, Mitchell & Associates</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section id="pricing" className="py-24 px-6 bg-gradient-to-b from-[#F4F6FA] to-white">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Simple Pricing</p>
          <h2
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight"
            style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}
          >
            Start free. Scale as you grow.
          </h2>
          <p className="text-gray-500 mb-10 max-w-lg mx-auto">No contracts. No hidden fees. Cancel anytime. Your first 14 days are completely free.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 text-sm text-gray-600">
            {['Unlimited cases', 'Client portal included', 'eCourts integration', 'Priority support'].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <Link href="/register" className="bg-primary text-white rounded-full px-10 py-4 text-sm font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2 shadow-lg shadow-primary/25">
            Start your free trial <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <PortalAccessSection />

      {/* Footer */}
      <footer className="bg-[#121845] py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <LogoWithText dark={false} size={24} />
            <div className="flex gap-8 text-sm text-blue-200/60">
              {['Features', 'How it Works', 'Privacy', 'Terms'].map((item) => (
                <a key={item} href="#" className="hover:text-white transition-colors">{item}</a>
              ))}
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-blue-200/40">© {new Date().getFullYear()} Briefli. All rights reserved.</p>
            <div className="flex items-center gap-2 text-xs text-blue-200/40">
              <Clock className="w-3 h-3" />
              <span>Built for attorneys who value their time.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
