'use client'

import { useState, useEffect, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Layout from '@/components/layout/Layout'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { FONT, tabsConfig } from './constants'
import ManualTab from './components/ManualTab'
import NLPTab from './components/NLPTab'
import VoiceTab from './components/VoiceTab'
import ScanTab from './components/ScanTab'
import FeatureGate from '@/components/subscription/FeatureGate'

const BRAND_TEAL = '#0d9488'
const INACTIVE_SLATE = '#94a3b8'

function normalizeTab(raw: string | null): string {
  const tab = raw || 'manual'
  if (tab === 'text') return 'nlp'
  if (tab === 'manual' || tab === 'nlp' || tab === 'voice' || tab === 'scan') return tab
  return 'manual'
}

function AddTransactionContent() {
  const t = useTranslations('add')
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlTab = normalizeTab(searchParams.get('tab'))
  const [activeTab, setActiveTab] = useState(urlTab)

  useEffect(() => {
    setActiveTab(urlTab)
  }, [urlTab])

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId)
    router.replace(`/add?tab=${tabId}`, { scroll: false })
  }

  return (
    <Layout>
      <div
        style={{
          maxWidth: 540,
          margin: '0 auto',
          fontFamily: FONT,
          paddingBottom: 56,
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: 24,
            border: '1px solid #f1f5f9',
            boxShadow: '0 4px 24px -8px rgba(15, 23, 42, 0.06)',
            padding: '6px 18px 24px',
          }}
        >
          {/* ─── Clean Underline Tab Bar ─── */}
          <div
            style={{
              display: 'flex',
              position: 'relative',
              borderBottom: '1.5px solid #f1f5f9',
              marginBottom: 22,
            }}
          >
            {tabsConfig.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectTab(tab.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '13px 4px 13px',
                    background: 'none',
                    border: 'none',
                    color: isActive ? BRAND_TEAL : INACTIVE_SLATE,
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 13.5,
                    cursor: 'pointer',
                    fontFamily: FONT,
                    position: 'relative',
                    transition: 'color 0.18s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <tab.Icon size={16} />
                  <span>{t(tab.labelKey as 'tabManual' | 'tabNlp' | 'tabVoice' | 'tabScan')}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      style={{
                        position: 'absolute',
                        bottom: -1.5,
                        left: 8,
                        right: 8,
                        height: 2.5,
                        background: BRAND_TEAL,
                        borderRadius: 999,
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* ─── Tab Content ─── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              {activeTab === 'manual' && <ManualTab />}
              {activeTab === 'nlp' && (
                <FeatureGate feature="nlp_entry" title="Smart Text Entry">
                  <NLPTab />
                </FeatureGate>
              )}
              {activeTab === 'voice' && (
                <FeatureGate feature="voice_entry" title="Voice Entry">
                  <VoiceTab />
                </FeatureGate>
              )}
              {activeTab === 'scan' && (
                <FeatureGate feature="receipt_scan" title="Receipt & PDF Scan">
                  <ScanTab />
                </FeatureGate>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  )
}

export default function AddPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AddTransactionContent />
    </Suspense>
  )
}
