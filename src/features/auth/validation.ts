import { z } from 'zod';

/** Matches the display_name length constraint in the database (1 to 80). */
export const NAME_MAX_LENGTH = 80;
export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt, which Supabase uses, only considers the first 72 bytes. */
export const PASSWORD_MAX_LENGTH = 72;

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Enter your email address.')
  .pipe(z.email('Enter a valid email address.'));

const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password.'),
});

const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter your name.')
    .max(NAME_MAX_LENGTH, `Use ${NAME_MAX_LENGTH} characters or fewer.`),
  email: emailField,
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
    .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_LENGTH, {
      message: `Use ${PASSWORD_MAX_LENGTH} bytes or fewer.`,
    }),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

export type ValidationResult<T> =
  { ok: true; data: T } | { ok: false; errors: Partial<Record<keyof T, string>> };

function validate<T extends Record<string, unknown>>(
  schema: z.ZodType<T>,
  input: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };

  const errors: Partial<Record<keyof T, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof T;
    // Keep the first message per field.
    if (field !== undefined && errors[field] === undefined) errors[field] = issue.message;
  }
  return { ok: false, errors };
}

export function validateSignIn(input: unknown) {
  return validate(signInSchema, input);
}

export function validateSignUp(input: unknown) {
  return validate(signUpSchema, input);
}
