import { Request, Response, NextFunction } from "express";

export function requireDoctor(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = req.session?.user;
  if (!user || user.type !== "doctor") {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }
  (req as Request & { doctorId: string }).doctorId = user.id;
  next();
}

export function requirePatient(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = req.session?.user;
  if (!user || user.type !== "patient") {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }
  (req as Request & { patientId: string }).patientId = user.id;
  next();
}
