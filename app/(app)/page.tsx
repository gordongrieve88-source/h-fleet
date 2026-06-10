import { redirect } from "next/navigation";

/** H-Fleet's home is the daily truck board. */
export default function HomePage() {
  redirect("/fleet");
}
