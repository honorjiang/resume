import {
  Archive,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

type ApplicationStatus =
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'withdrawn';

type ApplicationFilter = 'all' | 'active' | 'interview' | 'offer' | 'closed';

type ApplicationRecord = {
  id: string;
  company: string;
  role: string;
  location: string;
  channel: string;
  status: ApplicationStatus;
  priority: 'high' | 'medium' | 'low';
  appliedAt: string;
  nextActionAt: string;
  contact: string;
  compensation: string;
  notes: string;
  archived: boolean;
  updatedAt: string;
};

type ApplicationTrackerModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const STORAGE_KEY = 'resume-application-tracker';

const statusOptions: Array<{
  value: ApplicationStatus;
  label: string;
  tone: string;
}> = [
  { value: 'applied', label: '已投递', tone: 'bg-slate-100 text-slate-700' },
  { value: 'screening', label: '筛选中', tone: 'bg-blue-50 text-blue-700' },
  { value: 'interview', label: '面试中', tone: 'bg-violet-50 text-violet-700' },
  { value: 'offer', label: 'Offer', tone: 'bg-emerald-50 text-emerald-700' },
  { value: 'rejected', label: '未通过', tone: 'bg-rose-50 text-rose-700' },
  { value: 'withdrawn', label: '已放弃', tone: 'bg-amber-50 text-amber-700' },
];

const filterOptions: Array<{
  value: ApplicationFilter;
  label: string;
}> = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '进行中' },
  { value: 'interview', label: '面试' },
  { value: 'offer', label: 'Offer' },
  { value: 'closed', label: '已关闭' },
];

const priorityLabels = {
  high: '重点',
  medium: '普通',
  low: '观察',
} as const;

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadApplications() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as ApplicationRecord[]) : [];
  } catch {
    return [];
  }
}

function getStatusOption(status: ApplicationStatus) {
  return (
    statusOptions.find((option) => option.value === status) ?? statusOptions[0]
  );
}

function isActiveApplication(application: ApplicationRecord) {
  return ['applied', 'screening', 'interview'].includes(application.status);
}

function isClosedApplication(application: ApplicationRecord) {
  return ['rejected', 'withdrawn'].includes(application.status);
}

function fieldValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return statusOptions.some((option) => option.value === value);
}

function isPriority(value: unknown): value is ApplicationRecord['priority'] {
  return value === 'high' || value === 'medium' || value === 'low';
}

function textValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeImportedApplications(value: unknown) {
  const source = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && Array.isArray((value as { applications?: unknown }).applications)
      ? (value as { applications: unknown[] }).applications
      : [];

  return source
    .map((entry) => {
      const item = entry && typeof entry === 'object'
        ? (entry as Partial<ApplicationRecord>)
        : null;

      if (!item) {
        return null;
      }

      const company = textValue(item.company);
      const role = textValue(item.role);

      if (!company || !role) {
        return null;
      }

      return {
        id: textValue(item.id) || createId(),
        company,
        role,
        location: textValue(item.location, '待确认') || '待确认',
        channel: textValue(item.channel, '官网投递') || '官网投递',
        status: isApplicationStatus(item.status) ? item.status : 'applied',
        priority: isPriority(item.priority) ? item.priority : 'medium',
        appliedAt: textValue(item.appliedAt) || today(),
        nextActionAt: textValue(item.nextActionAt),
        contact: textValue(item.contact),
        compensation: textValue(item.compensation),
        notes: textValue(item.notes),
        archived: Boolean(item.archived),
        updatedAt: textValue(item.updatedAt) || new Date().toISOString(),
      } satisfies ApplicationRecord;
    })
    .filter((item): item is ApplicationRecord => Boolean(item));
}

