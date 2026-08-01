const { createClient } = require('@supabase/supabase-js');

  const supabaseUrl = process.env.SUPABASE_URL || 'https://sadikezxiwyntwutntnp.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    process.exit(1);
  }
  const s = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

(async () => {
  // Fetch current site_content
  const { data, error } = await s.from('settings').select('value').eq('key', 'site_content').single();
  if (error) { console.error('Fetch error:', error); process.exit(1); }

  let c = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;

  // Fix venue — remove dress, set correct times
  c.venue = {
    heading: "Venue & Details",
    subtitle: "Chennai, October 8th, 2026",
    ceremony: { tag: "Ceremony", name: "St Andrews Kirk", address: "Poonamallee High Rd, Vepery, Chennai 600 007", time: "4:30 PM" },
    reception: { tag: "Reception", name: "BKN Auditorium", address: "Chennai, Tamil Nadu", time: "7:00 PM" },
  };

  // Fix itinerary times
  c.itinerary = {
    heading: "Day Itinerary",
    items: [
      { time: "4:30 PM", label: "Ceremony", venue: "St Andrews Kirk" },
      { time: "7:00 PM", label: "Reception", venue: "BKN Auditorium" },
    ],
  };

  // Update with content from lib/content.ts
  c.james = {
    name: "James Daniel",
    photo: "/images/james-profile.jpg",
    bio: "Born on October 16, 1997, alongside his twin brother John Jebasingh, James grew up in Chennai with faith as his foundation — shaped by his years at Anitha Methodist School and the community of the Laymen's Evangelical Fellowship. A graduate in Physiotherapy from MGR Medical University, he continues to serve others through his clinical calling while also building a career in technology. Today he serves as an Associate Application Support Analyst at Globus Medical, an international medical device company — carrying the same heart for people, now through a different door. It was through their shared church community that, by His sovereign will, God wove these two families together.",
    facts: [
      { label: "Hometown", value: "Chennai, India" },
      { label: "Education", value: "B.P.T., MGR Medical University" },
      { label: "Profession", value: "Associate Application Support Analyst, Globus Medical" },
      { label: "Faith", value: "Christian — Laymen's Evangelical Fellowship" }
    ]
  };

  c.sharon = {
    name: "Sharon",
    photo: "/images/sharon-profile.jpg",
    bio: "Raised in Guntur, Sharon grew up with a heart anchored in faith and a mind drawn to excellence. A graduate in Electronics and Communication Engineering from Vasireddy Venkatadri Institute of Technology, she built a career that reflects both her sharp intellect and her commitment to doing things right. With over five years of experience across Amazon and Uber, she now serves as an AI Evaluation Specialist — shaping the quality and integrity of AI systems at a global scale. It was through their shared church community that, by His sovereign will, God wove these two families together.",
    facts: [
      { label: "Hometown", value: "Guntur, Andhra Pradesh" },
      { label: "Education", value: "B.Tech, Electronics & Communication Engineering" },
      { label: "Profession", value: "AI Evaluation Specialist, Uber" },
      { label: "Faith", value: "Christian" }
    ]
  };

  // Write back
  const { error: upsertError } = await s.from('settings').upsert(
    { key: 'site_content', value: JSON.stringify(c), updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );

  if (upsertError) { console.error('Update error:', upsertError); process.exit(1); }
  console.log('✅ Successfully updated site_content!');
  console.log('Venue ceremony:', JSON.stringify(c.venue.ceremony));
  console.log('Venue reception:', JSON.stringify(c.venue.reception));
  console.log('Itinerary items:', JSON.stringify(c.itinerary.items));
  console.log('James bio:', c.james.bio.substring(0, 60) + '...');
  console.log('Sharon bio:', c.sharon.bio.substring(0, 60) + '...');
})();
