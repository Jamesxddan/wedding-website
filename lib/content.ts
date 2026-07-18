export interface Milestone {
  year: string;
  title: string;
  description: string;
  emoji: string;
}

export interface PersonFact { label: string; value: string; }
export interface FamilyMember { name: string; role: string; }
export interface ItineraryItem { time: string; label: string; venue: string; }

export interface SiteContent {
  opening: {
    tagline: string;
    invited_label: string;
    date: string;
    venue_short: string;
  };
  invitation: {
    body: string;
    couple_name: string;
    quote: string;
    date: string;
    ceremony_line: string;
    reception_line: string;
    presence_line: string;
    explore_btn: string;
  };
  story: {
    heading: string;
    subtitle: string;
    milestones: Milestone[];
  };
  james: {
    name: string;
    bio: string;
    facts: PersonFact[];
  };
  sharon: {
    name: string;
    bio: string;
    facts: PersonFact[];
  };
  venue: {
    heading: string;
    subtitle: string;
    ceremony: { tag: string; name: string; address: string; time: string; dress: string };
    reception: { tag: string; name: string; address: string; time: string; dress: string };
  };
  itinerary: {
    heading: string;
    items: ItineraryItem[];
  };
  families: {
    heading: string;
    subtitle: string;
    james: FamilyMember[];
    sharon: FamilyMember[];
  };
}

export const DEFAULT_CONTENT: SiteContent = {
  opening: {
    tagline: "Together with their families",
    invited_label: "— You are invited —",
    date: "October 8th, 2026",
    venue_short: "St Andrews Kirk, Chennai",
  },
  invitation: {
    body: "We greet you in the name of the Lord Jesus Christ. With great joy in our hearts, we invite you to celebrate the wedding of",
    couple_name: "James Daniel & Sharon",
    quote: "God's will was on our marriage",
    date: "October 8th, 2026",
    ceremony_line: "St Andrews Kirk, Chennai — Ceremony",
    reception_line: "BKN Auditorium, Chennai — Reception",
    presence_line: "Your presence is greatly needed and deeply cherished. 🌸",
    explore_btn: "Explore the wedding website",
  },
  story: {
    heading: "Our Story",
    subtitle: '"God\'s will was on our marriage"',
    milestones: [
      { year: "2023", title: "First Meeting", description: "God brought two hearts together in a moment neither of us expected. It was the beginning of something beautiful — a friendship that quietly blossomed into love.", emoji: "🌱" },
      { year: "2024", title: "Growing Together", description: "Through laughter, prayers, and countless conversations, we discovered that God's hand was weaving our stories into one. Every moment felt like a gentle confirmation.", emoji: "🌿" },
      { year: "2025", title: "The Proposal", description: "On a day we will never forget, James asked Sharon to walk with him for the rest of his life. With joy and tears, she said yes — and God smiled.", emoji: "💍" },
      { year: "2026", title: "October 8th — Wedding Day", description: "Before family, friends, and God, we will make a covenant of love. St Andrews Kirk, Chennai — the place where our forever begins.", emoji: "🕊️" },
    ],
  },
  james: {
    name: "James Daniel",
    bio: "James is a man shaped by faith, family, and a deep love for people. Raised in a home where Jesus was central, he carries a quiet strength and a heart that seeks to serve. He found in Sharon not just a life partner, but an answer to years of prayer.",
    facts: [
      { label: "Hometown", value: "Chennai, India" },
      { label: "Faith", value: "Christian" },
      { label: "Favourite verse", value: "Jeremiah 29:11" },
    ],
  },
  sharon: {
    name: "Sharon",
    bio: "Sharon is a woman of grace, warmth, and unwavering faith. Those who know her speak of a joy that is contagious and a gentleness that draws people in. In James she found a love she had entrusted to God long before she knew his name.",
    facts: [
      { label: "Hometown", value: "Chennai, India" },
      { label: "Faith", value: "Christian" },
      { label: "Favourite verse", value: "Proverbs 31:25" },
    ],
  },
  venue: {
    heading: "Venue & Details",
    subtitle: "Chennai, October 8th, 2026",
    ceremony: { tag: "Ceremony", name: "St Andrews Kirk", address: "Poonamallee High Rd, Vepery, Chennai 600 007", time: "TBD", dress: "Formals / Ethnic" },
    reception: { tag: "Reception", name: "BKN Auditorium", address: "Chennai, Tamil Nadu", time: "TBD", dress: "Formals / Ethnic" },
  },
  itinerary: {
    heading: "Day Itinerary",
    items: [
      { time: "TBD", label: "Ceremony", venue: "St Andrews Kirk" },
      { time: "TBD", label: "Reception", venue: "BKN Auditorium" },
    ],
  },
  families: {
    heading: "The Families",
    subtitle: "Two families, one blessing",
    james: [
      { name: "Mr. Joseph Rubin Washington", role: "Father of the Groom" },
      { name: "Mrs. Sophia Joseph", role: "Mother of the Groom" },
      { name: "John Jebasingh", role: "Brother of the Groom" },
    ],
    sharon: [
      { name: "Mr. Yesurathinam", role: "Father of the Bride" },
      { name: "Mrs. Singapogu Rizma", role: "Mother of the Bride" },
      { name: "Shiny Singapogu", role: "Sister of the Bride" },
    ],
  },
};

export function mergeSiteContent(base: SiteContent, overrides: Partial<SiteContent>): SiteContent {
  const result = JSON.parse(JSON.stringify(base)) as SiteContent;
  for (const key of Object.keys(overrides) as (keyof SiteContent)[]) {
    const val = overrides[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result[key] = { ...(base[key] as any), ...(val as any) } as any;
    } else if (val !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[key] = val;
    }
  }
  return result;
}
