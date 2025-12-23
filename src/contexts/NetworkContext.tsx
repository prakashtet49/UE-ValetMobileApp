import React, {createContext, useContext, useEffect, useState} from 'react';
import NetInfo from '@react-native-community/netinfo';

type NetworkContextType = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
};

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  isInternetReachable: true,
});

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('[Network] Connection type:', state.type);
      console.log('[Network] Is connected:', state.isConnected);
      console.log('[Network] Is internet reachable:', state.isInternetReachable);
      
      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable);
    });

    // Fetch initial state
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <NetworkContext.Provider value={{isConnected, isInternetReachable}}>
      {children}
    </NetworkContext.Provider>
  );
};
