import { describe, expect, it } from "vitest";
import { countryOf, parseLinkedIn, parseWebsite } from "@/lib/profile-import";

describe("parseLinkedIn", () => {
  it("reads name, company, place, bio and photo from the public preview", () => {
    const d = parseLinkedIn(
      "Nelson Cishugi - Lopango | LinkedIn",
      "Diplômé en Marketing Management, Certifié Expert Adobe et… · Experience: Lopango · Education: The University of Texas at Austin · Location: Republic of the Congo · 500+ connections on LinkedIn. View Nelson Cishugi’s profile on LinkedIn",
      "https://media.licdn.com/dms/image/x/profile-displayphoto-shrink_200_200/y",
      new URL("https://cg.linkedin.com/in/nelson-cishugi/")
    );
    expect(d).toMatchObject({
      name: "Nelson Cishugi",
      role: null,
      organization: "Lopango",
      city: null,
      country: "CG",
      bio: "Diplômé en Marketing Management, Certifié Expert Adobe et…",
      linkedin: "https://www.linkedin.com/in/nelson-cishugi",
    });
    expect(d.photoUrl).toContain("licdn.com");
  });

  it("uses a short headline as the role and keeps the city", () => {
    const d = parseLinkedIn(
      "Grâce M. - Exemple | LinkedIn",
      "Développeuse full-stack · Experience: Exemple · Location: Kinshasa, Democratic Republic of the Congo",
      "https://static.licdn.com/aero-v1/sc/h/ghost-person.png",
      new URL("https://www.linkedin.com/in/grace")
    );
    expect(d).toMatchObject({ role: "Développeuse full-stack", city: "Kinshasa", country: "CD", bio: null, photoUrl: null });
  });
});

describe("countryOf", () => {
  it("tells the two Congos apart", () => {
    expect(countryOf("Brazzaville, Republic of the Congo")).toBe("CG");
    expect(countryOf("Pointe-Noire")).toBe("CG");
    expect(countryOf("Kinshasa, République démocratique du Congo")).toBe("CD");
    expect(countryOf("Raleigh")).toBeNull();
  });
});

describe("parseWebsite", () => {
  it("prefers a JSON-LD Person", () => {
    const html = `<html><head><title>Accueil</title><script type="application/ld+json">{"@type":"Person","name":"Aïcha N.","jobTitle":"Designer","worksFor":{"name":"Studio"},"image":"/me.jpg","address":{"addressLocality":"Brazzaville"},"sameAs":["https://www.linkedin.com/in/aicha"]}</script></head></html>`;
    expect(parseWebsite(html, new URL("https://aicha.cg/"))).toMatchObject({
      name: "Aïcha N.",
      role: "Designer",
      organization: "Studio",
      city: "Brazzaville",
      country: "CG",
      photoUrl: "https://aicha.cg/me.jpg",
      linkedin: "https://www.linkedin.com/in/aicha",
    });
  });
  it("falls back to the title", () => {
    const html = `<html><head><title>Didier L. — Développeur mobile</title><meta property="og:image" content="https://d.cg/p.jpg"></head></html>`;
    expect(parseWebsite(html, new URL("https://d.cg/"))).toMatchObject({ name: "Didier L.", role: "Développeur mobile", photoUrl: "https://d.cg/p.jpg" });
  });
});
