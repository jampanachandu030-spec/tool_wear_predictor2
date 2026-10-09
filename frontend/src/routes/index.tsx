import { createFileRoute } from "@tanstack/react-router";
import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  BrainCircuit,
  Cog,
  LineChart,
  RadioTower,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Wrench,
  Zap,
  LogOut,
  UserRound,
  Camera,
} from "lucide-react";
import heroImage from "@/assets/cnc-hero.jpg";
import { WearPredictor } from "@/components/WearPredictor";
import { WearChart } from "@/components/WearChart";
import { AiCustomerHub } from "@/components/AiCustomerHub";
import { AuthPage } from "@/components/AuthPage";
import { AuthProvider, useAuth, type UserProfile } from "@/context/AuthContext";
import { AiProvider } from "@/context/AiContext";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EdgeWear — CNC Tool Wear Prediction with Machine Learning" },
      {
        name: "description",
        content:
          "Predict CNC tool wear in real time with machine learning. Monitor flank wear, estimate remaining useful life, and schedule tool changes before scrap happens.",
      },
      {
        property: "og:title",
        content: "EdgeWear — CNC Tool Wear Prediction with Machine Learning",
      },
      {
        property: "og:description",
        content:
          "Real-time ML predictions of flank wear and remaining useful life for CNC milling and turning tools.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FEATURES = [
  {
    icon: RadioTower,
    title: "Live sensor fusion",
    text: "Streams vibration, acoustic emission, spindle current and cutting force straight from the machine at 1 kHz.",
  },
  {
    icon: BrainCircuit,
    title: "ML wear models",
    text: "Gradient-boosted and LSTM models trained on thousands of tool-life runs predict flank wear (VB) within ±0.02 mm.",
  },
  {
    icon: TimerReset,
    title: "Remaining useful life",
    text: "Every prediction ships with an RUL estimate so tool changes land in planned downtime, not mid-cut.",
  },
  {
    icon: ShieldCheck,
    title: "Scrap prevention",
    text: "Alerts fire before wear crosses the ISO 3685 limit, protecting surface finish and dimensional tolerance.",
  },
  {
    icon: LineChart,
    title: "Fleet analytics",
    text: "Compare wear curves across machines, materials and inserts to find the parameters that extend tool life.",
  },
  {
    icon: Zap,
    title: "Edge deployment",
    text: "Models run on the machine's edge gateway — predictions in under 50 ms, no cloud round-trip required.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Sense",
    text: "Accelerometers, AE sensors and power monitors capture the cutting signature on every pass.",
  },
  {
    n: "02",
    title: "Learn",
    text: "Features are extracted in the time and frequency domain and fed to models trained on labelled wear measurements.",
  },
  {
    n: "03",
    title: "Predict",
    text: "The model outputs current flank wear, a wear-rate trajectory and remaining useful life with confidence bounds.",
  },
  {
    n: "04",
    title: "Act",
    text: "Operators get a clear replace / monitor / healthy verdict, and the MES gets an automatic tool-change work order.",
  },
];

const STATS = [
  { value: "±0.02 mm", label: "Wear prediction error" },
  { value: "31%", label: "Average tool-life extension" },
  { value: "<50 ms", label: "Inference latency at the edge" },
  { value: "12k+", label: "Tool runs in training data" },
];

function Index() {
  return (
    <AuthProvider>
      <AiProvider>
        <IndexContent />
      </AiProvider>
    </AuthProvider>
  );
}

