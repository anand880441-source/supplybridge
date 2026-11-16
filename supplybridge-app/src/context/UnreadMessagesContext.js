import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { AppState } from "react-native";

import { getConversations } from "../services/conversationService";
import { useAuth } from "./AuthContext";

const REFRESH_INTERVAL_MS = 30000;

const UnreadMessagesContext = createContext({
  unreadTotal: 0,
  setUnreadTotal: () => {},
  refreshUnreadTotal: async () => null
});

export const UnreadMessagesProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [unreadTotal, setUnreadTotal] = useState(0);

  const refreshUnreadTotal = useCallback(async () => {
    if (!token || !user) {
      setUnreadTotal(0);
      return 0;
    }

    try {
      const response = await getConversations(token);
      const nextTotal =
        typeof response.unreadTotal === "number"
          ? response.unreadTotal
          : (response.data || []).reduce(
              (total, conversation) =>
                total + (Number(conversation.unreadCount) || 0),
              0
            );

      setUnreadTotal(nextTotal);
      return nextTotal;
    } catch (error) {
      return null;
    }
  }, [token, user]);

  useEffect(() => {
    if (!token || !user) {
      setUnreadTotal(0);
      return undefined;
    }

    refreshUnreadTotal();

    const interval = setInterval(() => {
      if (AppState.currentState === "active") {
        refreshUnreadTotal();
      }
    }, REFRESH_INTERVAL_MS);

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshUnreadTotal();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [token, user, refreshUnreadTotal]);

  const value = useMemo(
    () => ({
      unreadTotal,
      setUnreadTotal,
      refreshUnreadTotal
    }),
    [unreadTotal, refreshUnreadTotal]
  );

  return (
    <UnreadMessagesContext.Provider value={value}>
      {children}
    </UnreadMessagesContext.Provider>
  );
};

export const useUnreadMessages = () => {
  return useContext(UnreadMessagesContext);
};
