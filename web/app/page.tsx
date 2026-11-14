import Link from "next/link";
import { Show } from "@clerk/nextjs";

const btn = "rounded-md px-4 py-2 font-medium";

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Estimate your heart rate with your camera</h1>
      <p>
        Sit still in front of your camera for 30 seconds. FaceHealth AI reads tiny colour changes
        in your skin caused by your pulse and gives you an estimated heart rate.
      </p>

      <ol className="list-decimal space-y-1 pl-5">
        <li>Create a free account.</li>
        <li>Allow camera access and face the camera in even, steady light.</li>
        <li>Hold still for 30 seconds and get your estimate.</li>
      </ol>

      <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
        <p className="font-semibold">Please note</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>This is a Beta wellness tool, not a medical device.</li>
          <li>Results are estimates and can be wrong. Do not use them for medical decisions.</li>
          <li>Your video stays on your device. Only colour averages are sent, and nothing is stored.</li>
        </ul>
      </div>

      <div className="flex gap-3">
        <Show when="signed-out">
          <Link href="/sign-up" className={`${btn} bg-foreground text-background`}>
            Sign up
          </Link>
          <Link href="/sign-in" className={`${btn} border`}>
            Sign in
          </Link>
        </Show>
        <Show when="signed-in">
          <Link href="/scan" className={`${btn} bg-foreground text-background`}>
            Start a scan
          </Link>
        </Show>
      </div>
    </div>
  );
}
