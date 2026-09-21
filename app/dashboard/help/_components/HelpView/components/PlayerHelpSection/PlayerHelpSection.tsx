"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PLAYER_HELP_ITEM_KEYS } from "./consts";

export function PlayerHelpSection() {
  const t = useTranslations("PlayerHelpSection");

  return (
    <Card className="shrink-0">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {PLAYER_HELP_ITEM_KEYS.map((key) => (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger>{t(`items.${key}.title`)}</AccordionTrigger>
              <AccordionContent>
                {key === "browsing"
                  ? t.rich("items.browsing.body", {
                      link: (chunks) => (
                        <Link href="/dashboard/browse">{chunks}</Link>
                      ),
                    })
                  : t(`items.${key}.body`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
