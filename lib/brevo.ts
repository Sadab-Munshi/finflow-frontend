export async function sendWelcomeEmail(fullName: string, email: string): Promise<void> {
  const firstName = fullName.split(' ')[0]

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to FinFlow</title>
  <style>
    @media (max-width:600px) {
      .outer-wrap  { padding:12px !important; }
      .inner-wrap  { width:100% !important; }
      .logo-img    { max-height:36px !important; height:36px !important; }
      .greeting    { font-size:20px !important; }
      .body-text   { font-size:13px !important; }
      .feature-cell  { padding:10px 12px !important; }
      .feature-icon  { width:28px !important; height:28px !important; }
      .feature-title { font-size:13px !important; }
      .feature-desc  { font-size:12px !important; }
      .cta-btn     { font-size:14px !important; padding:12px 20px !important; width:90% !important; display:block !important; text-align:center !important; box-sizing:border-box !important; }
      .pro-tip-cell  { padding:10px !important; }
      .pro-tip-text  { font-size:12px !important; }
      .footer-text   { font-size:10px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" class="outer-wrap" style="background:#f9fafb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" class="inner-wrap" style="max-width:600px;background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.07);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:32px 24px 24px;">
              <img src="https://app.sadabmunshi.online/images/finflow-logo.png" alt="FinFlow" height="60" class="logo-img" style="height:60px;width:auto;display:block;" />
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 24px;">
              <hr style="border:none;border-top:1px solid #f0fdf4;margin:0;">
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:28px 24px 4px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#111827;" class="greeting">Hey <span style="color:#10b981;">${firstName}</span>, welcome to FinFlow! &#127881;</p>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding:12px 24px 20px;">
              <p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#374151;" class="body-text">You&#39;re all set to manage your finances effortlessly.</p>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;" class="body-text">Here&#39;s how to get started:</p>
            </td>
          </tr>

          <!-- Features -->
          <tr>
            <td style="padding:0 24px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">

                <!-- NLP Text Parsing -->
                <tr>
                  <td style="padding:0 0 10px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3e8ff;border-radius:12px;">
                      <tr>
                        <td style="padding:16px 18px;" class="feature-cell">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="vertical-align:middle;padding-right:16px;">
                                <img src="https://app.sadabmunshi.online/images/icon-nlp.png" alt="NLP Text Parsing" width="48" height="48" class="feature-icon" style="width:48px;height:48px;display:block;" />
                              </td>
                              <td style="vertical-align:middle;">
                                <p style="margin:0;font-size:14px;font-weight:700;color:#111827;" class="feature-title">NLP Text Parsing</p>
                                <p style="margin:4px 0 0;font-size:13px;color:#6b7280;" class="feature-desc">Type naturally, AI understands and categorizes</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Voice Input -->
                <tr>
                  <td style="padding:0 0 10px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#d1fae5;border-radius:12px;">
                      <tr>
                        <td style="padding:16px 18px;" class="feature-cell">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="vertical-align:middle;padding-right:16px;">
                                <img src="https://app.sadabmunshi.online/images/icon-voice.png" alt="Voice Input" width="48" height="48" class="feature-icon" style="width:48px;height:48px;display:block;" />
                              </td>
                              <td style="vertical-align:middle;">
                                <p style="margin:0;font-size:14px;font-weight:700;color:#111827;" class="feature-title">Voice Input</p>
                                <p style="margin:4px 0 0;font-size:13px;color:#6b7280;" class="feature-desc">Add transactions just by speaking naturally</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Receipt Scan -->
                <tr>
                  <td style="padding:0 0 10px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#dbeafe;border-radius:12px;">
                      <tr>
                        <td style="padding:16px 18px;" class="feature-cell">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="vertical-align:middle;padding-right:16px;">
                                <img src="https://app.sadabmunshi.online/images/icon-receipt.png" alt="Receipt Scan" width="48" height="48" class="feature-icon" style="width:48px;height:48px;display:block;" />
                              </td>
                              <td style="vertical-align:middle;">
                                <p style="margin:0;font-size:14px;font-weight:700;color:#111827;" class="feature-title">Receipt Scan</p>
                                <p style="margin:4px 0 0;font-size:13px;color:#6b7280;" class="feature-desc">Snap a photo and let AI extract the details</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- AI Insights -->
                <tr>
                  <td style="padding:0 0 10px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fce7f3;border-radius:12px;">
                      <tr>
                        <td style="padding:16px 18px;" class="feature-cell">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="vertical-align:middle;padding-right:16px;">
                                <img src="https://app.sadabmunshi.online/images/icon-insights.png" alt="AI Insights" width="48" height="48" class="feature-icon" style="width:48px;height:48px;display:block;" />
                              </td>
                              <td style="vertical-align:middle;">
                                <p style="margin:0;font-size:14px;font-weight:700;color:#111827;" class="feature-title">AI Insights</p>
                                <p style="margin:4px 0 0;font-size:13px;color:#6b7280;" class="feature-desc">Get smart spending patterns and tips</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Smart Budgets -->
                <tr>
                  <td style="padding:0;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef9c3;border-radius:12px;">
                      <tr>
                        <td style="padding:16px 18px;" class="feature-cell">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="vertical-align:middle;padding-right:16px;">
                                <img src="https://app.sadabmunshi.online/images/icon-budgets.png" alt="Smart Budgets" width="48" height="48" class="feature-icon" style="width:48px;height:48px;display:block;" />
                              </td>
                              <td style="vertical-align:middle;">
                                <p style="margin:0;font-size:14px;font-weight:700;color:#111827;" class="feature-title">Smart Budgets</p>
                                <p style="margin:4px 0 0;font-size:13px;color:#6b7280;" class="feature-desc">Set limits and get alerts before you overspend</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:0 24px 28px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.sadabmunshi.online'}/dashboard"
                 class="cta-btn"
                 style="display:inline-block;background:#14b8a6;color:#ffffff;font-size:15px;font-weight:700;padding:14px 36px;border-radius:50px;text-decoration:none;">
                Start Tracking Now &#8594;
              </a>
            </td>
          </tr>

          <!-- Pro Tip -->
          <tr>
            <td style="padding:0 24px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border-radius:10px;">
                <tr>
                  <td style="padding:14px 16px;" class="pro-tip-cell">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:12px;width:36px;">
                          <img src="https://app.sadabmunshi.online/images/icon-tip.png" alt="Pro Tip" width="32" height="32" style="width:32px;height:32px;display:block;" />
                        </td>
                        <td style="vertical-align:middle;">
                          <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;" class="pro-tip-text"><strong>Pro Tip:</strong> Add your first transaction today to build the habit!</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 24px;">
              <hr style="border:none;border-top:1px solid #f3f4f6;margin:0;">
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td style="padding:24px 24px 20px;">
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
                Warm regards,<br>
                <strong style="color:#14b8a6;">Sadab</strong><br>
                <span style="color:#6b7280;">FinFlow Team</span>
              </p>
            </td>
          </tr>

          <!-- Hidden tracking link -->
          <tr>
            <td>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.sadabmunshi.online'}/user-guide" style="color:transparent;font-size:0;line-height:0;display:block;height:0;overflow:hidden;">user guide</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:16px 24px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;color:#9ca3af;" class="footer-text">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.sadabmunshi.online'}/privacy" style="color:#9ca3af;text-decoration:none;">Privacy Policy</a>
                &nbsp;&#183;&nbsp;
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.sadabmunshi.online'}/terms" style="color:#9ca3af;text-decoration:none;">Terms</a>
                &nbsp;&#183;&nbsp;
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.sadabmunshi.online'}/disclaimer" style="color:#9ca3af;text-decoration:none;">Unsubscribe</a>
              </p>
              <p style="margin:0;font-size:11px;color:#9ca3af;" class="footer-text">&#169; 2026 FinFlow</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.BREVO_FROM_EMAIL
  const senderName = process.env.BREVO_SENDER_NAME || process.env.BREVO_FROM_NAME || 'FinFlow'

  if (!senderEmail) {
    throw new Error('Missing sender email env variable (BREVO_SENDER_EMAIL or BREVO_FROM_EMAIL)')
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY!,
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email, name: fullName }],
      subject: `Hey ${firstName}, welcome to FinFlow! 🎉`,
      htmlContent,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Brevo email error:', error)
    throw new Error('Failed to send welcome email')
  }
}
