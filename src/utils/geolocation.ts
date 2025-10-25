export interface GeolocationData {
  ip: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface DeviceInfo {
  deviceName: string;
  browserName: string;
  osName: string;
}

export const getGeolocation = async (ip?: string): Promise<GeolocationData | null> => {
  try {
    const response = await fetch(`https://ipapi.co/json/`);
    if (!response.ok) throw new Error('Failed to fetch geolocation');
    
    const data = await response.json();
    
    return {
      ip: data.ip || 'Unknown',
      country: data.country_name || 'Unknown',
      city: data.city || 'Unknown',
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
    };
  } catch (error) {
    console.error('Geolocation fetch error:', error);
    return null;
  }
};

export const getDeviceInfo = (): DeviceInfo => {
  const ua = navigator.userAgent;
  
  let deviceName = 'Unknown Device';
  let browserName = 'Unknown Browser';
  let osName = 'Unknown OS';

  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
    deviceName = /iphone|ipad|ipod/i.test(ua) ? 'iPhone/iPad' : 'Android Device';
  } else if (/windows|mac|linux/i.test(ua)) {
    if (/windows/i.test(ua)) deviceName = 'Windows PC';
    else if (/macintosh|mac os x/i.test(ua)) deviceName = 'Mac';
    else deviceName = 'Linux PC';
  }

  if (/edge/i.test(ua)) browserName = 'Edge';
  else if (/chrome/i.test(ua) && !/chromium/i.test(ua)) browserName = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browserName = 'Safari';
  else if (/firefox/i.test(ua)) browserName = 'Firefox';
  else if (/opera|opr/i.test(ua)) browserName = 'Opera';

  if (/windows nt/i.test(ua)) osName = 'Windows';
  else if (/mac os x/i.test(ua)) osName = 'macOS';
  else if (/linux/i.test(ua)) osName = 'Linux';
  else if (/iphone|ipad|ipod/i.test(ua)) osName = 'iOS';
  else if (/android/i.test(ua)) osName = 'Android';

  return {
    deviceName,
    browserName,
    osName,
  };
};
