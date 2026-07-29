export type UserRole = 'student' | 'admin' | 'support';

export interface User {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationId?: string;
  department?: string;
  enrollmentYear?: number;
  courseOfStudy?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  cognitoSub: string;
  preferences?: {
    language?: string;
    notifications?: boolean;
    theme?: 'light' | 'dark';
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  fullName: string;
  role: UserRole;
  organizationId?: string;
  department?: string;
  enrollmentYear?: number;
  courseOfStudy?: string;
  cognitoSub: string;
}

export interface UpdateUserInput {
  fullName?: string;
  department?: string;
  enrollmentYear?: number;
  courseOfStudy?: string;
  preferences?: User['preferences'];
  isActive?: boolean;
}
