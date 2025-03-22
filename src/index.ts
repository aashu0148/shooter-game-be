// import mongoose from "mongoose";
import express, { Express } from "express";
import cors from "cors";
import { Server as SocketServer } from "socket.io";
import http from "http";

import AppSocket from "@app/socket";
import { appEnvs } from "@utils/configs";
import RoomCleaner from "@app/cleaner";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://shooter-vibe.netlify.app",
];
const app: Express = express();
const server: http.Server = http.createServer(app);
const io: SocketServer = new SocketServer(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
  },
});

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

app.get("/hi", (req, res) => {
  res.send("hi");
});

server.listen(appEnvs.PORT, () => {
  console.log(`🚀 Backend is up at port ${appEnvs.PORT}`);
  new AppSocket(io);

  // Set up room cleanup interval
  setInterval(() => {
    RoomCleaner.cleanup();
  }, 60 * 1000); // Run every minute

  // mongoose.set("strictQuery", true);
  // mongoose
  //   .connect(process.env.MONGO_URI || "")
  //   .then(() => {
  //     console.log("🔒 Established a connection with the database");

  //     // initBot();
  //     // setUpCronJobs();
  //     // console.log(`🔁 Jobs initialized with Bree`);
  //   })
  //   .catch((err) => console.log("⚠️❗ Error connecting to database", err));
});
