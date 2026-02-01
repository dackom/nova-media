import "dotenv/config";
import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { Server } from "socket.io";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import eventsRoutes from "./routes/doctor/events.js";
import doctorPatientsRoutes from "./routes/doctor/patients.js";
import patientEventsRoutes from "./routes/patients/events.js";
import patientSocketTokenRoutes from "./routes/patients/socket-token.js";
import { requireDoctor, requirePatient } from "./middleware/auth.js";
import { connectRedis } from "./lib/redis.js";
import { consumeSocketToken } from "./lib/socket-tokens.js";
import { startEventReminderJob } from "./jobs/event-reminder.js";

const app = express();
const httpServer = createServer(app);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";
/** Set to e.g. ".loudvibe.com" in production so the session cookie is shared across subdomains (frontend + backend). */
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? undefined;
const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN, credentials: true },
});

const PORT = process.env.PORT ?? 3001;
const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://localhost:27017/nova-media";
const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "dev-secret-change-in-production";

// Required when behind a reverse proxy (e.g. Coolify) so req.secure and cookies work correctly
app.set("trust proxy", 1);
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

async function connectMongo() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

async function main() {
  await connectMongo();
  const redis = await connectRedis();

  if (redis) {
    const store = new RedisStore({ client: redis });
    app.use(
      session({
        store,
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        name: "nova.sid",
        cookie: {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
        },
      })
    );
  } else {
    app.use(
      session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        name: "nova.sid",
        cookie: {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
          ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
        },
      })
    );
    console.warn("Redis unavailable, using in-memory session store");
  }

  app.set("io", io);
  app.use("/auth", authRoutes);
  app.use("/doctors/events", requireDoctor, eventsRoutes);
  app.use("/doctors/patients", requireDoctor, doctorPatientsRoutes);
  app.use("/patients/events", requirePatient, patientEventsRoutes);
  app.use("/patients/socket-token", requirePatient, patientSocketTokenRoutes);

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error("Missing auth token"));
    }
    const patientId = await consumeSocketToken(token);
    if (!patientId) {
      return next(new Error("Invalid or expired token"));
    }
    socket.data.patientId = patientId;
    next();
  });

  io.on("connection", (socket) => {
    const patientId = socket.data.patientId as string;
    socket.join(`patient:${patientId}`);
    socket.on("disconnect", () => {
      console.log("Patient disconnected:", socket.id);
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    startEventReminderJob(io);
  });
}

main();
