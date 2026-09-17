import { z } from 'zod';

/** Shared by the hero search box and the header's search dialog. */
export const searchInputSchema = z
  .string()
  .trim()
  .min(3, { message: 'Arama için en az 3 karakter girin.' });
