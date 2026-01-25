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
  NetworkInterface,
} from './NativeNetworkState';

export interface UseNetworkStateOptions {
  /**
   * Whether to start listening automatically when the hook mounts
   * @default true
   */
  autoStart?: boolean;

  /**
   * Whether to include IP address information for network interfaces.
   * When true, networkState.interfaces will be populated with WiFi/Ethernet
   * interfaces and their IPv4/IPv6 addresses. Updates reactively on network changes.
   * @default false
   */
  includeIPAddresses?: boolean;
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

  /**
   * Get network interfaces with IP addresses (WiFi & Ethernet only)
   */
  getNetworkInterfaces: () => Promise<NetworkInterface[]>;
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
  const { autoStart = true, includeIPAddresses = false } = options;

  const [networkStateData, setNetworkStateData] =
    useState<NetworkStateType | null>(null);
  const [isListening, setIsListening] = useState(false);
  const subscriptionRef = useRef<{
    remove: () => void;
  } | null>(null);
  const isListeningRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const state = await NativeNetworkState.getNetworkState();

      if (includeIPAddresses) {
        const interfaces = await NativeNetworkState.getNetworkInterfaces();
        setNetworkStateData({ ...state, interfaces });
      } else {
        setNetworkStateData(state);
      }
    } catch (error) {
      console.error('Failed to refresh network state:', error);
    }
  }, [includeIPAddresses]);

  const startListening = useCallback(() => {
    // Prevent multiple subscriptions using ref (avoids race condition with state updates)
    if (isListeningRef.current) return;

    // Clean up existing subscription if any (safety check)
    subscriptionRef.current?.remove?.();
    subscriptionRef.current = null;

    isListeningRef.current = true;
    NativeNetworkState.startNetworkStateListener();
    setIsListening(true);

    // Listen to network state changes
    const emitter =
      Platform.OS === 'ios'
        ? new NativeEventEmitter((NativeModules as any).NetworkState)
        : DeviceEventEmitter;
    const subscription = (emitter as any).addListener(
      'networkStateChanged',
      async (state: any) => {
        if (includeIPAddresses) {
          try {
            const interfaces = await NativeNetworkState.getNetworkInterfaces();
            setNetworkStateData({ ...(state as NetworkStateType), interfaces });
          } catch {
            setNetworkStateData(state as NetworkStateType);
          }
        } else {
          setNetworkStateData(state as NetworkStateType);
        }
      }
    );

    // Store subscription for cleanup in closure
    subscriptionRef.current = subscription as unknown as {
      remove: () => void;
    };
  }, [includeIPAddresses]);

  const stopListening = useCallback(() => {
    if (!isListeningRef.current) return;

    isListeningRef.current = false;
    NativeNetworkState.stopNetworkStateListener();
    setIsListening(false);

    // Remove subscription
    subscriptionRef.current?.remove?.();
    subscriptionRef.current = null;
  }, []);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Use ref instead of state to avoid race condition with batched async updates
      if (nextAppState === 'active' && isListeningRef.current) {
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
  }, [refresh]);

  // Restart listener when includeIPAddresses changes (to update the event handler closure)
  useEffect(() => {
    if (isListeningRef.current) {
      // Restart listener to pick up new includeIPAddresses value
      stopListening();
      startListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeIPAddresses]);

  useEffect(() => {
    if (autoStart) {
      startListening();
    }

    // Initial network state
    refresh();

    return () => {
      if (isListeningRef.current) {
        stopListening();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

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
      if (state.details) {
        return state.details;
      }
      return null;
    },
    getNetworkCapabilities: async () => {
      const state = await NativeNetworkState.getNetworkState();
      return state.details?.capabilities || null;
    },
    getNetworkInterfaces: () => NativeNetworkState.getNetworkInterfaces(),
  };
}

export default useNetworkState;
