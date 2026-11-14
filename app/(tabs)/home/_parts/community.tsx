'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, MessageCircle, Share2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHead, ListRow, Meta, Row } from '@/components/rookie/ui';
import { openExternal, socialMediaLinks } from './constants';

/* ── Invite friends + social: one quiet row of two cards ── */
export function CommunityRow({ onInvite }: { onInvite: () => void }) {
  return (
    <section className="mt-section">
      <Row className="md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHead icon={Users} label="Invite friends" title="Study with your friends" />
          <p className="text-body-sm text-muted-foreground">Bring your batchmates to Rookie and practise together.</p>
          <div className="mt-auto pt-6">
            <Button variant="secondary" className="h-10 rounded-control px-4" onClick={onInvite}>
              <Share2 /> Invite now
            </Button>
          </div>
        </Card>
        <Card className="flex flex-col">
          <CardHead icon={MessageCircle} label="Community" title="We’re on social media" />
          <div className="grid grid-cols-2 gap-2">
            {socialMediaLinks.map((item) => (
              <ListRow key={item.label} role="button" tabIndex={0} aria-label={`Open ${item.label}`}
                onClick={() => openExternal(item.url)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openExternal(item.url); } }}
                className="cursor-pointer justify-between py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="text-body-sm font-medium text-foreground">{item.label}</span>
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </ListRow>
            ))}
          </div>
        </Card>
      </Row>
    </section>
  );
}

/* ── Footer ── */
export function HomeFooter() {
  const router = useRouter();
  return (
    <>
    <footer className="mt-section flex flex-col gap-4 rounded-card bg-card px-6 py-5 ring-1 ring-black/[.05] sm:flex-row sm:items-center dark:ring-white/[.06]">
      <div className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/rookie-owl.png" alt="" className="size-7 rounded-full" />
        <div>
          <p className="text-body-sm font-semibold leading-none text-foreground">Rookie</p>
          <Meta className="mt-1 block">AI-powered exam prep</Meta>
        </div>
      </div>
      <nav className="flex flex-wrap gap-x-1 gap-y-1 sm:ml-auto">
        {[
          { label: 'Practice', path: '/explore' },
          { label: 'Leaderboard', path: '/leaderboard' },
          { label: 'Bookmarks', path: '/bookmark' },
          { label: 'Settings', path: '/profile' },
        ].map((link) => (
          <Button key={link.label} variant="ghost" size="sm" className="rounded-control text-muted-foreground" onClick={() => router.push(link.path)}>
            {link.label}
          </Button>
        ))}
        <Button variant="ghost" size="sm" className="rounded-control text-muted-foreground">Privacy</Button>
        <Button variant="ghost" size="sm" className="rounded-control text-muted-foreground">Terms</Button>
      </nav>
    </footer>
    <Meta className="mt-3 block px-1">© {new Date().getFullYear()} Rookie. All rights reserved.</Meta>
    </>
  );
}
