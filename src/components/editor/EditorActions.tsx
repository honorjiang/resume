import { Plus, Trash2 } from 'lucide-react';
import { useLanguageMode } from '../../hooks/useLanguageMode';
import { Button } from '../ui/Button';

type EditorSectionActionsProps = {
  isEditing: boolean;
  addLabel: string;
  onAdd: () => void;
  isEmpty?: boolean;
  emptyMessage?: string;
};

export function EditorSectionActions({
  isEditing,
  addLabel,
  onAdd,
  isEmpty = false,
  emptyMessage,
}: EditorSectionActionsProps) {
  const { t } = useLanguageMode();

  if (!isEditing) {
    return null;
  }

  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {isEmpty ? (
        <p className="text-sm text-slate-500">
          {emptyMessage ?? t('editor.emptyMessage')}
        </p>
      ) : (
        <span className="text-sm text-slate-500">
          {t('editor.editModeHint')}
        </span>
      )}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onAdd}
        icon={<Plus className="size-4" />}
      >
        {addLabel}
      </Button>
    </div>
  );
}

type EditorRemoveButtonProps = {
  onRemove: () => void;
  className?: string;
};

export function EditorRemoveButton({
  onRemove,
  className,
}: EditorRemoveButtonProps) {
  const { t } = useLanguageMode();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onRemove}
      className={['shrink-0 text-slate-500 hover:text-rose-600', className]
        .filter(Boolean)
        .join(' ')}
      icon={<Trash2 className="size-4" />}
    >
      {t('editor.delete')}
    </Button>
  );
}
