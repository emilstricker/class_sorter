export type Gender = 'Boy' | 'Girl' | 'Other' | 'Unknown';
export type Level = 1 | 2 | 3 | 4 | 5;

export interface Student {
  id: string;
  name: string;
  photoUrl: string;
  gender: Gender;
  abilityLevel: Level;
  socialSkill: Level;
  behavioralIntensity: Level;
  supportLevel: Level;
  friendships: string[]; // List of student IDs
  conflicts: string[]; // List of student IDs
  classId: string | null; // null means unassigned
  notes?: string;
  isLocked?: boolean;
  isDSA?: boolean; // Dansk som andetsprog (ESL)
  isSPS?: boolean; // + 9 (Special Needs)
  isMedical?: boolean;
  wishes?: string[]; // Prioritized list of student IDs
  avoidNestClass?: boolean;
  preferNestClass?: boolean;
}

export interface ClassInfo {
  id: string;
  name: string;
  maxInternal?: number;
  externalSlots?: number;
}
