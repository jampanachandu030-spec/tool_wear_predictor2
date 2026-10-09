import React, { useState } from "react";
import {
  Cog,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Gauge,
  Cpu,
  AlertCircle,
  UserPlus,
  LogIn,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

interface AuthPageProps {
  onSuccess?: () => void;
}

export function AuthPage({ onSuccess }: AuthPageProps) {
  const { signIn, signUp, resetPassword, authError } = useAuth();

  // Mode: "signin" | "signup"
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // Common Form States
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("Lead CNC Machinist");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status & error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (mode === "signin") {
        if (!username.trim()) {
          setErrorMsg("Please enter your User Name.");
          setIsLoading(false);
          return;
        }
        if (!email.trim() || !email.includes("@")) {
          setErrorMsg("Please enter a valid Mail ID (e.g., operator@company.com).");
          setIsLoading(false);
          return;
        }
        if (!password) {
          setErrorMsg("Please enter your password.");
          setIsLoading(false);
          return;
        }

        const res = await signIn({ username, email, password, rememberSession: rememberMe });
        if (!res.success) {
          setErrorMsg(res.error || "Authentication failed. Please verify credentials.");
          toast.error("Sign in failed", { description: res.error });
        } else {
          toast.success(`Welcome back, ${username}!`, {
            description: "Access granted to EdgeWear CNC telemetry & prediction engine.",
          });
          if (onSuccess) onSuccess();
        }
      } else {
        // Sign Up
        if (!username.trim() || username.trim().length < 3) {
          setErrorMsg("User Name must be at least 3 characters.");
          setIsLoading(false);
          return;
        }
        if (!email.trim() || !email.includes("@") || !email.includes(".")) {
          setErrorMsg("Please enter a valid Mail ID.");
          setIsLoading(false);
          return;
        }
        if (!password || password.length < 8) {
          setErrorMsg("Password must be at least 8 characters.");
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg("Passwords do not match. Please re-enter.");
          setIsLoading(false);
          return;
        }

        const res = await signUp({ username, email, password, role, rememberSession: rememberMe });
        if (!res.success) {
          setErrorMsg(res.error || "Registration failed.");
          toast.error("Registration error", { description: res.error });
        } else {
          toast.success(`Account registered for ${username}!`, {
            description: "Signed in automatically. Initializing tool wear workspace...",
          });
          if (onSuccess) onSuccess();
        }
      }
    } catch (error) {
      console.error("Unexpected EdgeWear authentication error", error);
      setErrorMsg("An unexpected error occurred during authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (newPassword.length < 8) {
      setErrorMsg("Your new password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg("New passwords do not match. Please re-enter them.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPassword({
        username,
        email,
        newPassword,
      });
      if (!result.success) {
        setErrorMsg(result.error ?? "Unable to reset your password.");
        toast.error("Password reset failed", { description: result.error });
        return;
      }
      setIsPasswordReset(false);
      setNewPassword("");
      setConfirmNewPassword("");
      setPassword("");
      setMode("signin");
      toast.success("Password updated", {
        description: "Your new password is saved. Sign in to continue.",
      });
    } catch (error) {
      console.error("Unexpected EdgeWear password reset error", error);
      setErrorMsg("Unable to reset your password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center relative overflow-hidden selection:bg-primary/30">
      {/* Background blueprint grid styling */}
      <div className="grid-blueprint absolute inset-0 opacity-40 pointer-events-none" />

      {/* Ambient glowing radial effects */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-accent/20 blur-3xl pointer-events-none" />

      {/* Top micro-bar */}
      <div className="w-full border-b border-border/60 bg-background/70 backdrop-blur-md px-6 py-3.5 fixed top-0 left-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Cog className="h-5 w-5 animate-[spin_12s_linear_infinite]" />
            </span>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight leading-none text-foreground flex items-center gap-1.5">
                EdgeWear{" "}
                <span className="text-xs font-mono-data px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                  v2.4
                </span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono-data">
                CNC Condition Monitoring Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono-data text-muted-foreground bg-card/80 border border-border px-3 py-1.5 rounded-full">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span>GATEWAY ONLINE</span>
              <span className="text-border">|</span>
              <span>1 kHz SENSORS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Authentication Container */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-24 sm:py-28 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Industrial Machine Overview & Trust Badges */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs text-primary font-mono-data w-fit">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>OPERATOR SECURITY GATEWAY</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                Machinist & Fleet <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-amber-300 to-amber-500">
                  Authentication
                </span>
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Log into EdgeWear to access real-time tool wear prediction, sensor telemetry
                analytics, and remaining useful life (RUL) monitoring for your CNC machining
                centers.
              </p>
            </div>

            {/* Industrial features highlight cards */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border/80 bg-card/60 backdrop-blur">
                <div className="p-2 rounded-md bg-primary/15 text-primary shrink-0">
                  <Gauge className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-foreground">
                    Flank Wear (VB) Estimation
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sub-millimeter flank wear tracking within ±0.02 mm error.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border border-border/80 bg-card/60 backdrop-blur">
                <div className="p-2 rounded-md bg-primary/15 text-primary shrink-0">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-foreground">
                    Shop-Floor Edge Intelligence
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Low-latency ML inference runs directly at the machine gateway.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border border-border/80 bg-card/60 backdrop-blur">
                <div className="p-2 rounded-md bg-primary/15 text-primary shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-foreground">AI Machining Copilot</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Automated cutting parameter optimization and scrap reduction.
                  </p>
                </div>
              </div>
            </div>

            {/* ISO compliance tag */}
            <div className="font-mono-data text-[11px] text-muted-foreground flex items-center gap-2 pt-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              <span>Compliant with ISO 3685 Tool-Life Testing Standards</span>
            </div>
          </div>

          {/* Right Column: Sign In & Sign Up Interactive Portal Card */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl p-6 sm:p-8 relative transition-all">
              {/* Segmented Option Selector: Sign In vs Sign Up */}
              <div className="mb-6">
                <div className="grid grid-cols-2 p-1 bg-secondary/80 rounded-xl border border-border/60">
                  <button
                    type="button"
                    id="btn-tab-signin"
                    onClick={() => {
                      setMode("signin");
                      setIsPasswordReset(false);
                      setErrorMsg(null);
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                      mode === "signin"
                        ? "bg-primary text-primary-foreground shadow-md font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Sign In</span>
                  </button>

                  <button
                    type="button"
                    id="btn-tab-signup"
                    onClick={() => {
                      setMode("signup");
                      setIsPasswordReset(false);
                      setErrorMsg(null);
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                      mode === "signup"
                        ? "bg-primary text-primary-foreground shadow-md font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Sign Up</span>
                  </button>
                </div>
              </div>

              {/* Header title for current form */}
              <div className="mb-6">
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  {isPasswordReset ? (
                    <span>Reset Password</span>
                  ) : mode === "signin" ? (
                    <>
                      <span>Operator Sign In</span>
                      <span className="text-xs font-mono-data font-normal text-primary border border-primary/30 px-2 py-0.5 rounded bg-primary/10">
                        CREDENTIALS
                      </span>
                    </>
                  ) : (
                    <>
                      <span>Register New Operator</span>
                      <span className="text-xs font-mono-data font-normal text-primary border border-primary/30 px-2 py-0.5 rounded bg-primary/10">
                        NEW ACCOUNT
                      </span>
                    </>
                  )}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {isPasswordReset
                    ? "Enter your account username and email, then choose a new password."
                    : mode === "signin"
                      ? "Enter your User Name, Mail ID, and Password to authenticate to your home page."
                      : "Create an operator profile with User Name, Mail ID, and Password to access the fleet."}
                </p>
              </div>

              {/* Error Alert if any */}
              {(errorMsg || authError) && (
                <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{errorMsg ?? authError}</span>
                </div>
              )}
              {/* The Form */}
              <form
                onSubmit={isPasswordReset ? handleResetPassword : handleSubmit}
                className="space-y-4"
              >
                {/* 1. User Name Input */}
                <div>
                  <label
                    htmlFor="auth-username"
                    className="block text-xs font-medium text-foreground mb-1.5"
                  >
                    User Name <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      id="auth-username"
                      type="text"
                      required
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={mode === "signin" ? "e.g. machinist_pro" : "e.g. sarah_connor"}
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                    />
                  </div>
                </div>

                {/* 2. Mail ID Input */}
                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-medium text-foreground mb-1.5"
                  >
                    Mail ID (Email Address) <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="auth-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. operator@edgewear.ai"
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                    />
                  </div>
                </div>

                {!isPasswordReset && (
                  <>
                    {/* 3. Password Input */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label
                          htmlFor="auth-password"
                          className="block text-xs font-medium text-foreground"
                        >
                          Password <span className="text-primary">*</span>
                        </label>
                        {mode === "signin" && (
                          <button
                            type="button"
                            onClick={() => {
                              setErrorMsg(null);
                              setIsPasswordReset(true);
                              setNewPassword("");
                              setConfirmNewPassword("");
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            Reset password
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                          <Lock className="h-4 w-4" />
                        </div>
                        <input
                          id="auth-password"
                          type={showPassword ? "text" : "password"}
                          required
                          autoComplete={mode === "signin" ? "current-password" : "new-password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {isPasswordReset && (
                  <>
                    <div>
                      <label
                        htmlFor="reset-new-password"
                        className="mb-1.5 block text-xs font-medium text-foreground"
                      >
                        New password <span className="text-primary">*</span>
                      </label>
                      <input
                        id="reset-new-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={256}
                        required
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="reset-confirm-password"
                        className="mb-1.5 block text-xs font-medium text-foreground"
                      >
                        Confirm new password <span className="text-primary">*</span>
                      </label>
                      <input
                        id="reset-confirm-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={256}
                        required
                        value={confirmNewPassword}
                        onChange={(event) => setConfirmNewPassword(event.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                )}

                {/* 4. Extra fields for Sign Up mode */}
                {!isPasswordReset && mode === "signup" && (
                  <>
                    {/* Confirm Password */}
                    <div>
                      <label
                        htmlFor="auth-confirm-password"
                        className="block text-xs font-medium text-foreground mb-1.5"
                      >
                        Confirm Password <span className="text-primary">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                          <Lock className="h-4 w-4" />
                        </div>
                        <input
                          id="auth-confirm-password"
                          type={showPassword ? "text" : "password"}
                          required
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                        />
                      </div>
                    </div>

                    {/* Operator Role */}
                    <div>
                      <label
                        htmlFor="auth-role"
                        className="block text-xs font-medium text-foreground mb-1.5"
                      >
                        Shop Floor Clearance / Role
                      </label>
                      <select
                        id="auth-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
                      >
                        <option value="Lead CNC Machinist">Lead CNC Machinist</option>
                        <option value="Tooling Engineer">Tooling Engineer</option>
                        <option value="Shop Floor Supervisor">Shop Floor Supervisor</option>
                        <option value="Maintenance Technician">Maintenance Technician</option>
                        <option value="Quality Assurance Specialist">
                          Quality Assurance Specialist
                        </option>
                      </select>
                    </div>
                  </>
                )}

                {/* Remember Me / Session options */}
                {!isPasswordReset && (
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-border text-primary accent-[oklch(0.78_0.16_75)] focus:ring-primary h-3.5 w-3.5"
                      />
                      <span>Keep operator session active on this machine</span>
                    </label>
                  </div>
                )}

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  id="auth-submit-button"
                  className="w-full glow-amber mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary py-3 px-4 text-sm font-semibold text-primary-foreground transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-lg"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Cog className="h-4 w-4 animate-spin" />
                      <span>
                        {isPasswordReset
                          ? "Updating Password..."
                          : mode === "signin"
                            ? "Authenticating Operator..."
                            : "Creating Account..."}
                      </span>
                    </div>
                  ) : (
                    <>
                      <span>
                        {isPasswordReset
                          ? "Reset Password"
                          : mode === "signin"
                            ? "Sign In & Enter Dashboard"
                            : "Register & Authenticate"}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                {isPasswordReset && (
                  <div className="flex items-center justify-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPasswordReset(false);
                        setErrorMsg(null);
                      }}
                      className="text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Back to sign in
                    </button>
                  </div>
                )}
              </form>

              {/* Demo Quick Fill & Mode Switch Footnotes */}
              <div className="mt-6 pt-5 border-t border-border/80 flex flex-col gap-3">
                {!isPasswordReset && mode === "signin" ? (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      Don't have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("signup");
                          setErrorMsg(null);
                        }}
                        className="text-primary font-medium hover:underline"
                      >
                        Sign Up now
                      </button>
                    </p>
                  </div>
                ) : !isPasswordReset ? (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      Already registered?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("signin");
                          setErrorMsg(null);
                        }}
                        className="text-primary font-medium hover:underline"
                      >
                        Switch to Sign In
                      </button>
                    </p>
                  </div>
                ) : null}
                <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                  Your account is stored securely in the EdgeWear database. Passwords are never
                  stored as plain text.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer disclaimer */}
      <div className="relative z-10 w-full border-t border-border/60 py-4 text-center text-xs text-muted-foreground bg-background/50">
        <p className="font-mono-data">
          EdgeWear Secure Gateway · Edge Inference Latency &lt;50ms · ISO 3685 Standard
        </p>
      </div>
    </div>
  );
}
