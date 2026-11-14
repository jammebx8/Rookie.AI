'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bookmark, BookOpen, ClipboardCheck, Coins, Flame, House, LogOut, Moon, PanelLeftClose, PanelLeftOpen,
  Search, Sun, Trophy, UserRound,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset,
  SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider, useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNightOwl } from './theme';
import { PassMini, SaleBar, useHasPass, useSaleLive } from './sale';
import { Toaster } from './toast';
import './rookie.css';

export type ShellUser = { name?: string | null; email?: string | null; avatar_url?: string | null; cl?: string | null; exam?: string | null } | null;

const NAV = [
  { label: 'Home', href: '/home', icon: House, match: ['/home'] },
  { label: 'Practice', href: '/explore', icon: BookOpen, match: ['/explore', '/chapterpage'] },
  { label: 'Tests', href: '/tests', icon: ClipboardCheck, match: ['/tests'] },
  { label: 'Bookmarks', href: '/bookmark', icon: Bookmark, match: ['/bookmark'] },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy, match: ['/leaderboard'] },
];
const isActive = (path: string, match: string[]) => match.some(m => path === m || path.startsWith(m + '/'));

function Tip({ label, children, side = 'right' }: { label: string; children: React.ReactElement; side?: 'right' | 'bottom' | 'top' }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

function Logo() {
  return (
    <span className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/rookie-owl.png" alt="" className="size-8 shrink-0 rounded-control" />
      <span className="text-title font-semibold tracking-tight text-foreground">Rookie</span>
    </span>
  );
}

function SidebarBrand() {
  const { state, toggleSidebar } = useSidebar();
  if (state === 'collapsed') {
    return (
      <Tip label="Expand menu">
        <button onClick={toggleSidebar} aria-label="Expand menu"
          className="group/brand relative mx-auto grid size-8 place-items-center rounded-control outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
          <span className="grid size-8 place-items-center overflow-hidden rounded-control bg-[var(--rk-sky-300)] transition group-hover/brand:opacity-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/rookie-owl.png" alt="" className="size-8 scale-[1.32]" />
          </span>
          <PanelLeftOpen className="absolute size-4 text-foreground opacity-0 transition group-hover/brand:opacity-100" />
        </button>
      </Tip>
    );
  }
  return (
    <div className="flex items-center justify-between">
      <Link href="/home" aria-label="Rookie home" className="rounded-control outline-none focus-visible:ring-2 focus-visible:ring-ring"><Logo /></Link>
      <Tip label="Collapse menu" side="bottom">
        <button onClick={toggleSidebar} aria-label="Collapse menu"
          className="grid size-8 place-items-center rounded-control text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          <PanelLeftClose className="size-4" />
        </button>
      </Tip>
    </div>
  );
}

function UserMenu({ user, dark, toggle, onLogout, compact = false }: { user: ShellUser; dark: boolean; toggle: () => void; onLogout: () => void; compact?: boolean }) {
  const router = useRouter();
  const name = user?.name || 'You';
  const sub = [user?.cl, user?.exam].filter(Boolean).join(' · ');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn('flex items-center gap-3 rounded-control text-left outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
          compact ? 'p-0.5' : 'w-full p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0')}
        aria-label="Account menu"
      >
        <Avatar className={compact ? 'size-8' : 'size-9'}>
          {user?.avatar_url && <AvatarImage src={user.avatar_url} alt="" referrerPolicy="no-referrer" />}
          <AvatarFallback className="bg-muted font-semibold text-foreground">{name[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        {!compact && (
          <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-[13px] font-semibold text-foreground">{name}</span>
            {sub && <span className="block truncate text-[11px] text-muted-foreground">{sub}</span>}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side={compact ? 'bottom' : 'top'} align={compact ? 'end' : 'start'} className="w-56">
        {/* Base UI: a menu label must live inside a group, or opening the menu crashes. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{user?.email || name}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => router.push('/profile')}><UserRound /> Profile & settings</DropdownMenuItem>
          <DropdownMenuItem onClick={toggle}>{dark ? <Sun /> : <Moon />} {dark ? 'Day mode' : 'Night owl mode'}</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}><LogOut /> Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatPill({ icon: Icon, value, label, className, ...rest }: { icon: typeof Flame; value: string; label: string } & React.ComponentProps<'span'>) {
  return (
    <span {...rest} tabIndex={0} aria-label={`${value} ${label}`}
      className={cn('inline-flex h-9 cursor-default items-center gap-1.5 rounded-control bg-background px-3 text-sm font-semibold tabular-nums text-foreground ring-1 ring-border outline-none transition hover:ring-[var(--rk-sky-300)] focus-visible:ring-2 focus-visible:ring-ring', className)}>
      <Icon className="size-4 text-muted-foreground" strokeWidth={2} /> {value}
    </span>
  );
}

const SEARCH_LINKS = [
  { label: 'Practice PYQs by chapter', href: '/explore', icon: BookOpen },
  { label: 'Start a custom test', href: '/tests', icon: ClipboardCheck },
  { label: 'Open bookmarks', href: '/bookmark', icon: Bookmark },
  { label: 'View leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Profile & settings', href: '/profile', icon: UserRound },
];

function SearchPalette({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const router = useRouter();
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(!open); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);
  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Jump anywhere in Rookie" className="rounded-card!">
      {/* cmdk needs its <Command> root inside the dialog (without it, opening ⌘K crashes the page). */}
      <Command>
      <CommandInput placeholder="Where do you want to go?" />
      <CommandList>
        <CommandEmpty>Nothing found.</CommandEmpty>
        <CommandGroup heading="Go to">
          {SEARCH_LINKS.map(l => (
            <CommandItem key={l.href} onSelect={() => { setOpen(false); router.push(l.href); }}><l.icon /> {l.label}</CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      </Command>
    </CommandDialog>
  );
}

function MobileNav({ path, badge }: { path: string; badge: number }) {
  return (
    <nav aria-label="Primary"
      className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-card bg-background/90 p-1.5 shadow-[0_10px_30px_-10px_rgba(46,46,46,.25)] ring-1 ring-border backdrop-blur-md md:hidden"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
      {NAV.map(n => {
        const active = isActive(path, n.match);
        return (
          <Link key={n.label} href={n.href}
            className={cn('relative flex flex-1 flex-col items-center gap-0.5 rounded-control py-2 text-[11px] font-medium text-muted-foreground transition',
              active && 'bg-accent text-accent-foreground')}>
            <n.icon className="size-5" strokeWidth={1.9} />
            {n.label}
            {n.href === '/bookmark' && badge > 0 && (
              <span className="absolute right-[18%] top-1 grid min-w-4 place-items-center rounded-full bg-[#d9473a] px-1 text-[9px] font-bold text-white">{badge > 9 ? '9+' : badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Platform shell. Pure presentation — data comes from the (tabs) layout, which keeps the
 * original logic (auth user → @user cache, coins, wrong-answer badge, pass auto-sync).
 */
export function AppShell({ children, user, coins, streak, wrongBadge, onLogout, chromeless = false }: {
  children: React.ReactNode; user: ShellUser; coins: number; streak: number; wrongBadge: number; onLogout: () => void; chromeless?: boolean;
}) {
  const path = usePathname() || '';
  const { dark, toggle } = useNightOwl();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const hasPass = useHasPass();
  const saleLive = useSaleLive();
  const showSale = hasPass === false && saleLive;

  if (chromeless) return <div className="rk-app min-h-svh bg-muted font-sans">{children}<Toaster /></div>;

  return (
    <TooltipProvider>
      <SidebarProvider className="rk-app font-sans">
        <Sidebar collapsible="icon" className="border-r-0">
          <SidebarHeader className="px-3 pt-4 pb-[36px]"><SidebarBrand /></SidebarHeader>
          <SidebarContent className="px-1">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {NAV.map(n => (
                    <SidebarMenuItem key={n.label}>
                      <SidebarMenuButton isActive={isActive(path, n.match)} tooltip={n.label}
                        className="h-9 rounded-control px-3 text-[13px] font-medium data-active:font-semibold" render={<Link href={n.href} />}>
                        <n.icon className="size-4" strokeWidth={1.9} />
                        <span>{n.label}</span>
                      </SidebarMenuButton>
                      {n.href === '/bookmark' && wrongBadge > 0 && (
                        <SidebarMenuBadge className="rounded-tag bg-[#fdecea] text-[#b2382d] dark:bg-[rgba(255,122,102,.14)] dark:text-[#ff9c8c]">{wrongBadge > 9 ? '9+' : wrongBadge}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="gap-3 p-3">
            {hasPass === false && <PassMini className="group-data-[collapsible=icon]:hidden" />}
            <UserMenu user={user} dark={dark} toggle={toggle} onLogout={onLogout} />
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="min-h-svh bg-muted">
          <div className="sticky top-0 z-30">
            {showSale && <SaleBar />}
            <header className="bg-muted/85 px-4 backdrop-blur-md md:px-6">
              <div className="mx-auto flex h-[calc(3.5rem+4px)] w-full max-w-content items-center gap-3">
                <Link href="/home" className="md:hidden" aria-label="Rookie home">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/rookie-owl.png" alt="" className="size-8 rounded-control" />
                </Link>
                <button onClick={() => setSearchOpen(true)}
                  className="hidden h-10 w-full max-w-sm items-center gap-2 rounded-control bg-background px-3 text-sm text-muted-foreground ring-1 ring-border transition hover:ring-[var(--rk-sky-300)] sm:flex">
                  <Search className="size-4" /> Search Rookie…
                  <kbd className="ml-auto rounded-md bg-muted px-1.5 py-0.5 font-sans text-[11px] text-muted-foreground">⌘K</kbd>
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setSearchOpen(true)} aria-label="Search"><Search /></Button>
                  <Tip label="Streak: days in a row you’ve practised" side="bottom"><StatPill icon={Flame} value={String(streak)} label="day streak" /></Tip>
                  <Tip label="Coins: earned for correct answers" side="bottom"><StatPill icon={Coins} value={coins.toLocaleString('en-IN')} label="coins" /></Tip>
                  <Button variant="ghost" size="icon" onClick={toggle} aria-label={dark ? 'Switch to day mode' : 'Switch to night owl mode'} className="hidden sm:inline-flex">
                    {dark ? <Sun /> : <Moon />}
                  </Button>
                  <span className="md:hidden"><UserMenu user={user} dark={dark} toggle={toggle} onLogout={onLogout} compact /></span>
                </div>
              </div>
            </header>
          </div>
          <div className="px-4 pb-28 md:px-6 md:pb-12">{children}</div>
        </SidebarInset>

        <MobileNav path={path} badge={wrongBadge} />
        <SearchPalette open={searchOpen} setOpen={setSearchOpen} />
        <Toaster />
      </SidebarProvider>
    </TooltipProvider>
  );
}

/** Thin header for focus screens (practice, question viewer, test hall): back + title + right slot. */
export function FocusShell({ children }: { children: React.ReactNode }) {
  useNightOwl();
  return (
    <TooltipProvider>
      <div className="rk-app min-h-svh bg-muted font-sans">{children}<Toaster /></div>
    </TooltipProvider>
  );
}
