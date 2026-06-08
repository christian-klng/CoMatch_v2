import type { Community, Person, Skill } from "./types";

// Curated skill taxonomy for the "ich suche / ich kann" picker.
// In prod this becomes a DB-backed, LLM-extended controlled vocabulary.
export const SKILL_CATALOG: Skill[] = [
  { id: "frontend", label: "Frontend-Entwicklung", kind: "offer" },
  { id: "backend", label: "Backend-Entwicklung", kind: "offer" },
  { id: "uxui", label: "UX/UI Design", kind: "offer" },
  { id: "product", label: "Product Management", kind: "offer" },
  { id: "growth", label: "Growth & Marketing", kind: "offer" },
  { id: "sales", label: "Sales & BizDev", kind: "offer" },
  { id: "fundraising", label: "Fundraising", kind: "offer" },
  { id: "legal", label: "Legal & Recht", kind: "offer" },
  { id: "finance", label: "Finance & Controlling", kind: "offer" },
  { id: "ml", label: "Machine Learning / AI", kind: "offer" },
  { id: "data", label: "Data & Analytics", kind: "offer" },
  { id: "ops", label: "Operations", kind: "offer" },
  { id: "hr", label: "People & Hiring", kind: "offer" },
  { id: "content", label: "Content & Brand", kind: "offer" },
  { id: "cofounder", label: "Co-Founder", kind: "offer" },
  { id: "mentoring", label: "Mentoring", kind: "offer" },
];

export const CURRENT_COMMUNITY: Community = {
  id: "c_techfest25",
  name: "TechFest Berlin 2025",
  code: "10000001",
  memberCount: 248,
  context: "Konferenz · 12.–13. Juni",
};

// Avatars via deterministic placeholder service (no upload pipeline yet).
const face = (seed: string) =>
  `https://i.pravatar.cc/240?img=${seed}`;

export const MOCK_MATCHES: Person[] = [
  {
    id: "p1",
    name: "Anna Schmidt",
    role: "Senior Product Managerin",
    company: "Northwind SaaS",
    avatarUrl: face("47"),
    bio: "Baue B2B-Produkte von 0→1. Suche technische Mitgründer-Energie.",
    attributes: ["B2B SaaS", "8 Jahre Erfahrung", "Ex-Gründerin"],
    seeks: ["Frontend-Entwicklung", "Machine Learning / AI"],
    offers: ["Product Management", "Fundraising"],
    matchScore: 94,
    matchedOn: {
      theyOffer: ["Product Management"],
      theySeek: ["Frontend-Entwicklung"],
    },
    connection: "none",
  },
  {
    id: "p2",
    name: "Jonas Weber",
    role: "ML Engineer",
    company: "Helix Labs",
    avatarUrl: face("12"),
    bio: "LLM-Infra & RAG-Systeme. Offen für spannende Side-Projects.",
    attributes: ["LLMs", "PyTorch", "Open Source"],
    seeks: ["Product Management", "Growth & Marketing"],
    offers: ["Machine Learning / AI", "Backend-Entwicklung"],
    matchScore: 91,
    matchedOn: {
      theyOffer: ["Machine Learning / AI"],
      theySeek: ["Product Management"],
    },
    connection: "incoming",
  },
  {
    id: "p3",
    name: "Leïla Hadad",
    role: "Brand & Content Lead",
    company: "Freelance",
    avatarUrl: face("32"),
    bio: "Story-first Marketing für Deep-Tech. Suche Gründerteams mit Substanz.",
    attributes: ["Storytelling", "Deep-Tech", "Freelance"],
    seeks: ["Co-Founder", "Fundraising"],
    offers: ["Content & Brand", "Growth & Marketing"],
    matchScore: 83,
    matchedOn: {
      theyOffer: ["Growth & Marketing"],
      theySeek: ["Co-Founder"],
    },
    connection: "none",
  },
  {
    id: "p4",
    name: "David Okoro",
    role: "Full-Stack Developer",
    company: "Stealth Startup",
    avatarUrl: face("68"),
    bio: "TypeScript end-to-end. Suche ein starkes Produkt-/Design-Gegenüber.",
    attributes: ["TypeScript", "React", "Postgres"],
    seeks: ["UX/UI Design", "Product Management"],
    offers: ["Frontend-Entwicklung", "Backend-Entwicklung"],
    matchScore: 89,
    matchedOn: {
      theyOffer: ["Frontend-Entwicklung"],
      theySeek: ["UX/UI Design"],
    },
    connection: "connected",
  },
  {
    id: "p5",
    name: "Sofia Rossi",
    role: "Venture Partner",
    company: "Atlas Ventures",
    avatarUrl: face("23"),
    bio: "Pre-Seed & Seed in B2B / AI. Treffe gern technische Gründer:innen.",
    attributes: ["Pre-Seed", "B2B / AI", "Angel"],
    seeks: ["Co-Founder", "Machine Learning / AI"],
    offers: ["Fundraising", "Finance & Controlling"],
    matchScore: 78,
    matchedOn: {
      theyOffer: ["Fundraising"],
      theySeek: ["Machine Learning / AI"],
    },
    connection: "requested",
  },
];
