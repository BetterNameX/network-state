import { TurboModuleRegistry, type TurboModule } from 'react-native';

/**
 * Network state information
 * Platform: Android & iOS
 */
export interface NetworkState {
  /**
   * Whether a network interface is available and claims to provide internet access.
   * This will be true even if you're connected to a captive portal (e.g., hotel WiFi login page).
   * Use this to determine if the device has any network connectivity at all.
   */
  isConnected: boolean;

  /**
   * Whether the device can actually reach the internet.
   * On Android: Network has been validated by the OS (NET_CAPABILITY_VALIDATED).
   * On iOS: Network path is satisfied (not just reachable, but usable).
   * This will be false at captive portals or when network requires authentication.
   * Use this to determine if you can make network requests.
   */
  isInternetReachable: boolean;

  /** Network type (wifi, cellular, ethernet, etc.) */
  type: NetworkType;

  /** Whether the network is considered expensive (typically true on cellular) */
  isExpensive: boolean;

  /** Whether the network is metered (typically true on cellular) */
  isMetered: boolean;

  /** Additional network details (signal strength, capabilities, etc.) */
  details?: NetworkDetails;
}

/**
 * Platform: Mostly Android. iOS may not provide SSID/BSSID/strength/frequency.
 */
export interface NetworkDetails {
  ssid?: string;
  bssid?: string;
  strength?: number;
  frequency?: number;
  linkSpeed?: number;
  capabilities?: NetworkCapabilities;
}

/**
 * Platform: Android & iOS. Field coverage varies per platform.
 */
export interface NetworkCapabilities {
  hasTransportWifi?: boolean;
  hasTransportCellular?: boolean;
  hasTransportEthernet?: boolean;
  hasTransportBluetooth?: boolean;
  hasTransportVpn?: boolean;
  hasCapabilityInternet?: boolean;
  hasCapabilityValidated?: boolean;
  hasCapabilityCaptivePortal?: boolean;
  hasCapabilityNotRestricted?: boolean;
  hasCapabilityTrusted?: boolean;
  hasCapabilityNotMetered?: boolean;
  hasCapabilityNotRoaming?: boolean;
  hasCapabilityForLocal?: boolean;
  hasCapabilityManaged?: boolean;
  hasCapabilityNotSuspended?: boolean;
  hasCapabilityNotVpn?: boolean;
  hasCapabilityNotCellular?: boolean;
  hasCapabilityNotWifi?: boolean;
  hasCapabilityNotEthernet?: boolean;
  hasCapabilityNotBluetooth?: boolean;
}

/**
 * Platform availability per member noted in comments.
 */
export enum NetworkType {
  NONE = 'none',
  UNKNOWN = 'unknown',
  WIFI = 'wifi', // Android & iOS
  CELLULAR = 'cellular', // Android & iOS
  ETHERNET = 'ethernet', // Android & iOS
  BLUETOOTH = 'bluetooth', // Android
  VPN = 'vpn', // Android
  WIFI_AWARE = 'wifi_aware', // Android (API 26+)
  LOWPAN = 'lowpan', // Android (API 27+)
}

export interface Spec extends TurboModule {
  // Required for NativeEventEmitter on iOS
  addListener(eventType: string): void;
  removeListeners(count: number): void;

  /** Get current network state (Android & iOS) */
  getNetworkState(): Promise<NetworkState>;

  /** Start listening to network changes (Android & iOS) */
  startNetworkStateListener(): void;

  /** Stop listening to network changes (Android & iOS) */
  stopNetworkStateListener(): void;

  /** Check if specific network type is available. Types vary by platform. (Android & iOS) */
  isNetworkTypeAvailable(type: NetworkType): Promise<boolean>;

  /** Get network strength. Android returns RSSI; iOS may return -1. (Android & iOS) */
  getNetworkStrength(): Promise<number>;

  /** Check if network is expensive (typically true on cellular). (Android & iOS) */
  isNetworkExpensive(): Promise<boolean>;

  /** Check if network is metered (typically true on cellular). (Android & iOS) */
  isNetworkMetered(): Promise<boolean>;

  /** Force refresh current network state (Android & iOS) */
  forceRefresh(): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NetworkState');
