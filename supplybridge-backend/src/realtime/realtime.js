const jwt = require("jsonwebtoken");
const { WebSocket, WebSocketServer } = require("ws");

const User = require("../models/User");

const REALTIME_PATH = "/api/realtime";
const MAX_CONNECTIONS_PER_USER = 5;
const HEARTBEAT_INTERVAL_MS = 30000;
const MAX_PAYLOAD_BYTES = 8 * 1024;
const UNAUTHORIZED_CLOSE_CODE = 4001;
const INACTIVE_CLOSE_CODE = 4003;
const TOO_MANY_CONNECTIONS_CLOSE_CODE = 4008;

const connectionsByUser = new Map();
let websocketServer = null;
let heartbeatTimer = null;

const safeSend = (socket, payload) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return false;
  }

  try {
    socket.send(JSON.stringify(payload));
    return true;
  } catch (error) {
    return false;
  }
};

const removeSocket = (userId, socket) => {
  const connections = connectionsByUser.get(userId);

  if (!connections) {
    return;
  }

  connections.delete(socket);

  if (connections.size === 0) {
    connectionsByUser.delete(userId);
  }
};

const authenticateRequest = async (request) => {
  let decoded;

  try {
    const url = new URL(request.url, "http://localhost");
    const token = url.searchParams.get("token");

    if (!token) {
      return { error: "missing_token" };
    }

    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return { error: "invalid_token" };
  }

  try {
    const user = await User.findById(decoded.userId).select("_id status");

    if (!user) {
      return { error: "invalid_token" };
    }

    if (user.status !== "active") {
      return { error: "inactive_user" };
    }

    return { user, decoded };
  } catch (error) {
    return { error: "lookup_failed" };
  }
};

const handleConnection = async (socket, request) => {
  const authentication = await authenticateRequest(request);

  if (authentication.error) {
    const closeCode =
      authentication.error === "inactive_user"
        ? INACTIVE_CLOSE_CODE
        : UNAUTHORIZED_CLOSE_CODE;

    socket.close(closeCode, "Unauthorized");
    return;
  }

  const userId = authentication.user._id.toString();
  const connections = connectionsByUser.get(userId) || new Set();

  if (connections.size >= MAX_CONNECTIONS_PER_USER) {
    socket.close(TOO_MANY_CONNECTIONS_CLOSE_CODE, "Too many connections");
    return;
  }

  connections.add(socket);
  connectionsByUser.set(userId, connections);

  socket.isAlive = true;
  safeSend(socket, {
    type: "connected",
    data: {
      userId,
      connectedAt: new Date().toISOString()
    }
  });

  const expiresAt = authentication.decoded.exp
    ? authentication.decoded.exp * 1000
    : 0;
  const expiresInMs = expiresAt - Date.now();
  const expiryTimer =
    expiresInMs > 0 && expiresInMs < 2147483647
      ? setTimeout(() => {
          socket.close(UNAUTHORIZED_CLOSE_CODE, "Session expired");
        }, expiresInMs)
      : null;

  if (expiryTimer && typeof expiryTimer.unref === "function") {
    expiryTimer.unref();
  }

  socket.on("pong", () => {
    socket.isAlive = true;
  });

  socket.on("message", (rawMessage) => {
    let message;

    try {
      message = JSON.parse(rawMessage.toString());
    } catch (error) {
      return;
    }

    if (message && message.type === "ping") {
      safeSend(socket, { type: "pong" });
    }
  });

  socket.on("close", () => {
    if (expiryTimer) {
      clearTimeout(expiryTimer);
    }

    removeSocket(userId, socket);
  });

  socket.on("error", () => {});
};

const attachRealtimeServer = (server) => {
  if (websocketServer) {
    return websocketServer;
  }

  websocketServer = new WebSocketServer({
    server,
    path: REALTIME_PATH,
    maxPayload: MAX_PAYLOAD_BYTES
  });

  websocketServer.on("connection", (socket, request) => {
    handleConnection(socket, request).catch(() => {
      socket.close(UNAUTHORIZED_CLOSE_CODE, "Unauthorized");
    });
  });

  heartbeatTimer = setInterval(() => {
    connectionsByUser.forEach((connections) => {
      connections.forEach((socket) => {
        if (!socket.isAlive) {
          socket.terminate();
          return;
        }

        socket.isAlive = false;

        try {
          socket.ping();
        } catch (error) {
          socket.terminate();
        }
      });
    });
  }, HEARTBEAT_INTERVAL_MS);

  if (typeof heartbeatTimer.unref === "function") {
    heartbeatTimer.unref();
  }

  websocketServer.on("close", () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    websocketServer = null;
  });

  return websocketServer;
};

const sendToUser = (userId, payload) => {
  if (!userId) {
    return 0;
  }

  const connections = connectionsByUser.get(userId.toString());

  if (!connections || connections.size === 0) {
    return 0;
  }

  let sentCount = 0;

  connections.forEach((socket) => {
    if (safeSend(socket, payload)) {
      sentCount += 1;
    }
  });

  return sentCount;
};

const closeRealtimeServer = () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  connectionsByUser.forEach((connections) => {
    connections.forEach((socket) => {
      socket.terminate();
    });
  });
  connectionsByUser.clear();

  if (websocketServer) {
    websocketServer.close();
    websocketServer = null;
  }
};

module.exports = {
  REALTIME_PATH,
  attachRealtimeServer,
  closeRealtimeServer,
  sendToUser
};
