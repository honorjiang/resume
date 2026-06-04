import { Download, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

type PreviewState = {
  title: string;
  subtitle: string;
  url: string;
  downloadName?: string;
} | null;

type PdfPreviewModalProps = {
  isOpen: boolean;
  preview: PreviewState;
  onClose: () => void;
};

export function PdfPreviewModal({
  isOpen,
  preview,
  onClose,
}: PdfPreviewModalProps) {
  if (!preview) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={preview.title}
      description={preview.subtitle}
    >
      <div className="flex flex-col gap-4 border-b border-[var(--line)] py-4 pl-6 pr-16 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">{preview.title}</p>
          {preview.subtitle ? (
            <p className="mt-1 text-sm text-slate-500">{preview.subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            href={preview.url}
            download={preview.downloadName}
            variant="secondary"
            size="sm"
            icon={<Download className="size-4" />}
          >
            下载 PDF
          </Button>
          <Button
            href={preview.url}
            target="_blank"
            rel="noreferrer"
            variant="secondary"
            size="sm"
            icon={<ExternalLink className="size-4" />}
          >
            新标签打开
          </Button>
        </div>
      </div>

      <div className="min-h-[65vh] bg-slate-100 p-3 sm:p-4">
        <object
          data={preview.url}
          type="application/pdf"
          className="h-[65vh] w-full rounded-2xl bg-white shadow-lg"
        >
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="text-base font-medium text-slate-900">
              当前浏览器不支持内嵌 PDF 预览。
            </p>
            <p className="max-w-md text-sm leading-6 text-slate-600">
              可以通过新标签页直接打开 PDF，或下载到本地查看。
            </p>
            <Button
              href={preview.url}
              download={preview.downloadName}
              variant="primary"
              size="sm"
            >
              下载或打开 PDF
            </Button>
          </div>
        </object>
      </div>
    </Modal>
  );
}
