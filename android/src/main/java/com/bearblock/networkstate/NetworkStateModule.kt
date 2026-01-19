package com.bearblock.networkstate

import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*

@ReactModule(name = NetworkStateModule.NAME)
class NetworkStateModule(reactContext: ReactApplicationContext) :
  NativeNetworkStateSpec(reactContext) {

  private val networkStateManager = NetworkStateManager(reactContext)
  private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
  private var collectJob: Job? = null
  
  private val eventEmitter = reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)

  override fun getName(): String {
    return NAME
  }

  // Required for NativeEventEmitter on iOS/Android
  override fun addListener(eventType: String) {
    // Required for event emitter support - no-op on Android
  }

  override fun removeListeners(count: Double) {
    // Required for event emitter support - no-op on Android
  }

  override fun getNetworkState(promise: Promise) {
    scope.launch {
      try {
        val networkState = networkStateManager.getCurrentNetworkState()
        val result = Arguments.createMap().apply {
          putBoolean("isConnected", networkState.isConnected)
          putBoolean("isInternetReachable", networkState.isInternetReachable)
          putString("type", networkState.type)
          putBoolean("isExpensive", networkState.isExpensive)
          putBoolean("isMetered", networkState.isMetered)
          
          networkState.details?.let { details ->
            val detailsMap = Arguments.createMap().apply {
              details.ssid?.let { putString("ssid", it) }
              details.bssid?.let { putString("bssid", it) }
              details.strength?.let { putInt("strength", it) }
              details.frequency?.let { putInt("frequency", it) }
              details.linkSpeed?.let { putInt("linkSpeed", it) }
              
              val capabilitiesMap = Arguments.createMap().apply {
                putBoolean("hasTransportWifi", details.capabilities.hasTransportWifi)
                putBoolean("hasTransportCellular", details.capabilities.hasTransportCellular)
                putBoolean("hasTransportEthernet", details.capabilities.hasTransportEthernet)
                putBoolean("hasTransportBluetooth", details.capabilities.hasTransportBluetooth)
                putBoolean("hasTransportVpn", details.capabilities.hasTransportVpn)
                putBoolean("hasCapabilityInternet", details.capabilities.hasCapabilityInternet)
                putBoolean("hasCapabilityValidated", details.capabilities.hasCapabilityValidated)
                putBoolean("hasCapabilityCaptivePortal", details.capabilities.hasCapabilityCaptivePortal)
                putBoolean("hasCapabilityNotRestricted", details.capabilities.hasCapabilityNotRestricted)
                putBoolean("hasCapabilityTrusted", details.capabilities.hasCapabilityTrusted)
                putBoolean("hasCapabilityNotMetered", details.capabilities.hasCapabilityNotMetered)
                putBoolean("hasCapabilityNotRoaming", details.capabilities.hasCapabilityNotRoaming)
                putBoolean("hasCapabilityNotSuspended", details.capabilities.hasCapabilityNotSuspended)
              }
              putMap("capabilities", capabilitiesMap)
            }
            putMap("details", detailsMap)
          }
        }
        
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("NETWORK_STATE_ERROR", e.message, e)
      }
    }
  }

  override fun startNetworkStateListener() {
    networkStateManager.startListening()
    if (collectJob != null) return

    // Start observing network state changes and emit events
    collectJob = scope.launch {
      networkStateManager.networkState.collect { networkState ->
        val eventData = Arguments.createMap().apply {
          putBoolean("isConnected", networkState.isConnected)
          putBoolean("isInternetReachable", networkState.isInternetReachable)
          putString("type", networkState.type)
          putBoolean("isExpensive", networkState.isExpensive)
          putBoolean("isMetered", networkState.isMetered)
          
          networkState.details?.let { details ->
            val detailsMap = Arguments.createMap().apply {
              details.ssid?.let { putString("ssid", it) }
              details.bssid?.let { putString("bssid", it) }
              details.strength?.let { putInt("strength", it) }
              details.frequency?.let { putInt("frequency", it) }
              details.linkSpeed?.let { putInt("linkSpeed", it) }
              
              val capabilitiesMap = Arguments.createMap().apply {
                putBoolean("hasTransportWifi", details.capabilities.hasTransportWifi)
                putBoolean("hasTransportCellular", details.capabilities.hasTransportCellular)
                putBoolean("hasTransportEthernet", details.capabilities.hasTransportEthernet)
                putBoolean("hasTransportBluetooth", details.capabilities.hasTransportBluetooth)
                putBoolean("hasTransportVpn", details.capabilities.hasTransportVpn)
                putBoolean("hasCapabilityInternet", details.capabilities.hasCapabilityInternet)
                putBoolean("hasCapabilityValidated", details.capabilities.hasCapabilityValidated)
                putBoolean("hasCapabilityCaptivePortal", details.capabilities.hasCapabilityCaptivePortal)
                putBoolean("hasCapabilityNotRestricted", details.capabilities.hasCapabilityNotRestricted)
                putBoolean("hasCapabilityTrusted", details.capabilities.hasCapabilityTrusted)
                putBoolean("hasCapabilityNotMetered", details.capabilities.hasCapabilityNotMetered)
                putBoolean("hasCapabilityNotRoaming", details.capabilities.hasCapabilityNotRoaming)
                putBoolean("hasCapabilityNotSuspended", details.capabilities.hasCapabilityNotSuspended)
              }
              putMap("capabilities", capabilitiesMap)
            }
            putMap("details", detailsMap)
          }
        }
        
        eventEmitter.emit("networkStateChanged", eventData)
      }
    }
  }

  override fun stopNetworkStateListener() {
    networkStateManager.stopListening()
    collectJob?.cancel()
    collectJob = null
  }

  override fun isNetworkTypeAvailable(type: String, promise: Promise) {
    scope.launch {
      try {
        val isAvailable = networkStateManager.isNetworkTypeAvailable(type)
        promise.resolve(isAvailable)
      } catch (e: Exception) {
        promise.reject("NETWORK_TYPE_CHECK_ERROR", e.message, e)
      }
    }
  }

  override fun getNetworkStrength(promise: Promise) {
    scope.launch {
      try {
        val strength = networkStateManager.getNetworkStrength()
        promise.resolve(strength)
      } catch (e: Exception) {
        promise.reject("NETWORK_STRENGTH_ERROR", e.message, e)
      }
    }
  }

  override fun isNetworkExpensive(promise: Promise) {
    scope.launch {
      try {
        val isExpensive = networkStateManager.isNetworkExpensive()
        promise.resolve(isExpensive)
      } catch (e: Exception) {
        promise.reject("NETWORK_EXPENSIVE_ERROR", e.message, e)
      }
    }
  }

  override fun isNetworkMetered(promise: Promise) {
    scope.launch {
      try {
        val isMetered = networkStateManager.isNetworkMetered()
        promise.resolve(isMetered)
      } catch (e: Exception) {
        promise.reject("NETWORK_METERED_ERROR", e.message, e)
      }
    }
  }

  override fun forceRefresh() {
    networkStateManager.forceRefresh()
  }

  override fun onCatalystInstanceDestroy() {
    super.onCatalystInstanceDestroy()
    networkStateManager.stopListening()
    scope.cancel()
  }

  companion object {
    const val NAME = "NetworkState"
  }
}
