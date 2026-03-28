/**
 * Default electives + capacities for Timber Lake Camp (matches web seed:
 * lovable-web-app/supabase/migrations/20260323162322_*.sql).
 */
export const TIMBER_LAKE_DEFAULT_ELECTIVES: readonly { name: string; capacity: number }[] = [
    { name: '3D Printing', capacity: 8 },
    { name: 'Candles', capacity: 8 },
    { name: 'Ceramics', capacity: 10 },
    { name: 'Graphic Design', capacity: 6 },
    { name: 'Insta-Art', capacity: 10 },
    { name: 'Jewelry', capacity: 10 },
    { name: 'Music Studio', capacity: 8 },
    { name: 'Painting', capacity: 10 },
    { name: 'Photography', capacity: 6 },
    { name: 'Radio/Podcasting', capacity: 5 },
    { name: 'Robotics', capacity: 6 },
    { name: 'Stitchery', capacity: 8 },
    { name: 'TV Studio', capacity: 8 },
    { name: 'Water Ski', capacity: 8 },
    { name: 'Woodshop', capacity: 8 },
] as const;
