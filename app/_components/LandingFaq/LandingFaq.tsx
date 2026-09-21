import { getTranslations } from "next-intl/server";
import { FadeInSection } from "@/components/FadeInSection";
import { FAQ_IDS } from "./consts";
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
// messages/*.json's LandingFaq namespace comment. Accordion's
// open/collapse state lives inside Radix's own component, so this section
// needs no client state of its own and renders on the server.
export async function LandingFaq() {
  const t = await getTranslations("LandingFaq");
  const items = t.raw("items") as FaqTranslation[];

  return (
    <section id="faq" className={`${CONTAINER} py-12`}>
      <FadeInSection className="flex flex-col items-center text-center gap-3 mb-10">
        <h2 className="text-3xl md:text-[38px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground">
          {t("heading")}
        </h2>
        <p className="max-w-lg text-sm text-muted-foreground leading-relaxed text-pretty">
          {t("subheading")}
        </p>
      </FadeInSection>

      <FadeInSection
        className="max-w-2xl mx-auto rounded-sm border border-border px-6"
        delayMs={80}
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
      </FadeInSection>
    </section>
  );
}
