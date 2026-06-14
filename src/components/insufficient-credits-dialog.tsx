import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { useCredits } from "@/hooks/use-credits";
import { useT } from "@/hooks/use-language";

export function InsufficientCreditsDialog() {
  const { outOfCreditsOpen, hideOutOfCredits, lastInsufficient } = useCredits();
  const t = useT();
  const cost = lastInsufficient?.cost ?? 1;

  return (
    <Dialog open={outOfCreditsOpen} onOpenChange={(o) => !o && hideOutOfCredits()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            {t("আপনার এআই ক্রেডিট শেষ / You're out of AI credits")}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t(
              `এই অ্যাকশনের জন্য ${cost} ক্রেডিট দরকার, কিন্তু আপনার পর্যাপ্ত ক্রেডিট নেই। প্রতি মাসে ১০০টি ফ্রি ক্রেডিট পান, অথবা টপ-আপ কিনুন, অথবা Profile থেকে নিজের Gemini API key যোগ করুন — তাহলে আনলিমিটেড AI চলবে। / This action needs ${cost} credit${cost === 1 ? "" : "s"}, but you don't have enough. You get 100 free credits each month, buy a top-up, OR add your own Gemini key on Profile to get unlimited AI for free.`,
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={hideOutOfCredits} className="sm:flex-1">
            {t("পরে / Later")}
          </Button>
          <Button asChild variant="outline" className="sm:flex-1" onClick={hideOutOfCredits}>
            <Link to="/profile">{t("নিজের Key যোগ করুন / Use my own key")}</Link>
          </Button>
          <Button asChild className="sm:flex-1" onClick={hideOutOfCredits}>
            <Link to="/billing">{t("ক্রেডিট কিনুন / Buy credits")}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
