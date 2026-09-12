// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useForm } from "react-hook-form";
import type { OnboardingFormValues } from "@/app/onboarding/types";
import { ClubBasicsStep } from "./ClubBasicsStep";

// Harness mirrors PhoneField.test.tsx's own convention: a bare useForm host
// wired up with just the fields ClubBasicsStep touches, so this test doesn't
// need the full OnboardingWizard (routing, Clerk auth, animation, etc.).
function Harness() {
  const {
    register,
    control,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    defaultValues: {
      userType: "owner",
      name: "",
      email: "",
      phone: "",
      whatsappNumber: "",
      whatsappCountry: "",
      address: "",
      country: "",
      province: "",
      city: "",
      zipCode: "",
      confirmedAge: false,
      acceptedTerms: false,
    },
  });

  return (
    <ClubBasicsStep
      register={register}
      control={control}
      errors={errors}
      shouldFocusHeading={false}
    />
  );
}

function renderClubBasicsStep() {
  return render(<Harness />);
}

describe("ClubBasicsStep", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a required WhatsApp field distinct from the general Phone field", () => {
    const { getByText } = renderClubBasicsStep();
    expect(getByText("Phone *")).toBeInTheDocument();
    expect(getByText("WhatsApp (for payment receipts) *")).toBeInTheDocument();
  });
});
