# React Native Network State (Android 10+ / iOS 12+)

A high-performance React Native library for tracking network state using modern Android APIs (API 29+) and iOS NWPathMonitor (iOS 12+). This library provides accurate network state information by leveraging the latest platform APIs instead of deprecated methods used by older libraries.

## 🚀 Features

- Modern APIs: Android 10+ `NetworkCapabilities`, iOS 12+ `NWPathMonitor`
- Real-time monitoring with automatic foreground refresh
- Works with Old & New Architecture (TurboModules/Fabric)
- Detailed info and capabilities (coverage varies by platform)
- Simple React Hook + TypeScript types

## 📱 Why

Use modern platform APIs for accurate, real-time network state on Android 10+ and iOS 12+.

## 📋 Requirements

- React Native 0.71+
- **Android**: Android 10+ (API level 29+)
- **iOS**: iOS 12.0+

## 🛠 Installation

```bash
npm install @bear-block/network-state
# or
yarn add @bear-block/network-state
```

### Setup

Autolinking handles configuration.

#### Android
- ✅ Permissions are automatically added to your app
- ✅ Requires Android 10+ (API 29+)
- ✅ Supports both Old Architecture and New Architecture (TurboModules)

#### iOS  
- ✅ Frameworks are automatically linked
- ✅ Requires iOS 12.0+
- ✅ Supports both Old Architecture and New Architecture (TurboModules/Fabric)

### Permissions

#### Android (Auto-added)
```xml
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
<uses-permission android:name="android.permission.INTERNET" />
```

#### iOS (Auto-linked)
- `Network.framework` - For NWPathMonitor and network state detection

## 📖 Usage

### Basic Usage

```typescript
import { useNetworkState, NetworkType } from '@bear-block/network-state';

function MyComponent() {
  const { networkState, isListening, startListening, stopListening } = useNetworkState();

  useEffect(() => {
    if (networkState) {
      console.log('Network type:', networkState.type);
      console.log('Is connected:', networkState.isConnected);
      console.log('Internet reachable:', networkState.isInternetReachable);
      
      // Handle different connection states
      if (networkState.isConnected && !networkState.isInternetReachable) {
        console.log('Connected to network but may need authentication (captive portal)');
      }
    }
  }, [networkState]);

  return (
    <View>
      <Text>Network: {networkState?.type || 'Unknown'}</Text>
      <Text>Connected: {networkState?.isConnected ? 'Yes' : 'No'}</Text>
      <Text>Internet: {networkState?.isInternetReachable ? 'Yes' : 'No'}</Text>
      <Button title="Start Listening" onPress={startListening} />
      <Button title="Stop Listening" onPress={stopListening} />
    </View>
  );
}
```

### Understanding `isConnected` vs `isInternetReachable`

These two properties provide different levels of network connectivity information:

#### `isConnected`
- **Meaning**: Device has a network interface and it claims to provide internet access
- **True when**: Connected to WiFi/Cellular/Ethernet, even if it's a captive portal
- **Use case**: Check if device has any network connectivity at all
- **Example scenarios where it's `true`**:
  - Hotel WiFi with login page (captive portal)
  - Airport WiFi before accepting terms
  - Corporate network requiring VPN
  - Home WiFi with working internet

#### `isInternetReachable`
- **Meaning**: Device can actually reach the public internet
- **True when**: OS has validated that internet requests can succeed
- **Use case**: Check if you can make API calls or load remote content
- **Example scenarios where it's `true`**:
  - Connected to WiFi/Cellular with verified internet access
  - VPN connected and authenticated
- **Example scenarios where it's `false`**:
  - Captive portals (hotel/airport WiFi login pages)
  - Network requiring authentication
  - WiFi connected but no internet gateway

#### Typical Patterns

```typescript
const { networkState } = useNetworkState();

// Pattern 1: Show offline UI
if (!networkState?.isConnected) {
  return <Text>No network connection</Text>;
}

// Pattern 2: Show "needs authentication" UI
if (networkState.isConnected && !networkState.isInternetReachable) {
  return <Text>Connected but internet not reachable. Check for captive portal.</Text>;
}

// Pattern 3: Safe to make network requests
if (networkState.isInternetReachable) {
  // Make API calls, load images, etc.
}

// Pattern 4: Warn about expensive connection
if (networkState.isInternetReachable && networkState.isExpensive) {
  return <Text>Using cellular data - large downloads may incur charges</Text>;
}
```

