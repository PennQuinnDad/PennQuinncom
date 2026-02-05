import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";

// Simple password-based authentication for admin access
// Configure via environment variables:
// - ADMIN_PASSWORD: The password required to access admin features
// - SESSION_SECRET: Secret key for session encryption

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  return session({
    secret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

// Extend Express session to include our custom fields
declare module "express-session" {
  interface SessionData {
    isAdmin: boolean;
    loginTime: number;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
}

export function registerAuthRoutes(app: Express): void {
  // Login endpoint
  app.post("/api/login", (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error("ADMIN_PASSWORD environment variable not set");
      return res.status(500).json({ message: "Server configuration error" });
    }

    if (password === adminPassword) {
      req.session.isAdmin = true;
      req.session.loginTime = Date.now();
      return res.json({
        success: true,
        user: {
          id: "admin",
          email: "admin@pennquinn.com",
          firstName: "Admin"
        }
      });
    }

    return res.status(401).json({ message: "Invalid password" });
  });

  // Get current auth status
  app.get("/api/auth/user", (req, res) => {
    if (req.session.isAdmin) {
      return res.json({
        id: "admin",
        email: "admin@pennquinn.com",
        firstName: "Admin"
      });
    }
    return res.status(401).json({ message: "Not authenticated" });
  });

  // Logout endpoint
  app.get("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
      }
      res.redirect("/");
    });
  });

  // Also support POST logout
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ message: "Error logging out" });
      }
      res.json({ success: true });
    });
  });
}

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};
