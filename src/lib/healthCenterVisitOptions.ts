/** Common pick-list values from North Shore day camp Airtable visit log. */

export const HEALTH_VISIT_LOCATIONS = [
  "N/A",
  "From home",
  "Bunk",
  "Pool",
  "Main pool",
  "Piano pool",
  "New pool",
  "Middle pool",
  "Lunch",
  "Gaga",
  "Jumping Pillow",
  "Rec hall",
  "Path",
  "Walkway",
  "Grass",
  "Bus",
  "Fast",
  "Tent",
  "Village",
  "Bathroom",
  "Arts and crafts",
  "Basketball",
  "Soccer",
  "Tennis",
  "Softball",
  "Hockey",
  "Flag football",
  "Swim",
  "Dance",
  "Gymnastics",
  "Music",
  "Cooking",
  "Woodworking",
  "Wonderworks",
  "Adventure",
  "Adventureland",
  "Mansion playground",
  "Stepping stone playground",
  "SS playground",
  "SS village",
  "Construction zone",
  "Imagination play",
  "Mini Golf",
  "Pickleball",
  "9 square",
  "Kickball",
  "Volleyball",
  "Fields",
  "Hill",
  "Bleachers",
  "Pavilion",
  "Carriage house",
  "Play house",
  "Club hill",
  "Turfs up",
  "Back of mansion",
  "Water games",
  "Funtastic friday",
  "Lightshow",
  "Starfish huddle",
  "Starfish stage",
  "Crew trip",
  "Train",
  "Stage",
  "Jewelry",
  "Ceramics",
  "Races",
  "Funhouse",
  "Sports academy",
] as const;

export const HEALTH_VISIT_TREATMENTS = [
  "Ice",
  "Ice pack",
  "Cleaned",
  "Cleaned and bandaged",
  "Bandaged",
  "Bandaid",
  "Clean, bandaid",
  "Aquaphor",
  "Bee gel",
  "Bee sting swab",
  "Calamine",
  "Motrin",
  "Tylenol",
  "Rest",
  "Rest in AC",
  "Went back to group",
  "Going back to group",
  "Going home",
  "Calling home",
  "Called mom",
  "No temp",
  "Gatorade",
  "Gatorade and rest in AC",
  "Cleaned with water pad",
  "Rinsed with eye drops",
  "Elevate and ice",
  "Splinter removed",
  "Went back to group advised to drink water",
  "Division will let mom know",
] as const;

export const HEALTH_VISIT_REASON_SUGGESTIONS = [
  "Doesn't feel well",
  "Stomachache",
  "Headache",
  "Nauseous",
  "Scrape on knee",
  "Scrape on elbow",
  "Gaga knuckles",
  "Pool toe",
  "Bee sting",
  "Bloody nose",
  "Sunscreen in eye",
  "Bumped head",
  "Hit in the eye",
  "Twisted ankle",
  "Bug bite",
  "Spontaneous nose bleed",
  "Fever",
  "Threw up",
  "Old scrape from home",
  "Heat rash",
  "Splinter",
] as const;

export const HEALTH_VISIT_NURSE_NAMES = [
  "Mary",
  "Christina",
  "Jamie",
  "Caitlin",
  "Mary and christina",
] as const;

export const HEALTH_VISIT_YES_NO = ["Yes", "No"] as const;

export const HEALTH_VISIT_CALLED_HOME_OPTIONS = [
  "Yes",
  "No",
  "N/A",
  "Division will let mom know",
] as const;

export type HealthCenterVisitExtraFields = {
  treatment?: string | null;
  incident_location?: string | null;
  group_name?: string | null;
  counselor_name?: string | null;
  nurse_name?: string | null;
  sent_home?: string | null;
  called_home?: string | null;
};

function relationRecord<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function relationName(
  value: { name?: string | null } | { name?: string | null }[] | null | undefined,
): string {
  return relationRecord(value)?.name?.trim() || '';
}

type BunkRef = { bunk_name?: string | null; bunk_number?: number | null };

type HealthVisitCamper = {
  group_name?: string | null;
  grade?: string | null;
  division?: { name?: string | null } | { name?: string | null }[] | null;
  leader?: { name?: string | null } | { name?: string | null }[] | null;
  bunk?: BunkRef | BunkRef[] | null;
};

/** Health Center Group field: day camp group_name only — never division or grade. */
export function healthVisitGroupForCamper(
  camper: HealthVisitCamper,
  isDayCamp: boolean,
): string {
  if (isDayCamp) return camper.group_name?.trim() || '';
  const bunk = relationRecord(camper.bunk);
  const fromBunk = bunk?.bunk_name?.trim();
  if (fromBunk) return fromBunk;
  if (bunk?.bunk_number != null) return `Bunk ${bunk.bunk_number}`;
  return camper.group_name?.trim() || '';
}

export function healthVisitCounselorForCamper(camper: HealthVisitCamper): string {
  return relationName(camper.leader);
}
