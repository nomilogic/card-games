import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import express from "express";
import { monitor } from "@colyseus/monitor";
import cors from "cors";
import { GameRoom } from "./rooms/GameRoom";
// @ts-ignore
import { playground } from "@colyseus/playground";
const port = Number(process.env.PORT || 2567);
const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

// Create WebSocket Server
const gameServer = new Server({
  transport: new WebSocketTransport({
    server: createServer(app)
  })
});

// Register your room handlers
gameServer.define("game_room", GameRoom);

// Register @colyseus/monitor
// It provides a nice web interface to monitor your rooms in real-time
app.use("/colyseus", monitor());
if (process.env.NODE_ENV !== "production") {
  app.use("/playground", playground);
}

gameServer.listen(port).then(() => {
  console.log(`
🎮 Game Server is running!
👉 WebSocket Server: ws://localhost:${port}
📊 Colyseus Monitor: http://localhost:${port}/colyseus
  `);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
