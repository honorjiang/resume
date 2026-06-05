import type { ResumeProfile } from './resume';
import type {
  ResumeAtsRiskLevel,
  ResumeOptimizationPatch,
} from './resume-ai';

export type ResumeVersion = {
  id: string;
  name: string;
  targetRole: string;
  jobDescription: string;
  createdAt: string;
  updatedAt: string;
  resume: ResumeProfile;
  patches: ResumeOptimizationPatch[];
  keywordCoverage: string[];
  atsScore?: number;
  notes?: string;
};

export type ResumeMaterialCategory =
  | 'achievement'
  | 'project'
  | 'skill'
  | 'highlight';

export type ResumeEvidenceScore = {
  score: number;
  hasMetric: boolean;
  hasContext: boolean;
  hasAction: boolean;
  hasResult: boolean;
  missing: string[];
};

export type ResumeMaterialItem = {
  id: string;
  category: ResumeMaterialCategory;
  sourceLabel: string;
  title: string;
  content: string;
  path: string;
  tags: string[];
  metric?: string;
  evidenceLevel: ResumeAtsRiskLevel;
  evidence: ResumeEvidenceScore;
};

export type ResumeInterviewPrompt = {
  id: string;
  sourceLabel: string;
  sourceText: string;
  questions: string[];
  evidence: ResumeEvidenceScore;
};

export type AtsChecklistItem = {
  id: string;
  title: string;
  detail: string;
  severity: ResumeAtsRiskLevel;
  sectionLabel: string;
  sectionId: string;
  source: 'risk' | 'suggestion' | 'keyword';
};
