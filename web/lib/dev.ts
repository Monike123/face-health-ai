/** Local/demo mode (no Clerk). Never set on a locked-down production with real auth. */
export const DEV_AUTH = process.env.NEXT_PUBLIC_DEV_AUTH === "1";

/** Clerk only when a publishable key is present and demo mode is off. */
export const USE_CLERK =
  !DEV_AUTH && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
