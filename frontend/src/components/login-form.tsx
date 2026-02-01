import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth, type UserType } from "@/contexts/auth-context";
import { api, ApiError } from "@/lib/api";
import { getBrowserTimezone } from "@/lib/timezone";

export function LoginForm({
  userType,
  className,
  ...props
}: React.ComponentProps<"div"> & { userType: UserType }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const body: Record<string, unknown> = {
        email: email.trim(),
        password,
        type: userType,
      };
      if (userType === "patient") {
        const timezone = getBrowserTimezone();
        if (timezone) body.timezone = timezone;
      }
      const res = await api.post<{
        success: boolean;
        user: { id: string; name: string; email: string; type: UserType };
      }>("/auth/login", body);
      if (res.success && res.user) {
        login(res.user);
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const title =
    userType === "doctor"
      ? "Doctor login"
      : "Patient login";
  const description =
    userType === "doctor"
      ? "Sign in to access the doctor portal"
      : "Sign in to access your patient account";

  return (
    <div
      className={cn("flex w-full min-w-[280px] max-w-md flex-col gap-6", className)}
      {...props}
    >
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Login"}
                </Button>
                <Button variant="outline" type="button">
                  Login with Google
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account? <a href="#">Sign up</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
