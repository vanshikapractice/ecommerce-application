export const validateCredentials = (
  mode: 'login' | 'register',
  values: { name: string; email: string; password: string },
) => {
  if (mode === 'register' && values.name.trim().length < 2) {
    return 'Please enter your full name.';
  }
  if (!values.email.includes('@') || values.password.length < 8) {
    return 'Use a valid email and a password of at least 8 characters.';
  }
  return '';
};
