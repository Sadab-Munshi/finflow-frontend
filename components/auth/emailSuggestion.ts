const domainCorrections: Record<string, string> = {
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gnail.com': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'icloud.co': 'icloud.com',
}

export function getEmailSuggestion(email: string): string | null {
  const trimmedEmail = email.trim().toLowerCase()
  const [localPart, domain, ...rest] = trimmedEmail.split('@')

  if (!localPart || !domain || rest.length > 0) return null

  const correctedDomain = domainCorrections[domain]
  if (!correctedDomain || correctedDomain === domain) return null

  return `${localPart}@${correctedDomain}`
}
