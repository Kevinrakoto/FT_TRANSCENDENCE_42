// src/components/PageLayout.tsx
'use client'

import { ReactNode } from 'react'
import Link from 'next/link'

interface PageLayoutProps {
  children: ReactNode
  title: string
  backUrl?: string
}

export default function PageLayout({ children, title, backUrl }: PageLayoutProps) {
  return (
    <div className="game-container">
      {backUrl && (
        <Link href={backUrl} className="back-button">
          ← BACK
        </Link>
      )}

      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1 className="dashboard-title">
            <span className="title-top">{title.toUpperCase()}</span>
          </h1>
        </header>

        <div className="dashboard-content">
          {children}
        </div>
      </div>
    </div>
  )
}