function downloadJsonFile(value: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ApplicationTrackerModal({
  isOpen,
  onClose,
}: ApplicationTrackerModalProps) {
  const [applications, setApplications] =
    useState<ApplicationRecord[]>(loadApplications);
  const [activeFilter, setActiveFilter] = useState<ApplicationFilter>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const editingApplication = editingId
    ? applications.find((a) => a.id === editingId) ?? null
    : null;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  }, [applications]);

  const stats = useMemo(() => {
    const liveApplications = applications.filter((item) => !item.archived);

    return {
      total: liveApplications.length,
      active: liveApplications.filter(isActiveApplication).length,
      offers: liveApplications.filter((item) => item.status === 'offer').length,
      interviews: liveApplications.filter((item) => item.status === 'interview')
        .length,
      overdue: liveApplications.filter(
        (item) =>
          isActiveApplication(item) &&
          item.nextActionAt &&
          item.nextActionAt < today(),
      ).length,
      archived: applications.filter((item) => item.archived).length,
    };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return applications
      .filter((application) => showArchived || !application.archived)
      .filter((application) => {
        if (!normalizedQuery) {
          return true;
        }

        return [
          application.company,
          application.role,
          application.location,
          application.channel,
          application.contact,
          application.compensation,
          application.notes,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .filter((application) => {
        switch (activeFilter) {
          case 'active':
            return isActiveApplication(application);
          case 'interview':
            return application.status === 'interview';
          case 'offer':
            return application.status === 'offer';
          case 'closed':
            return isClosedApplication(application);
          default:
            return true;
        }
      })
      .sort((left, right) => {
        const leftDate = left.nextActionAt || left.appliedAt;
        const rightDate = right.nextActionAt || right.appliedAt;
        return leftDate.localeCompare(rightDate);
      });
  }, [activeFilter, applications, searchQuery, showArchived]);

  function handleAddApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const nextRecord: ApplicationRecord = {
      id: createId(),
      company: fieldValue(formData, 'company'),
      role: fieldValue(formData, 'role'),
      location: fieldValue(formData, 'location') || '待确认',
      channel: fieldValue(formData, 'channel') || '官网投递',
      status: 'applied',
      priority: (fieldValue(formData, 'priority') || 'medium') as
        | 'high'
        | 'medium'
        | 'low',
      appliedAt: fieldValue(formData, 'appliedAt') || today(),
      nextActionAt: fieldValue(formData, 'nextActionAt'),
      contact: fieldValue(formData, 'contact'),
      compensation: fieldValue(formData, 'compensation'),
      notes: fieldValue(formData, 'notes'),
      archived: false,
      updatedAt: new Date().toISOString(),
    };

    if (!nextRecord.company || !nextRecord.role) {
      return;
    }

    setApplications((current) => [nextRecord, ...current]);
    setIsAdding(false);
    event.currentTarget.reset();
  }

  function handleEditApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;

    const formData = new FormData(event.currentTarget);
    const company = fieldValue(formData, 'company');
    const role = fieldValue(formData, 'role');

    if (!company || !role) return;

    updateApplication(editingId, {
      company,
      role,
      location: fieldValue(formData, 'location') || '待确认',
      channel: fieldValue(formData, 'channel') || '官网投递',
      priority: (fieldValue(formData, 'priority') || 'medium') as 'high' | 'medium' | 'low',
      appliedAt: fieldValue(formData, 'appliedAt') || today(),
      nextActionAt: fieldValue(formData, 'nextActionAt'),
      contact: fieldValue(formData, 'contact'),
      compensation: fieldValue(formData, 'compensation'),
      notes: fieldValue(formData, 'notes'),
    });
    setEditingId(null);
  }

  function updateApplication(
    id: string,
    patch: Partial<Omit<ApplicationRecord, 'id'>>,
  ) {
    setApplications((current) =>
      current.map((application) =>
        application.id === id
          ? {
              ...application,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : application,
      ),
    );
  }

  function deleteApplication(id: string) {
    const application = applications.find((item) => item.id === id);
    const confirmed = window.confirm(
      application
        ? `确认删除「${application.company} · ${application.role}」？`
        : '确认删除这条投递记录？',
    );

    if (!confirmed) {
      return;
    }

    setApplications((current) =>
      current.filter((application) => application.id !== id),
    );
  }

  function handleExportApplications() {
    downloadJsonFile(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        applications,
      },
      `resume-application-tracker-${today()}.json`,
    );
  }

  async function handleImportApplications(file: File) {
    try {
      const text = await file.text();
      const importedApplications = normalizeImportedApplications(JSON.parse(text));

      if (!importedApplications.length) {
        window.alert('未识别到有效投递记录。');
        return;
      }

      setApplications((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        const normalized = importedApplications.map((item) => {
          if (!existingIds.has(item.id)) {
            existingIds.add(item.id);
            return item;
          }

          const nextItem = {
            ...item,
            id: createId(),
          };
          existingIds.add(nextItem.id);
          return nextItem;
        });

        return [...normalized, ...current];
      });
    } catch {
      window.alert('导入失败，请确认文件是投递追踪导出的 JSON。');
    }
  }

  function handleClearApplications() {
    if (!window.confirm('确认清空全部投递记录？此操作无法撤销。')) {
      return;
    }

    setApplications([]);
    setActiveFilter('all');
    setSearchQuery('');
    setShowArchived(false);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="投递追踪"
      description="管理求职投递、面试阶段、后续动作与归档记录。"
    >
      <div className="flex max-h-[92vh] flex-col bg-slate-50/90">
        <div className="border-b border-[var(--line)] bg-white px-6 py-5 pr-16">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                <BriefcaseBusiness className="size-4" />
                <span>Applications</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-slate-950">
                投递追踪
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                跟进公司、岗位、阶段和下一步动作，数据仅保存在当前浏览器。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => importInputRef.current?.click()}
                icon={<Upload className="size-4" />}
              >
                导入
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!applications.length}
                onClick={handleExportApplications}
                icon={<Download className="size-4" />}
              >
                导出
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsAdding((current) => !current)}
                icon={<Plus className="size-4" />}
              >
                新增投递
              </Button>
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleImportApplications(file);
                }
                event.currentTarget.value = '';
              }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
                <span className="text-[11px] text-slate-500">全部</span>
                <span className="text-xs font-semibold text-slate-800">
                  {stats.total}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-medium text-blue-700">
                <span className="size-1.5 rounded-full bg-blue-500" />
                进行中 {stats.active}
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-medium text-violet-700">
                <span className="size-1.5 rounded-full bg-violet-500" />
                面试 {stats.interviews}
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Offer {stats.offers}
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-medium text-rose-700">
                <span className="size-1.5 rounded-full bg-rose-500" />
                待跟进 {stats.overdue}
              </div>

              <div className="min-w-4 flex-1" />

              <Button
                type="button"
                variant={showArchived ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowArchived((current) => !current)}
                icon={<Archive className="size-4" />}
              >
                {showArchived ? '隐藏归档' : `显示归档 ${stats.archived}`}
              </Button>
            </div>
          </div>

          {isAdding ? (
            <form
              onSubmit={handleAddApplication}
              className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="grid gap-4 lg:grid-cols-4">
                <label className="block lg:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    公司
                  </span>
                  <input
                    name="company"
                    required
                    placeholder="例如：棱镜科技"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    岗位
                  </span>
                  <input
                    name="role"
                    required
                    placeholder="例如：AI 产品负责人"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    城市
                  </span>
                  <input
                    name="location"
                    placeholder="上海 / 远程"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    渠道
                  </span>
                  <input
                    name="channel"
                    placeholder="官网 / Boss / 内推"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    投递日期
                  </span>
                  <input
                    name="appliedAt"
                    type="date"
                    defaultValue={today()}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    下一步
                  </span>
                  <input
                    name="nextActionAt"
                    type="date"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    优先级
                  </span>
                  <select
                    name="priority"
                    defaultValue="medium"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  >
                    <option value="high">重点</option>
                    <option value="medium">普通</option>
                    <option value="low">观察</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    联系人
                  </span>
                  <input
                    name="contact"
                    placeholder="HR / 猎头 / 内推人"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    薪资范围
                  </span>
                  <input
                    name="compensation"
                    placeholder="例如：60-80k / 面议"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </label>
                <label className="block lg:col-span-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    备注
                  </span>
                  <textarea
                    name="notes"
                    rows={3}
                    placeholder="记录 JD 关键词、面试安排、跟进动作。"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAdding(false)}
                >
                  取消
                </Button>
                <Button type="submit" size="sm" icon={<Plus className="size-4" />}>
                  保存投递
                </Button>
              </div>
            </form>
          ) : null}

          {editingApplication ? (
            <form
              onSubmit={handleEditApplication}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 text-sm font-semibold text-slate-900">
                编辑投递 · {editingApplication.company}
              </div>
              <div className="grid gap-4 lg:grid-cols-4">
                <label className="block lg:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    公司
                  </span>
                  <input
                    name="company"
                    required
                    defaultValue={editingApplication.company}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    岗位
                  </span>
                  <input
                    name="role"
                    required
                    defaultValue={editingApplication.role}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    城市
                  </span>
                  <input
                    name="location"
                    defaultValue={editingApplication.location}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    渠道
                  </span>
                  <input
                    name="channel"
                    defaultValue={editingApplication.channel}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    投递日期
                  </span>
                  <input
                    name="appliedAt"
                    type="date"
                    defaultValue={editingApplication.appliedAt}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    下一步
                  </span>
                  <input
                    name="nextActionAt"
                    type="date"
                    defaultValue={editingApplication.nextActionAt}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    优先级
                  </span>
                  <select
                    name="priority"
                    defaultValue={editingApplication.priority}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  >
                    <option value="high">重点</option>
                    <option value="medium">普通</option>
                    <option value="low">观察</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    联系人
                  </span>
                  <input
                    name="contact"
                    defaultValue={editingApplication.contact}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    薪资范围
                  </span>
                  <input
                    name="compensation"
                    defaultValue={editingApplication.compensation}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </label>
                <label className="block lg:col-span-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    备注
                  </span>
                  <textarea
                    name="notes"
                    rows={3}
                    defaultValue={editingApplication.notes}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingId(null)}
                >
                  取消
                </Button>
                <Button type="submit" size="sm" icon={<Pencil className="size-4" />}>
                  保存修改
                </Button>
              </div>
            </form>
          ) : (
          <>
          <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="搜索公司、岗位、城市、联系人或备注"
                className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setActiveFilter(option.value)}
                  className={[
                    'rounded-full border px-4 py-2 text-sm font-medium transition',
                    activeFilter === option.value
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {filteredApplications.length ? (
            <div className="grid gap-4">
              {filteredApplications.map((application) => {
                const status = getStatusOption(application.status);

                return (
                  <article
                    key={application.id}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={[
                              'rounded-full px-3 py-1 text-xs font-semibold',
                              status.tone,
                            ].join(' ')}
                          >
                            {status.label}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {priorityLabels[application.priority]}
                          </span>
                          {application.archived ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                              已归档
                            </span>
                          ) : null}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-slate-950">
                          {application.company}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {application.role} · {application.location} ·{' '}
                          {application.channel}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingId(application.id)}
                          icon={<Pencil className="size-4" />}
                        >
                          编辑
                        </Button>
                        <select
                          value={application.status}
                          onChange={(event) =>
                            updateApplication(application.id, {
                              status: event.target.value as ApplicationStatus,
                            })
                          }
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            updateApplication(application.id, {
                              archived: !application.archived,
                            })
                          }
                          icon={<Archive className="size-4" />}
                        >
                          {application.archived ? '取消归档' : '归档'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteApplication(application.id)}
                          className="text-rose-600 hover:text-rose-700"
                          icon={<Trash2 className="size-4" />}
                        >
                          删除
                        </Button>
                      </div>
                    </div>

                    {editingId !== application.id ? (
                    <>
                    <div className="mt-5 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          <ClipboardList className="size-4" />
                          投递
                        </div>
                        <p className="mt-2 text-slate-800">
                          {application.appliedAt}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          <CalendarClock className="size-4" />
                          下一步
                        </div>
                        <p className="mt-2 text-slate-800">
                          {application.nextActionAt || '待安排'}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          <CheckCircle2 className="size-4" />
                          条件
                        </div>
                        <p className="mt-2 text-slate-800">
                          {application.compensation || '待确认'}
                        </p>
                      </div>
                    </div>

                    {(application.contact || application.notes) && (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-600">
                        {application.contact ? (
                          <p>
                            <span className="font-semibold text-slate-800">
                              联系：
                            </span>
                            {application.contact}
                          </p>
                        ) : null}
                        {application.notes ? <p>{application.notes}</p> : null}
                      </div>
                    )}
                    </>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <BriefcaseBusiness className="size-5" />
              </div>
              <p className="mt-4 text-base font-semibold text-slate-950">
                暂无投递记录
              </p>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                添加公司与岗位后，可以在这里追踪阶段、下一步动作和归档状态。
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-5"
                onClick={() => setIsAdding(true)}
                icon={<Plus className="size-4" />}
              >
                新增投递
              </Button>
            </div>
          )}

          {applications.length ? (
            <div className="mt-6 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleClearApplications();
                }}
                icon={<RotateCcw className="size-4" />}
              >
                清空投递记录
              </Button>
            </div>
          ) : null}
          </>
          )}
        </div>
      </div>
    </Modal>
  );
}
