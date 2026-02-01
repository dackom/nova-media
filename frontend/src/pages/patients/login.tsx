import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LoginForm } from "@/components/login-form";
import { useAuth } from "@/contexts/auth-context";

export function PatientsLogin() {
  const { user, isAuthenticated, isInitialized } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isInitialized) return;
    if (isAuthenticated && user?.type === "patient") {
      navigate("/patients/dashboard", { replace: true });
    }
  }, [isInitialized, isAuthenticated, user?.type, navigate]);

  if (!isInitialized) return null;
  if (isAuthenticated && user?.type === "patient") {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">
      <LoginForm userType="patient" className="w-full max-w-md" />
    </div>
  );
}
