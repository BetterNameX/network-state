#import <Foundation/Foundation.h>
#import <SystemConfiguration/SystemConfiguration.h>

NS_ASSUME_NONNULL_BEGIN

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
@property (nonatomic, assign) NSInteger strength;
@property (nonatomic, assign) NSInteger frequency;
@property (nonatomic, assign) NSInteger linkSpeed;

- (instancetype)init;
- (void)updateFromReachability:(SCNetworkReachabilityFlags)flags;
- (void)updateWifiInfo;
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

@end

NS_ASSUME_NONNULL_END