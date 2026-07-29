export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateEmail(email: string): string | null {
  if (!email) return "Email is required";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return "Invalid email format";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  return null;
}

export function validateName(name: string): string | null {
  if (!name) return "Name is required";
  if (name.length < 2) return "Name must be at least 2 characters";
  if (name.length > 50) return "Name must be less than 50 characters";
  return null;
}

export function validateConfirmPassword(password: string, confirmPassword: string): string | null {
  if (!confirmPassword) return "Please confirm your password";
  if (password !== confirmPassword) return "Passwords do not match";
  return null;
}

export function validateLoginForm(data: {
  email: string;
  password: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  const emailError = validateEmail(data.email);
  const passwordError = validatePassword(data.password);

  if (emailError) errors.email = emailError;
  if (passwordError) errors.password = passwordError;

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateRegisterForm(data: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  const nameError = validateName(data.name);
  const emailError = validateEmail(data.email);
  const passwordError = validatePassword(data.password);
  const confirmError = validateConfirmPassword(data.password, data.confirmPassword);

  if (nameError) errors.name = nameError;
  if (emailError) errors.email = emailError;
  if (passwordError) errors.password = passwordError;
  if (confirmError) errors.confirmPassword = confirmError;

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateResetPasswordForm(data: {
  email: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  const emailError = validateEmail(data.email);

  if (emailError) errors.email = emailError;

  return { valid: Object.keys(errors).length === 0, errors };
}
