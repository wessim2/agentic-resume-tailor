export interface ProjectVaultItem {
  id: string;
  title: string;
  role?: string;
  techStack: string[];
  bullets: string[];
  tags: string[];
  url?: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  period: string;
  location?: string;
  bullets: string[];
  techStack?: string[];
}

export interface CandidateBio {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: Record<string, string>;
  summary?: string;
}

export interface MasterSkills {
  languages?: string[];
  frameworks?: string[];
  tools?: string[];
  databases?: string[];
  concepts?: string[];
  [category: string]: string[] | undefined;
}

export interface UserProfile {
  candidate: CandidateBio;
  projectVault: ProjectVaultItem[];
  experiences?: ExperienceItem[];
  masterSkills?: MasterSkills;
  certifications?: string[];
}
