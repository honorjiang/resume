import type { ResumeImportAiConfig } from './resume-import';

export type ResumeAiTextAction = 'polish' | 'star';

export type ResumeAiEditedAction = ResumeAiTextAction | 'optimize';

export type ResumeAiTextFormat = 'short' | 'paragraph' | 'lines';

export type ResumeAiTextRewriteResult = {
  rewrittenText: string;
  notes: string[];
};

export type ResumeAtsRiskLevel = 'high' | 'medium' | 'low';

export type ResumeAtsRisk = {
  title: string;
  section: string;
  severity: ResumeAtsRiskLevel;
  detail: string;
};

export type ResumeAtsSuggestion = {
  title: string;
  priority: ResumeAtsRiskLevel;
  detail: string;
};

export type ResumeAtsReport = {
  overallScore: number;
  summary: string;
  strengths: string[];
  missingKeywords: string[];
  risks: ResumeAtsRisk[];
  suggestions: ResumeAtsSuggestion[];
};

export type ResumeOptimizationPatch = {
  path: string;
  label: string;
  currentValue: string;
  suggestedValue: string;
  reason: string;
};

export type ResumeOptimizationResult = {
  summary: string;
  targetRole: string;
  keywordCoverage: string[];
  warnings: string[];
  patches: ResumeOptimizationPatch[];
};

export type ResumeAiTextActionParams = {
  actionKey: string;
  action: ResumeAiTextAction;
  value: string;
  fieldPath?: string;
  sectionLabel?: string;
  fieldLabel?: string;
  contextHint?: string;
  format?: ResumeAiTextFormat;
};

export type ResumeAiEditedField = {
  action: ResumeAiEditedAction;
  value: string;
};

export type ResumeAiEditLookup = {
  isAiEdited: boolean;
  label: string | null;
};

export type ResumeAiTextRequest = Omit<ResumeAiTextActionParams, 'actionKey'> & {
  config: ResumeImportAiConfig;
};

export type ResumeAtsCheckRequest = {
  config: ResumeImportAiConfig;
  resumeJson: string;
  targetRole?: string;
  jobDescription?: string;
};

export type ResumeJobOptimizationRequest = ResumeAtsCheckRequest & {
  allowedPatchesJson: string;
};
