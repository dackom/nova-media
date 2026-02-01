import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>
            Choose how you want to access the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={() => navigate("/doctors")}
          >
            For doctors
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={() => navigate("/patients")}
          >
            For patients
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
