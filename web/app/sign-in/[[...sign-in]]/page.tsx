import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="fh-fade flex flex-1 items-center justify-center py-4">
      <SignIn
        forceRedirectUrl="/scan"
        signUpUrl="/sign-up"
        appearance={{
          elements: {
            rootBox: "w-full",
            cardBox: "shadow-none border border-[var(--glass-border)] rounded-[1.25rem]",
          },
        }}
      />
    </div>
  );
}
