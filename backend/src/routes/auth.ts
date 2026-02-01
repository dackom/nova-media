import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { Doctor } from "../models/doctor.js";
import { Patient } from "../models/patient.js";
import { invalidatePatientsCache } from "../lib/patients-cache.js";

const router = Router();

type UserType = "doctor" | "patient";

declare module "express-session" {
  interface SessionData {
    user: { id: string; name: string; email: string; type: UserType };
  }
}

router.post("/login", async (req: Request, res: Response) => {
  const { email, password, type, timezone } = req.body as {
    email?: string;
    password?: string;
    type?: string;
    timezone?: string;
  };

  if (!email || !password || !type) {
    return res.status(400).json({
      success: false,
      message: "Email, password, and type are required",
    });
  }

  if (type !== "doctor" && type !== "patient") {
    return res.status(400).json({
      success: false,
      message: "Type must be 'doctor' or 'patient'",
    });
  }

  try {
    const user =
      type === "doctor"
        ? await Doctor.findOne({ email }).select("+password")
        : await Patient.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (type === "patient" && timezone) {
      await Patient.findByIdAndUpdate(user._id, { timezone });
      await invalidatePatientsCache();
    }

    req.session.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      type: type as UserType,
    };

    // Save session before sending response so Set-Cookie is included (required behind proxy / cross-subdomain)
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({
          success: false,
          message: "An error occurred during login",
        });
      }
      return res.json({
        success: true,
        message: "Login successful",
        user: req.session.user,
      });
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred during login",
    });
  }
});

router.get("/me", async (req: Request, res: Response) => {
  const user = req.session?.user;
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  }

  const timezone = req.query.timezone as string | undefined;
  if (user.type === "patient" && timezone) {
    await Patient.findByIdAndUpdate(user.id, { timezone });
    await invalidatePatientsCache();
  }

  return res.json({ success: true, user });
});

router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Logout failed",
      });
    }
    const cookieOptions: {
      httpOnly: boolean;
      sameSite: "lax";
      secure: boolean;
      domain?: string;
    } = {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    };
    if (process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }
    res.clearCookie("nova.sid", cookieOptions);
    return res.json({ success: true, message: "Logged out" });
  });
});

export default router;