function IndexContent() {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  // Initial client hydration check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg animate-pulse mb-4">
          <Cog className="h-6 w-6 animate-spin" />
        </div>
        <p className="font-mono-data text-xs text-muted-foreground tracking-wider">
          INITIALIZING EDGEWEAR GATEWAY...
        </p>
      </div>
    );
  }

  function ProfileDialog({ user, onClose }: { user: UserProfile; onClose: () => void }) {
    const { updateProfile, changePassword } = useAuth();
    const [username, setUsername] = useState(user.username);
    const [email, setEmail] = useState(user.email);
    const [profilePhoto, setProfilePhoto] = useState<string | null>(user.profilePhoto ?? null);
    const [isSaving, setIsSaving] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error("Unsupported photo format", {
          description: "Choose a PNG, JPEG, or WebP image.",
        });
        return;
      }
      if (file.size > 1024 * 1024) {
        toast.error("Photo is too large", {
          description: "Choose an image smaller than 1 MB.",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") setProfilePhoto(reader.result);
      };
      reader.onerror = () => {
        toast.error("Could not read the selected photo");
      };
      reader.readAsDataURL(file);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSaving(true);
      const result = await updateProfile({ username, email, profilePhoto });
      setIsSaving(false);
      if (!result.success) {
        toast.error("Profile update failed", { description: result.error });
        return;
      }
      toast.success("Profile updated");
      onClose();
    };

    const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (newPassword.length < 8) {
        toast.error("New password must be at least 8 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("New passwords do not match.");
        return;
      }
      setIsChangingPassword(true);
      const result = await changePassword({ newPassword });
      setIsChangingPassword(false);
      if (!result.success) {
        toast.error("Password update failed", { description: result.error });
        return;
      }
      toast.success("Password updated. Please sign in again.");
      onClose();
    };

    return (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-dialog-title"
          className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8"
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 id="profile-dialog-title" className="text-2xl font-bold">
                Operator profile
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                View and update your account details.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close profile"
              className="rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              ×
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-muted-foreground">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound className="h-8 w-8" />
                )}
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="profile-photo"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
                >
                  <Camera className="h-4 w-4" />
                  Choose photo
                </label>
                <input
                  id="profile-photo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoChange}
                  className="sr-only"
                />
                <p className="text-xs text-muted-foreground">PNG, JPEG, or WebP · up to 1 MB</p>
                {profilePhoto && (
                  <button
                    type="button"
                    onClick={() => setProfilePhoto(null)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="profile-username" className="mb-1.5 block text-xs font-medium">
                User name
              </label>
              <input
                id="profile-username"
                required
                minLength={3}
                maxLength={40}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="profile-email" className="mb-1.5 block text-xs font-medium">
                Email address
              </label>
              <input
                id="profile-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="profile-role" className="mb-1.5 block text-xs font-medium">
                Shop floor role
              </label>
              <input
                id="profile-role"
                value={user.role}
                readOnly
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-muted-foreground"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Roles are managed by an administrator.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>
          <form
            onSubmit={handlePasswordChange}
            className="mt-6 space-y-4 border-t border-border pt-6"
          >
            <div>
              <h3 className="font-semibold">Change password</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose a new password. You will need to sign in again after it changes.
              </p>
            </div>
            <div>
              <label htmlFor="profile-new-password" className="mb-1.5 block text-xs font-medium">
                New password
              </label>
              <input
                id="profile-new-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label
                htmlFor="profile-confirm-password"
                className="mb-1.5 block text-xs font-medium"
              >
                Confirm new password
              </label>
              <input
                id="profile-confirm-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={isChangingPassword}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent disabled:opacity-50"
            >
              {isChangingPassword ? "Updating..." : "Update password"}
            </button>
          </form>
        </section>
      </div>
    );
  }

  // If unauthenticated, show the Sign In & Sign Up authentication page
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Authenticated: Render full CNC Tool Wear Dashboard
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="#top" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <Cog className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="text-lg font-semibold tracking-tight">EdgeWear</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#how" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#demo" className="transition-colors hover:text-foreground">
              Live demo
            </a>
            <a
              href="#ai-hub"
              className="transition-colors hover:text-foreground flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI Advisor & ROI
            </a>
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
          </nav>
          <div className="flex items-center gap-3">
            {/* Operator Status Badge */}
            <div className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-card/90 px-2.5 py-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <div className="flex flex-col">
                <span className="font-semibold text-foreground font-mono-data leading-none">
                  {user?.username}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono-data leading-tight">
                  {user?.email}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowProfile(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {user.profilePhoto ? (
                <img src={user.profilePhoto} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <UserRound className="h-3.5 w-3.5" />
              )}
              <span>Profile</span>
            </button>

            {/* Sign Out Action Button */}
            <button
              type="button"
              id="btn-sign-out"
              onClick={() => {
                void signOut().then((success) => {
                  if (success) {
                    toast.info("Signed out successfully", {
                      description: "Returned to EdgeWear authentication portal.",
                    });
                  } else {
                    toast.error("Sign out failed", {
                      description: "Your session is still active. Please try again.",
                    });
                  }
                });
              }}
              title="Sign out of current operator session"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>

            <a
              href="#ai-hub"
              className="hidden lg:inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI Copilot
            </a>
            <a
              href="#demo"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Try the predictor
            </a>
          </div>
        </div>
      </header>
      {showProfile && user && <ProfileDialog user={user} onClose={() => setShowProfile(false)} />}

      {/* Hero */}
      <section id="top" className="relative overflow-hidden">
        <div className="grid-blueprint absolute inset-0 opacity-60" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <p className="font-mono-data mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
              MACHINE LEARNING · CONDITION MONITORING
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Know your tool's wear before it costs you a part.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              EdgeWear predicts CNC tool flank wear and remaining useful life in real time — so you
              change inserts on evidence, not on guesswork.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#demo"
                className="glow-amber rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Run a live prediction
              </a>
              <a
                href="#ai-hub"
                className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-6 py-3 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <Sparkles className="h-4 w-4" />
                AI Machining Advisor
              </a>
              <a
                href="#how"
                className="rounded-md border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                See how it works
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-xl border border-border">
              <img
                src={heroImage}
                alt="CNC milling machine cutting steel with sparks and coolant"
                width={1920}
                height={1088}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="font-mono-data absolute -bottom-5 left-6 rounded-lg border border-border bg-card px-4 py-3 text-xs shadow-xl">
              <p className="text-muted-foreground">SPINDLE 04 · LIVE</p>
              <p className="mt-1 text-sm">
                VB <span className="text-primary font-semibold">0.183 mm</span>
                <span className="ml-3 text-success">RUL 74 min</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="border-y border-border bg-card/50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-10 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-mono-data text-3xl font-bold text-primary">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <p className="font-mono-data text-xs tracking-widest text-primary">PIPELINE</p>
        <h2 className="mt-2 text-3xl font-bold sm:text-4xl">From cutting signal to decision</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.n} className="rounded-xl border border-border bg-card p-6">
              <p className="font-mono-data text-sm text-primary">{step.n}</p>
              <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold">Wear progression across the fleet</h3>
              <p className="text-sm text-muted-foreground">
                Flank wear (VB) vs cutting time for three tools under different regimes.
              </p>
            </div>
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <WearChart />
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="border-y border-border bg-secondary/30">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className="font-mono-data text-xs tracking-widest text-primary">INTERACTIVE DEMO</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Predict tool wear yourself</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            This demo runs a physics-informed model in your browser. In production, the same
            interface is served by models trained on your machines' real sensor data.
          </p>
          <div className="mt-12">
            <WearPredictor />
          </div>
        </div>
      </section>

      {/* AI Machining Advisor & Customer Solutions Hub */}
      <AiCustomerHub />

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <p className="font-mono-data text-xs tracking-widest text-primary">CAPABILITIES</p>
        <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Built for the shop floor</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
            >
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="grid-blueprint mx-auto max-w-6xl px-6 py-24 text-center">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold sm:text-4xl">
            Stop scheduling tool changes on a calendar.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Deploy EdgeWear on one machine, prove the savings, then scale to the whole fleet.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="#demo"
              className="glow-amber inline-block rounded-md bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Start with the live demo
            </a>
            <a
              href="#ai-hub"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-8 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Consult AI Machining Advisor
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <span className="flex items-center gap-2">
            <Cog className="h-4 w-4 text-primary" /> EdgeWear — CNC tool wear prediction
          </span>
          <span className="font-mono-data text-xs">ISO 3685 · VB limit 0.30 mm</span>
        </div>
      </footer>
    </div>
  );
}
