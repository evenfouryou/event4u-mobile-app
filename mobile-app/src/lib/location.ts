import * as Location from 'expo-location';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

let cachedLocation: UserLocation | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[Location] Error requesting permission:', error);
    return false;
  }
}

export async function checkLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[Location] Error checking permission:', error);
    return false;
  }
}

export async function getCurrentLocation(): Promise<UserLocation | null> {
  try {
    // Return cached location if still valid
    if (cachedLocation && Date.now() - lastFetchTime < CACHE_DURATION) {
      return cachedLocation;
    }

    const hasPermission = await checkLocationPermission();
    if (!hasPermission) {
      const granted = await requestLocationPermission();
      if (!granted) {
        console.log('[Location] Permission denied');
        return null;
      }
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    cachedLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    lastFetchTime = Date.now();

    console.log('[Location] Got user location:', cachedLocation);
    return cachedLocation;
  } catch (error) {
    console.error('[Location] Error getting location:', error);
    return null;
  }
}

export function getCachedLocation(): UserLocation | null {
  return cachedLocation;
}

export function clearLocationCache(): void {
  cachedLocation = null;
  lastFetchTime = 0;
}
