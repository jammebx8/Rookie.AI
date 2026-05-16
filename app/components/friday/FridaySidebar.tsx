'use client';

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Conversation, UserProfile } from '@/app/test/page';

interface Props {
  open: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewChat: () => void;
  userProfile: UserProfile | null;
  userName: string;
}

const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── Sidebar is memo'd so it never re-renders from parent message state ───────

const FridaySidebar = memo(function FridaySidebar({
  open,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewChat,
  userProfile,
  userName,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className="friday-sidebar"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="friday-sidebar__inner">
            {/* Brand */}
            <div className="friday-sidebar__brand">
              <div className="friday-sidebar__logo">
                <span className="friday-logo-ring" />
                <span className="friday-logo-dot" />
              </div>
              <div>
                <div className="friday-sidebar__title">F.R.I.D.A.Y</div>
                <div className="friday-sidebar__subtitle">Personal AI</div>
              </div>
            </div>

            {/* New chat */}
            <button className="friday-new-chat" onClick={onNewChat}>
              <PlusIcon />
              <span>New conversation</span>
            </button>

            {/* History */}
            <div className="friday-history-label">Recent</div>
            <div className="friday-history">
              {conversations.length === 0 ? (
                <p className="friday-history__empty">No conversations yet.</p>
              ) : (
                conversations.map(conv => (
                  <motion.div
                    key={conv.id}
                    className={`friday-conv-item ${activeConversationId === conv.id ? 'friday-conv-item--active' : ''}`}
                    onClick={() => onSelectConversation(conv.id)}
                    whileHover={{ x: 2 }}
                    layout
                  >
                    <div className="friday-conv-item__inner">
                      <span className="friday-conv-item__title">{conv.title}</span>
                      <span className="friday-conv-item__date">{formatDate(conv.updated_at)}</span>
                    </div>
                    <button
                      className="friday-conv-item__delete"
                      onClick={e => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                    >
                      <TrashIcon />
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {/* User footer */}
            <div className="friday-sidebar__footer">
              <div className="friday-user-avatar">
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt={userName} />
                ) : (
                  <span>{userName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="friday-user-info">
                <div className="friday-user-name">{userName}</div>
                <div className="friday-user-email">{userProfile?.email || ''}</div>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
});

export default FridaySidebar;

// Styles injected via global CSS or inline — add to your globals.css:
// (exported as a string for convenience)
export const SIDEBAR_STYLES = `
  .friday-sidebar {
    flex-shrink: 0;
    height: 100dvh;
    overflow: hidden;
    border-right: 1px solid var(--friday-border);
    background: var(--friday-bg);
  }
  .friday-sidebar__inner {
    width: 260px;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 20px 0;
    overflow: hidden;
  }

  /* Brand */
  .friday-sidebar__brand {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 18px 20px;
    border-bottom: 1px solid var(--friday-border);
    margin-bottom: 16px;
  }
  .friday-sidebar__logo {
    position: relative;
    width: 34px; height: 34px;
    flex-shrink: 0;
  }
  .friday-logo-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1.5px solid rgba(232,201,126,0.35);
    animation: spin-slow 8s linear infinite;
  }
  @keyframes spin-slow { to { transform: rotate(360deg); } }
  .friday-logo-dot {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 10px; height: 10px;
    border-radius: 50%;
    background: var(--friday-accent);
    box-shadow: 0 0 10px var(--friday-accent-glow);
  }
  .friday-sidebar__title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: var(--friday-accent);
  }
  .friday-sidebar__subtitle {
    font-size: 10px;
    color: var(--friday-muted);
    letter-spacing: 0.05em;
  }

  /* New chat */
  .friday-new-chat {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 12px 16px;
    padding: 9px 14px;
    background: var(--friday-accent-dim);
    border: 1px solid rgba(232,201,126,0.18);
    border-radius: 10px;
    color: var(--friday-accent);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .friday-new-chat:hover {
    background: rgba(232,201,126,0.18);
    border-color: rgba(232,201,126,0.3);
  }

  /* History */
  .friday-history-label {
    padding: 0 18px 8px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--friday-muted);
  }
  .friday-history {
    flex: 1;
    overflow-y: auto;
    padding: 0 8px;
  }
  .friday-history::-webkit-scrollbar { width: 3px; }
  .friday-history::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 2px; }
  .friday-history__empty {
    font-size: 12px;
    color: var(--friday-muted);
    padding: 12px 10px;
  }

  /* Conversation item */
  .friday-conv-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.15s;
    margin-bottom: 2px;
    group: true;
  }
  .friday-conv-item:hover { background: rgba(255,255,255,0.04); }
  .friday-conv-item--active { background: var(--friday-accent-dim) !important; }
  .friday-conv-item__inner {
    flex: 1;
    min-width: 0;
  }
  .friday-conv-item__title {
    display: block;
    font-size: 12.5px;
    color: #c4bfb5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.4;
  }
  .friday-conv-item--active .friday-conv-item__title { color: var(--friday-accent); }
  .friday-conv-item__date {
    display: block;
    font-size: 10px;
    color: var(--friday-muted);
    margin-top: 1px;
  }
  .friday-conv-item__delete {
    background: none;
    border: none;
    color: var(--friday-muted);
    cursor: pointer;
    padding: 3px;
    border-radius: 6px;
    opacity: 0;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
  .friday-conv-item:hover .friday-conv-item__delete { opacity: 1; }
  .friday-conv-item__delete:hover { color: #f87171; background: rgba(239,68,68,0.1); }

  /* User footer */
  .friday-sidebar__footer {
    margin-top: auto;
    padding: 14px 16px 0;
    border-top: 1px solid var(--friday-border);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .friday-user-avatar {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: var(--friday-accent-dim);
    border: 1px solid rgba(232,201,126,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
    font-size: 13px;
    color: var(--friday-accent);
    font-weight: 600;
  }
  .friday-user-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .friday-user-name {
    font-size: 12.5px;
    color: var(--friday-text);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .friday-user-email {
    font-size: 10px;
    color: var(--friday-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .friday-user-info { min-width: 0; }
`;