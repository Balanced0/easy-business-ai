import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "লগইন / Sign in: EasyBusiness AI" }] }),
  component: LoginPage,
});

function LoginPage() {
  const t = useT();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", search: { q: undefined, t: undefined } });
  }, [user, loading, navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else navigate({ to: "/dashboard", search: { q: undefined, t: undefined } });
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) {
      setBusy(false);
      toast.error(result.error.message || "Google sign-in failed");
    }
  };

  return (
    <AuthShell
      eyebrow={t("ওয়ার্কস্পেসে ফিরে আসুন / Return to your workspace")}
      title={t(
        "আপনার ব্যবসার পরের সিদ্ধান্তটি কোথায় আছে, দেখুন। / See where your next business decision is waiting.",
      )}
      description={t(
        "ইনভেন্টরি, গ্রাহক এবং বিক্রয় তথ্য এক জায়গায় রাখুন। / Keep inventory, customer, and sales information in one place.",
      )}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{t("লগইন করুন / Sign in")}</CardTitle>
          <CardDescription>
            {t("আপনার ব্যবসার ড্যাশবোর্ডে প্রবেশ করুন / Access your business dashboard")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
            {t("Google দিয়ে চালিয়ে যান / Continue with Google")}
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">{t("অথবা / or")}</span>
            </div>
          </div>
          <form onSubmit={handleEmail} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">{t("ইমেইল / Email")}</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">{t("পাসওয়ার্ড / Password")}</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {t("লগইন / Sign in")}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            {t("অ্যাকাউন্ট নেই? / No account?")}{" "}
            <Link to="/signup" className="text-primary hover:underline">
              {t("সাইন আপ / Sign up")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
