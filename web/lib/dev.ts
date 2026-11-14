/** Local-only demo mode (no Clerk). Never set on Vercel production. */
export const DEV_AUTH = process.env.NEXT_PUBLIC_DEV_AUTH === "1";
