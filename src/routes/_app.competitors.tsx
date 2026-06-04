import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Info } from "lucide-react";
import { useT } from "@/hooks/use-language";

export const Route = createFileRoute("/_app/competitors")({
  head: () => ({ meta: [{ title: "প্রতিযোগী / Competitors — EasyBusiness AI" }] }),
  component: CompetitorsPage,
});

function CompetitorsPage() {
  const t = useT();
  return (
    <>
      <DashboardTopbar title="প্রতিযোগী ইন্টেলিজেন্স / Competitor Intelligence" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <Card className="border-warning/40 bg-warning/[0.04]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <CardTitle className="text-base">{t("প্রতিযোগী ডেটা উপলব্ধ নয় / Competitor data not available")}</CardTitle>
            </div>
            <CardDescription>
              {t("প্রতিযোগী মূল্য বা ক্যাটাগরি ইনসাইট তৈরি করতে আপনার নিজস্ব পণ্য ও মূল্য আপলোড করুন। ভবিষ্যতে প্রতিযোগী স্ক্রেপিং যুক্ত করা হবে। / Upload your own products and pricing to build competitor insights. Competitor scraping will be added in a future release.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link to="/upload">
                <Upload className="mr-1 h-3.5 w-3.5" />
                {t("পণ্য আপলোড / Upload products")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
