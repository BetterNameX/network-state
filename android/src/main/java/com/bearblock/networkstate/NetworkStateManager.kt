package com.bearblock.networkstate

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.WifiManager
import android.os.Build
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class NetworkStateManager(private val context: Context) {

    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    private val wifiManager = context.getSystemService(Context.WIFI_SERVICE) as WifiManager

    private val _networkState = MutableStateFlow(NetworkState())
    val networkState: StateFlow<NetworkState> = _networkState.asStateFlow()

    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    init {
        updateNetworkState()
    }

    fun startListening() {
        if (networkCallback != null) return

        networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) { updateNetworkState() }
            override fun onLost(network: Network) { updateNetworkState() }
            override fun onCapabilitiesChanged(network: Network, networkCapabilities: NetworkCapabilities) { updateNetworkState() }
            override fun onLinkPropertiesChanged(network: Network, linkProperties: android.net.LinkProperties) { updateNetworkState() }
        }

        val networkRequest = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        connectivityManager.registerNetworkCallback(networkRequest, networkCallback!!)
    }

    fun stopListening() {
        networkCallback?.let { callback ->
            connectivityManager.unregisterNetworkCallback(callback)
            networkCallback = null
        }
    }

    private fun updateNetworkState() {
        val (_, caps) = resolveActiveNetworkAndCaps()

        // isConnected: Has network capabilities (might be captive portal)
        // isInternetReachable: Network has been validated by Android (actual internet access)
        val hasNetwork = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
        val isValidated = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true

        val newState = NetworkState(
            isConnected = hasNetwork,
            isInternetReachable = isValidated,
            type = getNetworkType(caps),
            isExpensive = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED) != true,
            isMetered = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED) != true,
            details = getNetworkDetails(caps)
        )

        _networkState.value = newState
    }

    private fun resolveActiveNetworkAndCaps(): Pair<Network?, NetworkCapabilities?> {
        val active = connectivityManager.activeNetwork
        val activeCaps = connectivityManager.getNetworkCapabilities(active)
        if (active != null && activeCaps != null) return active to activeCaps

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            var bestNetwork: Network? = null
            var bestCaps: NetworkCapabilities? = null
            var bestScore = -1

            for (net in connectivityManager.allNetworks) {
                val nc = connectivityManager.getNetworkCapabilities(net) ?: continue
                val hasInternet = nc.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                val isValidated = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    nc.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
                } else false

                val score = when {
                    isValidated -> 3
                    hasInternet -> 2
                    else -> 1
                } + when {
                    nc.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> 2
                    nc.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> 1
                    else -> 0
                }

                if (score > bestScore) {
                    bestScore = score
                    bestNetwork = net
                    bestCaps = nc
                }
            }
            if (bestNetwork != null && bestCaps != null) return bestNetwork!! to bestCaps!!
        }
        return null to null
    }

    private fun getNetworkType(networkCapabilities: NetworkCapabilities?): String {
        if (networkCapabilities == null) return "none"
        return when {
            networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
            networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
            networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
            networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH) -> "bluetooth"
            networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN) -> "vpn"
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI_AWARE) -> "wifi_aware"
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1 && networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_LOWPAN) -> "lowpan"
            else -> "unknown"
        }
    }

    private fun getNetworkDetails(networkCapabilities: NetworkCapabilities?): NetworkDetails? {
        if (networkCapabilities == null) return null

        val details = NetworkDetails()

        // Always try to get WiFi info from WifiManager if WiFi is physically connected.
        // This works regardless of VPN status, as WifiManager queries the hardware directly.
        // The networkId check ensures we're actually connected to a WiFi network.
        val wifiInfo = try { wifiManager.connectionInfo } catch (_: Exception) { null }
        if (wifiInfo != null && wifiInfo.networkId != -1) {
            details.ssid = wifiInfo.ssid?.removeSurrounding("\"")
            details.bssid = wifiInfo.bssid
            details.strength = wifiInfo.rssi
            details.frequency = wifiInfo.frequency
            details.linkSpeed = wifiInfo.linkSpeed
        }

        details.capabilities = NetworkCapabilitiesInfo(
            hasTransportWifi = networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI),
            hasTransportCellular = networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR),
            hasTransportEthernet = networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET),
            hasTransportBluetooth = networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH),
            hasTransportVpn = networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN),
            hasCapabilityInternet = networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET),
            hasCapabilityValidated = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) else false,
            hasCapabilityCaptivePortal = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_CAPTIVE_PORTAL) else false,
            hasCapabilityNotRestricted = networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_RESTRICTED),
            hasCapabilityTrusted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_TRUSTED) else false,
            hasCapabilityNotMetered = networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED),
            hasCapabilityNotRoaming = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_ROAMING) else false,
            hasCapabilityNotSuspended = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_SUSPENDED) else false
        )

        return details
    }

    fun getCurrentNetworkState(): NetworkState {
        updateNetworkState()
        return _networkState.value
    }

    fun isNetworkTypeAvailable(type: String): Boolean {
        val (_, caps) = resolveActiveNetworkAndCaps()
        return when (type) {
            "wifi" -> caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
            "cellular" -> caps?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true
            "ethernet" -> caps?.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) == true
            "bluetooth" -> caps?.hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH) == true
            "vpn" -> caps?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) == true
            else -> false
        }
    }

    fun getNetworkStrength(): Int {
        val (_, caps) = resolveActiveNetworkAndCaps()
        return when {
            caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true -> {
                val wifiInfo = try { wifiManager.connectionInfo } catch (_: Exception) { null }
                wifiInfo?.rssi ?: -1
            }
            caps?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true -> -1
            else -> -1
        }
    }

    fun isNetworkExpensive(): Boolean {
        val (_, caps) = resolveActiveNetworkAndCaps()
        return caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED) != true
    }

    fun isNetworkMetered(): Boolean {
        val (_, caps) = resolveActiveNetworkAndCaps()
        return caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED) != true
    }

    /**
     * Force refresh network state - useful when app comes to foreground
     */
    fun forceRefresh() {
        updateNetworkState()
    }
}

// Data classes for network state
data class NetworkState(
    val isConnected: Boolean = false,
    val isInternetReachable: Boolean = false,
    val type: String = "none",
    val isExpensive: Boolean = false,
    val isMetered: Boolean = false,
    val details: NetworkDetails? = null
)

data class NetworkDetails(
    var ssid: String? = null,
    var bssid: String? = null,
    var strength: Int = -1,
    var frequency: Int = -1,
    var linkSpeed: Int = -1,
    var capabilities: NetworkCapabilitiesInfo = NetworkCapabilitiesInfo()
)

data class NetworkCapabilitiesInfo(
    val hasTransportWifi: Boolean = false,
    val hasTransportCellular: Boolean = false,
    val hasTransportEthernet: Boolean = false,
    val hasTransportBluetooth: Boolean = false,
    val hasTransportVpn: Boolean = false,
    val hasCapabilityInternet: Boolean = false,
    val hasCapabilityValidated: Boolean = false,
    val hasCapabilityCaptivePortal: Boolean = false,
    val hasCapabilityNotRestricted: Boolean = false,
    val hasCapabilityTrusted: Boolean = false,
    val hasCapabilityNotMetered: Boolean = false,
    val hasCapabilityNotRoaming: Boolean = false,
    val hasCapabilityNotSuspended: Boolean = false
)
