'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

const EMAIL = 'contact@envoydirect.io'

const links = [
  { label: 'GitHub', href: '#' },
  { label: 'Upwork', href: '#' },
  { label: 'Fiverr', href: '#' },
  { label: 'LinkedIn', href: '#' },
]

export function SiteFooter() {
  const [copied, setCopied] = useState(false)

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <footer className="mx-auto max-w-6xl px-6 pb-16 pt-12">
      <div className="rounded-2xl border border-glass-border glass-panel p-8 md:p-12">
        <div className="flex flex-col items-center gap-8 text-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-accent-neon">
              // Terminal Connect Block
            </p>
            <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              INITIATE PROJECT SCOPING
            </h2>
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <span className="font-mono text-sm tracking-tight text-muted-foreground">
              {EMAIL}
            </span>
            <button
              type="button"
              onClick={copyEmail}
              aria-label="Copy email address"
              className="inline-flex items-center gap-2 rounded-lg border border-glass-border bg-background/40 px-3 py-1.5 font-mono text-xs tracking-tight text-foreground transition-colors hover:border-accent-neon/40 hover:bg-accent-neon/10"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-status-green" aria-hidden="true" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-glass-border pt-8">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-mono text-xs tracking-tight text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <p className="mt-8 text-center font-mono text-[11px] tracking-tight text-muted-foreground/50">
        © {new Date().getFullYear()} ENVOYDIRECT // ALL SYSTEMS OPERATIONAL
      </p>
    </footer>
  )
}
