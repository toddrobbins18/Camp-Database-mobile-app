/** Company slugs — keep in sync with Lovable `companies.slug` */
export const CAMP_SLUG = {
  TIMBER_LAKE_CAMP: 'timber-lake-camp',
  TIMBER_LAKE_WEST: 'timber-lake-west',
  TYLER_HILL_CAMP: 'tyler-hill-camp',
} as const;

export type CampSlug = (typeof CAMP_SLUG)[keyof typeof CAMP_SLUG];

export function isTimberLakeCamp(slug: string | null | undefined): boolean {
  return slug === CAMP_SLUG.TIMBER_LAKE_CAMP;
}

export function isTimberLakeWest(slug: string | null | undefined): boolean {
  return slug === CAMP_SLUG.TIMBER_LAKE_WEST;
}

export function isTylerHillCamp(slug: string | null | undefined): boolean {
  return slug === CAMP_SLUG.TYLER_HILL_CAMP;
}
