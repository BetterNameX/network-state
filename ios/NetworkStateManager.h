#import <Foundation/Foundation.h>
#import <SystemConfiguration/SystemConfiguration.h>
#import <ifaddrs.h>
#import <arpa/inet.h>
#import <net/if.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * Represents an IP address with metadata
 */
@interface IPAddressInfo : NSObject
@property (nonatomic, strong) NSString *address;
@property (nonatomic, strong) NSString *version;  // "ipv4" or "ipv6"
@property (nonatomic, assign) NSInteger prefixLength;
@property (nonatomic, strong, nullable) NSString *scope;  // For IPv6: "global", "link-local", etc.

- (NSDictionary *)toDictionary;
@end

/**
 * Represents a network interface (WiFi, Ethernet)
 */
@interface NetworkInterfaceInfo : NSObject
@property (nonatomic, strong) NSString *name;
@property (nonatomic, strong) NSString *type;  // "wifi" or "ethernet"
@property (nonatomic, strong) NSMutableArray<IPAddressInfo *> *addresses;
@property (nonatomic, assign) BOOL isDefaultRoute;

- (NSDictionary *)toDictionary;
@end

@protocol NetworkStateListener <NSObject>
- (void)onNetworkStateChanged:(id)networkState;
@end

@interface NetworkCapabilities : NSObject
@property (nonatomic, assign) BOOL hasTransportWifi;
@property (nonatomic, assign) BOOL hasTransportCellular;
@property (nonatomic, assign) BOOL hasTransportEthernet;
@property (nonatomic, assign) BOOL hasTransportBluetooth;
@property (nonatomic, assign) BOOL hasTransportVpn;
@property (nonatomic, assign) BOOL hasCapabilityInternet;
@property (nonatomic, assign) BOOL hasCapabilityValidated;
@property (nonatomic, assign) BOOL hasCapabilityCaptivePortal;

- (instancetype)init;
- (void)updateFromReachability:(SCNetworkReachabilityFlags)flags;
- (NSDictionary *)toDictionary;
@end

@interface NetworkDetails : NSObject
@property (nonatomic, strong, nullable) NSString *ssid;
@property (nonatomic, strong, nullable) NSString *bssid;
@property (nonatomic, strong, nullable) NSNumber *strength;
@property (nonatomic, strong, nullable) NSNumber *frequency;
@property (nonatomic, strong, nullable) NSNumber *linkSpeed;

- (instancetype)init;
- (void)updateFromReachability:(SCNetworkReachabilityFlags)flags;
- (void)updateWifiInfoWithCompletion:(void (^)(void))completion;
- (NSDictionary *)toDictionary;
@end

@interface NetworkStateModel : NSObject
@property (nonatomic, assign) BOOL isConnected;
@property (nonatomic, assign) BOOL isInternetReachable;
@property (nonatomic, strong) NSString *type;
@property (nonatomic, assign) BOOL isExpensive;
@property (nonatomic, assign) BOOL isMetered;
@property (nonatomic, strong) NetworkCapabilities *capabilities;
@property (nonatomic, strong) NetworkDetails *details;

- (instancetype)init;
- (void)updateFromReachability:(SCNetworkReachabilityFlags)flags;
- (NSDictionary *)toDictionary;
@end

@interface NetworkStateManager : NSObject

@property (nonatomic, strong, readonly) NetworkStateModel *currentNetworkState;

- (instancetype)init;
- (void)addListener:(id<NetworkStateListener>)listener;
- (void)removeListener:(id<NetworkStateListener>)listener;
- (NetworkStateModel *)getCurrentNetworkState;
- (BOOL)isNetworkTypeAvailable:(NSString *)typeString;
- (NSInteger)getNetworkStrength;
- (BOOL)isNetworkExpensive;
- (BOOL)isNetworkMetered;
- (void)forceRefresh;
- (void)refreshWifiInfoWithCompletion:(void (^)(void))completion;
- (NSArray<NSDictionary *> *)getNetworkInterfaces;

@end

NS_ASSUME_NONNULL_END