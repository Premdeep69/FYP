import app from "./app.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { handleConnection } from "./socket/socketHandler.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins in development
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Handle socket connections
handleConnection(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}`);
  console.log(`WebSocket server ready for connections`);
});
