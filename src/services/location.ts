/**
 * Location service for geolocation with permission handling
 */

export interface LocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface LocationError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED';
  message: string;
}

/**
 * Request user's current location with browser geolocation API
 */
export async function getCurrentLocation(
  options?: PositionOptions
): Promise<LocationResult> {
  if (!('geolocation' in navigator)) {
    throw {
      code: 'NOT_SUPPORTED',
      message: 'Geolocation is not supported by this browser',
    } as LocationError;
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        const errorMap: Record<number, LocationError['code']> = {
          [error.PERMISSION_DENIED]: 'PERMISSION_DENIED',
          [error.POSITION_UNAVAILABLE]: 'POSITION_UNAVAILABLE',
          [error.TIMEOUT]: 'TIMEOUT',
        };

        reject({
          code: errorMap[error.code] || 'POSITION_UNAVAILABLE',
          message: error.message,
        } as LocationError);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
        ...options,
      }
    );
  });
}

/**
 * Check if geolocation permission is granted
 */
export async function checkLocationPermission(): Promise<PermissionState> {
  if (!('permissions' in navigator)) {
    return 'prompt';
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state;
  } catch {
    return 'prompt';
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
