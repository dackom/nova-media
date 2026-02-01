import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { AuthenticatedRedirect } from "@/components/authenticated-redirect";
import { DoctorRouteGuard } from "@/components/doctor-route-guard";
import { PatientRouteGuard } from "@/components/patient-route-guard";
import { Home } from "@/pages/home";
import { DoctorsLogin } from "@/pages/doctors/login";
import { PatientsLogin } from "@/pages/patients/login";
import { DoctorsDashboard } from "@/pages/doctors/dashboard";
import { PatientsDashboard } from "@/pages/patients/dashboard";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ThemeProvider>
          <Toaster position="top-center" richColors />
          <ThemeSwitcher />
          <Routes>
            <Route
              path="/"
              element={
                <AuthenticatedRedirect>
                  <Home />
                </AuthenticatedRedirect>
              }
            />
            <Route path="/doctors" element={<DoctorsLogin />} />
            <Route path="/patients" element={<PatientsLogin />} />
            <Route
              path="/doctors/dashboard"
              element={
                <DoctorRouteGuard>
                  <DoctorsDashboard />
                </DoctorRouteGuard>
              }
            />
            <Route
              path="/patients/dashboard"
              element={
                <PatientRouteGuard>
                  <PatientsDashboard />
                </PatientRouteGuard>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ThemeProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
