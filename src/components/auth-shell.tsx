import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import { useT } from "@/hooks/use-language";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  const t = useT();

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100svh-2rem)] max-w-6xl overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1fr)] lg:min-h-[calc(100svh-4rem)]">
        <aside className="flex flex-col justify-between bg-foreground p-6 text-background sm:p-8 lg:p-10">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-3"
              aria-label="EasyBusiness AI home"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BarChart3 className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-display text-lg font-semibold leading-none">
                  ইজিবিজনেস
                </span>
                <span className="mt-1 block text-xs text-background/65">EasyBusiness AI</span>
              </span>
            </Link>
            <p className="mt-14 text-sm font-medium text-primary">{eyebrow}</p>
            <h1 className="mt-4 max-w-sm font-display text-3xl font-semibold leading-tight sm:text-4xl">
              {title}
            </h1>
            <p className="mt-5 max-w-sm leading-relaxed text-background/70">{description}</p>
          </div>
          <p className="mt-12 text-sm leading-relaxed text-background/60">
            {t(
              "ব্যবসার তথ্য, কাজের তালিকা, এবং প্রশ্ন করার জায়গা, একই ওয়ার্কস্পেসে। / Business data, working lists, and a place to ask questions, in one workspace.",
            )}
          </p>
        </aside>
        <main className="flex items-center justify-center p-5 sm:p-10 lg:p-14">{children}</main>
      </div>
    </div>
  );
}
