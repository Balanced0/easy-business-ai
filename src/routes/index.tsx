import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BarChart3, Database, MessageSquare, PackageSearch, ScanLine, Upload } from "lucide-react";
import { useLanguage, useT } from "@/hooks/use-language";

function LanguageToggle() {
  const { lang, toggleLang } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLang}
      className="inline-flex min-h-10 items-center rounded-md border border-border bg-card p-1 text-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label="Switch language"
    >
      <span
        className={
          lang === "bn"
            ? "rounded-sm bg-primary px-2.5 py-1 text-primary-foreground"
            : "px-2.5 py-1 text-muted-foreground"
        }
      >
        বাং
      </span>
      <span
        className={
          lang === "en"
            ? "rounded-sm bg-primary px-2.5 py-1 text-primary-foreground"
            : "px-2.5 py-1 text-muted-foreground"
        }
      >
        En
      </span>
    </button>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EasyBusiness AI | Commerce workspace for small business teams" },
      {
        name: "description",
        content:
          "A bilingual commerce workspace for small business owners in Bangladesh who need clear inventory, customer, and sales decisions.",
      },
      { property: "og:title", content: "EasyBusiness AI | Clearer commerce decisions" },
      {
        property: "og:description",
        content: "A bilingual commerce workspace for small business owners in Bangladesh.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { lang } = useLanguage();
  const t = useT();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3"
            aria-label="EasyBusiness AI home"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BarChart3 className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-lg font-semibold leading-none">
                ইজিবিজনেস
              </span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                EasyBusiness AI
              </span>
            </span>
          </Link>

          <nav
            className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex"
            aria-label="Primary navigation"
          >
            <a href="#workspace" className="transition-colors hover:text-foreground">
              {t("ওয়ার্কস্পেস / Workspace")}
            </a>
            <a href="#flow" className="transition-colors hover:text-foreground">
              {t("শুরু করার পথ / Getting started")}
            </a>
            <Link to="/about" className="transition-colors hover:text-foreground">
              {t("সম্পর্কে / About")}
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageToggle />
            <Button asChild className="hidden sm:inline-flex">
              <Link to="/dashboard" search={{ q: undefined, t: undefined }}>
                {t("ওয়ার্কস্পেস খুলুন / Open workspace")}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(28rem,1.05fr)] lg:items-center lg:gap-16 lg:px-8 lg:py-24">
          <div>
            <p className="text-sm font-medium text-primary">
              {t("ব্যবসার কাজ, পরিষ্কারভাবে / Business work, made clearer")}
            </p>
            <h1 className="mt-5 max-w-xl font-display text-4xl font-semibold leading-tight text-balance sm:text-5xl lg:text-6xl">
              {lang === "bn"
                ? "কোন পণ্য দেখবেন, কখন আবার কিনবেন, আর কী প্রশ্ন করবেন, সব এক জায়গায়।"
                : "Know what to check, what to reorder, and what to ask next."}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {lang === "bn"
                ? "ইজিবিজনেস আপনার স্টোরের তথ্যকে এমন একটি কাজের তালিকায় আনে, যা ব্যবসার মালিক নিজেই পড়তে ও ব্যবহার করতে পারেন।"
                : "EasyBusiness brings store information into a working view that an owner can read, question, and use."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/dashboard" search={{ q: undefined, t: undefined }}>
                  {t("ডেমো ওয়ার্কস্পেস দেখুন / View demo workspace")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#flow">{t("ডেটা কীভাবে আসে দেখুন / See how data enters")}</a>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="font-display text-xl font-semibold">
                  {t("আজকের ওয়ার্কস্পেস / Today’s workspace")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("নমুনা অবস্থা / Sample state")}
                </p>
              </div>
              <span className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">
                {t("শুরু করুন / Start here")}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <WorkspaceRow
                icon={Upload}
                title={t("বিক্রয় ফাইল যোগ করুন / Add a sales file")}
                detail={t("CSV বা এক্সপোর্ট দিয়ে শুরু করুন / Start with a CSV or store export")}
                to="/upload"
              />
              <WorkspaceRow
                icon={ScanLine}
                title={t("হাতের লেখা নোট স্ক্যান করুন / Scan handwritten notes")}
                detail={t("খাতার তথ্য পর্যালোচনার জন্য পাঠান / Send notebook data for review")}
                to="/scan"
              />
              <WorkspaceRow
                icon={MessageSquare}
                title={t("একটি ব্যবসার প্রশ্ন করুন / Ask a business question")}
                detail={t(
                  "প্রাসঙ্গিক তথ্য দিয়ে উত্তর পড়ুন / Read an answer with relevant context",
                )}
                to="/assistant"
              />
            </div>
          </div>
        </section>

        <section id="workspace" className="border-y border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[minmax(16rem,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
              <div>
                <p className="text-sm font-medium text-primary">
                  {t("একটি কাজের দৃশ্য / One working view")}
                </p>
                <h2 className="mt-4 max-w-md font-display text-3xl font-semibold leading-tight text-balance sm:text-4xl">
                  {lang === "bn"
                    ? "ড্যাশবোর্ড সাজানো থাকে আপনার পরের সিদ্ধান্তকে ঘিরে।"
                    : "The workspace is arranged around the decision you need to make next."}
                </h2>
              </div>
              <div className="grid gap-0 divide-y divide-border border-y border-border">
                <Capability
                  icon={PackageSearch}
                  title={t("ইনভেন্টরি দেখুন / Review inventory")}
                  detail={t(
                    "কম স্টক, অতিরিক্ত স্টক, এবং SKU অনুযায়ী তথ্য একটি পড়ার মতো তালিকায় রাখুন। / Keep low-stock, overstock, and SKU information in one readable list.",
                  )}
                />
                <Capability
                  icon={Database}
                  title={t("স্টোর ডেটা সংগঠিত করুন / Organize store data")}
                  detail={t(
                    "ফাইল, স্ক্যান, ও সংযুক্ত উৎস থেকে আসা তথ্য একই ওয়ার্কস্পেসে পর্যালোচনা করুন। / Review files, scans, and connected sources in the same workspace.",
                  )}
                />
                <Capability
                  icon={MessageSquare}
                  title={t("প্রশ্ন থেকে কাজ ঠিক করুন / Turn questions into next steps")}
                  detail={t(
                    "সহকারীকে ব্যবসার ভাষায় প্রশ্ন করুন, তারপর প্রাসঙ্গিক তথ্য দেখে সিদ্ধান্ত নিন। / Ask in business language, then decide from the relevant context.",
                  )}
                />
              </div>
            </div>
          </div>
        </section>

        <section id="flow" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:gap-16">
            <div className="rounded-xl bg-secondary p-6 sm:p-8">
              <p className="text-sm font-medium text-primary">
                {t("যেখান থেকে আছেন / Start where you are")}
              </p>
              <h2 className="mt-4 max-w-xl font-display text-3xl font-semibold leading-tight text-balance sm:text-4xl">
                {lang === "bn"
                  ? "নিখুঁত ডেটা না থাকলেও শুরু করা যায়।"
                  : "You can begin before your data is perfect."}
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-secondary-foreground/80">
                {lang === "bn"
                  ? "একটি এক্সপোর্ট ফাইল, খাতার ছবি, বা একটি প্রশ্ন দিয়ে শুরু করুন। আপনার ব্যবসার তথ্য যে অবস্থায় আছে, সেখান থেকেই কাজ এগোবে।"
                  : "Start with an export file, a notebook photo, or a question. The workspace meets your business information where it is."}
              </p>
              <Button
                asChild
                variant="secondary"
                className="mt-8 bg-background text-foreground hover:bg-card"
              >
                <Link to="/upload">{t("ডেটা যোগ করার পথ খুলুন / Open data upload")}</Link>
              </Button>
            </div>

            <ol className="divide-y divide-border border-y border-border">
              <FlowStep
                title={t("আপনার কাছে যা আছে তা যোগ করুন / Add what you already have")}
                detail={t("ফাইল আপলোড করুন বা একটি স্ক্যান পাঠান। / Upload a file or send a scan.")}
              />
              <FlowStep
                title={t("পর্যালোচনার জন্য প্রস্তুত করুন / Prepare it for review")}
                detail={t(
                  "প্রতিটি উৎসের অবস্থা স্পষ্টভাবে দেখুন। / See the state of each source clearly.",
                )}
              />
              <FlowStep
                title={t("প্রশ্ন করুন এবং পরের কাজটি নিন / Ask, then take the next action")}
                detail={t(
                  "ওয়ার্কস্পেস থেকে সহকারী বা প্রাসঙ্গিক তালিকায় যান। / Move from the workspace to the assistant or a relevant list.",
                )}
              />
            </ol>
          </div>
        </section>

        <section className="border-t border-border bg-foreground text-background">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end lg:px-8 lg:py-20">
            <div>
              <p className="text-sm font-medium text-primary">
                {t("প্রস্তুত হলে / When you are ready")}
              </p>
              <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold leading-tight text-balance sm:text-4xl">
                {lang === "bn"
                  ? "আপনার স্টোরের পরের সিদ্ধান্তটি পরিষ্কার করে নিন।"
                  : "Make the next store decision clearer."}
              </h2>
            </div>
            <Button
              asChild
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link to="/dashboard" search={{ q: undefined, t: undefined }}>
                {t("ওয়ার্কস্পেস খুলুন / Open workspace")}
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <span>© {new Date().getFullYear()} EasyBusiness AI</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/about" className="hover:text-foreground">
              {t("সম্পর্কে / About")}
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              {t("গোপনীয়তা / Privacy")}
            </Link>
            <Link to="/pricing" className="hover:text-foreground">
              {t("মূল্য / Pricing")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function WorkspaceRow({
  icon: Icon,
  title,
  detail,
  to,
}: {
  icon: typeof Upload;
  title: string;
  detail: string;
  to: "/upload" | "/scan" | "/assistant";
}) {
  const linkProps =
    to === "/assistant"
      ? { to: "/assistant" as const, search: { q: undefined, t: undefined } }
      : { to };

  return (
    <Link
      {...linkProps}
      className="group flex items-start gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-foreground group-hover:text-primary">{title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{detail}</span>
      </span>
    </Link>
  );
}

function Capability({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof Upload;
  title: string;
  detail: string;
}) {
  return (
    <article className="grid gap-4 py-6 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-5">
      <span className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <h3 className="font-display text-xl font-semibold">{title}</h3>
        <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">{detail}</p>
      </div>
    </article>
  );
}

function FlowStep({ title, detail }: { title: string; detail: string }) {
  return (
    <li className="py-6 first:pt-6 last:pb-6">
      <p className="font-display text-xl font-semibold">{title}</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">{detail}</p>
    </li>
  );
}
