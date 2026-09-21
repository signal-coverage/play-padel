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
import { OWNER_HELP_ITEM_KEYS, OWNER_HELP_ITEM_LINKS } from "./consts";

export function OwnerHelpSection() {
  const t = useTranslations("OwnerHelpSection");

  return (
    <Card className="shrink-0">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {OWNER_HELP_ITEM_KEYS.map((key) => {
            const links = OWNER_HELP_ITEM_LINKS[key];

            return (
              <AccordionItem key={key} value={key}>
                <AccordionTrigger>{t(`items.${key}.title`)}</AccordionTrigger>
                <AccordionContent>
                  {links
                    ? t.rich(
                        `items.${key}.body`,
                        Object.fromEntries(
                          Object.entries(links).map(([tag, href]) => [
                            tag,
                            (chunks: React.ReactNode) => (
                              <Link href={href}>{chunks}</Link>
                            ),
                          ]),
                        ),
                      )
                    : t(`items.${key}.body`)}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
