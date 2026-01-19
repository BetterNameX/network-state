#import "NetworkStateManager.h"
#import <Network/Network.h>
#import <NetworkExtension/NetworkExtension.h>

/**
 * Lightweight capability model attached to NetworkStateModel
 */
@implementation NetworkCapabilities

- (instancetype)init {
    if (self = [super init]) {
        _hasTransportWifi = NO;
        _hasTransportCellular = NO;
        _hasTransportEthernet = NO;
        _hasTransportBluetooth = NO;
        _hasTransportVpn = NO;
        _hasCapabilityInternet = NO;
        _hasCapabilityValidated = NO;
        _hasCapabilityCaptivePortal = NO;
    }
    return self;
}

// No-op for NWPathMonitor-only implementation
- (void)updateFromReachability:(int)unused {}

- (NSDictionary *)toDictionary {
    NSMutableDictionary *result = [NSMutableDictionary dictionary];
    result[@"hasTransportWifi"] = @(_hasTransportWifi);
    result[@"hasTransportCellular"] = @(_hasTransportCellular);
    result[@"hasTransportEthernet"] = @(_hasTransportEthernet);
    result[@"hasTransportBluetooth"] = @(_hasTransportBluetooth);
    result[@"hasTransportVpn"] = @(_hasTransportVpn);
    result[@"hasCapabilityInternet"] = @(_hasCapabilityInternet);
    result[@"hasCapabilityValidated"] = @(_hasCapabilityValidated);
    result[@"hasCapabilityCaptivePortal"] = @(_hasCapabilityCaptivePortal);
    return result;
}

@end

/**
 * Network details (ssid/bssid/strength/frequency/linkSpeed).
 * SSID/BSSID require:
 *   - com.apple.developer.networking.wifi-info entitlement
 *   - Location permission (iOS 13+) or precise location (iOS 14+)
 */
@implementation NetworkDetails

- (instancetype)init {
    if (self = [super init]) {
        _ssid = nil;
        _bssid = nil;
        _strength = nil;
        _frequency = nil;
        _linkSpeed = nil;
    }
    return self;
}

// No-op for NWPathMonitor-only implementation
- (void)updateFromReachability:(int)unused {}

/**
 * Fetch WiFi SSID/BSSID using NEHotspotNetwork (iOS 14+).
 * Fails gracefully if entitlements or permissions are missing.
 * Uses async completion handler to avoid deadlocks when called from main queue.
 * Requires:
 *   - com.apple.developer.networking.wifi-info entitlement
 *   - Location permission with precise location
 */
- (void)updateWifiInfoWithCompletion:(void (^)(void))completion {
    _ssid = nil;
    _bssid = nil;
    
    if (@available(iOS 14.0, *)) {
        @try {
            __weak NetworkDetails *weakSelf = self;
            [NEHotspotNetwork fetchCurrentWithCompletionHandler:^(NEHotspotNetwork * _Nullable currentNetwork) {
                NetworkDetails *strongSelf = weakSelf;
                if (!strongSelf) {
                    if (completion) completion();
                    return;
                }
                
                if (currentNetwork) {
                    strongSelf.ssid = currentNetwork.SSID;
                    strongSelf.bssid = currentNetwork.BSSID;
                } else {
                    strongSelf.ssid = nil;
                    strongSelf.bssid = nil;
                }
                
                if (completion) {
                    completion();
                }
            }];
        } @catch (NSException *exception) {
            // Fail gracefully - entitlements or permissions may be missing
            NSLog(@"NetworkStateManager updateWifiInfo error: %@", exception.reason);
            _ssid = nil;
            _bssid = nil;
            if (completion) completion();
        }
    } else {
        if (completion) completion();
    }
}

- (NSDictionary *)toDictionary {
    NSMutableDictionary *result = [NSMutableDictionary dictionary];
    // Only include values when they're available
    if (_ssid != nil) {
        result[@"ssid"] = _ssid;
    }
    if (_bssid != nil) {
        result[@"bssid"] = _bssid;
    }
    if (_strength != nil) {
        result[@"strength"] = _strength;
    }
    if (_frequency != nil) {
        result[@"frequency"] = _frequency;
    }
    if (_linkSpeed != nil) {
        result[@"linkSpeed"] = _linkSpeed;
    }
    return result;
}

@end

@implementation NetworkStateModel

- (instancetype)init {
    if (self = [super init]) {
        _isConnected = NO;
        _isInternetReachable = NO;
        _isExpensive = NO;
        _isMetered = NO;
        _type = @"unknown";
        _capabilities = [[NetworkCapabilities alloc] init];
        _details = [[NetworkDetails alloc] init];
    }
    return self;
}

