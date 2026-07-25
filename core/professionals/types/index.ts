export interface Professional {
  id: string;
  organizationId: string;
  displayName: string;
  specialties: string[];
  license?: string;
  phone?: string;
  email?: string;
  calendarColor?: string;
  userId?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface WorkingHours {
  id: string;
  organizationId: string;
  professionalId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
  createdAt: Date;
}

export interface CreateProfessionalInput {
  displayName: string;
  specialties?: string[];
  license?: string;
  phone?: string;
  email?: string;
  calendarColor?: string;
  userId?: string;
}

export interface UpdateProfessionalInput {
  displayName?: string;
  specialties?: string[];
  license?: string;
  phone?: string;
  email?: string;
  calendarColor?: string;
  userId?: string;
}

export interface ProfessionalFilters {
  search?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PaginatedProfessionals {
  data: Professional[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateWorkingHoursInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active?: boolean;
}

export interface UpdateWorkingHoursInput {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  active?: boolean;
}
