import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex justify-center">
      <SignIn forceRedirectUrl="/scan" signUpUrl="/sign-up" />
    </div>
  );
}
