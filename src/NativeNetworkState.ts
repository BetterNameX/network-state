import { TurboModuleRegistry, type TurboModule } from 'react-native';

/**
 * Represents an IP address with metadata
 * Platform: Android & iOS
 */
export interface IPAddress {
  /** The IP address (e.g., "192.168.1.100" or "fe80::1") */
  address: string;

  /** IP version */
  version: 'ipv4' | 'ipv6';

  /** Prefix length (e.g., 24 for /24, 64 for /64) */
  prefixLength: number;

  /** For IPv6: address scope */
  scope?: 'global' | 'link-local' | 'site-local' | 'host' | 'other';
}

/**
 * Represents a network interface (WiFi, Ethernet)
 * Platform: Android & iOS
 */
export interface NetworkInterface {
  /** Interface name (e.g., "en0", "wlan0", "eth0") */
  name: string;

  /** Interface type */
  type: 'wifi' | 'ethernet';

  /** All IP addresses assigned to this interface */
  addresses: IPAddress[];

  /**
   * Whether this interface is the default route for outgoing traffic.
   * Useful hint for choosing which IP to advertise/bind to.
   */
  isDefaultRoute: boolean;
}

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

  /**
   * Network interfaces with IP addresses.
   * Only populated when explicitly requested via includeIPAddresses option.
   * Includes WiFi and Ethernet interfaces only (excludes loopback, cellular, VPN).
   */
  interfaces?: NetworkInterface[];
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

  /**
   * Get network interfaces with IP addresses.
   * Returns WiFi and Ethernet interfaces only (excludes loopback, cellular, VPN).
   * (Android & iOS)
   */
  getNetworkInterfaces(): Promise<NetworkInterface[]>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NetworkState');
