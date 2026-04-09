export function getDeviceInfo(userAgent: string) {
  const ua = userAgent.toLowerCase()

  // Detect device type
  let device_name = 'Desktop'
  if (/mobile|android|iphone|ipod/.test(ua)) device_name = 'Mobile'
  else if (/ipad|tablet/.test(ua)) device_name = 'Tablet'

  // Detect browser
  let browser = 'Unknown Browser'
  if (ua.includes('edg/')) browser = 'Edge'
  else if (ua.includes('opr/') || ua.includes('opera')) browser = 'Opera'
  else if (ua.includes('chrome')) browser = 'Chrome'
  else if (ua.includes('safari')) browser = 'Safari'
  else if (ua.includes('firefox')) browser = 'Firefox'

  // Detect OS
  let os = 'Unknown OS'
  if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'
  else if (ua.includes('mac')) os = 'macOS'
  else if (ua.includes('linux')) os = 'Linux'

  return { device_name, browser, os }
}