### Advanced Usage

```typescript
import { useNetworkState, NetworkType } from '@bear-block/network-state';

function AdvancedComponent() {
  const {
    networkState: current,
    isNetworkTypeAvailable,
    getNetworkStrength,
    isNetworkExpensive,
    isNetworkMetered,
    getWifiDetails,
    getNetworkCapabilities
  } = useNetworkState({ autoStart: true });

  const checkNetworkCapabilities = async () => {
    // Check if WiFi is available
    const wifiAvailable = await isNetworkTypeAvailable(NetworkType.WIFI);
    
    // Get network strength
    const strength = await getNetworkStrength();
    
    // Check if network is expensive (mobile data)
    const expensive = await isNetworkExpensive();
    
    // Get WiFi details
    const wifiDetails = await getWifiDetails();
    if (wifiDetails) {
      console.log('SSID:', wifiDetails.ssid);
      console.log('Signal strength:', wifiDetails.strength);
      console.log('Frequency:', wifiDetails.frequency);
    }
    
    // Get network capabilities
    const capabilities = await getNetworkCapabilities();
    if (capabilities) {
      console.log('Has WiFi transport:', capabilities.hasTransportWifi);
      console.log('Has internet capability:', capabilities.hasCapabilityInternet);
    }
  };

  return (
    <View>
      {/* Your UI components */}
    </View>
  );
}
```

### Direct API Usage

```typescript
import { networkState, NetworkType } from '@bear-block/network-state';

// Get current network state
const state = await networkState.getNetworkState();

// Check specific network types
const wifiConnected = await networkState.isConnectedToWifi();
const cellularConnected = await networkState.isConnectedToCellular();

// Start/stop listening
networkState.startListening();
networkState.stopListening();
```

## 🔧 API Reference

### useNetworkState Hook

```typescript
const {
  networkState,           // Current network state
  isListening,           // Whether listening is active
  startListening,        // Start listening to changes
  stopListening,         // Stop listening to changes
  refresh,               // Manually refresh state
  isNetworkTypeAvailable, // Check if network type is available
  getNetworkStrength,    // Get network signal strength
  isNetworkExpensive,    // Check if network is expensive
  isNetworkMetered,      // Check if network is metered
  isConnectedToWifi,     // Check WiFi connection
  isConnectedToCellular, // Check cellular connection
  isInternetReachable,   // Check internet reachability
  getWifiDetails,        // Get WiFi details
  getNetworkCapabilities // Get network capabilities
} = useNetworkState(options);
```

### NetworkState Interface

```typescript
interface NetworkState {
  // Whether a network interface is available and claims to provide internet access.
  // This will be true even if you're connected to a captive portal (e.g., hotel WiFi login page).
  // Use this to determine if the device has any network connectivity at all.
  isConnected: boolean;
  
  // Whether the device can actually reach the internet.
  // Android: Network has been validated by the OS (NET_CAPABILITY_VALIDATED).
  // iOS: Network path is satisfied (not just reachable, but usable).
  // This will be false at captive portals or when network requires authentication.
  // Use this to determine if you can make network requests.
  isInternetReachable: boolean;
  
  type: NetworkType;
  isExpensive: boolean;
  isMetered: boolean;
  details?: NetworkDetails;
}

interface NetworkDetails {
  ssid?: string;            // WiFi network name (Android)
  bssid?: string;           // WiFi BSSID (Android)
  strength?: number;        // Signal strength (Android; iOS may be unavailable and return -1)
  frequency?: number;       // WiFi frequency in MHz (Android)
  linkSpeed?: number;       // WiFi link speed (Android)
  capabilities?: NetworkCapabilities; // Both; field coverage varies by platform
}
```

### NetworkType Enum

