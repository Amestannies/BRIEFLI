'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Calendar,
  DollarSign,
  Settings,
  Bell,
  Search,
  ChevronDown,
  Clock,
  FileText,
  BarChart3,
  Building2,
  UserCog,
  FolderOpen,
  User,
  CreditCard,
  Shield,
} from 'lucide-react';
import { cn } from '@briefli/ui';
import { LogoWithText } from '@/components/ui/logo';

interface NavChild {
  label: string;
  href: string;
  icon?: React.ElementType;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: NavChild[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Cases', href: '/cases', icon: Briefcase },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Documents', href: '/documents', icon: FolderOpen },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  {
    label: 'Billing',
    href: '/billing',
    icon: DollarSign,
    children: [
      { label: 'Time Entries', href: '/billing/time-entries', icon: Clock },
      { label: 'Invoices', href: '/billing/invoices', icon: FileText },
      { label: 'Reports', href: '/billing/reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    children: [
      { label: 'Firm', href: '/settings/firm', icon: Building2 },
      { label: 'Team', href: '/settings/users', icon: UserCog },
      { label: 'My Profile', href: '/settings/profile', icon: User },
      { label: 'Billing Prefs', href: '/settings/billing-prefs', icon: CreditCard },
      { label: 'Notifications', href: '/settings/notifications', icon: Bell },
      { label: 'Security', href: '/settings/security', icon: Shield },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/cases': 'Cases',
  '/clients': 'Clients',
  '/documents': 'Documents',
  '/calendar': 'Calendar',
  '/billing': 'Billing',
  '/billing/time-entries': 'Time Entries',
  '/billing/invoices': 'Invoices',
  '/billing/reports': 'Reports',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
  '/settings/firm': 'Firm Settings',
  '/settings/users': 'Team',
  '/settings/profile': 'My Profile',
  '/settings/billing-prefs': 'Billing Preferences',
  '/settings/notifications': 'Notifications',
  '/settings/security': 'Security',
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/cases/')) return 'Case Details';
  if (pathname.startsWith('/clients/')) return 'Client Profile';
  if (pathname.startsWith('/billing/invoices/')) return 'Invoice';
  return 'Briefli';
}

// ─── TopbarAvatar — topbar right corner avatar ───────────────────────────────
function TopbarAvatar() {
  const [user, setUser] = useState<{ firstName: string; lastName: string; avatarUrl?: string | null } | null>(null);

  useEffect(() => {
    import('@/lib/api').then(({ api }) => {
      api.get<{ firstName: string; lastName: string; avatarUrl?: string | null }>('/users/me')
        .then((r) => setUser(r.data))
        .catch(() => null);
    });
  }, []);

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : 'U';

  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={initials}
        className="w-8 h-8 rounded-full object-cover hover:opacity-90 transition-opacity cursor-pointer ring-2 ring-transparent hover:ring-primary/30"
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold cursor-pointer hover:opacity-90 transition-opacity">
      {initials}
    </div>
  );
}

// ─── UserAvatar — fetches real user name + avatar ────────────────────────────
function UserAvatar() {
  const [user, setUser] = useState<{ firstName: string; lastName: string; avatarUrl?: string | null } | null>(null);

  useEffect(() => {
    import('@/lib/api').then(({ api }) => {
      api.get<{ firstName: string; lastName: string; avatarUrl?: string | null }>('/users/me')
        .then((r) => setUser(r.data))
        .catch(() => null);
    });
  }, []);

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : 'U';

  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={`${user.firstName} ${user.lastName}`}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
      {initials}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-[#121845] border-r border-[#1e2d6b]">
        {/* Logo area */}
        <div className="px-5 py-5 border-b border-[#1e2d6b] flex-shrink-0">
          <Link href="/dashboard">
            <LogoWithText dark={false} size={28} />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary px-2 mb-3 opacity-80">
            Workspace
          </p>

          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const hasChildren = Boolean(item.children?.length);

              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-blue-200/60 hover:bg-white/5 hover:text-blue-100',
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {hasChildren && (
                      <ChevronDown
                        className={cn(
                          'w-3.5 h-3.5 transition-transform duration-200',
                          isActive ? 'rotate-180 opacity-70' : 'opacity-40',
                        )}
                      />
                    )}
                  </Link>

                  {/* Sub-items */}
                  {hasChildren && isActive && item.children && (
                    <div className="mt-0.5 ml-4 pl-4 border-l border-[#1e2d6b] space-y-0.5">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                              isChildActive
                                ? 'bg-white/10 text-white'
                                : 'text-blue-200/60 hover:bg-white/5 hover:text-blue-100',
                            )}
                          >
                            {ChildIcon && <ChildIcon className="w-3.5 h-3.5 flex-shrink-0" />}
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* User profile section */}
        <div className="flex-shrink-0 border-t border-[#1e2d6b] px-3 py-3">
          <Link
            href="/settings/profile"
            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 transition-all duration-150 group"
          >
            <UserAvatar />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-200/80 truncate leading-none mb-0.5">
                My Account
              </p>
              <p className="text-[10px] text-blue-200/40 truncate leading-none">
                Manage profile
              </p>
            </div>
            <Settings className="w-3.5 h-3.5 text-blue-200/40 group-hover:text-blue-200/80 transition-colors flex-shrink-0" />
          </Link>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex-shrink-0 bg-white border-b border-border flex items-center px-6 gap-4">
          {/* Page title / breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate">{pageTitle}</h2>
          </div>

          {/* Search bar */}
          <div className="flex-1 flex justify-center">
            <button className="flex items-center gap-2.5 text-sm text-muted-foreground bg-muted rounded-full px-4 py-2 hover:bg-secondary transition-colors w-full max-w-sm">
              <Search className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">Search cases, clients...</span>
              <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium bg-background border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/notifications"
              className="relative p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
            </Link>
            <Link href="/settings/profile" title="My Profile">
              <TopbarAvatar />
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-8 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
