import { UserSession } from '../types';

const DEVICE_ID_KEY = 'rfid_app_device_uuid_v1';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server-device';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `dev-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function detectDeviceInfo(): {
  deviceId: string;
  deviceName: string;
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
} {
  const deviceId = getOrCreateDeviceId();
  if (typeof window === 'undefined') {
    return {
      deviceId,
      deviceName: 'Unknown Device',
      browser: 'Browser',
      os: 'Unknown OS',
      deviceType: 'desktop'
    };
  }

  const ua = navigator.userAgent;
  let browser = 'Web Browser';
  let os = 'Unknown OS';
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';

  // Detect OS
  if (/windows phone/i.test(ua)) {
    os = 'Windows Phone';
    deviceType = 'mobile';
  } else if (/win(dows|98|nt|95)/i.test(ua)) {
    os = 'Windows';
  } else if (/android/i.test(ua)) {
    os = 'Android';
    deviceType = /tablet|ipad/i.test(ua) ? 'tablet' : 'mobile';
  } else if (/ipad/i.test(ua)) {
    os = 'iPadOS';
    deviceType = 'tablet';
  } else if (/iphone|ipod/i.test(ua)) {
    os = 'iOS';
    deviceType = 'mobile';
  } else if (/mac(intosh|_os)/i.test(ua)) {
    os = 'macOS';
  } else if (/cros/i.test(ua)) {
    os = 'Chrome OS';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  }

  // Detect Browser
  if (/edg/i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/samsungbrowser/i.test(ua)) {
    browser = 'Samsung Internet';
  } else if (/chrome|crios/i.test(ua) && !/opr|opera|brave/i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) {
    browser = 'Apple Safari';
  } else if (/opr|opera/i.test(ua)) {
    browser = 'Opera';
  }

  // Detect Mobile by screen width / touch
  if (deviceType === 'desktop' && (window.innerWidth <= 768 || ('ontouchstart' in window && navigator.maxTouchPoints > 1 && window.innerWidth <= 1024))) {
    deviceType = window.innerWidth >= 600 ? 'tablet' : 'mobile';
  }

  const deviceName = `${browser} (${os}${deviceType === 'mobile' ? ' Ponsel' : deviceType === 'tablet' ? ' Tablet' : ''})`;

  return {
    deviceId,
    deviceName,
    browser,
    os,
    deviceType
  };
}

export function createNewSession(userId: string): UserSession {
  const info = detectDeviceInfo();
  const now = new Date().toISOString();
  const sessionId = `sess-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;

  return {
    sessionId,
    deviceId: info.deviceId,
    deviceName: info.deviceName,
    browser: info.browser,
    os: info.os,
    deviceType: info.deviceType,
    loginAt: now,
    lastSeenAt: now
  };
}