```typescript
enum NetworkType {
  NONE = 'none',
  UNKNOWN = 'unknown',
  WIFI = 'wifi',                    // Android & iOS
  CELLULAR = 'cellular',            // Android & iOS
  ETHERNET = 'ethernet',            // Android & iOS (iOS via NWPath)
  BLUETOOTH = 'bluetooth',          // Android (iOS transport not exposed via public APIs)
  VPN = 'vpn',                      // Android (iOS transport not exposed via public APIs)
  WIFI_AWARE = 'wifi_aware',        // Android (API 26+)
  LOWPAN = 'lowpan'                 // Android (API 27+)
}
```

### Platform Support by API

- **useNetworkState hook**: Android & iOS
- **getNetworkState()**: Android & iOS
- **start/stop listening**: Android & iOS
- **isConnected**: Android & iOS
  - Android: Has `NET_CAPABILITY_INTERNET` (network claims internet access)
  - iOS: Has network interfaces (WiFi/Cellular/Ethernet/Other)
- **isInternetReachable**: Android & iOS
  - Android: Has `NET_CAPABILITY_VALIDATED` (OS validated internet connectivity)
  - iOS: Path status is `satisfied` (OS verified path is usable)
- **isNetworkTypeAvailable()**: Android & iOS (types available differ per platform)
- **getNetworkStrength()**: Android (iOS returns -1)
- **isNetworkExpensive()**: Android & iOS (treated as true on cellular)
- **isNetworkMetered()**: Android & iOS (treated as true on cellular)
- **isConnectedToWifi()/isConnectedToCellular()**: Android & iOS
- **getWifiDetails()**: Android (may be null on iOS)
- **getNetworkCapabilities()**: Android & iOS (fields coverage varies)

## 🧪 Example

```bash
cd example && yarn install
yarn android # or yarn ios
```

## 🔄 Background/Foreground Handling

The library automatically handles app lifecycle changes to ensure network state accuracy:

### **Automatic State Refresh**
- ✅ **Background → Foreground**: Automatically refreshes network state when app returns to foreground
- ✅ **Network Changes in Background**: Native callbacks continue working in background
- ✅ **State Consistency**: UI always shows current network state when app becomes active
- ✅ **Zero Configuration**: Works automatically without any setup

### **How It Works**
1. **App goes to background**: Network monitoring continues at native level
2. **Network changes in background**: Native callbacks detect changes
3. **App returns to foreground**: `AppState` listener triggers automatic refresh
4. **State updates**: Both native and React state are refreshed automatically

### **Example Usage**
```typescript
const { networkState, isListening } = useNetworkState({ autoStart: true });

// No additional code needed - background/foreground handling is automatic!
// When user returns to app, network state will be automatically refreshed
```

## 🔍 How It Works

### Android Implementation (Summary)

1. **Network Capabilities API**: Uses `NetworkCapabilities` to detect network type and capabilities
2. **Network Callbacks**: Implements `ConnectivityManager.NetworkCallback` for real-time updates
3. **Connection States**: 
   - `isConnected`: Checks `NET_CAPABILITY_INTERNET` (network claims internet)
   - `isInternetReachable`: Checks `NET_CAPABILITY_VALIDATED` (OS validated connectivity)
4. **Modern Permissions**: Handles Android 10+ permission requirements properly
5. **Efficient Monitoring**: Only listens when needed and provides accurate state information
6. **App Lifecycle**: Handles background/foreground transitions with automatic state refresh

### iOS Implementation (Summary)

1. **NWPathMonitor**: Uses `NWPathMonitor` for real-time network state monitoring
2. **Network Framework**: Leverages iOS 12+ Network framework for reliable detection
3. **Interface Detection**: Detects WiFi, Cellular, Ethernet, and other interface types
4. **Connection States**:
   - `isConnected`: Checks for network interfaces (WiFi/Cellular/Ethernet/Other)
   - `isInternetReachable`: Checks `nw_path_status_satisfied` (OS validated path)
5. **Event Emission**: Emits network state changes to React Native via events
6. **App Lifecycle**: Handles background/foreground transitions with automatic state refresh

## 🤝 Contributing
PRs welcome.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments
Built with modern Android/iOS APIs.

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/bear-block/network-state/issues) page
2. Create a new issue with detailed information
3. Include your React Native version and platform details

---

**Note**: Designed for Android 10+ and iOS 12+. For older OS versions, consider other libraries.
