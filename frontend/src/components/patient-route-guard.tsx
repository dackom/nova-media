import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PatientRouteGuard({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isInitialized, logout } = useAuth();
  const navigate = useNavigate();

  if (!isInitialized) return null;
  if (!isAuthenticated) {
    navigate("/patients", { replace: true });
    return null;
  }

  if (user?.type !== "patient") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>
              This area is for patients only. You are logged in as a doctor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              Log out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
