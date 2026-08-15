# Legal & Compliance Audit

Internal reference only — not published anywhere in the app. Not legal advice; before acting on any draft clause below, have it reviewed by an Argentine attorney familiar with *derecho del consumidor* and Ley 25.326.

**Scope confirmed (2026-08-15):** legal entity and users both in Argentina, pre-launch (no real users yet), payments via Mercado Pago Checkout Pro (hosted redirect — card data never touches this app's servers, see `lib/mercadopago/preferences.ts`), web-only distribution (no App Store/Play Store), target 18+ signup gate.

## Data map (confirmed from code)

| Processor | Purpose | Data | Notes |
|---|---|---|---|
| Clerk | Auth | Email, name, OAuth profile photo | `imageUrl` from Clerk session, never uploaded directly (`app/api/onboarding/route.ts`) |
| Mercado Pago (Checkout Pro) | Payments | Reservation amount/ref | Local AR entity — lower cross-border risk than the others below |
| Neon Postgres / Prisma | Database | Name, email, phone, address, gender, padel category, side, dominant hand | See `prisma/schema.prisma` `UserProfile` model |
| Resend | Transactional email | Recipient email, notification content | `lib/email/resend.ts`, `lib/notifications/dispatcher.ts` |
| Vercel Analytics + Speed Insights | Usage/perf | Standard telemetry | No custom cookies set by app code |

No AI/ML usage, no file uploads, no Google Analytics/Meta Pixel/ad SDKs, no App Store distribution (Nutrition Labels / Data Safety don't apply).

## Known gaps

- **No real Terms of Service.** The only "terms" in the repo is a placeholder checkbox step (`app/onboarding/terms-content.ts`) explicitly marked *"placeholder text pending legal review"*, and it incorrectly states *"no payment is required to reserve a court"* — contradicts the live Mercado Pago integration.
- **No Privacy Policy at all.** Footer links to `/privacy` and `/terms` (`app/_components/LandingFooter/LandingFooter.tsx`) both 404 — no matching routes exist.
- **No AAIP database registration.** Ley 25.326 art. 21 requires any privately-held personal-data database to be registered with the Registro Nacional de Bases de Datos Personales (AAIP). Not done.
- **No cross-border-transfer consent language.** Clerk, Resend, Neon, and Vercel are foreign-headquartered providers (mostly US) — verify each account's actual data-residency setting. Under Ley 25.326 this requires informed consent since the US isn't on Argentina's adequate-country list.
- **No 18+ enforcement.** No DOB field, no age gate anywhere in signup/onboarding, despite that being the intended policy.
- **No club-content representation/takedown clause.** Club-logo field (`app/dashboard/settings/club/_components/ClubSettingsView/ClubSettingsView.tsx`) accepts an arbitrary pasted URL rendered as `<img src>` — no warranty that the submitter owns the image, no takedown contact.
- **No DPAs confirmed** with Clerk/Resend/Neon/Vercel.

## Correction to the "standard SaaS ToS" assumption

Mandatory binding arbitration + class-action waiver — the default in most US SaaS templates — is likely **unenforceable** against this app's player-users. They're "consumidores" under Ley 24.240, and Argentine consumer law (art. 45, plus CCyC rules on *contratos de consumo*) generally bars businesses from forcing binding arbitration on a consumer to block court access; arbitration must stay voluntary on the consumer's side. Importing a US-style clause wholesale risks it being voided as a *cláusula abusiva* (CCyC art. 988). Club owners acting in a commercial/professional capacity may fall outside the "consumidor" definition, opening room for a real arbitration clause in a separate club-owner agreement — but that split needs an attorney's read on the actual facts.

## Priority list

🔴 **Critical — before launch**
- Real Terms of Service (accurate payment description, Argentina-appropriate dispute clause — see draft below)
- Real Privacy Policy (processor table above + cross-border transfer consent — see draft below)
- Wire up `/terms` and `/privacy` routes so the footer links resolve
- 18+ signup gate

🟠 **High — before growth**
- AAIP database registration (Ley 25.326 art. 21)
- Confirm/request DPAs from Clerk, Resend, Neon, Vercel
- Club-logo representation clause + takedown contact

🟡 **Medium — recommended**
- Separate club-owner (B2B) terms addendum once there's real club-owner volume
- Explicit disclosure of Clerk/Vercel's own cookies in the Privacy Policy

🟢 **Low — future**
- Re-run the AI-disclosure check before adding any AI feature
- Revisit formal DMCA takedown process only if the app starts hosting user-uploaded files or expands outside Argentina

## Draft clause language

> **DRAFT FOR ATTORNEY REVIEW — NOT LEGAL ADVICE**

**Governing law & disputes:**
> These Terms are governed by the laws of Argentina. Any dispute shall be submitted to the ordinary courts of [city/jurisdiction], without prejudice to the consumer's right to access the Tribunal Arbitral de Consumo (COPREC) or any other consumer-protection forum available under Ley 24.240, participation in which shall always be optional for the consumer.

**International transfers (Privacy Policy):**
> Some of your personal data is processed by service providers located outside Argentina, including Clerk (USA), Resend (USA), and our hosting/database infrastructure. By using our services, you consent to this transfer, carried out solely for the purposes described in this policy. You may exercise your rights of access, rectification, and deletion (*derecho de acceso, rectificación y supresión*) under Ley 25.326 at any time by contacting [email].

**Club content:**
> By submitting a logo URL or other content, you represent that you own it or have the right to display it. We will remove any content in response to a good-faith written notice of infringement sent to [email].

## Official sources

- Ley 25.326 (data protection) & Ley 24.240 (consumer protection) — search by law number at infoleg.gob.ar
- AAIP (enforcement body + database registration) — argentina.gob.ar/aaip
- COPREC (consumer arbitration) — argentina.gob.ar/produccion/defensadelconsumidor
- U.S. Copyright Office DMCA (only relevant if expanding to US users or hosting files directly) — copyright.gov/dmca
