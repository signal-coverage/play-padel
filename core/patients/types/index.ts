export type PatientStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
export type DocumentType = "DNI" | "PASSPORT" | "CUIL" | "OTHER";

export interface PatientAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface InsuranceInfo {
  provider?: string;
  policyNumber?: string;
  groupNumber?: string;
  holderName?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface Patient {
  id: string;
  organizationId: string;
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthDate?: Date;
  gender?: Gender;
  phone?: string;
  email?: string;
  address?: PatientAddress;
  insurance?: InsuranceInfo;
  emergencyContact?: EmergencyContact;
  tags: string[];
  notes?: string;
  status: PatientStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface PatientFilters {
  search?: string;
  status?: PatientStatus;
  page?: number;
  pageSize?: number;
}

export interface PaginatedPatients {
  data: Patient[];
  total: number;
  page: number;
  pageSize: number;
}