- (void)updateFromReachability:(SCNetworkReachabilityFlags)flags {
    // isConnected: Network is reachable (might require connection or be captive portal)
    // isInternetReachable: Network is reachable AND doesn't require connection (actual internet)
    BOOL isReachable = (flags & kSCNetworkReachabilityFlagsReachable) != 0;
    BOOL needsConnection = (flags & kSCNetworkReachabilityFlagsConnectionRequired) != 0;
    
    _isConnected = isReachable;
    _isInternetReachable = isReachable && !needsConnection;
    _isExpensive = (flags & kSCNetworkReachabilityFlagsIsWWAN) != 0;
    _isMetered = (flags & kSCNetworkReachabilityFlagsIsWWAN) != 0;
    
    // Determine network type
    if ((flags & kSCNetworkReachabilityFlagsIsWWAN) != 0) {
        _type = @"cellular";
    } else if (isReachable) {
        _type = @"wifi";
    } else {
        _type = @"unknown";
    }
    
    // Update capabilities and details
    [_capabilities updateFromReachability:flags];
    [_details updateFromReachability:flags];
}

- (NSDictionary *)toDictionary {
    NSMutableDictionary *result = [NSMutableDictionary dictionary];
    result[@"isConnected"] = @(_isConnected);
    result[@"isInternetReachable"] = @(_isInternetReachable);
    result[@"isExpensive"] = @(_isExpensive);
    result[@"isMetered"] = @(_isMetered);
    result[@"type"] = _type;
    // Compose details and nest capabilities under details to match JS types
    NSMutableDictionary *detailsDict = [[_details toDictionary] mutableCopy];
    if (!detailsDict) { detailsDict = [NSMutableDictionary dictionary]; }
    detailsDict[@"capabilities"] = [_capabilities toDictionary];
    result[@"details"] = detailsDict;
    return result;
}

@end

@implementation NetworkStateManager {
    NetworkStateModel *_currentNetworkState;
    NSMutableArray<id<NetworkStateListener>> *_listeners;
    nw_path_monitor_t _pathMonitor;
}

- (instancetype)init {
    if (self = [super init]) {
        _currentNetworkState = [[NetworkStateModel alloc] init];
        _listeners = [NSMutableArray array];
        [self setupReachability];
    }
    return self;
}

- (void)dealloc {
    @try {
        if (_pathMonitor) {
            nw_path_monitor_cancel(_pathMonitor);
            _pathMonitor = NULL;
        }
    } @catch (NSException *exception) {
        NSLog(@"NetworkStateManager dealloc error: %@", exception.reason);
    }
}

// Set up NWPathMonitor (iOS 12+)
- (void)setupReachability {
    @try {
        _pathMonitor = nw_path_monitor_create();
        nw_path_monitor_set_queue(_pathMonitor, dispatch_get_main_queue());
        __weak NetworkStateManager *weakSelf = self;
        nw_path_monitor_set_update_handler(_pathMonitor, ^(nw_path_t  _Nonnull path) {
            NetworkStateManager *strongSelf = weakSelf;
            if (!strongSelf) return;
            [strongSelf updateNetworkStateFromPath:path];
        });
        nw_path_monitor_start(_pathMonitor);
    } @catch (NSException *exception) {
        NSLog(@"NetworkStateManager setupReachability error: %@", exception.reason);
    }
}

