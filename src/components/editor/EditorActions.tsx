import { Plus, Trash2 } from 'lucide-react';
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
  if (!isEditing) {
    return null;
  }

  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {isEmpty ? (
        <p className="text-sm text-slate-500">{emptyMessage ?? '当前还没有内容。'}</p>
      ) : (
        <span className="text-sm text-slate-500">编辑模式下可以新增或删除当前模块内容。</span>
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
      删除
    </Button>
  );
}
