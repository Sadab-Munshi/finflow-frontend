'use client'

import { MessageSquare, Camera, Mic, Bell, BarChart3, Brain, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'
import BackButton from '@/components/landing/BackButton'

/* ── collapsible section ── */
interface GuideSectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

function GuideSection({ title, icon, children, defaultOpen = false }: GuideSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-5 sm:p-6 text-left hover:bg-neutral-50 transition-colors"
      >
        <span className="flex items-center gap-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-neutral-900 text-white shrink-0">
            {icon}
          </span>
          <span className="font-semibold text-neutral-900 text-base sm:text-lg">{title}</span>
        </span>
        {open ? (
          <ChevronUp className="w-5 h-5 text-neutral-400 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-neutral-400 shrink-0" />
        )}
      </button>
      {open && <div className="px-5 sm:px-6 pb-6 text-neutral-700 leading-relaxed">{children}</div>}
    </div>
  )
}

/* ── small FAQ item inside Section 07 ── */
interface FAQEntryProps {
  q: string
  a: React.ReactNode
}

function FAQEntry({ q, a }: FAQEntryProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-neutral-100 rounded-xl">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50 transition-colors"
      >
        <span className="font-medium text-neutral-900 text-sm">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-neutral-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 text-sm text-neutral-600 leading-relaxed">{a}</div>}
    </div>
  )
}

