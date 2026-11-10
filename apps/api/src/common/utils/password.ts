import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_ROUNDS);

export const comparePassword = (password: string, passwordHash: string) =>
  bcrypt.compare(password, passwordHash);
