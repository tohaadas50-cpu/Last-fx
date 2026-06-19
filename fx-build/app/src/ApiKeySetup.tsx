/**
 * TextFX v5 — API Key Setup Modal
 * ─────────────────────────────────────────────────────────────────────────────
 * Shown on first run (or when /llm returns 401).
 * Stores the key via the Electron preload bridge → keytar (Windows Credential Store).
 * Never touches localStorage, never sends the key to any server except the local backend.
 */

import React, { useState } from 'react'

interface Props {
  backendPort: number
  onKeyStored: () => void
  onDismiss?:  () => void
}

declare global {
  interface Window {
    fx?: {
      getBackendInfo(): Promise<{ port: number; certFingerprint: string; protocol: string; host: string }>
      request(channel: string, payload?: unknown): Promise<unknown>
    }
  }
}

export function ApiKeySetup({ backendPort, onKeyStored, onDismiss }: Props) {
  const [apiKey,  setApiKey]  = useState('')
  const [status,  setStatus]  = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSave() {
    const trimmed = apiKey.trim()
    if (!trimmed.startsWith('sk-')) {
      setStatus('error')
      setMessage('API keys must start with "sk-". Check your OpenAI dashboard.')
      return
    }

    setStatus('saving')
    setMessage('')

    try {
      // Post key to local backend — backend stores it via keytar, key never reaches renderer memory after this
      const resp = await fetch(`https://127.0.0.1:${backendPort}/api/set-key`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        // Tell backend to store this key via keytar
        body:    JSON.stringify({ service: 'fx-openai', account: 'default', value: trimmed }),
      })

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `HTTP ${resp.status}`)
      }

      setApiKey('')  // clear from memory immediately
      setStatus('ok')
      setMessage('Key saved to Windows Credential Store.')
      setTimeout(() => onKeyStored(), 1200)
    } catch (err: unknown) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Unknown error saving key.')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="apikey-title"
      style={overlay}
    >
      <div style={modal}>
        <h2 id="apikey-title" style={title}>Configure OpenAI API Key</h2>

        <p style={body}>
          TextFX stores your key securely in the <strong>Windows Credential Store</strong>{' '}
          via <code>keytar</code>. It is never written to disk, never sent to any external server,
          and never appears in logs.
        </p>

        <label htmlFor="apikey-input" style={label}>OpenAI API Key</label>
        <input
          id="apikey-input"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-…"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          disabled={status === 'saving' || status === 'ok'}
          style={input}
          aria-describedby="apikey-hint"
        />
        <p id="apikey-hint" style={hint}>
          Get your key at{' '}
          <span style={{ color: '#7c3aed' }}>platform.openai.com → API keys</span>
        </p>

        {message && (
          <p
            role="alert"
            style={{ ...statusMsg, color: status === 'error' ? '#ef4444' : '#22c55e' }}
          >
            {message}
          </p>
        )}

        <div style={btnRow}>
          <button
            onClick={handleSave}
            disabled={!apiKey.trim() || status === 'saving' || status === 'ok'}
            style={primaryBtn}
            aria-busy={status === 'saving'}
          >
            {status === 'saving' ? 'Saving…' : status === 'ok' ? '✓ Saved' : 'Save Key'}
          </button>

          {onDismiss && status !== 'saving' && status !== 'ok' && (
            <button onClick={onDismiss} style={ghostBtn}>
              Skip for now
            </button>
          )}
        </div>

        <p style={footer}>
          To remove the key later: <code>Settings → API Key → Remove</code>
        </p>
      </div>
    </div>
  )
}

// ── Inline styles (no build-time CSS required) ────────────────────────────────
const overlay: React.CSSProperties = {
  position:        'fixed', inset: 0,
  background:      'rgba(0,0,0,0.75)',
  display:         'flex', alignItems: 'center', justifyContent: 'center',
  zIndex:          9999,
  backdropFilter:  'blur(4px)',
}
const modal: React.CSSProperties = {
  background:    '#1e1e2e',
  border:        '1px solid #3b3b5c',
  borderRadius:  '12px',
  padding:       '32px',
  maxWidth:      '480px', width: '90vw',
  boxShadow:     '0 24px 64px rgba(0,0,0,0.6)',
}
const title: React.CSSProperties = {
  margin: '0 0 12px', fontSize: '1.25rem', fontWeight: 700, color: '#e2e8f0',
}
const body: React.CSSProperties = {
  fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 20px',
}
const label: React.CSSProperties = {
  display: 'block', fontSize: '0.8rem', fontWeight: 600,
  color: '#cbd5e1', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase',
}
const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 14px', fontSize: '1rem',
  background: '#0f0f1a', border: '1px solid #4b4b6e', borderRadius: '8px',
  color: '#e2e8f0', outline: 'none', fontFamily: 'monospace',
}
const hint: React.CSSProperties = {
  fontSize: '0.75rem', color: '#64748b', margin: '6px 0 16px',
}
const statusMsg: React.CSSProperties = {
  fontSize: '0.85rem', margin: '0 0 12px', fontWeight: 500,
}
const btnRow: React.CSSProperties = {
  display: 'flex', gap: '12px', marginTop: '8px',
}
const primaryBtn: React.CSSProperties = {
  flex: 1, padding: '10px 0',
  background: '#7c3aed', border: 'none', borderRadius: '8px',
  color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
}
const ghostBtn: React.CSSProperties = {
  padding: '10px 18px',
  background: 'transparent', border: '1px solid #4b4b6e', borderRadius: '8px',
  color: '#94a3b8', cursor: 'pointer', fontSize: '0.875rem',
}
const footer: React.CSSProperties = {
  marginTop: '20px', fontSize: '0.75rem', color: '#475569', textAlign: 'center',
}
