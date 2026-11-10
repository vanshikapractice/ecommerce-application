import { describe, expect, it } from 'vitest';
import { validateCredentials } from './validation';

describe('validateCredentials', () => {
  it('requires a name when registering', () => {
    expect(validateCredentials('register', { name: 'A', email: 'a@test.com', password: 'password' }))
      .toBe('Please enter your full name.');
  });

  it('rejects invalid email and short passwords', () => {
    expect(validateCredentials('login', { name: '', email: 'invalid', password: 'short' }))
      .toBe('Use a valid email and a password of at least 8 characters.');
  });

  it('accepts valid login credentials', () => {
    expect(validateCredentials('login', { name: '', email: 'user@test.com', password: 'password' }))
      .toBe('');
  });
});
