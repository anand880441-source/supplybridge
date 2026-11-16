import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { AppState } from "react-native";

import { SERVER_BASE_URL } from "../constants/config";
import { getNotificationUnreadCount } from "../services/notificationService";
import { useAuth } from "./AuthContext";
import { useUnreadMessages } from "./UnreadMessagesContext";

const FALLBACK_POLL_INTERVAL_MS = 60000;
const MAX_RECONNECT_DELAY_MS = 30000;

const NotificationsContext = createContext({
  unreadCount: 0,
  setUnreadCount: () => {},
  refreshUnreadCount: async () => null,
  isRealtimeConnected: false,
  notificationVersion: 0,
  messageVersion: 0,
  lastMessageEvent: null
});

const buildRealtimeUrl = (token) => {
  const websocketBaseUrl = SERVER_BASE_URL.replace(/^http/, "ws").replace(
    /\/+$/,
    ""
  );

  return `${websocketBaseUrl}/api/realtime?token=${encodeURIComponent(token)}`;
};

export const NotificationsProvider = ({ children }) => {
  const { token, user, logout } = useAuth();
  const { refreshUnreadTotal, setUnreadTotal } = useUnreadMessages();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [notificationVersion, setNotificationVersion] = useState(0);
  const [messageVersion, setMessageVersion] = useState(0);
  const [lastMessageEvent, setLastMessageEvent] = useState(null);
  const logoutRef = useRef(logout);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  const refreshUnreadCount = useCallback(async () => {
    if (!token || !user) {
      setUnreadCount(0);
      return 0;
    }

    try {
      const response = await getNotificationUnreadCount(token);
      const nextCount = Number(response.unreadCount) || 0;

      setUnreadCount(nextCount);
      return nextCount;
    } catch (error) {
      return null;
    }
  }, [token, user]);

  useEffect(() => {
    if (!token || !user) {
      setUnreadCount(0);
      return undefined;
    }

    refreshUnreadCount();

    const interval = setInterval(() => {
      if (AppState.currentState === "active" && !isRealtimeConnected) {
        refreshUnreadCount();
      }
    }, FALLBACK_POLL_INTERVAL_MS);

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshUnreadCount();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [token, user, isRealtimeConnected, refreshUnreadCount]);

  useEffect(() => {
    if (!token || !user) {
      setIsRealtimeConnected(false);
      return undefined;
    }

    let isActive = true;
    let reconnectAttempt = 0;
    let reconnectTimer = null;
    let socket = null;

    const scheduleReconnect = () => {
      if (!isActive || reconnectTimer) {
        return;
      }

      const delay = Math.min(
        1000 * 2 ** reconnectAttempt,
        MAX_RECONNECT_DELAY_MS
      );

      reconnectAttempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (
        !isActive ||
        (socket && (socket.readyState === 0 || socket.readyState === 1))
      ) {
        return;
      }

      let currentSocket;

      try {
        currentSocket = new WebSocket(buildRealtimeUrl(token));
      } catch (error) {
        scheduleReconnect();
        return;
      }

      socket = currentSocket;

      currentSocket.onopen = () => {
        if (!isActive || socket !== currentSocket) {
          return;
        }

        reconnectAttempt = 0;
        setIsRealtimeConnected(true);
        refreshUnreadCount();
        refreshUnreadTotal();
      };

      currentSocket.onmessage = (event) => {
        if (socket !== currentSocket) {
          return;
        }

        let payload;

        try {
          payload = JSON.parse(event.data);
        } catch (error) {
          return;
        }

        if (!payload || typeof payload.type !== "string") {
          return;
        }

        if (payload.type === "notification") {
          if (typeof payload.unreadCount === "number") {
            setUnreadCount(payload.unreadCount);
          } else {
            setUnreadCount((currentCount) => currentCount + 1);
          }

          setNotificationVersion((currentVersion) => currentVersion + 1);
        }

        if (payload.type === "message") {
          if (typeof payload.unreadTotal === "number") {
            setUnreadTotal(payload.unreadTotal);
          } else {
            refreshUnreadTotal();
          }

          setLastMessageEvent(payload.data || null);
          setMessageVersion((currentVersion) => currentVersion + 1);
        }
      };

      currentSocket.onclose = (event) => {
        if (socket !== currentSocket) {
          return;
        }

        socket = null;

        if (!isActive) {
          return;
        }

        setIsRealtimeConnected(false);

        if (event.code === 4001 || event.code === 4003) {
          isActive = false;
          logoutRef.current();
          return;
        }

        scheduleReconnect();
      };

      currentSocket.onerror = () => {};
    };

    connect();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        connect();
        refreshUnreadCount();
      }
    });

    return () => {
      isActive = false;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      subscription.remove();
      setIsRealtimeConnected(false);

      if (socket) {
        socket.onclose = null;
        socket.close();
        socket = null;
      }
    };
  }, [token, user, refreshUnreadCount, refreshUnreadTotal, setUnreadTotal]);

  const value = useMemo(
    () => ({
      unreadCount,
      setUnreadCount,
      refreshUnreadCount,
      isRealtimeConnected,
      notificationVersion,
      messageVersion,
      lastMessageEvent
    }),
    [
      unreadCount,
      refreshUnreadCount,
      isRealtimeConnected,
      notificationVersion,
      messageVersion,
      lastMessageEvent
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  return useContext(NotificationsContext);
};
