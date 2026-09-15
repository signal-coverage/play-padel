"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ACCOUNT_LANGUAGE_HELP_ITEM_KEYS } from "./consts";

export function AccountLanguageHelpSection() {
  const t = useTranslations("AccountLanguageHelpSection");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {ACCOUNT_LANGUAGE_HELP_ITEM_KEYS.map((key) => (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger>{t(`items.${key}.title`)}</AccordionTrigger>
              <AccordionContent>{t(`items.${key}.body`)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
