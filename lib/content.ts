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
    ceremony: { tag: string; name: string; address: string; time: string };
    reception: { tag: string; name: string; address: string; time: string };
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
    hosts_bride: "Mr. Yesuratnam & Mrs. Rizmasusi",
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
    bio: "Born on October 16, 1997, alongside his twin brother John Jebasingh, James grew up in Chennai with faith as his foundation — shaped by his years at Anitha Methodist School and the community of the Laymen's Evangelical Fellowship. A graduate in Physiotherapy from MGR Medical University, he continues to serve others through his clinical calling while also building a career in technology. Today he serves as an Associate Application Support Analyst at Globus Medical, an international medical device company — carrying the same heart for people, now through a different door. It was through their shared church community that, by His sovereign will, God wove these two families together.",
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
    bio: "Born in 1999 and raised in a loving Christian family, Sharon grew up with her parents, Mr. Yesuratnam and Mrs. Rizmasusi, and her younger sister in a home rooted in faith, kindness, prayer, and respect. Her grandparents, Mr. Jacob and Mrs. Ruth, lovingly led the family to the Laymen's Evangelical Fellowship (LEF), where her spiritual foundation was nurtured from an early age. She holds a B.Tech degree and currently serves as an AI Evaluation Specialist with a leading multinational company in Hyderabad. She values faith, family, and meaningful relationships, and looks forward to building a Christ-centered life filled with love, purpose, and God's grace. It was through their shared church community that, by His sovereign will, God wove these two families together.",
    facts: [
      { label: "Hometown", value: "Guntur, Andhra Pradesh" },
      { label: "Education", value: "B.Tech, Electronics & Communication Engineering" },
      { label: "Profession", value: "AI Evaluation Specialist, Uber" },
      { label: "Faith", value: "Christian — Laymen's Evangelical Fellowship" },
    ],
  },
  venue: {
    heading: "Venue & Details",
    subtitle: "Chennai, October 8th, 2026",
    ceremony: { tag: "Ceremony", name: "St Andrews Kirk", address: "Poonamallee High Rd, Vepery, Chennai 600 007", time: "4:30 PM" },
    reception: { tag: "Reception", name: "BKN Auditorium", address: "Chennai, Tamil Nadu", time: "7:00 PM" },
  },
  itinerary: {
    heading: "Day Itinerary",
    items: [
      { time: "4:30 PM", label: "Ceremony", venue: "St Andrews Kirk" },
      { time: "7:00 PM", label: "Reception", venue: "BKN Auditorium" },
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
      { name: "Mr. Yesuratnam", role: "Father of the Bride" },
      { name: "Mrs. Rizmasusi", role: "Mother of the Bride" },
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
