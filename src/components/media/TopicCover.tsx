import { BrainCircuit, Briefcase, Cpu, PartyPopper, Rocket, type LucideIcon } from "lucide-react";

/*
 * Cover shown when a story has no picture, or none large enough: the topic's
 * icon (the same ones as on the sign-in screen) on the topic's colours.
 */

export type CoverTopic = "ia" | "startups" | "entrepreneurs" | "evenements" | "tech";

const VISUALS: Record<CoverTopic, { label: string; icon: LucideIcon; tile: string }> = {
  ia: { label: "IA", icon: BrainCircuit, tile: "from-accent to-[#5b9bff]" },
  startups: { label: "Startups", icon: Rocket, tile: "from-[#ff6b4a] to-[#ffb547]" },
  entrepreneurs: { label: "Entrepreneurs", icon: Briefcase, tile: "from-[#0f9d6b] to-[#45d49b]" },
  evenements: { label: "Événements", icon: PartyPopper, tile: "from-[#7c3aed] to-[#c084fc]" },
  tech: { label: "Tech", icon: Cpu, tile: "from-[#1e293b] to-[#475569]" },
};

// Artificial intelligence, in French and English. "IA" / "AI" only as capital words.
const AI = /\b(IA|AI|GenAI|LLMs?|GPT-?\d*o?|ChatGPT|OpenAI)\b|intelligence artificielle|artificial intelligence|machine learning|apprentissage automatique|deep learning|IA g[ée]n[ée]rative|chatbots?|agents? IA/;

/** The picture's topic: AI when the story is about it, else its meta tag (events first), else Tech. */
export function coverTopic(tagSlugs: string[], text: string): CoverTopic {
  if (AI.test(text)) return "ia";
  for (const slug of ["evenements", "startups", "entrepreneurs", "tech"] as const) {
    if (tagSlugs.includes(slug)) return slug;
  }
  return "tech";
}

export function TopicCover({ topic, className = "", size = "sm" }: { topic: CoverTopic; className?: string; size?: "sm" | "lg" }) {
  const { label, icon: Icon, tile } = VISUALS[topic];
  return (
    <div
      role="img"
      aria-label={`Illustration : ${label}`}
      className={`relative grid place-items-center overflow-hidden bg-gradient-to-br text-white ${tile} ${className}`}
    >
      {/* Soft rings behind the icon, echoing the round topic bubbles of the sign-in screen. */}
      <span aria-hidden className="absolute -right-[18%] -top-[30%] aspect-square w-[70%] rounded-full bg-white/10" />
      <span aria-hidden className="absolute -bottom-[40%] -left-[12%] aspect-square w-[60%] rounded-full bg-black/10" />
      <span className="relative flex flex-col items-center gap-1">
        <Icon className={size === "lg" ? "h-10 w-10" : "h-7 w-7"} strokeWidth={1.75} aria-hidden />
        <span className={`font-semibold uppercase tracking-[0.12em] ${size === "lg" ? "text-xs" : "text-[9px]"}`}>{label}</span>
      </span>
    </div>
  );
}
