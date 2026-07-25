import type { PatientSheetProps, PatientFormValues } from "./types";

export function getInitialValues(
  patient?: PatientSheetProps["patient"],
): Partial<PatientFormValues> {
  if (!patient) {
    return {
      firstName: "",
      lastName: "",
      documentNumber: "",
      gender: "",
      birthDate: "",
      phone: "",
      email: "",
      notes: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelationship: "",
      insuranceProvider: "",
      insurancePolicyNumber: "",
    };
  }
  return {
    firstName: patient.firstName,
    lastName: patient.lastName,
    documentType: patient.documentType as PatientFormValues["documentType"],
    documentNumber: patient.documentNumber,
    gender: (patient.gender as PatientFormValues["gender"]) ?? "",
    birthDate: patient.birthDate
      ? patient.birthDate.toISOString().split("T")[0]
      : "",
    phone: patient.phone ?? "",
    email: patient.email ?? "",
    notes: patient.notes ?? "",
    emergencyContactName: patient.emergencyContact?.name ?? "",
    emergencyContactPhone: patient.emergencyContact?.phone ?? "",
    emergencyContactRelationship: patient.emergencyContact?.relationship ?? "",
    insuranceProvider: patient.insurance?.provider ?? "",
    insurancePolicyNumber: patient.insurance?.policyNumber ?? "",
  };
}
