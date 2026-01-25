import { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Alert,
  AppState,
  Switch,
} from 'react-native';
import {
  useNetworkState,
  NetworkType,
  networkState,
  getNetworkInterfaces,
} from '../../src';
import type { NetworkInterface } from '../../src';

export default function App() {
  const [includeIPAddresses, setIncludeIPAddresses] = useState(false);

  const {
    networkState: currentNetworkState,
    isListening,
    startListening,
    stopListening,
    refresh,
    isNetworkTypeAvailable,
    getNetworkStrength,
    isNetworkExpensive,
    isNetworkMetered,
    isConnectedToWifi,
    isConnectedToCellular,
    isInternetReachable,
    getWifiDetails,
    getNetworkCapabilities,
  } = useNetworkState({ autoStart: true, includeIPAddresses });

  const [testResults, setTestResults] = useState<string[]>([]);
  const [appState, setAppState] = useState(AppState.currentState);
  const [manualInterfaces, setManualInterfaces] = useState<
    NetworkInterface[] | null
  >(null);

  const addTestResult = useCallback((result: string) => {
    setTestResults((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${result}`,
    ]);
  }, []);

  // Monitor app state changes for background/foreground testing
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      setAppState(nextAppState);
      if (nextAppState === 'active') {
        addTestResult('App came to foreground - network state should refresh');
      } else if (nextAppState === 'background') {
        addTestResult('App went to background');
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [addTestResult]);

  const runTests = async () => {
    setTestResults([]);

    try {
      // Test network type availability
      const wifiAvailable = await isNetworkTypeAvailable(NetworkType.WIFI);
      addTestResult(`WiFi available: ${wifiAvailable}`);

      const cellularAvailable = await isNetworkTypeAvailable(
        NetworkType.CELLULAR
      );
      addTestResult(`Cellular available: ${cellularAvailable}`);

      // Test network strength
      const strength = await getNetworkStrength();
      addTestResult(`Network strength: ${strength}`);

      // Test network properties
      const expensive = await isNetworkExpensive();
      addTestResult(`Network expensive: ${expensive}`);

      const metered = await isNetworkMetered();
      addTestResult(`Network metered: ${metered}`);

      // Test connection types
      const wifiConnected = await isConnectedToWifi();
      addTestResult(`Connected to WiFi: ${wifiConnected}`);

      const cellularConnected = await isConnectedToCellular();
      addTestResult(`Connected to Cellular: ${cellularConnected}`);

      // Test internet reachability
      const internetReachable = await isInternetReachable();
      addTestResult(`Internet reachable: ${internetReachable}`);

      // Test WiFi details
      const wifiDetails = await getWifiDetails();
      if (wifiDetails) {
        addTestResult(`WiFi SSID: ${wifiDetails.ssid || 'Unknown'}`);
        addTestResult(`WiFi strength: ${wifiDetails.strength}`);
      }

      // Test network capabilities
      const capabilities = await getNetworkCapabilities();
      if (capabilities) {
        addTestResult(`Has WiFi transport: ${capabilities.hasTransportWifi}`);
        addTestResult(
          `Has cellular transport: ${capabilities.hasTransportCellular}`
        );
        addTestResult(
          `Has internet capability: ${capabilities.hasCapabilityInternet}`
        );
      }
    } catch (error) {
      addTestResult(`Error running tests: ${error}`);
    }
  };

  const testDirectAPI = async () => {
    try {
      const state = await networkState.getNetworkState();
      Alert.alert(
        'Direct API Test',
        `Network type: ${state.type}\nConnected: ${state.isConnected}`
      );
    } catch (error) {
      Alert.alert('Error', `Failed to get network state: ${error}`);
    }
  };

  const fetchNetworkInterfaces = useCallback(async () => {
    try {
      const interfaces = await getNetworkInterfaces();
      setManualInterfaces(interfaces);
      addTestResult(`Fetched ${interfaces.length} interface(s)`);
      for (const iface of interfaces) {
        addTestResult(
          `  ${iface.name} (${iface.type}) - default: ${iface.isDefaultRoute}`
        );
        for (const addr of iface.addresses) {
          addTestResult(
            `    ${addr.address}/${addr.prefixLength} (${addr.version}${addr.scope ? `, ${addr.scope}` : ''})`
          );
        }
      }
    } catch (error) {
      addTestResult(`Error fetching interfaces: ${error}`);
    }
  }, [addTestResult]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Modern Network State Library</Text>
        <Text style={styles.subtitle}>Android 10+ Network State Tracking</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Network State</Text>
          <Text style={styles.infoText}>
            App State: <Text style={styles.highlight}>{appState}</Text>
          </Text>
          {currentNetworkState ? (
            <View style={styles.networkInfo}>
              <Text style={styles.infoText}>
                Type:{' '}
                <Text style={styles.highlight}>{currentNetworkState.type}</Text>
              </Text>
              <Text style={styles.infoText}>
                Connected:{' '}
                <Text style={styles.highlight}>
                  {currentNetworkState.isConnected ? 'Yes' : 'No'}
                </Text>
              </Text>
              <Text style={styles.infoText}>
                Internet Reachable:{' '}
                <Text style={styles.highlight}>
                  {currentNetworkState.isInternetReachable ? 'Yes' : 'No'}
                </Text>
              </Text>
              <Text style={styles.infoText}>
                Expensive:{' '}
                <Text style={styles.highlight}>
                  {currentNetworkState.isExpensive ? 'Yes' : 'No'}
                </Text>
              </Text>
              <Text style={styles.infoText}>
                Metered:{' '}
                <Text style={styles.highlight}>
                  {currentNetworkState.isMetered ? 'Yes' : 'No'}
                </Text>
              </Text>

              {currentNetworkState.details && (
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsTitle}>Details:</Text>
                  {currentNetworkState.details.ssid && (
                    <Text style={styles.infoText}>
                      SSID: {currentNetworkState.details.ssid}
                    </Text>
                  )}
                  {currentNetworkState.details.strength !== -1 && (
                    <Text style={styles.infoText}>
                      Strength: {currentNetworkState.details.strength}
                    </Text>
                  )}
                  {currentNetworkState.details.frequency !== -1 && (
                    <Text style={styles.infoText}>
                      Frequency: {currentNetworkState.details.frequency} MHz
                    </Text>
                  )}
                </View>
              )}

              {currentNetworkState.interfaces &&
                currentNetworkState.interfaces.length > 0 && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsTitle}>
                      Network Interfaces (Reactive):
                    </Text>
                    {currentNetworkState.interfaces.map((iface, idx) => (
                      <View key={idx} style={styles.interfaceBlock}>
                        <Text style={styles.interfaceName}>
                          {iface.name} ({iface.type})
                          {iface.isDefaultRoute && (
                            <Text style={styles.defaultBadge}> [DEFAULT]</Text>
                          )}
                        </Text>
                        {iface.addresses.map((addr, addrIdx) => (
                          <Text key={addrIdx} style={styles.addressText}>
                            {addr.version === 'ipv4' ? '  IPv4: ' : '  IPv6: '}
                            {addr.address}/{addr.prefixLength}
                            {addr.scope && (
                              <Text style={styles.scopeText}>
                                {' '}
                                ({addr.scope})
                              </Text>
                            )}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                )}
            </View>
          ) : (
            <Text style={styles.loadingText}>Loading network state...</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Controls</Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Include IP Addresses:</Text>
            <Switch
              value={includeIPAddresses}
              onValueChange={setIncludeIPAddresses}
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button,
                isListening ? styles.buttonActive : styles.buttonInactive,
              ]}
              onPress={isListening ? stopListening : startListening}
            >
              <Text style={styles.buttonText}>
                {isListening ? 'Stop Listening' : 'Start Listening'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={refresh}>
              <Text style={styles.buttonText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={runTests}>
              <Text style={styles.buttonText}>Run Tests</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={testDirectAPI}>
              <Text style={styles.buttonText}>Test Direct API</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={fetchNetworkInterfaces}
            >
              <Text style={styles.buttonText}>
                Fetch Interfaces (Imperative)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {manualInterfaces && manualInterfaces.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Network Interfaces (Manual Fetch)
            </Text>
            {manualInterfaces.map((iface, idx) => (
              <View key={idx} style={styles.interfaceBlock}>
                <Text style={styles.interfaceName}>
                  {iface.name} ({iface.type})
                  {iface.isDefaultRoute && (
                    <Text style={styles.defaultBadge}> [DEFAULT]</Text>
                  )}
                </Text>
                {iface.addresses.map((addr, addrIdx) => (
                  <Text key={addrIdx} style={styles.addressText}>
                    {addr.version === 'ipv4' ? '  IPv4: ' : '  IPv6: '}
                    {addr.address}/{addr.prefixLength}
                    {addr.scope && (
                      <Text style={styles.scopeText}> ({addr.scope})</Text>
                    )}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {testResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Results</Text>
            <View style={styles.resultsContainer}>
              {testResults.map((result, index) => (
                <Text key={index} style={styles.resultText}>
                  {result}
                </Text>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Background/Foreground Test</Text>
          <Text style={styles.featureText}>
            • Put app in background (home button)
          </Text>
          <Text style={styles.featureText}>
            • Change network (WiFi ↔ Cellular)
          </Text>
          <Text style={styles.featureText}>
            • Return to app - state should refresh automatically
          </Text>
          <Text style={styles.featureText}>
            • Check logs below for refresh events
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <Text style={styles.featureText}>
            • Modern Android Network APIs (API 29+)
          </Text>
          <Text style={styles.featureText}>
            • Network Capabilities detection
          </Text>
          <Text style={styles.featureText}>
            • Real-time network state monitoring
          </Text>
          <Text style={styles.featureText}>
            • WiFi details (SSID, strength, frequency)
          </Text>
          <Text style={styles.featureText}>
            • Cellular and Ethernet support
          </Text>
          <Text style={styles.featureText}>• VPN and Bluetooth detection</Text>
          <Text style={styles.featureText}>
            • React Hook for easy integration
          </Text>
          <Text style={styles.featureText}>• TypeScript support</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  networkInfo: {
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
  },
  highlight: {
    fontWeight: '600',
    color: '#007AFF',
  },
  detailsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#FF3B30',
  },
  buttonInactive: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  resultText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  featureText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: '#555',
  },
  buttonSecondary: {
    backgroundColor: '#5856D6',
  },
  interfaceBlock: {
    marginBottom: 12,
    paddingLeft: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  interfaceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  defaultBadge: {
    color: '#34C759',
    fontWeight: '700',
  },
  addressText: {
    fontSize: 13,
    color: '#555',
    fontFamily: 'monospace',
  },
  scopeText: {
    color: '#8E8E93',
    fontStyle: 'italic',
  },
} as const;
