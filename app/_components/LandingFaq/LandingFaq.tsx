"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { FAQ_IDS, ease } from "./consts";
import { CONTAINER } from "@/lib/consts";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FaqTranslation {
  question: string;
  answer: string;
}

// Copy is grounded in the app's real feature set (booking/scheduling,
// Mercado Pago payments, court/club management, plan tiers, cancellations)
// but is placeholder example copy for the user to refine — see
// messages/*.json's LandingFaq namespace comment.
export function LandingFaq() {
  const t = useTranslations("LandingFaq");
  const shouldReduce = useReducedMotion();
  const items = t.raw("items") as FaqTranslation[];

  return (
    <section id="faq" className={`${CONTAINER} py-12`}>
      <motion.div
        className="flex flex-col items-center text-center gap-3 mb-10"
        initial={shouldReduce ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease }}
      >
        <h2 className="text-3xl md:text-[38px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground">
          {t("heading")}
        </h2>
        <p className="max-w-lg text-sm text-muted-foreground leading-relaxed text-pretty">
          {t("subheading")}
        </p>
      </motion.div>

      <motion.div
        className="max-w-2xl mx-auto rounded-sm border border-border px-6"
        initial={shouldReduce ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.08, ease }}
      >
        <Accordion type="single" collapsible>
          {FAQ_IDS.map((id, i) => (
            <AccordionItem key={id} value={id}>
              <AccordionTrigger className="text-[15px] font-semibold text-foreground py-5">
                {items[i].question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed text-pretty">
                {items[i].answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </section>
  );
}
