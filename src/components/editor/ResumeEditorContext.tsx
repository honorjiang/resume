/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import type { ResumeImportAiConfig } from '../../types/resume-import';
import type {
  ResumeAiEditLookup,
  ResumeAiEditedField,
  ResumeAiTextActionParams,
} from '../../types/resume-ai';
import type { ResumeProfile } from '../../types/resume';

type ResumeEditorContextValue = {
  isEditing: boolean;
  updateResume: (updater: (draft: ResumeProfile) => void) => void;
  aiConfig: ResumeImportAiConfig;
  canUseAi: boolean;
  activeAiActionKey: string | null;
  activeAiActionLabel: string | null;
  updateAiConfig: (patch: Partial<ResumeImportAiConfig>) => void;
  runAiTextAction: (params: ResumeAiTextActionParams) => Promise<string>;
  markAiEditedFields: (entries: Record<string, ResumeAiEditedField>) => void;
  clearAiEditedField: (fieldPath: string, prefix?: boolean) => void;
  getAiEditedState: (
    fieldPath: string | undefined,
    currentValue?: string,
    prefix?: boolean,
  ) => ResumeAiEditLookup;
};

const ResumeEditorContext = createContext<ResumeEditorContextValue | null>(null);

type ResumeEditorProviderProps = {
  children: ReactNode;
  value: ResumeEditorContextValue;
};

export function ResumeEditorProvider({
  children,
  value,
}: ResumeEditorProviderProps) {
  return (
    <ResumeEditorContext.Provider value={value}>
      {children}
    </ResumeEditorContext.Provider>
  );
}

export function useResumeEditor() {
  const context = useContext(ResumeEditorContext);

  if (!context) {
    throw new Error('useResumeEditor must be used inside ResumeEditorProvider.');
  }

  return context;
}
