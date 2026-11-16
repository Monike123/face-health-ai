/** Clerk only when a publishable key is present. Open demo = no key. */
export const USE_CLERK = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
