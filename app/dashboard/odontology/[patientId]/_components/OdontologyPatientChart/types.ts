import type { SerializedOdontogramState } from "odonto-next";
import type {
  ConsultationRecord,
  TreatmentRecord,
} from "@/app/actions/odontology";

export interface NextAppointmentInfo {
  id: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  reason: string | null;
  professionalName: string | null;
  status: string;
}

export interface VisitFormState {
  chiefComplaint: string;
  diagnosis: string;
  treatment: string;
  notes: string;
}

export interface TreatmentFormState {
  description: string;
  toothNumber: string;
  surface: string;
  price: string;
  notes: string;
}

export interface OdontologyPatientChartProps {
  patientId: string;
  initialOdontogramState: SerializedOdontogramState | null;
  consultations: ConsultationRecord[];
  treatments: TreatmentRecord[];
  nextAppointment: NextAppointmentInfo | null;
}
