export interface MediaPhoto {
  id: number;
  alt: string;
  colorKey: string;
  folder: string;
  taggedCampers: string[];
  tagStatus: 'tagged' | 'pending' | 'untagged';
  uploadDate: string;
}

export interface CamperFace {
  id: string;
  name: string;
  photoCount: number;
  lastSeen: string;
  status: 'verified' | 'suggested';
}

export const PHOTO_COLORS: Record<string, string> = {
  primary20: '#dbeafe',
  accent20: '#ffedd5',
  success20: '#dcfce7',
  info20: '#e0f2fe',
  warning20: '#fef3c7',
  primary10: '#eff6ff',
  accent10: '#fff7ed',
  success10: '#ecfdf5',
  info10: '#f0f9ff',
  warning10: '#fffbeb',
  primary15: '#e8f0fe',
  accent15: '#fff4e6',
};

export const mediaFolders = [
  'All Photos',
  'Session 1',
  'Session 2',
  'Campfire Night',
  'Water Sports',
  'Arts & Crafts',
  'Field Day',
];

export const camperNames = [
  'Emma Johnson',
  'Liam Martinez',
  'Olivia Chen',
  'Noah Patel',
  'Ava Brooks',
  'Ethan Kim',
  'Sophia Rivera',
  'Mason Lee',
  'Isabella Davis',
  'Lucas Wilson',
  'Mia Thompson',
  'Jack Anderson',
];

const colorKeys = [
  'primary20', 'accent20', 'success20', 'info20', 'warning20',
  'primary10', 'accent10', 'success10', 'info10', 'warning10',
  'primary15', 'accent15',
  'primary20', 'accent20', 'success20', 'info20', 'warning20',
  'primary10', 'accent10', 'success10', 'info10', 'warning10',
  'primary15', 'accent15',
];

export const mockPhotos: MediaPhoto[] = Array.from({ length: 24 }, (_, i) => {
  const folderIdx = i < 4 ? 1 : i < 8 ? 2 : i < 12 ? 3 : i < 16 ? 4 : i < 20 ? 5 : 6;
  const numTagged = Math.floor(Math.random() * 4);
  const tagged = camperNames.slice(0, numTagged);
  return {
    id: i + 1,
    alt: `Camp photo ${i + 1}`,
    colorKey: colorKeys[i],
    folder: mediaFolders[folderIdx],
    taggedCampers: tagged,
    tagStatus: numTagged > 0 ? 'tagged' : i % 3 === 0 ? 'pending' : 'untagged',
    uploadDate: `Mar ${Math.max(1, 12 - Math.floor(i / 3))}, 2026`,
  };
});

export const mockCamperFaces: CamperFace[] = camperNames.map((name, i) => ({
  id: `camper-${i}`,
  name,
  photoCount: Math.floor(Math.random() * 15) + 3,
  lastSeen: `Mar ${Math.max(1, 12 - i)}, 2026`,
  status: i < 8 ? 'verified' : 'suggested',
}));
