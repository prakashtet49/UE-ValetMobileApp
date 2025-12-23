import React, {useState, useEffect} from 'react';
import NetInfo from '@react-native-community/netinfo';
import NetworkDialog from './NetworkDialog';

const GlobalNetworkMonitor: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('[GlobalNetworkMonitor] Connection type:', state.type);
      console.log('[GlobalNetworkMonitor] Is connected:', state.isConnected);
      console.log('[GlobalNetworkMonitor] Is internet reachable:', state.isInternetReachable);
      
      // Show dialog if not connected or internet is not reachable
      const offline = !state.isConnected || state.isInternetReachable === false;
      setIsOffline(offline);
      
      if (offline) {
        console.log('[GlobalNetworkMonitor] ⚠️ Network is offline - showing dialog');
      } else {
        console.log('[GlobalNetworkMonitor] ✅ Network is online');
      }
    });

    // Check initial state
    NetInfo.fetch().then(state => {
      const offline = !state.isConnected || state.isInternetReachable === false;
      setIsOffline(offline);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleRetry = async () => {
    console.log('[GlobalNetworkMonitor] Retry button pressed - checking connection...');
    
    try {
      const state = await NetInfo.fetch();
      const offline = !state.isConnected || state.isInternetReachable === false;
      
      if (!offline) {
        console.log('[GlobalNetworkMonitor] ✅ Connection restored');
        setIsOffline(false);
      } else {
        console.log('[GlobalNetworkMonitor] ⚠️ Still offline');
        // Dialog will remain visible
      }
    } catch (error) {
      console.error('[GlobalNetworkMonitor] Error checking connection:', error);
    }
  };

  return <NetworkDialog visible={isOffline} onRetry={handleRetry} />;
};

export default GlobalNetworkMonitor;
