import UAParser from 'ua-parser-js'

export function getDeviceInfo(userAgent: string) {
  const parser = new UAParser.UAParser(userAgent)
  const result = parser.getResult()

  const browser = result.browser.name ?? 'Unknown Browser'
  const os = result.os.name ?? 'Unknown OS'
  const deviceType = result.device.type ?? 'desktop'

  let device_name = 'Desktop'
  if (deviceType === 'mobile') device_name = 'Mobile'
  else if (deviceType === 'tablet') device_name = 'Tablet'

  return {
    device_name,
    browser,
    os,
  }
}
