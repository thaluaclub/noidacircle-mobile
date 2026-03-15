export const isValidEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

export const isValidUsername = (username: string): boolean => {
  const re = /^[a-zA-Z0-9_]{3,20}$/;
  return re.test(username);
};

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate login - accepts email OR username
 */
export const validateLogin = (identifier: string, password: string): ValidationError[] => {
  const errors: ValidationError[] = [];
  if (!identifier.trim()) {
    errors.push({ field: 'identifier', message: 'Email or username is required' });
  }
  if (!password) errors.push({ field: 'password', message: 'Password is required' });
  else if (!isValidPassword(password)) errors.push({ field: 'password', message: 'Password must be at least 6 characters' });
  return errors;
};

export const validateSignup = (
  username: string,
  email: string,
  password: string
): ValidationError[] => {
  const errors: ValidationError[] = [];
  if (!username.trim()) errors.push({ field: 'username', message: 'Username is required' });
  else if (!isValidUsername(username)) errors.push({ field: 'username', message: 'Username must be 3-20 characters (letters, numbers, underscores)' });
  if (!email.trim()) errors.push({ field: 'email', message: 'Email is required' });
  else if (!isValidEmail(email)) errors.push({ field: 'email', message: 'Invalid email address' });
  if (!password) errors.push({ field: 'password', message: 'Password is required' });
  else if (!isValidPassword(password)) errors.push({ field: 'password', message: 'Password must be at least 6 characters' });
  return errors;
};
