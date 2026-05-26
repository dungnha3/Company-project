import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import SmartAssistantModal from './SmartAssistantModal';

export default function SmartAssistantFAB({ project, projectId, sprint }) {
    const [isOpen, setIsOpen] = useState(false);

    // Resolve projectId
    const resolvedProjectId = project?.projectId || projectId;

    // If project is not fully loaded, fetch minimal info
    const { data: projectData } = useQuery({
        queryKey: ['project-minimal', resolvedProjectId],
        queryFn: async () => (await apiClient.get(`/api/projects/${resolvedProjectId}`)).data,
        enabled: !!resolvedProjectId && !project,
    });

    const resolvedProject = project || projectData;

    if (!resolvedProjectId) return null;

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
                    sprint={sprint}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
