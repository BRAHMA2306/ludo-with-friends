require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initRedis } = require('./redis');
const setupSockets = require('./sockets');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ["websocket", "polling"]
});

io.engine.on("connection_error", (err) => {
  console.log("Socket connection error:", err);
});

app.get('/', (req, res) => {
  res.send('Ludo Server is running');
});

async function start() {
  await initRedis();

  setupSockets(io);

  const PORT = process.env.PORT || 4000;
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start();
