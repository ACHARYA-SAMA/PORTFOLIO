import { CONTACT } from "./content";

export const MAIL_SUBJECT = "Hello from your portfolio";

/** mailto: with the subject pre-filled. */
export const mailtoHref = (subject = MAIL_SUBJECT) => `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}`;

export type ContactInput = { name: string; email: string; message: string };
export type ContactErrors = Partial<Record<keyof ContactInput, string>>;

export const LIMITS = { name: 100, email: 200, message: 4000, messageMin: 10 };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Shared by the form (instant feedback) and the route handler (the real gate). */
export function validateContact(input: Partial<Record<keyof ContactInput, unknown>>): { value?: ContactInput; errors: ContactErrors } {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const value = { name: str(input.name), email: str(input.email), message: str(input.message) };
  const errors: ContactErrors = {};
  if (!value.name) errors.name = "Your name, please.";
  else if (value.name.length > LIMITS.name) errors.name = `Keep it under ${LIMITS.name} characters.`;
  if (!EMAIL.test(value.email) || value.email.length > LIMITS.email) errors.email = "That email doesn’t look right.";
  if (value.message.length < LIMITS.messageMin) errors.message = `A little more than ${LIMITS.messageMin} characters.`;
  else if (value.message.length > LIMITS.message) errors.message = `Keep it under ${LIMITS.message} characters.`;
  return Object.keys(errors).length ? { errors } : { value, errors };
}
