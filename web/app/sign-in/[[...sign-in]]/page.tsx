import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="fh-fade" style={{ display: "grid", placeItems: "center", padding: "1rem 0" }}>
      <SignIn forceRedirectUrl="/scan" signUpUrl="/sign-up" />
    </div>
  );
}
