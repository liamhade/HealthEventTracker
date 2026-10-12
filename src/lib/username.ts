// Supabase Auth identifies password users by email, not username. Usernames are mapped to a
// synthetic address on example.com (reserved by IANA, so it can never receive real mail).
// This needs "Confirm email" turned off in the Supabase Auth email provider settings.
const EMAIL_DOMAIN = 'example.com'

export const USERNAME_MIN = 3
export const USERNAME_MAX = 30
export const PASSWORD_MIN = 8

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase()
}

/** Returns an error message, or null when the username is acceptable. */
export function validateUsername(input: string): string | null {
  const username = normalizeUsername(input)
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters.`
  }
  if (!USERNAME_PATTERN.test(username)) {
    return 'Use only letters, numbers, dots, dashes and underscores, starting with a letter or number.'
  }
  return null
}

export function usernameToEmail(input: string): string {
  return `u-${normalizeUsername(input)}@${EMAIL_DOMAIN}`
}

export function isSyntheticEmail(email: string | undefined): boolean {
  return !!email && email.startsWith('u-') && email.endsWith(`@${EMAIL_DOMAIN}`)
}