// Update current state based on NWPath
- (void)updateNetworkStateFromPath:(nw_path_t)path API_AVAILABLE(ios(12.0)) {
    @try {
        nw_path_status_t status = nw_path_get_status(path);
        BOOL isSatisfied = (status == nw_path_status_satisfied);
        BOOL usesWifi = nw_path_uses_interface_type(path, nw_interface_type_wifi);
        BOOL usesCell = nw_path_uses_interface_type(path, nw_interface_type_cellular);
        BOOL usesEthernet = nw_path_uses_interface_type(path, nw_interface_type_wired);
        BOOL usesOther = nw_path_uses_interface_type(path, nw_interface_type_other);

        // isConnected: Has network interfaces (might be captive portal)
        // isInternetReachable: Path is satisfied (validated by iOS)
        BOOL hasNetworkInterface = usesWifi || usesCell || usesEthernet || usesOther;
        _currentNetworkState.isConnected = hasNetworkInterface;
        _currentNetworkState.isInternetReachable = isSatisfied;
        _currentNetworkState.isExpensive = usesCell;
        _currentNetworkState.isMetered = usesCell;
        if (usesWifi) {
            _currentNetworkState.type = @"wifi";
        } else if (usesCell) {
            _currentNetworkState.type = @"cellular";
        } else if (usesEthernet) {
            _currentNetworkState.type = @"ethernet";
        } else if (usesOther) {
            _currentNetworkState.type = @"unknown";
        } else {
            _currentNetworkState.type = isSatisfied ? @"unknown" : @"none";
        }

        // Capabilities
        [_currentNetworkState.capabilities setHasTransportWifi:usesWifi];
        [_currentNetworkState.capabilities setHasTransportCellular:usesCell];
        [_currentNetworkState.capabilities setHasTransportEthernet:usesEthernet];
        [_currentNetworkState.capabilities setHasTransportBluetooth:NO];
        [_currentNetworkState.capabilities setHasTransportVpn:NO];
        [_currentNetworkState.capabilities setHasCapabilityInternet:isSatisfied];
        [_currentNetworkState.capabilities setHasCapabilityValidated:isSatisfied];
        [_currentNetworkState.capabilities setHasCapabilityCaptivePortal:NO];

        // Fetch WiFi details (SSID/BSSID) only when connected to WiFi
        if (usesWifi) {
            __weak NetworkStateManager *weakSelf = self;
            [_currentNetworkState.details updateWifiInfoWithCompletion:^{
                NetworkStateManager *strongSelf = weakSelf;
                if (!strongSelf) return;
                
                // Notify listeners on main queue after WiFi info is fetched
                dispatch_async(dispatch_get_main_queue(), ^{
                    [strongSelf notifyListeners];
                });
            }];
        } else {
            // Clear WiFi details when not on WiFi
            _currentNetworkState.details.ssid = nil;
            _currentNetworkState.details.bssid = nil;
            
            // Notify listeners immediately when not on WiFi
            [self notifyListeners];
        }
    } @catch (NSException *exception) {
        NSLog(@"NetworkStateManager updateNetworkStateFromPath error: %@", exception.reason);
    }
}

- (void)notifyListeners {
    if (_listeners) {
        for (id<NetworkStateListener> listener in _listeners) {
            if (listener && [listener respondsToSelector:@selector(onNetworkStateChanged:)]) {
                [listener onNetworkStateChanged:_currentNetworkState];
            }
        }
    }
}

- (void)addListener:(id<NetworkStateListener>)listener {
    if (listener && ![_listeners containsObject:listener]) {
        [_listeners addObject:listener];
    }
}

- (void)removeListener:(id<NetworkStateListener>)listener {
    [_listeners removeObject:listener];
}

- (NetworkStateModel *)getCurrentNetworkState {
    return _currentNetworkState;
}

- (BOOL)isNetworkTypeAvailable:(NSString *)typeString {
    if ([typeString isEqualToString:@"wifi"]) {
        return _currentNetworkState.capabilities.hasTransportWifi;
    } else if ([typeString isEqualToString:@"cellular"]) {
        return _currentNetworkState.capabilities.hasTransportCellular;
    } else if ([typeString isEqualToString:@"ethernet"]) {
        return _currentNetworkState.capabilities.hasTransportEthernet;
    } else if ([typeString isEqualToString:@"bluetooth"]) {
        return _currentNetworkState.capabilities.hasTransportBluetooth;
    } else if ([typeString isEqualToString:@"vpn"]) {
        return _currentNetworkState.capabilities.hasTransportVpn;
    }
    return NO;
}

- (NSInteger)getNetworkStrength {
    // SystemConfiguration doesn't provide network strength
    return -1;
}

- (BOOL)isNetworkExpensive {
    return _currentNetworkState.isExpensive;
}

- (BOOL)isNetworkMetered {
    return _currentNetworkState.isMetered;
}

- (void)forceRefresh {
    // Restart monitor to force an immediate update callback
    if (_pathMonitor) {
        nw_path_monitor_cancel(_pathMonitor);
        _pathMonitor = NULL;
    }
    [self setupReachability];
}

- (void)refreshWifiInfoWithCompletion:(void (^)(void))completion {
    if (_currentNetworkState.capabilities.hasTransportWifi) {
        [_currentNetworkState.details updateWifiInfoWithCompletion:^{
            if (completion) {
                dispatch_async(dispatch_get_main_queue(), ^{
                    completion();
                });
            }
        }];
    } else {
        if (completion) {
            completion();
        }
    }
}

@end
