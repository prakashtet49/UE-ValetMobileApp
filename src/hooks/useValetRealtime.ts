import {useEffect, useRef, useCallback} from 'react';
import {io, Socket} from 'socket.io-client';
import {getStoredTokens} from '../api/client';
import {BASE_URL} from '../api/config';
import type {ActiveJob} from '../api/jobs';
import type {PendingPickupJob} from '../api/pickup';

interface JobStatsPayload {
  parkedCount: number;
  deliveredCount: number;
}

interface ActiveJobsPayload {
  jobs: ActiveJob[];
  total: number;
  pagination?: any;
  summary?: any;
}

interface PickupRequestsPayload {
  requests: PendingPickupJob[];
}

interface UseValetRealtimeCallbacks {
  onActiveJobsUpdate?: (payload: ActiveJobsPayload) => void;
  onJobStatsUpdate?: (payload: JobStatsPayload) => void;
  onNewPickupRequest?: (payload: PickupRequestsPayload) => void;
}

export function useValetRealtime(callbacks: UseValetRealtimeCallbacks = {}) {
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef(callbacks);
  
  // Update callbacks ref whenever they change
  useEffect(() => {
    console.log('[WebSocket] 🔄 Callbacks updated');
    console.log('[WebSocket] Has onActiveJobsUpdate:', !!callbacks.onActiveJobsUpdate);
    console.log('[WebSocket] Has onJobStatsUpdate:', !!callbacks.onJobStatsUpdate);
    console.log('[WebSocket] Has onNewPickupRequest:', !!callbacks.onNewPickupRequest);
    callbacksRef.current = callbacks;
  }, [callbacks]);
  
  const {onActiveJobsUpdate, onJobStatsUpdate, onNewPickupRequest} = callbacks;

  const connect = useCallback(async () => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[WebSocket] 🔄 INITIATING CONNECTION');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Get the stored login token (this is what backend expects)
      const {accessToken} = await getStoredTokens();
      
      if (!accessToken) {
        console.warn('[WebSocket] ⚠️ No access token available, skipping connection');
        return;
      }
      
      console.log('[WebSocket] ✓ Token retrieved successfully');
      console.log('[WebSocket] Token source: Login (AsyncStorage)');
      console.log('[WebSocket] Token preview:', accessToken.substring(0, 30) + '...');
      console.log('[WebSocket] Full token:', accessToken);

      // Get base URL from config
      const baseUrl = BASE_URL;

      console.log('[WebSocket] Target URL:', baseUrl);
      console.log('[WebSocket] Path: /ws');
      console.log('[WebSocket] Transport: websocket');
      console.log('[WebSocket] Reconnection: enabled (10 attempts)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Try multiple authentication methods
      // Method 1: auth object with token (no Bearer prefix)
      // Method 2: extraHeaders with Authorization Bearer token
      // Method 3: query parameter (no Bearer prefix)
      const socket = io(baseUrl, {
        path: '/ws',
        auth: {
          token: accessToken,
        },
        extraHeaders: {
          Authorization: `Bearer ${accessToken}`,
        },
        query: {
          token: accessToken,
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 20000,
      });
      
      console.log('[WebSocket] Auth methods configured:');
      console.log('[WebSocket] - auth.token:', accessToken.substring(0, 30) + '...');
      console.log('[WebSocket] - extraHeaders.Authorization: Bearer', accessToken.substring(0, 20) + '...');
      console.log('[WebSocket] - query.token:', accessToken.substring(0, 30) + '...');

      socket.on('connect', () => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[WebSocket] ✅ CONNECTED');
        console.log('[WebSocket] Socket ID:', socket.id);
        console.log('[WebSocket] Transport:', socket.io.engine.transport.name);
        console.log('[WebSocket] Base URL:', baseUrl);
        console.log('[WebSocket] 📡 Listening for events:');
        console.log('[WebSocket]   - jobs:active');
        console.log('[WebSocket]   - jobstats:today');
        console.log('[WebSocket]   - pickup:new');
        console.log('[WebSocket] ⚠️ If you don\'t see events, backend is not emitting them');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      });

      socket.on('connect_error', (err: any) => {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('[WebSocket] ❌ CONNECTION ERROR');
        console.error('[WebSocket] Error:', err?.message || err);
        console.error('[WebSocket] Description:', err?.description);
        console.error('[WebSocket] Type:', err?.type);
        console.error('[WebSocket] Context:', err?.context);
        console.error('[WebSocket] Data:', err?.data);
        
        // Check error type and provide helpful messages
        if (err?.message === 'websocket error' || err?.type === 'TransportError') {
          console.error('[WebSocket] ⚠️ TRANSPORT ERROR');
          console.error('[WebSocket] This usually means:');
          console.error('[WebSocket] 1. WebSocket server is not running');
          console.error('[WebSocket] 2. Server is not configured to accept WebSocket at /ws');
          console.error('[WebSocket] 3. Network/firewall is blocking WebSocket connections');
          console.error('[WebSocket] 4. Server URL is incorrect:', baseUrl);
          console.error('[WebSocket] ℹ️ REST API works, so server is reachable');
          console.error('[WebSocket] ℹ️ The issue is WebSocket-specific configuration');
        } else if (err?.message === 'Unauthorized' || err?.data?.message === 'Unauthorized') {
          console.error('[WebSocket] ⚠️ AUTHENTICATION FAILED');
          console.error('[WebSocket] This usually means:');
          console.error('[WebSocket] 1. Token is invalid or expired');
          console.error('[WebSocket] 2. Server is not accepting the token format');
          console.error('[WebSocket] 3. WebSocket endpoint requires different auth');
          console.error('[WebSocket] Token being used:', accessToken?.substring(0, 30) + '...');
        }
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      });
      
      socket.on('reconnect_attempt', (attemptNumber: number) => {
        console.log('[WebSocket] 🔄 Reconnection attempt:', attemptNumber);
      });
      
      socket.on('reconnect_failed', () => {
        console.error('[WebSocket] ❌ Reconnection failed after all attempts');
      });

      socket.on('disconnect', (reason: any) => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[WebSocket] 🔌 DISCONNECTED');
        console.log('[WebSocket] Reason:', reason);
        console.log('[WebSocket] Timestamp:', new Date().toISOString());
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      });

      socket.on('error', (err: any) => {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('[WebSocket] ⚠️ ERROR EVENT');
        console.error('[WebSocket] Error:', err);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      });

      // Listen for active jobs updates
      socket.on('jobs:active', (payload: ActiveJobsPayload) => {
        console.log('┌─────────────────────────────────────────┐');
        console.log('│ [WebSocket] 📋 ACTIVE JOBS UPDATE       │');
        console.log('└─────────────────────────────────────────┘');
        console.log('[WebSocket] Timestamp:', new Date().toISOString());
        console.log('[WebSocket] Total Jobs:', payload.total);
        console.log('[WebSocket] Jobs Count:', payload.jobs?.length || 0);
        console.log('[WebSocket] Payload:', JSON.stringify(payload, null, 2));
        console.log('─────────────────────────────────────────');
        
        if (callbacksRef.current.onActiveJobsUpdate) {
          console.log('[WebSocket] ✓ Calling onActiveJobsUpdate callback');
          callbacksRef.current.onActiveJobsUpdate(payload);
        } else {
          console.log('[WebSocket] ⚠️ No onActiveJobsUpdate callback registered');
        }
      });

      // Listen for job stats updates
      socket.on('jobstats:today', (payload: JobStatsPayload) => {
        console.log('┌─────────────────────────────────────────┐');
        console.log('│ [WebSocket] 📊 JOB STATS UPDATE         │');
        console.log('└─────────────────────────────────────────┘');
        console.log('[WebSocket] Timestamp:', new Date().toISOString());
        console.log('[WebSocket] Parked Count:', payload.parkedCount);
        console.log('[WebSocket] Delivered Count:', payload.deliveredCount);
        console.log('[WebSocket] Payload:', JSON.stringify(payload, null, 2));
        console.log('─────────────────────────────────────────');
        
        if (callbacksRef.current.onJobStatsUpdate) {
          console.log('[WebSocket] ✓ Calling onJobStatsUpdate callback');
          callbacksRef.current.onJobStatsUpdate(payload);
        } else {
          console.log('[WebSocket] ⚠️ No onJobStatsUpdate callback registered');
        }
      });

      // Handler function for pickup requests (used by multiple event names)
      const handlePickupRequest = (eventName: string, payload: PickupRequestsPayload | PendingPickupJob[]) => {
        console.log('┌─────────────────────────────────────────┐');
        console.log('│ [WebSocket] 🚗 NEW PICKUP REQUEST       │');
        console.log('└─────────────────────────────────────────┘');
        console.log('[WebSocket] Event Name:', eventName);
        console.log('[WebSocket] Timestamp:', new Date().toISOString());
        console.log('[WebSocket] Raw Payload Type:', Array.isArray(payload) ? 'Array' : 'Object');
        console.log('[WebSocket] Full Payload:', JSON.stringify(payload, null, 2));
        
        // Normalize payload - backend sends array directly, not {requests: [...]}
        const normalizedPayload: PickupRequestsPayload = Array.isArray(payload) 
          ? { requests: payload }
          : payload;
        
        const requestsCount = normalizedPayload.requests?.length || 0;
        console.log('[WebSocket] Normalized Requests Count:', requestsCount);
        
        // Log each request details
        if (normalizedPayload.requests && normalizedPayload.requests.length > 0) {
          console.log('[WebSocket] 📝 Request Details:');
          normalizedPayload.requests.forEach((request, index) => {
            console.log(`[WebSocket]   Request ${index + 1}:`, JSON.stringify(request, null, 2));
          });
        } else {
          console.log('[WebSocket] ⚠️ No requests in payload');
        }
        console.log('─────────────────────────────────────────');
        
        if (callbacksRef.current.onNewPickupRequest) {
          console.log('[WebSocket] ✓ Calling onNewPickupRequest callback');
          console.log('[WebSocket] ✓ Callback will receive:', {
            requestsCount,
            hasRequests: requestsCount > 0
          });
          callbacksRef.current.onNewPickupRequest(normalizedPayload);
        } else {
          console.log('[WebSocket] ⚠️ No onNewPickupRequest callback registered');
        }
      };

      // Listen for new pickup requests - support multiple event names
      // Backend might use 'pickup:new' or 'pickup-requests/new'
      socket.on('pickup:new', (payload) => {
        console.log('[WebSocket] 🎯 pickup:new event received!');
        handlePickupRequest('pickup:new', payload);
      });
      socket.on('pickup-requests/new', (payload) => {
        console.log('[WebSocket] 🎯 pickup-requests/new event received!');
        handlePickupRequest('pickup-requests/new', payload);
      });

      // Add a catch-all listener to see ALL events from server
      socket.onAny((eventName: string, ...args: any[]) => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[WebSocket] 📨 RECEIVED EVENT:', eventName);
        console.log('[WebSocket] Event data:', JSON.stringify(args, null, 2));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      });

      socketRef.current = socket;
      
      console.log('[WebSocket] ✓ Socket instance created and stored');
      console.log('[WebSocket] ✓ All event listeners registered');
      console.log('[WebSocket] ✓ Catch-all listener added to log ALL events');
    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('[WebSocket] ❌ FAILED TO CONNECT');
      console.error('[WebSocket] Error:', error);
      console.error('[WebSocket] Stack:', (error as Error)?.stack);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  }, []); // Empty deps - connect only once

  useEffect(() => {
    console.log('[WebSocket] 🚀 Hook mounted, initiating connection...');
    connect();

    return () => {
      if (socketRef.current) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[WebSocket] 🧹 CLEANUP - Component unmounting');
        console.log('[WebSocket] Removing all listeners...');
        socketRef.current.removeAllListeners();
        console.log('[WebSocket] Disconnecting socket...');
        socketRef.current.disconnect();
        socketRef.current = null;
        console.log('[WebSocket] ✓ Cleanup complete');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }
    };
  }, [connect]);

  // Return socket instance and reconnect function
  return {
    socket: socketRef.current,
    reconnect: connect,
  };
}
