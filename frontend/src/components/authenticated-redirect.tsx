import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";

export function AuthenticatedRedirect({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isInitialized } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isInitialized) return;
    if (isAuthenticated && user?.type) {
      if (user.type === "doctor") {
        navigate("/doctors/dashboard", { replace: true });
      } else {
        navigate("/patients/dashboard", { replace: true });
      }
    }
  }, [isInitialized, isAuthenticated, user?.type, navigate]);

  if (!isInitialized) return null;
  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
