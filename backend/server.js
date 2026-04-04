// server.js
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { handleConnection } from "./socket/socketHandler.js";

if (process.env.NODE_ENV !== "production") {
  import('dotenv').then(dotenv => dotenv.config());
}

const PORT = process.env.PORT || 8080;

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
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
});