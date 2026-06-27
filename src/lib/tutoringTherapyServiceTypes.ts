import { isTimberLakeCamp } from '../constants/camps';

export const DEFAULT_TUTORING_THERAPY_SERVICE_TYPES = [
    'Math Tutoring',
    'Reading Tutoring',
    'Science Tutoring',
    'Speech Therapy',
    'Occupational Therapy',
    'Physical Therapy',
    'Behavioral Therapy',
    'Music Therapy',
    'Art Therapy',
    'ESL Tutoring',
] as const;

export const TIMBER_LAKE_TUTORING_THERAPY_SERVICE_TYPES = [
    'Therapy',
    'Tutoring',
    'Other',
] as const;

export function getTutoringTherapyServiceTypes(
    companySlug: string | null | undefined,
): string[] {
    if (isTimberLakeCamp(companySlug)) {
        return [...TIMBER_LAKE_TUTORING_THERAPY_SERVICE_TYPES];
    }
    return [...DEFAULT_TUTORING_THERAPY_SERVICE_TYPES];
}
