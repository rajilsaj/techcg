import { permanentRedirect } from "next/navigation";

/** The documentation moved to /api. */
export default function OldApiDocs() {
  permanentRedirect("/api");
}
