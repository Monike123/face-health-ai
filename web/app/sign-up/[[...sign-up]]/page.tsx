import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="fh-fade" style={{ display: "grid", placeItems: "center", padding: "1rem 0" }}>
      <SignUp forceRedirectUrl="/scan" signInUrl="/sign-in" />
    </div>
  );
}
