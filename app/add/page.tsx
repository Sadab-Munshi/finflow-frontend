'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Layout from '@/components/layout/Layout'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { TEAL, GRAY, FONT, tabsConfig } from './constants'
import ManualTab from './components/ManualTab'
import NLPTab from './components/NLPTab'
import VoiceTab from './components/VoiceTab'
import ScanTab from './components/ScanTab'

function AddTransactionContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab') || 'manual'
    return tab === 'text' ? 'nlp' : tab
  })

  return (
    <Layout>
      <div style={{ background: '#ffffff', minHeight: '100dvh', fontFamily: FONT }}>
        <div style={{ padding: '16px 16px 100px' }}>

          {/* ─── Tab Bar ─── */}
          <div style={{
            display: 'flex', position: 'relative',
            borderBottom: '2px solid #f3f4f6', marginBottom: 24,
          }}>
            {tabsConfig.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 6,
                    padding: '12px 0', background: 'none', border: 'none',
                    color: isActive ? TEAL : GRAY,
                    fontWeight: isActive ? 700 : 400,
                    fontSize: 14, cursor: 'pointer', fontFamily: FONT,
                    position: 'relative', paddingBottom: 14,
                  }}
                >
                  <tab.Icon size={18} />
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      style={{
                        position: 'absolute', bottom: -2, left: 0, right: 0,
                        height: 3, background: TEAL, borderRadius: 2,
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
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
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'manual' && <ManualTab />}
              {activeTab === 'nlp'    && <NLPTab />}
              {activeTab === 'voice'  && <VoiceTab />}
              {activeTab === 'scan'   && <ScanTab />}
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
