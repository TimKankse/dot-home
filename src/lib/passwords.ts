import bcrypt from 'bcrypt';

export const MIN_PASSWORD_LENGTH = 8;
const SALT_ROUNDS = 12;

export const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export const isValidPasswordLength = (password: string): boolean =>
  password.length >= MIN_PASSWORD_LENGTH;

export const hashPassword = async (password: string): Promise<string> =>
  bcrypt.hash(password, SALT_ROUNDS);

export const verifyPassword = async (
  password: string,
  passwordHash: string,
): Promise<boolean> => bcrypt.compare(password, passwordHash);
