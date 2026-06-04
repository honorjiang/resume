export interface LayoutBlockOverride {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  pageId?: string;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
  locked?: boolean;
}

export interface LayoutOverrideModel {
  version: number;
  blockOverrides: Record<string, LayoutBlockOverride>;
}

export const emptyLayoutOverrideModel: LayoutOverrideModel = {
  version: 1,
  blockOverrides: {},
};
