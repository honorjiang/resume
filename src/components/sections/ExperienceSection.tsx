import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, FolderKanban, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ExperienceItem, ProjectItem } from '../../types/resume';
import { useLanguageMode } from '../../hooks/useLanguageMode';
import { EditorRemoveButton, EditorSectionActions } from '../editor/EditorActions';
import { EditableText } from '../editor/EditableText';
import {
  formatCommaList,
  formatLineList,
  parseCommaList,
  parseLineList,
} from '../editor/list-format';
import { createExperienceDraft, createProjectDraft } from '../editor/resume-draft-factories';
import { useResumeEditor } from '../editor/ResumeEditorContext';
import { Section } from '../layout/Section';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

type ExperienceSectionProps = {
  items: ExperienceItem[];
  projects: ProjectItem[];
};

type ProjectEntry = {
  project: ProjectItem;
  projectId: string;
  projectIndex: number;
};

type ActiveProjectModal =
  | {
      kind: 'experience';
      experienceIndex: number;
    }
  | {
      kind: 'unassigned';
    };

export function ExperienceSection({
  items,
  projects,
}: ExperienceSectionProps) {
  const { isEditing, updateResume, getAiEditedState } = useResumeEditor();
  const { t } = useLanguageMode();
  const [activeProjectModal, setActiveProjectModal] =
    useState<ActiveProjectModal | null>(null);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(
    () => new Set(),
  );
  const projectEntries = useMemo<ProjectEntry[]>(
    () =>
      projects.map((project, projectIndex) => ({
        project,
        projectId: project.id ?? project.name,
        projectIndex,
      })),
    [projects],
  );
  const projectEntriesById = useMemo(
    () =>
      new Map(
        projectEntries.map((entry) => [entry.projectId, entry]),
      ),
    [projectEntries],
  );
  const assignedProjectIds = useMemo(() => {
    const assignedIds = new Set<string>();

    items.forEach((item) => {
      item.relatedProjectIds?.forEach((projectId) => {
        if (projectEntriesById.has(projectId)) {
          assignedIds.add(projectId);
        }
      });
    });

    return assignedIds;
  }, [items, projectEntriesById]);
  const unassignedProjectEntries = useMemo(
    () => projectEntries.filter((entry) => !assignedProjectIds.has(entry.projectId)),
    [assignedProjectIds, projectEntries],
  );
  const activeExperience =
    activeProjectModal?.kind === 'experience'
      ? items[activeProjectModal.experienceIndex]
      : null;
  const activeProjectEntries =
    activeProjectModal?.kind === 'unassigned'
      ? unassignedProjectEntries
      : activeExperience
        ? getRelatedProjectEntries(activeExperience)
        : [];
  const activeModalTitle = activeExperience
    ? `${activeExperience.company} ${t('editor.projectCount')}`
    : activeProjectModal?.kind === 'unassigned'
      ? t('editor.unassignedProjectsTitle')
      : t('editor.projectCount');
  const activeModalSubtitle = activeExperience
    ? `${activeExperience.role} · ${activeExperience.period}`
    : t('editor.unassignedProjectsDescription');

  function getRelatedProjectCount(item: ExperienceItem) {
    return getRelatedProjectEntries(item).length;
  }

  function getRelatedProjectEntries(item: ExperienceItem) {
    const seenProjectIds = new Set<string>();

    return (item.relatedProjectIds ?? [])
      .map((projectId) => projectEntriesById.get(projectId))
      .filter((entry): entry is ProjectEntry => {
        if (!entry || seenProjectIds.has(entry.projectId)) {
          return false;
        }

        seenProjectIds.add(entry.projectId);
        return true;
      });
  }

  function handleProjectDetailToggle(projectId: string) {
    setExpandedProjectIds((current) => {
      const next = new Set(current);

      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }

      return next;
    });
  }

  return (
    <Section id="experience" eyebrow={t('section.experienceEyebrow')} title={t('section.experience')} className="bg-slate-50/80">
      <EditorSectionActions
        isEditing={isEditing}
        addLabel={t('editor.addExperience')}
        isEmpty={!items.length}
        emptyMessage={t('editor.experienceEmpty')}
        onAdd={() =>
          updateResume((draft) => {
            draft.experience.push(createExperienceDraft());
          })
        }
      />

      <div className="relative pl-6 before:absolute before:bottom-0 before:left-[11px] before:top-3 before:w-px before:bg-slate-200 sm:pl-8 sm:before:left-[15px]">
        <div className="space-y-10">
          {items.map((item, index) => {
            const relatedProjectCount = getRelatedProjectCount(item);
            const isDarkCard = index % 2 === 0;
            const cardClass = isDarkCard
              ? 'border-slate-700 bg-slate-800 text-white shadow-[0_24px_60px_rgba(15,23,42,0.12)] hover:shadow-[0_30px_70px_rgba(15,23,42,0.16)]'
              : 'border-[var(--line)] bg-white text-slate-950 shadow-[0_24px_60px_rgba(15,23,42,0.06)] hover:shadow-[0_28px_64px_rgba(15,23,42,0.1)]';
            const titleClass = isDarkCard ? 'text-white' : 'text-slate-950';
            const metaClass = isDarkCard ? 'text-slate-300' : 'text-slate-600';
            const mutedClass = isDarkCard ? 'text-slate-400' : 'text-slate-500';
            const bodyClass = isDarkCard ? 'text-slate-300' : 'text-slate-600';
            const listClass = isDarkCard ? 'text-slate-200' : 'text-slate-700';
            const dividerClass = isDarkCard ? 'border-white/10' : 'border-slate-200';
            const editLabelClass = isDarkCard ? 'text-slate-200' : 'text-slate-800';
            const editPanelClass = isDarkCard
              ? 'rounded-2xl border border-white/10 bg-black/25 p-4 shadow-inner'
              : '';
            const editInputClass = isDarkCard
              ? '!border-white/15 !bg-slate-700/70 !text-slate-50 shadow-inner placeholder:!text-slate-400 focus:!border-sky-300/40'
              : '';
            const removeButtonClass = isDarkCard
              ? '!text-slate-300 hover:!bg-white/10 hover:!text-rose-200'
              : '';
            const projectButtonClass = isDarkCard
              ? '!border-white/15 !bg-white/10 !text-white hover:!border-white/25 hover:!bg-white/15'
              : '';

            return (
              <motion.article
                key={item.id ?? `${item.company}-${item.period}-${index}`}
                initial={{ opacity: 0, x: 18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
                className="relative print-avoid-break"
              >
                <span className="absolute -left-6 top-3 inline-flex size-6 items-center justify-center rounded-full border border-[var(--accent-soft)] bg-white shadow-sm sm:-left-8 sm:size-8">
                  <span className="size-2 rounded-full bg-[var(--accent)] sm:size-2.5" />
                </span>
                <div
                  className={[
                    'rounded-3xl border p-6 transition duration-300 hover:-translate-y-1',
                    cardClass,
                  ].join(' ')}
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <EditableText
                          value={item.company}
                          onChange={(value) =>
                            updateResume((draft) => {
                              draft.experience[index].company = value;
                            })
                          }
                          displayAs="h3"
                          displayClassName={`text-xl font-semibold ${titleClass}`}
                          inputClassName={[
                            'text-xl font-semibold text-slate-950',
                            editInputClass,
                          ].join(' ')}
                        />
                        {isEditing ? (
                          <EditorRemoveButton
                            className={removeButtonClass}
                            onRemove={() =>
                              updateResume((draft) => {
                                draft.experience.splice(index, 1);
                              })
                            }
                          />
                        ) : null}
                      </div>
                      <div
                        className={[
                          'flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium',
                          metaClass,
                        ].join(' ')}
                      >
                        <EditableText
                          value={item.role}
                          fieldPath={`experience.${index}.role`}
                          onChange={(value) =>
                            updateResume((draft) => {
                              draft.experience[index].role = value;
                            })
                          }
                          displayAs="p"
                          displayClassName={`text-sm font-medium ${metaClass}`}
                          inputClassName={[
                            'min-w-[12rem] text-sm font-medium text-slate-600',
                            editInputClass,
                          ].join(' ')}
                        />
                        <EditableText
                          value={item.location ?? ''}
                          onChange={(value) =>
                            updateResume((draft) => {
                              draft.experience[index].location = value || undefined;
                            })
                          }
                          placeholder={t('editor.locationPlaceholder')}
                          displayAs="p"
                          displayClassName={`text-sm font-medium ${mutedClass}`}
                          inputClassName={[
                            'min-w-[10rem] text-sm font-medium text-slate-500',
                            editInputClass,
                          ].join(' ')}
                        />
                      </div>
                      <EditableText
                        value={item.summary ?? ''}
                        fieldPath={`experience.${index}.summary`}
                        onChange={(value) =>
                          updateResume((draft) => {
                            draft.experience[index].summary = value || undefined;
                          })
                        }
                        placeholder={t('editor.placeholderSummary')}
                        multiline
                        rows={3}
                        displayAs="p"
                        displayClassName={`max-w-3xl text-sm leading-7 ${bodyClass}`}
                        inputClassName={[
                          'max-w-3xl text-sm leading-7 text-slate-600',
                          editInputClass,
                        ].join(' ')}
                      />
                    </div>
                    <div className="space-y-3 lg:w-[16rem] lg:text-right">
                      <EditableText
                        value={item.period}
                        onChange={(value) =>
                          updateResume((draft) => {
                            draft.experience[index].period = value;
                          })
                        }
                        displayAs="p"
                        displayClassName={`text-sm font-semibold ${mutedClass}`}
                        inputClassName={[
                          'text-sm font-semibold text-slate-500',
                          editInputClass,
                        ].join(' ')}
                      />
                      {isEditing ? (
                        <EditableText
                          value={formatCommaList(item.tags)}
                          onChange={(value) =>
                            updateResume((draft) => {
                              draft.experience[index].tags = parseCommaList(value);
                            })
                          }
                          multiline
                          rows={3}
                          placeholder={t('editor.placeholderTags')}
                          inputClassName={[
                            'text-sm text-slate-600',
                            editInputClass,
                          ].join(' ')}
                        />
                      ) : item.tags?.length ? (
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          {item.tags.map((tag) => (
                            <Badge key={tag} tone={isDarkCard ? 'inverse' : 'default'}>
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className={['mt-6 space-y-4', editPanelClass].join(' ')}>
                      <div>
                        <p className={`mb-2 text-sm font-semibold ${editLabelClass}`}>{t('editor.achievementsList')}</p>
                        <EditableText
                          value={formatLineList(item.achievements)}
                          fieldPath={`experience.${index}.achievements`}
                          fieldPathPrefix
                          onChange={(value) =>
                            updateResume((draft) => {
                              draft.experience[index].achievements = parseLineList(value);
                            })
                          }
                          multiline
                          rows={6}
                          placeholder={t('editor.achievementsTextarea')}
                          inputClassName={[
                            'text-sm leading-7 text-slate-700',
                            editInputClass,
                          ].join(' ')}
                        />
                      </div>
                    </div>
                  ) : (
                    <ul className="mt-6 grid gap-3">
                      {item.achievements.map((achievement, achievementIndex) => (
                        <li
                          key={`${achievement}-${achievementIndex}`}
                          className={[
                            'flex gap-3 text-sm leading-7',
                            listClass,
                          ].join(' ')}
                        >
                          <span className="mt-3 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                          <span
                            className={
                              getAiEditedState(
                                `experience.${index}.achievements.${achievementIndex}`,
                                achievement,
                              ).isAiEdited
                                ? 'resume-ai-edited-text'
                                : undefined
                            }
                          >
                            {achievement}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {relatedProjectCount > 0 ? (
                    <div
                      className={[
                        'no-print mt-6 flex flex-wrap gap-3 border-t pt-5',
                        dividerClass,
                      ].join(' ')}
                    >
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        icon={isEditing && !unassignedProjectEntries.length ? <Plus className="size-4" /> : <FolderKanban className="size-4" />}
                        className={projectButtonClass}
                        onClick={() =>
                          setActiveProjectModal({
                            kind: 'experience',
                            experienceIndex: index,
                          })
                        }
                      >
                        {t('editor.projectCount')} ({relatedProjectCount})
                      </Button>
                    </div>
                  ) : null}
                </div>
              </motion.article>
            );
          })}
          {unassignedProjectEntries.length || isEditing ? (
            <motion.article
              initial={{ opacity: 0, x: 18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="no-print relative"
            >
              <span className="absolute -left-6 top-3 inline-flex size-6 items-center justify-center rounded-full border border-amber-200 bg-white shadow-sm sm:-left-8 sm:size-8">
                <span className="size-2 rounded-full bg-amber-500 sm:size-2.5" />
              </span>
              <div className="rounded-3xl border border-dashed border-amber-200 bg-amber-50/70 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-amber-950">
                      {t('editor.unassignedProjectsTitle')}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      {t('editor.unassignedProjectsDescription')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={isEditing && !unassignedProjectEntries.length ? <Plus className="size-4" /> : <FolderKanban className="size-4" />}
                    onClick={() => setActiveProjectModal({ kind: 'unassigned' })}
                  >
                    {isEditing && !unassignedProjectEntries.length
                      ? t('editor.addProject')
                      : `${t('editor.projectCount')} (${unassignedProjectEntries.length})`}
                  </Button>
                </div>
              </div>
            </motion.article>
          ) : null}
        </div>
      </div>

      <Modal
        isOpen={Boolean(activeProjectModal)}
        onClose={() => setActiveProjectModal(null)}
        title={activeModalTitle}
        description={t('projectModal.description')}
      >
        <div className="flex min-h-0 flex-col bg-slate-50">
          <div className="border-b border-slate-200 bg-white px-6 py-5 pr-16">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              {t('editor.projectCount')}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">
              {activeExperience?.company ?? t('editor.noProjectEntries')}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {activeModalSubtitle}
            </p>
          </div>

          <div className="min-h-0 overflow-y-auto p-6">
            {activeProjectEntries.length ? (
              <div className="space-y-4">
                {activeProjectEntries.map(({ project, projectId, projectIndex }, modalProjectIndex) => {
                  const isExpanded = expandedProjectIds.has(projectId);
                  const isDarkProjectCard = modalProjectIndex % 2 === 0;
                  const projectCardClass = isDarkProjectCard
                    ? 'border-slate-700 bg-slate-800 text-white shadow-[0_18px_44px_rgba(15,23,42,0.12)]'
                    : 'border-slate-200 bg-white text-slate-950 shadow-sm';
                  const projectTitleClass = isDarkProjectCard
                    ? 'text-white'
                    : 'text-slate-950';
                  const projectTextClass = isDarkProjectCard
                    ? 'text-slate-300'
                    : 'text-slate-600';
                  const projectMetaClass = isDarkProjectCard
                    ? 'text-slate-300'
                    : 'text-slate-700';
                  const projectMutedClass = isDarkProjectCard
                    ? 'text-slate-400'
                    : 'text-slate-500';
                  const projectHeadingClass = isDarkProjectCard
                    ? 'text-slate-200'
                    : 'text-slate-800';
                  const projectToggleClass = isDarkProjectCard
                    ? '!text-slate-200 hover:!bg-white/10 hover:!text-white'
                    : '';
                  const projectEditInputClass = isDarkProjectCard
                    ? '!border-white/15 !bg-slate-700/70 !text-slate-50 shadow-inner placeholder:!text-slate-400 focus:!border-sky-300/40'
                    : '';

                  return (
                    <article
                      key={project.id ?? `${project.name}-${projectIndex}`}
                      className={[
                        'rounded-2xl border p-5',
                        projectCardClass,
                      ].join(' ')}
                    >
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                          <EditableText
                            value={project.name}
                            onChange={(value) =>
                              updateResume((draft) => {
                                draft.projects[projectIndex].name = value;
                              })
                            }
                            displayAs="h3"
                            displayClassName={`text-lg font-semibold ${projectTitleClass}`}
                            inputClassName={[
                              'text-lg font-semibold text-slate-950',
                              projectEditInputClass,
                            ].join(' ')}
                          />
                          {isEditing ? (
                            <EditorRemoveButton
                              className={isDarkProjectCard ? '!text-slate-300 hover:!bg-white/10 hover:!text-rose-200' : ''}
                              onRemove={() =>
                                updateResume((draft) => {
                                  const deletedId = draft.projects[projectIndex].id;
                                  draft.projects.splice(projectIndex, 1);
                                  draft.experience.forEach((exp) => {
                                    if (exp.relatedProjectIds) {
                                      exp.relatedProjectIds = exp.relatedProjectIds.filter(
                                        (id) => id !== deletedId,
                                      );
                                    }
                                  });
                                })
                              }
                            />
                          ) : null}
                          </div>
                          <EditableText
                            value={project.summary ?? ''}
                            fieldPath={`projects.${projectIndex}.summary`}
                            onChange={(value) =>
                              updateResume((draft) => {
                                draft.projects[projectIndex].summary = value;
                              })
                            }
                            placeholder={t('editor.placeholderProjectSummary')}
                            multiline
                            rows={3}
                            displayAs="p"
                            displayClassName={`text-sm leading-7 ${projectTextClass}`}
                            inputClassName={[
                              'text-sm leading-7 text-slate-600',
                              projectEditInputClass,
                            ].join(' ')}
                          />
                        </div>

                        <div className="space-y-3 lg:text-right">
                          <EditableText
                            value={project.role}
                            fieldPath={`projects.${projectIndex}.role`}
                            onChange={(value) =>
                              updateResume((draft) => {
                                draft.projects[projectIndex].role = value;
                              })
                            }
                            displayAs="p"
                            displayClassName={`text-sm font-semibold ${projectMetaClass}`}
                            inputClassName={[
                              'text-sm font-semibold text-slate-700',
                              projectEditInputClass,
                            ].join(' ')}
                          />
                          <EditableText
                            value={project.period ?? ''}
                            onChange={(value) =>
                              updateResume((draft) => {
                                draft.projects[projectIndex].period =
                                  value || undefined;
                              })
                            }
                            placeholder={t('editor.placeholderSubtitle')}
                            displayAs="p"
                            displayClassName={`text-sm ${projectMutedClass}`}
                            inputClassName={[
                              'text-sm text-slate-500',
                              projectEditInputClass,
                            ].join(' ')}
                          />
                          {isEditing ? (
                            <EditableText
                              value={formatCommaList(project.tags)}
                              onChange={(value) =>
                                updateResume((draft) => {
                                  draft.projects[projectIndex].tags =
                                    parseCommaList(value);
                                })
                              }
                              multiline
                              rows={3}
                              placeholder={t('editor.placeholderTags')}
                              inputClassName={[
                                'text-sm text-slate-600',
                                projectEditInputClass,
                              ].join(' ')}
                            />
                          ) : project.tags?.length ? (
                            <div className="flex flex-wrap gap-2 lg:justify-end">
                              {project.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  tone={isDarkProjectCard ? 'inverse' : 'default'}
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          icon={
                            isExpanded ? (
                              <ChevronUp className="size-4" />
                            ) : (
                              <ChevronDown className="size-4" />
                            )
                          }
                          aria-expanded={isExpanded}
                          onClick={() => handleProjectDetailToggle(projectId)}
                          className={projectToggleClass}
                        >
                          {isExpanded ? t('editor.hideDetails') : t('editor.showDetails')}
                        </Button>
                      </div>

                      <div
                        className={
                          isExpanded
                            ? 'mt-5 grid gap-5 lg:grid-cols-2'
                            : 'hidden'
                        }
                      >
                        <div className="lg:col-span-2">
                          <p className={`text-sm font-semibold ${projectHeadingClass}`}>
                            {t('editor.projectBackground')}
                          </p>
                          <div className="mt-2">
                            <EditableText
                              value={project.background}
                              fieldPath={`projects.${projectIndex}.background`}
                              onChange={(value) =>
                                updateResume((draft) => {
                                  draft.projects[projectIndex].background = value;
                                })
                              }
                              multiline
                              rows={4}
                              displayAs="p"
                              displayClassName={`text-sm leading-7 ${projectTextClass}`}
                              inputClassName={[
                                'text-sm leading-7 text-slate-600',
                                projectEditInputClass,
                              ].join(' ')}
                            />
                          </div>
                        </div>

                        <div>
                          <p className={`text-sm font-semibold ${projectHeadingClass}`}>
                            {t('editor.projectActions')}
                          </p>
                          {isEditing ? (
                            <div className="mt-3">
                              <EditableText
                                value={formatLineList(project.actions)}
                                fieldPath={`projects.${projectIndex}.actions`}
                                fieldPathPrefix
                                onChange={(value) =>
                                  updateResume((draft) => {
                                    draft.projects[projectIndex].actions =
                                      parseLineList(value);
                                  })
                                }
                                multiline
                                rows={6}
                                placeholder={t('editor.actionsTextarea')}
                                inputClassName={[
                                  'text-sm leading-7 text-slate-600',
                                  projectEditInputClass,
                                ].join(' ')}
                              />
                            </div>
                          ) : (
                            <ul className={`mt-3 grid gap-2 text-sm leading-7 ${projectTextClass}`}>
                              {project.actions.map((action, actionIndex) => (
                                <li
                                  key={`${action}-${actionIndex}`}
                                  className="flex gap-3"
                                >
                                  <span className="mt-3 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                                  <span
                                    className={
                                      getAiEditedState(
                                        `projects.${projectIndex}.actions.${actionIndex}`,
                                        action,
                                      ).isAiEdited
                                        ? 'resume-ai-edited-text'
                                        : undefined
                                    }
                                  >
                                    {action}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div>
                          <p className={`text-sm font-semibold ${projectHeadingClass}`}>
                            {t('editor.projectOutcomes')}
                          </p>
                          {isEditing ? (
                            <div className="mt-3">
                              <EditableText
                                value={formatLineList(project.outcomes)}
                                fieldPath={`projects.${projectIndex}.outcomes`}
                                fieldPathPrefix
                                onChange={(value) =>
                                  updateResume((draft) => {
                                    draft.projects[projectIndex].outcomes =
                                      parseLineList(value);
                                  })
                                }
                                multiline
                                rows={6}
                                placeholder={t('editor.outcomesTextarea')}
                                inputClassName={[
                                  'text-sm leading-7 text-slate-600',
                                  projectEditInputClass,
                                ].join(' ')}
                              />
                            </div>
                          ) : (
                            <ul className={`mt-3 grid gap-2 text-sm leading-7 ${projectTextClass}`}>
                              {project.outcomes.map((outcome, outcomeIndex) => (
                                <li
                                  key={`${outcome}-${outcomeIndex}`}
                                  className="flex gap-3"
                                >
                                  <span className="mt-3 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                                  <span
                                    className={
                                      getAiEditedState(
                                        `projects.${projectIndex}.outcomes.${outcomeIndex}`,
                                        outcome,
                                      ).isAiEdited
                                        ? 'resume-ai-edited-text'
                                        : undefined
                                    }
                                  >
                                    {outcome}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                {t('editor.noProjectEntries')}
              </div>
            )}
            {isEditing ? (
              <div className="flex justify-center pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={<Plus className="size-4" />}
                  onClick={() =>
                    updateResume((draft) => {
                      const newProject = createProjectDraft(false);
                      draft.projects.push(newProject);
                      if (activeProjectModal?.kind === 'experience') {
                        const exp = draft.experience[activeProjectModal.experienceIndex];
                        if (exp) {
                          if (!exp.relatedProjectIds) {
                            exp.relatedProjectIds = [];
                          }
                          exp.relatedProjectIds.push(newProject.id);
                        }
                      }
                    })
                  }
                >
                  {t('editor.addProject')}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </Modal>
    </Section>
  );
}
