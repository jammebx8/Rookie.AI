'use client';

import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from '@/app/test/page';

interface Props {
  messages: Message[];
  streamingContent: string;
  isLoading: boolean;
  onSpeak: (text: string) => void;
  isSpeaking: boolean;
}

const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const SpeakIcon = ({ active }: { active: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    {active
      ? <><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></>
      : <line x1="23" y1="9" x2="17" y2="15" />
    }
  </svg>
);

const TypingIndicator = () => (
  <div style={{ display: 'flex', gap: 4, padding: '12px 16px' }}>
    {[0, 1, 2].map(i => (
      <motion.div
        key={i}
        style={{ width: 7, height: 7, borderRadius: '50%', background: '#444' }}
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
      />
    ))}
  </div>
);

const MessageItem = memo(function MessageItem({
  msg,
  onSpeak,
  isSpeaking,
}: {
  msg: Message;
  onSpeak: (text: string) => void;
  isSpeaking: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = msg.role === 'user';

  return (
    <motion.div
      className={`msg-row ${isUser ? 'msg-row--user' : 'msg-row--ai'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      layout
    >
      {!isUser && (
        <div className="msg-avatar">
          <span className="msg-avatar__dot" />
        </div>
      )}

      <div className={`msg-bubble ${isUser ? 'msg-bubble--user' : 'msg-bubble--ai'}`}>
        <p className="msg-text">{msg.content}</p>

        {!isUser && (
          <div className="msg-actions">
            <button
              className="msg-action-btn"
              onClick={() => onSpeak(msg.content)}
              title={isSpeaking ? 'Stop' : 'Listen'}
            >
              <SpeakIcon active={isSpeaking} />
            </button>
            <button className="msg-action-btn" onClick={handleCopy} title="Copy">
              {copied
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                : <CopyIcon />
              }
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
});

const MessageList = memo(function MessageList({
  messages,
  streamingContent,
  isLoading,
  onSpeak,
  isSpeaking,
}: Props) {
  return (
    <div className="msglist">
      {messages.map(msg => (
        <MessageItem key={msg.id} msg={msg} onSpeak={onSpeak} isSpeaking={isSpeaking} />
      ))}

      {/* Streaming message */}
      {streamingContent && (
        <motion.div
          className="msg-row msg-row--ai"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="msg-avatar"><span className="msg-avatar__dot" /></div>
          <div className="msg-bubble msg-bubble--ai">
            <p className="msg-text">{streamingContent}<span className="msg-cursor" /></p>
          </div>
        </motion.div>
      )}

      {/* Loading indicator (before first chunk) */}
      {isLoading && !streamingContent && (
        <div className="msg-row msg-row--ai">
          <div className="msg-avatar"><span className="msg-avatar__dot" /></div>
          <div className="msg-bubble msg-bubble--ai" style={{ paddingLeft: 0 }}>
            <TypingIndicator />
          </div>
        </div>
      )}

      <style>{`
        .msglist {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-width: 720px;
          margin: 0 auto;
          width: 100%;
        }

        .msg-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .msg-row--user { flex-direction: row-reverse; }

        .msg-avatar {
          flex-shrink: 0;
          width: 28px; height: 28px;
          border-radius: 50%;
          background: rgba(232,201,126,0.1);
          border: 1px solid rgba(232,201,126,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 4px;
        }
        .msg-avatar__dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #e8c97e;
        }

        .msg-bubble {
          max-width: 72%;
          padding: 11px 15px;
          border-radius: 16px;
          position: relative;
        }
        .msg-bubble--user {
          background: rgba(232,201,126,0.1);
          border: 1px solid rgba(232,201,126,0.18);
          border-top-right-radius: 4px;
        }
        .msg-bubble--ai {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-top-left-radius: 4px;
        }

        .msg-text {
          font-size: 14px;
          line-height: 1.65;
          color: #e0dbd2;
          white-space: pre-wrap;
          word-break: break-word;
          margin: 0;
        }

        .msg-cursor {
          display: inline-block;
          width: 2px;
          height: 14px;
          background: #e8c97e;
          margin-left: 2px;
          vertical-align: text-bottom;
          animation: cursor-blink 0.8s step-end infinite;
        }
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .msg-actions {
          display: flex;
          gap: 4px;
          margin-top: 8px;
          opacity: 0;
          transition: opacity 0.15s;
        }
        .msg-bubble--ai:hover .msg-actions { opacity: 1; }

        .msg-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px; height: 24px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 6px;
          color: #666;
          cursor: pointer;
          transition: all 0.15s;
        }
        .msg-action-btn:hover { color: #e8c97e; background: rgba(232,201,126,0.1); border-color: rgba(232,201,126,0.2); }
      `}</style>
    </div>
  );
});

export default MessageList;