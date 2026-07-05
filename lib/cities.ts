import citiesData from "cities-list";

export interface City {
  name: string;
}

const ALL_CITIES: City[] = Object.keys(
  citiesData as Record<string, number>
).map((name) => ({ name }));

// Common Indian cities — prioritised in search results
const INDIA_CITIES = new Set([
  "Chennai","Mumbai","Delhi","Bangalore","Hyderabad","Kolkata","Pune","Ahmedabad",
  "Jaipur","Surat","Lucknow","Kanpur","Nagpur","Indore","Thane","Bhopal",
  "Visakhapatnam","Patna","Vadodara","Ghaziabad","Ludhiana","Agra","Nashik",
  "Faridabad","Meerut","Rajkot","Varanasi","Srinagar","Aurangabad","Dhanbad",
  "Amritsar","Allahabad","Howrah","Ranchi","Gwalior","Jabalpur","Coimbatore",
  "Vijayawada","Jodhpur","Madurai","Raipur","Kota","Chandigarh","Guwahati",
  "Solapur","Mysore","Tiruchirappalli","Bareilly","Aligarh","Moradabad",
  "Jalandhar","Bhubaneswar","Salem","Warangal","Guntur","Noida","Kochi",
  "Nellore","Dehradun","Jamshedpur","Cuttack","Mangalore","Erode","Belgaum",
  "Tirunelveli","Gaya","Jalgaon","Udaipur","Siliguri","Jammu","Ujjain",
  "Nanded","Kolhapur","Ajmer","Hubli","Dharwad","Vellore","Tiruppur",
  "Tirupati","Thrissur","Kozhikode","Thiruvananthapuram","Kannur","Kollam",
  "Durgapur","Asansol","Rourkela","Bikaner","Bhilai","Jhansi","Navi Mumbai",
  "Secunderabad","Pimpri","Chinchwad","New Delhi",
].map(c => c.toLowerCase()));

export function searchCities(query: string): City[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const indiaStarts: City[] = [];
  const otherStarts: City[] = [];
  const indiaContains: City[] = [];
  const otherContains: City[] = [];

  for (const c of ALL_CITIES) {
    const n = c.name.toLowerCase();
    const isIndia = INDIA_CITIES.has(n);
    if (n.startsWith(q)) {
      isIndia ? indiaStarts.push(c) : otherStarts.push(c);
    } else if (n.includes(q)) {
      isIndia ? indiaContains.push(c) : otherContains.push(c);
    }
  }

  const sort = (a: City, b: City) => a.name.localeCompare(b.name);
  return [
    ...indiaStarts.sort(sort),
    ...otherStarts.sort(sort),
    ...indiaContains.sort(sort),
    ...otherContains.sort(sort),
  ].slice(0, 50);
}
