import { useState, useEffect, useCallback, useRef } from 'react';
import {
  NativeEventEmitter,
  DeviceEventEmitter,
  AppState,
  Platform,
  NativeModules,
  type AppStateStatus,
} from 'react-native';
import NativeNetworkState, { NetworkType } from './NativeNetworkState';
import type {
  NetworkState as NetworkStateType,
  NetworkDetails,
  NetworkCapabilities,
} from './NativeNetworkState';

export interface UseNetworkStateOptions {
  /**
   * Whether to start listening automatically when the hook mounts
   * @default true
   */
  autoStart?: boolean;
}

export interface UseNetworkStateReturn {
  /**
   * Current network state
   */
  networkState: NetworkStateType | null;

  /**
   * Whether the hook is currently listening to network changes
   */
  isListening: boolean;

  /**
   * Start listening to network state changes
   */
  startListening: () => void;

  /**
   * Stop listening to network state changes
   */
  stopListening: () => void;

  /**
   * Refresh network state manually
   */
  refresh: () => Promise<void>;

  /**
   * Check if specific network type is available
   */
  isNetworkTypeAvailable: (type: NetworkType) => Promise<boolean>;

  /**
   * Get network strength
   */
  getNetworkStrength: () => Promise<number>;

  /**
   * Check if network is expensive
   */
  isNetworkExpensive: () => Promise<boolean>;

  /**
   * Check if network is metered
   */
  isNetworkMetered: () => Promise<boolean>;

  /**
   * Check if connected to WiFi
   */
  isConnectedToWifi: () => Promise<boolean>;

  /**
   * Check if connected to cellular
   */
  isConnectedToCellular: () => Promise<boolean>;

  /**
   * Check if internet is actually reachable (not just connected to a network).
   * Returns true only if the OS has validated internet connectivity.
   * Returns false at captive portals or when network requires authentication.
   */
  isInternetReachable: () => Promise<boolean>;

  /**
   * Get WiFi details
   */
  getWifiDetails: () => Promise<NetworkDetails | null>;

  /**
   * Get network capabilities
   */
  getNetworkCapabilities: () => Promise<NetworkCapabilities | null>;
}

/**
 * React Hook for tracking network state
 *
 * @param options Configuration options
 * @returns Network state and utility functions
 *
 * @example
 * ```tsx
 * const { networkState, isListening, startListening, stopListening } = useNetworkState();
 *
 * useEffect(() => {
 *   if (networkState) {
 *     console.log('Network type:', networkState.type);
 *
 *     // isConnected: true if device has a network (might be captive portal)
 *     console.log('Has network:', networkState.isConnected);
 *
 *     // isInternetReachable: true only if internet actually works
 *     console.log('Can reach internet:', networkState.isInternetReachable);
 *
 *     if (networkState.isConnected && !networkState.isInternetReachable) {
 *       console.log('Connected to network but may need authentication (captive portal)');
 *     }
 *   }
 * }, [networkState]);
 * ```
 */
export function useNetworkState(
  options: UseNetworkStateOptions = {}
): UseNetworkStateReturn {
  const { autoStart = true } = options;

  const [networkStateData, setNetworkStateData] =
    useState<NetworkStateType | null>(null);
  const [isListening, setIsListening] = useState(false);
  const subscriptionRef = useRef<{
    remove: () => void;
  } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const state = await NativeNetworkState.getNetworkState();
      setNetworkStateData(state);
    } catch (error) {
      console.error('Failed to refresh network state:', error);
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isListening) {
      NativeNetworkState.startNetworkStateListener();
      setIsListening(true);

      // Listen to network state changes
      const emitter =
        Platform.OS === 'ios'
          ? new NativeEventEmitter((NativeModules as any).NetworkState)
          : DeviceEventEmitter;
      const subscription = (emitter as any).addListener(
        'networkStateChanged',
        (state: any) => {
          setNetworkStateData(state as NetworkStateType);
        }
      );

      // Store subscription for cleanup in closure
      subscriptionRef.current = subscription as unknown as {
        remove: () => void;
      };
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (isListening) {
      NativeNetworkState.stopNetworkStateListener();
      setIsListening(false);

      // Remove subscription
      subscriptionRef.current?.remove?.();
      subscriptionRef.current = null;
    }
  }, [isListening]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isListening) {
        // App came to foreground, force refresh network state
        NativeNetworkState.forceRefresh();
        // Also refresh local state
        refresh();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => {
      subscription?.remove();
    };
  }, [isListening, refresh]);

  useEffect(() => {
    if (autoStart) {
      startListening();
    }

    // Initial network state
    refresh();

    return () => {
      if (isListening) {
        stopListening();
      }
    };
  }, [autoStart, startListening, stopListening, refresh, isListening]);

  return {
    networkState: networkStateData,
    isListening,
    startListening,
    stopListening,
    refresh,
    isNetworkTypeAvailable: (type: NetworkType) =>
      NativeNetworkState.isNetworkTypeAvailable(type),
    getNetworkStrength: () => NativeNetworkState.getNetworkStrength(),
    isNetworkExpensive: () => NativeNetworkState.isNetworkExpensive(),
    isNetworkMetered: () => NativeNetworkState.isNetworkMetered(),
    isConnectedToWifi: async () => {
      const state = await NativeNetworkState.getNetworkState();
      return state.type === NetworkType.WIFI && state.isConnected;
    },
    isConnectedToCellular: async () => {
      const state = await NativeNetworkState.getNetworkState();
      return state.type === NetworkType.CELLULAR && state.isConnected;
    },
    isInternetReachable: async () => {
      const state = await NativeNetworkState.getNetworkState();
      return state.isInternetReachable;
    },
    getWifiDetails: async () => {
      const state = await NativeNetworkState.getNetworkState();
      if (state.type === NetworkType.WIFI && state.details) {
        return state.details;
      }
      return null;
    },
    getNetworkCapabilities: async () => {
      const state = await NativeNetworkState.getNetworkState();
      return state.details?.capabilities || null;
    },
  };
}

export default useNetworkState;
