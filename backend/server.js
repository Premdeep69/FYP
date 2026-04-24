// server.js
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { startExpiryJob } from "./jobs/expireSessionRequests.js";
import { initializeSchedulers } from "./jobs/notificationScheduler.js";
import { handleConnection } from "./socket/socketHandler.js";

const PORT = process.env.PORT || 10000;

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL,'https://lemon-sand-086fe0300.7.azurestaticapps.net'],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Handle socket connections
handleConnection(io);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}`);
  console.log(`WebSocket server ready for connections`);
  startExpiryJob();
  initializeSchedulers();
});