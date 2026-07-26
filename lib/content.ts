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
    scripture: string;
    scripture_ref: string;
    hosts_groom: string;
    hosts_bride: string;
    body: string;
    couple_name: string;
    quote: string;
    date: string;
    time: string;
    ceremony_label: string;
    ceremony_line: string;
    reception_label: string;
    reception_line: string;
    presence_line: string;
    explore_btn: string;
  };
  james: {
    name: string;
    photo?: string;
    bio: string;
    facts: PersonFact[];
  };
  sharon: {
    name: string;
    photo?: string;
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
    tagline: "request the joy of your presence",
    invited_label: "with love & joy",
    date: "October 8th, 2026",
    venue_short: "St Andrews Kirk, Chennai",
  },
  invitation: {
    scripture: "He has made everything beautiful in His time.",
    scripture_ref: "Ecclesiastes 4:9-12",
    hosts_groom: "Mr. Joseph Washington & Mrs. Sophia Joseph",
    hosts_bride: "Mr. Yesurathinam & Mrs. Singapogu Rizma",
    body: "We greet you in the name of the Lord Jesus Christ. With great joy in our hearts, we invite you to celebrate the wedding of our children",
    couple_name: "James Daniel & Sharon",
    quote: "Two are better than one, because they have a good return for their labor — a cord of three strands is not quickly broken.",
    date: "October 8th (Thursday), 2026",
    time: "4:30 P.M.",
    ceremony_label: "Holy Matrimony",
    ceremony_line: "St. Andrew's Kirk, Egmore, Chennai",
    reception_label: "Wedding Reception",
    reception_line: "BKN Auditorium, Ritherdon Road, Vepery, Chennai",
    presence_line: "Your gracious presence and blessings will make this joyous occasion truly memorable.",
    explore_btn: "Explore the wedding website",
  },
  james: {
    name: "James Daniel",
    photo: "/images/james-profile.jpg",
    bio: "Born on October 16, 1997, alongside his twin brother John Jebasingh, James grew up in Chennai with faith as his foundation — shaped by his years at Anitha Methodist School and the community of the Laymen's Evangelical Fellowship. A graduate in Physiotherapy from MGR Medical University, he continues to serve others through his clinical calling while also building a career in technology. Today he serves as an Associate Application Support Analyst at Globus Medical, an international medical device company — carrying the same heart for people, now through a different door. He found in Sharon not just a life partner, but an answer to years of prayer.",
    facts: [
      { label: "Hometown", value: "Chennai, India" },
      { label: "Education", value: "B.P.T., MGR Medical University" },
      { label: "Profession", value: "Associate Application Support Analyst, Globus Medical" },
      { label: "Faith", value: "Christian — Laymen's Evangelical Fellowship" },
    ],
  },
  sharon: {
    name: "Sharon",
    photo: "/images/sharon-profile.jpg",
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
