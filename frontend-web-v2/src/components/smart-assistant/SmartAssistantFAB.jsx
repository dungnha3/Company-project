import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import SmartAssistantModal from './SmartAssistantModal';

export default function SmartAssistantFAB({ project, projectId, sprint }) {
    const [isOpen, setIsOpen] = useState(false);

    // Resolve projectId (stably — no early return before hooks)
    const resolvedProjectId = project?.projectId || projectId;

    // Fetch project info if not provided — enabled=false when project is already provided
    const { data: fetchedProject } = useQuery({
        queryKey: ['project-minimal', resolvedProjectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PROJECTS.BY_ID(resolvedProjectId))).data,
        enabled: !!(resolvedProjectId && resolvedProjectId > 0 && !project),
        retry: false,
    });

    // Fetch active sprint if not provided
    const { data: activeSprint } = useQuery({
        queryKey: ['project-active-sprint', resolvedProjectId],
        queryFn: async () => {
            const sprints = (await apiClient.get(ENDPOINTS.SPRINTS.BY_PROJECT(resolvedProjectId))).data;
            return (sprints || []).find(s => s.status === 'ACTIVE') || null;
        },
        enabled: !!(resolvedProjectId && resolvedProjectId > 0 && !sprint),
        retry: false,
    });

    const resolvedProject = project || fetchedProject;
    const resolvedSprint = sprint || activeSprint;

    // Early return only AFTER all hooks have been called
    if (!resolvedProjectId || resolvedProjectId < 0) return null;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 shadow-xl hover:shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
                title="Trợ lý thông minh"
            >
                <i className="fa-solid fa-robot text-white text-xl group-hover:animate-bounce" />
            </button>

            {isOpen && (
                <SmartAssistantModal
                    project={resolvedProject}
                    sprint={resolvedSprint}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