export default function UserGuidePage() {
  return (
    <>
      {/* ── Global styles to prevent image saving ── */}
      <style jsx global>{`
        .protected-image-container {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        .protected-image-container img {
          -webkit-user-drag: none;
          -khtml-user-drag: none;
          -moz-user-drag: none;
          -o-user-drag: none;
          user-drag: none;
          pointer-events: none;
        }
      `}</style>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">

        {/* ── back button ── */}
        <BackButton />

        {/* ── header ── */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-3">User Guide</h1>
        </div>

        {/* ── full-width infographic (FIXED) ── */}
        <div
          className="protected-image-container relative mb-10 -mx-4 sm:-mx-6 lg:-mx-8"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        >
          {/* Use a simpler full-width approach instead of the 50vw trick */}
          <div className="w-screen relative left-1/2 -translate-x-1/2">
            <Image
              src="/finflow-infographic.webp"
              alt="FinFlow Infographic"
              width={1920}
              height={1080}
              sizes="100vw"
              className="w-full h-auto block select-none"
              style={{
                pointerEvents: 'none',
                WebkitTouchCallout: 'none',
                maxHeight: 'none',
              }}
              draggable={false}
              priority
            />
            {/* ── Transparent overlay to block all interactions ── */}
            <div
              className="absolute inset-0 z-10"
              style={{ background: 'transparent' }}
              onContextMenu={(e) => e.preventDefault()}
              onTouchStart={(e) => {
                // Allow scroll but prevent long-press
                // Long press typically fires after ~500ms
              }}
            />
          </div>
        </div>

        {/* ── quick-start banner ── */}
        <div className="mb-8 rounded-2xl bg-neutral-900 text-white px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-semibold text-base mb-1">New here? Start in 60 seconds.</p>
            <p className="text-sm text-neutral-300">Sign up, add your first transaction, and let FinFlow do the rest.</p>
          </div>
          <a
            href="https://app.sadabmunshi.me/signup"
            target="_blank"
            rel="noreferrer"
            className="shrink-0 inline-flex items-center justify-center rounded-full bg-white text-neutral-900 text-sm font-medium px-5 py-2.5 hover:bg-neutral-100 transition-colors"
          >
            Get Started →
          </a>
        </div>

        {/* ── sections ── */}
        <div className="space-y-4">

          {/* ──────────────────────── SECTION 01 ──────────────────────── */}
          <GuideSection title="Getting Started &amp; Account Setup" icon={<HelpCircle size={18} />}>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">What Is FinFlow?</h3>
                <p>
                  FinFlow is a personal finance tracking platform built for everyday Indian users. Type what you
                  spent or earned, snap a photo of a receipt, or speak into your phone — FinFlow records,
                  categorises, and analyses your financial data automatically. Access everything through the web
                  app at{' '}
                  <a href="https://app.sadabmunshi.me" className="underline hover:text-neutral-900" target="_blank" rel="noreferrer">
                    app.sadabmunshi.me
                  </a>
                  , with optional WhatsApp and Telegram bots for on-the-go convenience.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">Why Use FinFlow?</h3>
                <ul className="list-disc pl-5 space-y-1.5 text-sm">
                  <li><strong>Zero-Friction Tracking</strong> — add transactions by typing or speaking naturally.</li>
                  <li><strong>Receipt Scanning</strong> — AI extracts every line item from a photo automatically.</li>
                  <li><strong>Multilingual NLP</strong> — understands English, Hindi, and Bengali.</li>
                  <li><strong>Monthly Auto-Reports</strong> — a comprehensive report delivered on the 1st of every month.</li>
                  <li><strong>Smart Budget Alerts</strong> — notifications at 80&nbsp;% and 100&nbsp;% of your spending limit.</li>
                  <li><strong>AI-Powered Insights</strong> — personalised tips drawn from your actual transaction history.</li>
                  <li><strong>Cross-Platform</strong> — web app, WhatsApp, and Telegram, all synced in real time.</li>
                  <li><strong>Secure &amp; Private</strong> — data encrypted end-to-end; never sold or shared.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">Creating Your Account</h3>
                <ol className="list-decimal pl-5 space-y-1.5 text-sm">
                  <li>
                    Visit{' '}
                    <a href="https://app.sadabmunshi.me" className="underline hover:text-neutral-900" target="_blank" rel="noreferrer">
                      app.sadabmunshi.me
                    </a>{' '}
                    and tap <strong>Sign Up</strong>.
                  </li>
                  <li>Enter your name, email, and a strong password — or choose <strong>Continue with Google</strong>.</li>
                  <li>Verify your email by clicking the confirmation link. Check your spam folder if it does not arrive within two minutes.</li>
                  <li>Complete your profile — INR is the default currency.</li>
                  <li>You now have full access to every feature on the web app.</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">Connecting WhatsApp (Optional)</h3>
                <ol className="list-decimal pl-5 space-y-1.5 text-sm">
                  <li>Go to <strong>Settings → Connect WhatsApp</strong>.</li>
                  <li>Copy the unique code displayed on screen.</li>
                  <li>Send the code to the FinFlow WhatsApp number shown.</li>
                  <li>Send <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-xs">balance</code> to confirm the link is active.</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">Connecting Telegram (Optional)</h3>
                <ol className="list-decimal pl-5 space-y-1.5 text-sm">
                  <li>Go to <strong>Settings → Connect Telegram</strong>.</li>
                  <li>Copy the unique code.</li>
                  <li>Open Telegram, search for the FinFlow bot, and send the code.</li>
                  <li>The bot replies with a welcome message once linked.</li>
                </ol>
              </div>

              <p className="text-sm text-neutral-500 italic">
                Tip: WhatsApp and Telegram are optional convenience channels. Every feature is fully available on the web app without them.
              </p>
            </div>
          </GuideSection>

          {/* ──────────────────────── SECTION 02 ──────────────────────── */}
          <GuideSection title="Adding Transactions" icon={<MessageSquare size={18} />}>
            <div className="space-y-6">
              <p>You can record transactions three ways — via the web app, WhatsApp, or Telegram.</p>

              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">Natural-Language Text</h3>
                <p className="text-sm mb-3">
                  Type your transaction in plain language. FinFlow&rsquo;s AI detects the amount, category, and
                  type automatically.
                </p>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-neutral-900 mb-1.5">Expense examples</p>
                    <ul className="space-y-1 text-neutral-600">
                      <li>&ldquo;spent 500 on lunch&rdquo; → Food &amp; Dining · ₹500</li>
                      <li>&ldquo;paid 1200 electricity bill&rdquo; → Bills · ₹1,200</li>
                      <li>&ldquo;bought groceries for 850&rdquo; → Groceries · ₹850</li>
                      <li>&ldquo;Swiggy order 650&rdquo; → Food &amp; Dining · ₹650</li>
                      <li>&ldquo;Netflix subscription 649&rdquo; → Entertainment · ₹649</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 mb-1.5">Income examples</p>
                    <ul className="space-y-1 text-neutral-600">
                      <li>&ldquo;received 50000 salary&rdquo; → Salary · ₹50,000</li>
                      <li>&ldquo;got 5000 freelance payment&rdquo; → Freelance · ₹5,000</li>
                      <li>&ldquo;cashback received 340&rdquo; → Cashback · ₹340</li>
                      <li>&ldquo;bonus of 10000 today&rdquo; → Bonus · ₹10,000</li>
                    </ul>
                  </div>
                </div>
                <p className="text-sm text-neutral-500 italic mt-3">
                  Tip: Add context for richer notes — e.g., &ldquo;spent 1800 on dinner with family at Barbeque
                  Nation&rdquo; saves a detailed note automatically.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">Receipt / Bill Photo Scan</h3>
                <p className="text-sm mb-2">Available on the web app and via WhatsApp / Telegram bots.</p>
                <ol className="list-decimal pl-5 space-y-1.5 text-sm">
                  <li>Take a clear, well-lit photo of any physical or digital receipt.</li>
                  <li>Upload it in the web app (<strong>Transactions → Scan Receipt</strong>) or send it directly to the FinFlow bot.</li>
                  <li>No caption required — just the image.</li>
                  <li>Wait 5–15 seconds for AI processing.</li>
                  <li>FinFlow lists all extracted line items automatically.</li>
                  <li>Edit any entry from the Transactions page if needed.</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">Voice Input</h3>
                <p className="text-sm mb-2">Available on the web app.</p>
                <ol className="list-decimal pl-5 space-y-1.5 text-sm">
                  <li>Open the transaction input screen.</li>
                  <li>Tap the microphone icon.</li>
                  <li>Speak clearly: &ldquo;Spent three hundred on tea.&rdquo;</li>
                  <li>Review the transcribed text and tap <strong>Save</strong>.</li>
                </ol>
                <p className="text-sm text-neutral-500 mt-1">Supports English, Hindi, and Bengali.</p>
              </div>

              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">Backdating Transactions</h3>
                <p className="text-sm">
                  On the web app you can manually set any past date when adding a transaction. On WhatsApp or
                  Telegram, include the date in your message: &ldquo;paid 800 for petrol on 20th March.&rdquo;
                </p>
              </div>
            </div>
          </GuideSection>

          {/* ──────────────────────── SECTION 03 ──────────────────────── */}
          <GuideSection title="WhatsApp &amp; Telegram Bot Commands" icon={<MessageSquare size={18} />}>
            <div className="space-y-5">
              <p className="text-sm">If you have linked WhatsApp or Telegram, use these commands (case-insensitive).</p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-2 pr-4 font-semibold text-neutral-900">Command</th>
                      <th className="text-left py-2 font-semibold text-neutral-900">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    <tr><td className="py-2 pr-4 font-mono text-xs">balance</td><td className="py-2">All-time income, expenses, net balance &amp; savings percentage</td></tr>
                    <tr><td className="py-2 pr-4 font-mono text-xs">monthly</td><td className="py-2">Current month&rsquo;s complete financial summary</td></tr>
                    <tr><td className="py-2 pr-4 font-mono text-xs">recent</td><td className="py-2">Last 5 transactions with full details</td></tr>
                    <tr><td className="py-2 pr-4 font-mono text-xs">preview on</td><td className="py-2">Shows a formatted preview before saving (recommended for new users)</td></tr>
                    <tr><td className="py-2 pr-4 font-mono text-xs">preview off</td><td className="py-2">Saves transactions instantly — no confirmation step (default)</td></tr>
                    <tr><td className="py-2 pr-4 font-mono text-xs">disconnect</td><td className="py-2">Safely unlinks your bot account; data remains intact</td></tr>
                    <tr><td className="py-2 pr-4 font-mono text-xs">help</td><td className="py-2">Lists all available commands</td></tr>
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-neutral-500 italic">
                The web app has no usage limits. If you ever hit the bot&rsquo;s fair-use threshold, you can
                always log transactions freely at{' '}
                <a href="https://app.sadabmunshi.me" className="underline hover:text-neutral-900" target="_blank" rel="noreferrer">
                  app.sadabmunshi.me
                </a>.
              </p>

              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">Reconnecting Your Account</h3>
                <ol className="list-decimal pl-5 space-y-1.5 text-sm">
                  <li>Log in at the web app → open <strong>Settings</strong>.</li>
                  <li>Tap <strong>Connect WhatsApp</strong> or <strong>Connect Telegram</strong>.</li>
                  <li>Copy the unique code and send it to the FinFlow bot.</li>
                  <li>The bot confirms the connection with a welcome message.</li>
                </ol>
                <p className="text-sm text-neutral-500 italic mt-2">
                  Tip: If you change your phone number, disconnect the old number from Settings first, then
                  reconnect. All your data stays intact.
                </p>
              </div>
            </div>
          </GuideSection>

          {/* ──────────────────────── SECTION 04 ──────────────────────── */}
          <GuideSection title="Budget Alerts" icon={<Bell size={18} />}>
            <div className="space-y-5">
              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">How It Works</h3>
                <p className="text-sm mb-3">
                  Set monthly spending limits per category on the web app. FinFlow monitors your spending in
                  real time and notifies you via the web app, WhatsApp, Telegram, and email when you approach
                  or exceed your limit.
                </p>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                    <p className="font-semibold text-amber-800 mb-1">80&nbsp;% Warning</p>
                    <p className="text-amber-700 text-xs">
                      Early heads-up so you can adjust before the month ends. E.g., Food budget ₹5,000 → alert at ₹4,000.
                    </p>
                  </div>
                  <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                    <p className="font-semibold text-red-800 mb-1">100&nbsp;% Critical</p>
                    <p className="text-red-700 text-xs">
                      Fires the moment you hit your limit so there are no surprises.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-neutral-500 mt-3">All budgets reset automatically on the 1st of every month.</p>
              </div>

              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">Setting Up a Budget</h3>
                <ol className="list-decimal pl-5 space-y-1.5 text-sm">
                  <li>Log in at the web app.</li>
                  <li>Open <strong>Budgets</strong> in the main navigation.</li>
                  <li>Tap <strong>+ Add Budget</strong>.</li>
                  <li>Select a spending category (Food, Transport, Bills, etc.).</li>
                  <li>Enter your monthly limit — e.g., Food = ₹6,000/month.</li>
                  <li>Tap <strong>Save</strong>. Monitoring starts immediately.</li>
                  <li>Visit the Budgets page anytime to see live progress bars.</li>
                </ol>
                <p className="text-sm text-neutral-500 italic mt-2">
                  Tip: Start with four key categories — Food, Transport, Entertainment, and Bills. These
                  typically cover 80&nbsp;% of monthly spending.
                </p>
              </div>
            </div>
          </GuideSection>

          {/* ──────────────────────── SECTION 05 ──────────────────────── */}
          <GuideSection title="Monthly Financial Reports" icon={<BarChart3 size={18} />}>
            <div className="space-y-5">
              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">Automatic Delivery</h3>
                <p className="text-sm">
                  On the 1st of every month at 8:00&nbsp;AM, FinFlow emails you a comprehensive report for the
                  previous month. No action required — it is fully automatic. You can also view, download, or
                  print any past report from the <strong>Reports</strong> section in the web app.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">What Each Report Covers</h3>
                <ul className="list-disc pl-5 space-y-1.5 text-sm">
                  <li><strong>Income vs Expense Summary</strong> — total income, total expenses, net balance, and savings rate.</li>
                  <li><strong>Category-Wise Breakdown</strong> — amount and percentage of total spending per category.</li>
                  <li><strong>Month-on-Month Comparison</strong> — percentage change per category versus the previous month.</li>
                  <li><strong>AI-Generated Insights</strong> — personalised observations and recommendations based on your patterns.</li>
                  <li><strong>Budget Performance</strong> — which categories stayed within limit, triggered 80&nbsp;% alerts, or exceeded 100&nbsp;%.</li>
                  <li><strong>Full Transaction List</strong> — every transaction with date, category, description, amount, and type.</li>
                </ul>
                <p className="text-sm text-neutral-500 italic mt-3">
                  Tip: If the report email goes to spam, mark it &ldquo;Not Spam&rdquo; once — future emails will land in your inbox.
                </p>
              </div>
            </div>
          </GuideSection>

          {/* ──────────────────────── SECTION 06 ──────────────────────── */}
          <GuideSection title="AI Insights" icon={<Brain size={18} />}>
            <div className="space-y-5">
              <p className="text-sm">
                FinFlow analyses your transactions using AI to surface personalised patterns, anomalies, and
                saving opportunities. Every insight is generated from <em>your own</em> data — no two users
                receive the same recommendations. Insights improve significantly with more data; by month three,
                they become highly accurate.
              </p>

              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">Types of Insights</h3>
                <ul className="list-disc pl-5 space-y-1.5 text-sm">
                  <li><strong>Spending Pattern Analysis</strong> — identifies your peak spending days and fastest-growing categories.</li>
                  <li><strong>Month-over-Month Comparison</strong> — clear percentage change per category.</li>
                  <li><strong>Saving Opportunities</strong> — actionable areas where you could cut costs. E.g., &ldquo;You ordered delivery 18 times this month. Cooking at home 4 days a week could save ~₹1,200.&rdquo;</li>
                  <li><strong>Budget Recommendations</strong> — data-driven limit suggestions based on actual spending history.</li>
                  <li><strong>Unusual Transaction Flags</strong> — significantly above-average transactions flagged for review.</li>
                  <li><strong>Positive Reinforcement</strong> — good habits highlighted, such as staying within budget for consecutive months.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">Where to Access Insights</h3>
                <ol className="list-decimal pl-5 space-y-1.5 text-sm">
                  <li><strong>Web App → Insights tab</strong> — live, continuously updated analysis.</li>
                  <li><strong>Monthly email report</strong> — most comprehensive month-end analysis.</li>
                  <li>Type <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-xs">monthly</code> in the bot for a quick summary.</li>
                </ol>
              </div>
            </div>
          </GuideSection>

          {/* ──────────────────────── SECTION 07 ──────────────────────── */}
          <GuideSection title="Frequently Asked Questions" icon={<HelpCircle size={18} />}>
            <div className="space-y-3">
              <FAQEntry
                q="Is FinFlow free to use?"
                a="Yes. All core features — transaction tracking, receipt scanning, budget alerts, monthly reports, and AI insights — are free. Premium features may be introduced in future updates."
              />
              <FAQEntry
                q="Is my financial data safe?"
                a="Absolutely. All data is encrypted in transit (TLS/SSL) and at rest using industry-standard protocols. Your data is never sold, shared, or monetised. You can request full deletion from Settings at any time."
              />
              <FAQEntry
                q="Can I use FinFlow without WhatsApp or Telegram?"
                a={<>Yes. Every feature is fully available on the web app at <a href="https://app.sadabmunshi.me" className="underline hover:text-neutral-900" target="_blank" rel="noreferrer">app.sadabmunshi.me</a>. WhatsApp and Telegram are optional convenience channels.</>}
              />
              <FAQEntry
                q="What happens if I disconnect WhatsApp or Telegram?"
                a="Only the messaging link is removed. All your transactions, budgets, and reports remain intact. You can reconnect anytime without losing data."
              />
              <FAQEntry
                q="The bot could not understand my message. What should I do?"
                a={<>Ensure your message includes a clear amount — &ldquo;lunch&rdquo; alone will not work, but &ldquo;spent 200 on lunch&rdquo; will. For receipts, make sure the photo is clear and well-lit. If issues persist, add the transaction on the web app.</>}
              />
              <FAQEntry
                q="Can I edit or delete a transaction?"
                a={<>Yes. Log in to the web app → <strong>Transactions</strong>, find the entry, and tap the edit or delete icon. Changes sync instantly across all platforms.</>}
              />
              <FAQEntry
                q="Can I track business and personal expenses separately?"
                a="Yes. Use categories such as Business, Freelance Income, and Office Supplies. For complete separation, use two separate FinFlow accounts."
              />
              <FAQEntry
                q="What if I forget to log a transaction on the correct date?"
                a={<>On the web app, set any past date when adding a transaction. On WhatsApp or Telegram, include the date in your message: &ldquo;paid 800 for petrol on 20th March.&rdquo;</>}
              />
              <FAQEntry
                q="I am not receiving the monthly report email."
                a="Check your spam and junk folders. Add the FinFlow sender address to your contacts. Confirm your email is verified in Settings. If the issue persists, contact support via the web app."
              />
              <FAQEntry
                q="Is there a mobile app?"
                a={<>FinFlow is a fully mobile-responsive web app at <a href="https://app.sadabmunshi.me" className="underline hover:text-neutral-900" target="_blank" rel="noreferrer">app.sadabmunshi.me</a> that works smoothly on every smartphone. A native mobile app may be released in a future update.</>}
              />
              <FAQEntry
                q="How do I permanently delete my account?"
                a="Go to Settings → scroll to the bottom → Delete Account → confirm. All data is permanently removed and cannot be recovered. Export your data from Reports first if you need a backup."
              />
            </div>
          </GuideSection>
        </div>

      </div>
    </>
  )
}
