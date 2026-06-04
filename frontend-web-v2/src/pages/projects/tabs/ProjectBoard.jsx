import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    useDroppable,
    useDraggable,
    pointerWithin,
    rectIntersection,
} from '@dnd-kit/core';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { useTimerStore, fireTaskCompleted, fireTaskStopped, calculateWorkingSeconds } from '@shared/stores/timerStore';
import { useAccessControl } from '@shared/hooks/useAccessControl';
import IssueDetailModal from '../components/IssueDetailModal';
import CreateIssueModal from '../components/CreateIssueModal';
import TimeLogSection from '../components/TimeLogSection';
import BoardTimeLogPanel from '../components/BoardTimeLogPanel';
import QuickReviewModal from '../components/QuickReviewModal';
import SubmitTaskModal from '../components/SubmitTaskModal';
import SmartAssistantFAB from '@components/smart-assistant/SmartAssistantFAB';
import { ExportButton, ImportButton } from '@shared/components/ui/index';

// Statuses considered "forward" (not rework)
const FORWARD_STATUSES = new Set(['Review', 'Done', 'Testing', 'test', 'review', 'done', 'kiểm tra', 'đánh giá', 'hoàn thành']);
// Statuses considered "backward" (rework trigger)
const BACKWARD_STATUSES = new Set(['In Progress', 'To Do', 'to do', 'in progress', 'progress', 'đang thực hiện', 'chưa bắt đầu', 'mở']);

function isBackwardMove(fromStatus, toStatus) {
    if (!fromStatus || !toStatus) return false;
    const oldLower = fromStatus.toLowerCase();
    const newLower = toStatus.toLowerCase();
    const isOldForward = [...FORWARD_STATUSES].some(s => oldLower.includes(s.toLowerCase()));
    const isNewBackward = [...BACKWARD_STATUSES].some(s => newLower.includes(s.toLowerCase()));
    return isOldForward && isNewBackward;
}

// ─── Fallback columns (used when API unavailable) ─────────────────────
const FALLBACK_STATUSES = [
    { statusId: 1, name: 'To Do', orderIndex: 1, color: '#94A3B8' },
    { statusId: 2, name: 'In Progress', orderIndex: 2, color: '#6366F1' },
    { statusId: 3, name: 'Review', orderIndex: 3, color: '#F59E0B' },
    { statusId: 4, name: 'Done', orderIndex: 4, color: '#10B981' },
];

// Map hex color to tailwind bg classes
function hexToColumnStyle(hex) {
    const colorMap = {
        '#94A3B8': { color: 'bg-gray-50', headerColor: 'bg-slate-200' },
        '#6366F1': { color: 'bg-blue-50/60', headerColor: 'bg-indigo-200' },
        '#F59E0B': { color: 'bg-amber-50/60', headerColor: 'bg-amber-200' },
        '#10B981': { color: 'bg-emerald-50/60', headerColor: 'bg-emerald-200' },
        '#EF4444': { color: 'bg-red-50/60', headerColor: 'bg-red-200' },
        '#8B5CF6': { color: 'bg-purple-50/60', headerColor: 'bg-purple-200' },
        '#EC4899': { color: 'bg-pink-50/60', headerColor: 'bg-pink-200' },
        '#06B6D4': { color: 'bg-cyan-50/60', headerColor: 'bg-cyan-200' },
        '#F97316': { color: 'bg-orange-50/60', headerColor: 'bg-orange-200' },
    };
    return colorMap[hex] || { color: 'bg-gray-50', headerColor: 'bg-gray-200' };
}

const COLUMN_COLORS = [
    { hex: '#6366F1', label: 'Indigo' },
    { hex: '#8B5CF6', label: 'Tím' },
    { hex: '#EC4899', label: 'Hồng' },
    { hex: '#EF4444', label: 'Đỏ' },
    { hex: '#F97316', label: 'Cam' },
    { hex: '#F59E0B', label: 'Vàng' },
    { hex: '#10B981', label: 'Xanh' },
    { hex: '#06B6D4', label: 'Cyan' },
    { hex: '#94A3B8', label: 'Xám' },
];

const PRIORITY_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'CRITICAL', label: 'Critical' },
    { value: 'HIGH', label: 'High' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'LOW', label: 'Low' },
];

const SWIMLANE_OPTIONS = [
    { value: 'none', label: 'Không phân nhóm', icon: 'fa-bars' },
    { value: 'assignee', label: 'Theo người thực hiện', icon: 'fa-users' },
    { value: 'priority', label: 'Theo độ ưu tiên', icon: 'fa-flag' },
];

// ─── WIP Limits persistence ───────────────────────────────────────────
function getWipLimits(projectId) {
    try {
        return JSON.parse(localStorage.getItem(`kanban-wip-${projectId}`)) || {};
    } catch { return {}; }
}

function saveWipLimits(projectId, limits) {
    localStorage.setItem(`kanban-wip-${projectId}`, JSON.stringify(limits));
}

// ════════════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ───────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════
export default function ProjectBoard({ project }) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // ── Drag state
    const [activeId, setActiveId] = useState(null);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [quickReviewIssueId, setQuickReviewIssueId] = useState(null);
    const [submitIssue, setSubmitIssue] = useState(null);
    const [reworkWarning, setReworkWarning] = useState(null);
    const [pendingMove, setPendingMove] = useState(null);
    const [penalizedIssues, setPenalizedIssues] = useState(new Set());

    // ── Filter state
    const [searchText, setSearchText] = useState('');
    const [filterMyIssues, setFilterMyIssues] = useState(false);
    const [filterPriority, setFilterPriority] = useState('');

    // ── Swimlane state
    const [swimlaneMode, setSwimlaneMode] = useState('none');

    // ── WIP Limits
    const [wipLimits, setWipLimits] = useState(() => getWipLimits(project.projectId));
    const [editingWipCol, setEditingWipCol] = useState(null);
    const [wipInput, setWipInput] = useState('');

    // ── Backlog panel
    const [showBacklog, setShowBacklog] = useState(false);

    // ── Time Log panel
    const [showTimeLog, setShowTimeLog] = useState(false);
    const [activeTimeLogIssueId, setActiveTimeLogIssueId] = useState(null);

    // ── Permissions
    const { hasPermission } = useAccessControl();
    const canManageIssues = hasPermission('PROJECT.MANAGE_ISSUES');
    const canManageAll = hasPermission('PROJECT.MANAGE_ALL');

    // ── Add column state
    const [showAddColumn, setShowAddColumn] = useState(false);
    const [newColName, setNewColName] = useState('');
    const [newColColor, setNewColColor] = useState('#6366F1');

    // Save WIP limits when changed
    useEffect(() => {
        saveWipLimits(project.projectId, wipLimits);
    }, [wipLimits, project.projectId]);

    // Auto-open time log panel when timer starts from Kanban drag
    useEffect(() => {
        const handler = (e) => {
            setShowTimeLog(true);
            setActiveTimeLogIssueId(e.detail.issueId);
        };
        window.addEventListener('auto-start-timer', handler);
        return () => window.removeEventListener('auto-start-timer', handler);
    }, []);

    // ── Fetch statuses (columns) from API
    const { data: statuses = FALLBACK_STATUSES } = useQuery({
        queryKey: ['issue-statuses'],
        queryFn: async () => {
            try {
                const response = (await apiClient.get(ENDPOINTS.ISSUE_STATUSES.LIST)).data;
                return response?.length > 0 ? response : FALLBACK_STATUSES;
            } catch { return FALLBACK_STATUSES; }
        },
        staleTime: 60000,
    });

    // ── Build dynamic columns from statuses
    const columns = useMemo(() =>
        statuses.map(s => ({
            id: s.name,
            statusId: s.statusId,
            title: s.name,
            ...hexToColumnStyle(s.color),
        })),
    [statuses]);

    const columnIds = useMemo(() => columns.map(c => c.id), [columns]);
    const statusNameToId = useMemo(() => {
        const map = {};
        statuses.forEach(s => { map[s.name] = s.statusId; });
        return map;
    }, [statuses]);

    // ── Fetch board issues — only from ACTIVE sprint (new board endpoint)
    const { data: projectIssues = [], isLoading: isLoadingProject } = useQuery({
        queryKey: ['issues', project.projectId, 'board'],
        queryFn: async () => {
            try {
                const response = (await apiClient.get(ENDPOINTS.ISSUES.BOARD(project.projectId), {
                    params: { size: 500 }
                })).data;
                return response?.content || response || [];
            } catch { return []; }
        },
        enabled: !filterMyIssues,
    });

    // When "Của tôi" is active, fetch from /my-issues instead
    const { data: myIssues = [], isLoading: isLoadingMy } = useQuery({
        queryKey: ['myIssues', 'filtered'],
        queryFn: async () => {
            try {
                const response = (await apiClient.get(ENDPOINTS.ISSUES.MY_ISSUES, {
                    params: { size: 500, sort: 'createdAt,desc' }
                })).data;
                return response?.content || response || [];
            } catch { return []; }
        },
        enabled: filterMyIssues,
    });

    // ── All issues (union of project + my-issues based on filter)
    const issues = filterMyIssues ? myIssues : projectIssues;
    const isLoading = filterMyIssues ? isLoadingMy : isLoadingProject;

    // ── Fetch backlog (Backlog + Sprint PLANNING — server-side filtered)
    const { data: backlogIssues = [] } = useQuery({
        queryKey: ['backlog-including-planning', project.projectId],
        queryFn: async () => {
            try {
                const response = (await apiClient.get(ENDPOINTS.ISSUES.BACKLOG_INCLUDE_PLANNING(project.projectId), {
                    params: { size: 200 }
                })).data;
                return response?.content || response || [];
            } catch { return []; }
        },
        enabled: !filterMyIssues && showBacklog,
    });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    // ── Dynamic collision detection
    const kanbanCollisionDetection = useCallback((args) => {
        const pointerCollisions = pointerWithin(args);
        if (pointerCollisions.length > 0) {
            const columnHit = pointerCollisions.find(c => columnIds.includes(c.id));
            if (columnHit) return [columnHit];
            return pointerCollisions;
        }
        return rectIntersection(args);
    }, [columnIds]);

    // ── Filter issues for Kanban columns ────────────────────────────────────────
    // Backend already returns only ACTIVE-sprint issues for the board endpoint.
    // The sprintId guard is kept as a safety net; it also filters the "My Issues"
    // overlay (which still hits /my-issues and may include issues from any sprint).
    const filteredIssues = useMemo(() => {
        let result = issues.filter(i => i.sprintId != null);
        // Only apply remaining client-side filters here
        if (filterPriority) {
            result = result.filter(i => i.priority === filterPriority);
        }
        if (searchText.trim()) {
            const q = searchText.toLowerCase().trim();
            result = result.filter(i =>
                i.title?.toLowerCase().includes(q) ||
                i.issueKey?.toLowerCase().includes(q) ||
                String(i.issueId).includes(q)
            );
        }
        return result;
    }, [issues, filterPriority, searchText]);

    // ── Group issues by status column
    const boardData = useMemo(() => {
        const grouped = {};
        columns.forEach(c => { grouped[c.id] = []; });
        filteredIssues.forEach(issue => {
            const statusName = issue.statusName || 'To Do';
            if (grouped[statusName]) grouped[statusName].push(issue);
            else if (grouped['To Do']) grouped['To Do'].push(issue);
            else {
                // Put in first column if To Do doesn't exist
                const firstCol = columns[0]?.id;
                if (firstCol && grouped[firstCol]) grouped[firstCol].push(issue);
            }
        });
        return grouped;
    }, [filteredIssues, columns]);

    // ── Swimlane grouping
    const getSwimlanes = useCallback((columnIssues) => {
        if (swimlaneMode === 'none') return [{ key: '__all__', label: null, issues: columnIssues }];

        const groups = {};
        if (swimlaneMode === 'assignee') {
            columnIssues.forEach(issue => {
                const key = issue.assigneeName || 'Chưa giao';
                if (!groups[key]) groups[key] = [];
                groups[key].push(issue);
            });
            // Sort: assigned first, then "Chưa giao" last
            const keys = Object.keys(groups).sort((a, b) => {
                if (a === 'Chưa giao') return 1;
                if (b === 'Chưa giao') return -1;
                return a.localeCompare(b);
            });
            return keys.map(key => ({ key, label: key, issues: groups[key] }));
        }

        if (swimlaneMode === 'priority') {
            columnIssues.forEach(issue => {
                const key = issue.priority || 'MEDIUM';
                if (!groups[key]) groups[key] = [];
                groups[key].push(issue);
            });
            const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
            return order
                .filter(k => groups[k]?.length > 0)
                .map(key => ({ key, label: key, issues: groups[key] }));
        }

        return [{ key: '__all__', label: null, issues: columnIssues }];
    }, [swimlaneMode]);

    // ── Status change mutation
    const moveIssueMutation = useMutation({
        mutationFn: ({ id, statusId, orderIndex }) => apiClient.patch(ENDPOINTS.ISSUES.UPDATE_STATUS_TO(id, statusId), null, {
            params: { orderIndex }
        }),
        onMutate: async ({ id, statusId, orderIndex }) => {
            await queryClient.cancelQueries({ queryKey: ['issues', project.projectId] });
            await queryClient.cancelQueries({ queryKey: ['myIssues', 'filtered'] });

            const snapshotIssues = queryClient.getQueryData(['issues', project.projectId]);
            const snapshotMy = queryClient.getQueryData(['myIssues', 'filtered']);

            queryClient.setQueryData(['issues', project.projectId], (old = []) =>
                old.map(issue =>
                    String(issue.issueId) === String(id)
                        ? { ...issue, statusId, statusName: statuses.find(s => s.statusId === statusId)?.name || issue.statusName }
                        : issue
                )
            );
            queryClient.setQueryData(['myIssues', 'filtered'], (old = []) =>
                old.map(issue =>
                    String(issue.issueId) === String(id)
                        ? { ...issue, statusId, statusName: statuses.find(s => s.statusId === statusId)?.name || issue.statusName }
                        : issue
                )
            );

            return { snapshotIssues, snapshotMy };
        },
        onError: (err, vars, context) => {
            showToast('Không thể cập nhật trạng thái', 'error');
            if (context?.snapshotIssues) {
                queryClient.setQueryData(['issues', project.projectId], context.snapshotIssues);
            }
            if (context?.snapshotMy) {
                queryClient.setQueryData(['myIssues', 'filtered'], context.snapshotMy);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            queryClient.invalidateQueries({ queryKey: ['myIssues'] });
            queryClient.invalidateQueries({ queryKey: ['myReportedIssues'] });
            queryClient.invalidateQueries({ queryKey: ['backlog-including-planning'] });
        },
        onSuccess: (data, variables) => {
            showToast('Đã cập nhật trạng thái', 'success');
            const reworkCount = data?.data?.reworkCount;
            if (reworkCount > 0 && variables?.applyPenalty) {
                showToast(`Rework! Đã bị trừ ${reworkCount} lần rework (-${reworkCount * 5}% điểm)`, 'warning', 4000);
            }
        },
    });

    // Listen to quick submit task button clicks from IssueCard
    useEffect(() => {
        const handler = (e) => {
            const { issue } = e.detail;
            if (issue.statusName !== 'Review' && issue.statusName !== 'Done') {
                setSubmitIssue(issue);
            }
        };
        window.addEventListener('submit-issue-kanban', handler);
        return () => window.removeEventListener('submit-issue-kanban', handler);
    }, []);

    // ── Drag handlers (supports both issue and column drags)
    const [dragType, setDragType] = useState(null); // 'Issue' or 'Column'

    const handleDragStart = useCallback((event) => {
        const type = event.active.data.current?.type || 'Issue';
        setDragType(type);
        setActiveId(event.active.id);
    }, []);

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        setActiveId(null);
        setDragType(null);
        if (!over) return;

        const activeType = active.data.current?.type || 'Issue';

        // ── Column reorder
        if (activeType === 'Column') {
            const activeColName = active.id;
            const overColName = over.id;
            if (activeColName !== overColName && columnIds.includes(String(overColName))) {
                const oldIdx = columns.findIndex(c => c.id === activeColName);
                const newIdx = columns.findIndex(c => c.id === overColName);
                if (oldIdx !== -1 && newIdx !== -1) {
                    const reordered = [...columns];
                    const [moved] = reordered.splice(oldIdx, 1);
                    reordered.splice(newIdx, 0, moved);
                    const payload = reordered.map((col, i) => ({ statusId: col.statusId, orderIndex: i }));
                    reorderColumnsMutation.mutate(payload);
                }
            }
            return;
        }

        // ── Issue status change
        const activeIssueId = active.id;
        const overId = over.id;

        let newStatusName = null;
        let newOrderIndex = null;

        if (columnIds.includes(overId)) {
            newStatusName = overId;
            newOrderIndex = boardData[overId]?.length || 0;
        } else {
            const overIssue = issues.find(i => i.issueId === overId);
            if (overIssue) {
                newStatusName = overIssue.statusName || 'To Do';
                const colIssues = boardData[newStatusName] || [];
                const overIndex = colIssues.findIndex(i => i.issueId === overId);
                newOrderIndex = overIndex >= 0 ? overIndex : 0;
            }
        }

        const activeIssue = issues.find(i => i.issueId === activeIssueId);
        if (activeIssue && newStatusName) {
            const statusId = statusNameToId[newStatusName];
            if (statusId) {
                // If dropping into "Done", show QuickReviewModal instead of mutating immediately
                if (activeIssue.statusName !== 'Done' && newStatusName === 'Done') {
                    setQuickReviewIssueId(activeIssueId);
                    return; // Stop here, wait for modal submission
                }

                // If dropping into "Review", show SubmitTaskModal instead of mutating immediately
                if (activeIssue.statusName !== 'Review' && newStatusName === 'Review') {
                    setSubmitIssue(activeIssue);
                    return; // Stop here, wait for modal submission
                }

                // Check if this is a backward move (rework)
                if (isBackwardMove(activeIssue.statusName, newStatusName)) {
                    const alreadyPenalized = penalizedIssues.has(activeIssue.issueId);
                    setReworkWarning({
                        issue: activeIssue,
                        fromStatus: activeIssue.statusName,
                        toStatus: newStatusName,
                        reworkCount: (activeIssue.reworkCount || 0) + 1,
                        penalty: ((activeIssue.reworkCount || 0) + 1) * 5,
                        alreadyPenalized,
                    });
                    setPendingMove({
                        id: activeIssue.issueId,
                        statusId,
                        orderIndex: newOrderIndex,
                        applyPenalty: !alreadyPenalized,
                    });
                    return; // Stop here, wait for confirmation
                }

                // If it's a different column, start timer if In Progress, or stop if moving out
                if (activeIssue.statusName !== newStatusName) {
                    if (newStatusName === 'In Progress') {
                        useTimerStore.getState().startTimer({
                            issueId: activeIssueId,
                            issueKey: activeIssue.issueKey,
                            issueTitle: activeIssue.title,
                        });
                    } else if (activeIssue.statusName === 'In Progress') {
                        fireTaskStopped(activeIssueId);
                    }
                }

                if (penalizedIssues.has(activeIssue.issueId)) {
                    setPenalizedIssues(prev => {
                        const next = new Set(prev);
                        next.delete(activeIssue.issueId);
                        return next;
                    });
                }

                moveIssueMutation.mutate({ id: activeIssueId, statusId, orderIndex: newOrderIndex });
            }
        }
    }, [issues, moveIssueMutation, columnIds, statusNameToId, columns, showToast, boardData, penalizedIssues]);

    const confirmReworkMove = () => {
        if (!pendingMove) return;
        if (pendingMove.applyPenalty) {
            setPenalizedIssues(prev => new Set([...prev, pendingMove.id]));
        }
        moveIssueMutation.mutate({
            id: pendingMove.id,
            statusId: pendingMove.statusId,
            orderIndex: pendingMove.orderIndex,
            applyPenalty: pendingMove.applyPenalty,
        });
        setReworkWarning(null);
        setPendingMove(null);
    };

    // ── Reorder columns mutation
    const reorderColumnsMutation = useMutation({
        mutationFn: async (payload) => {
            return (await apiClient.put(ENDPOINTS.ISSUE_STATUSES.REORDER, payload)).data;
        },
        onMutate: async (payload) => {
            await queryClient.cancelQueries({ queryKey: ['issue-statuses'] });
            const snapshot = queryClient.getQueryData(['issue-statuses']);
            queryClient.setQueryData(['issue-statuses'], (old = []) => {
                const reordered = [...old];
                payload.forEach(({ statusId, orderIndex }) => {
                    const col = reordered.find(c => c.statusId === statusId);
                    if (col) col.orderIndex = orderIndex;
                });
                return reordered.sort((a, b) => a.orderIndex - b.orderIndex);
            });
            return { snapshot };
        },
        onError: (err, vars, context) => {
            showToast('Không thể sắp xếp lại cột', 'error');
            if (context?.snapshot) {
                queryClient.setQueryData(['issue-statuses'], context.snapshot);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['issue-statuses'] });
        },
        onSuccess: (data) => {
            if (data) queryClient.setQueryData(['issue-statuses'], data);
            showToast('Đã sắp xếp lại cột', 'success');
        },
    });

    // ── Rename column mutation
    const renameColumnMutation = useMutation({
        mutationFn: async ({ statusId, name }) => {
            return (await apiClient.put(ENDPOINTS.ISSUE_STATUSES.UPDATE(statusId), { name })).data;
        },
        onMutate: async ({ statusId, name }) => {
            await queryClient.cancelQueries({ queryKey: ['issue-statuses'] });
            const snapshotStatuses = queryClient.getQueryData(['issue-statuses']);
            const snapshotIssues = queryClient.getQueryData(['issues', project.projectId]);

            queryClient.setQueryData(['issue-statuses'], (old = []) =>
                old.map(s => s.statusId === statusId ? { ...s, name } : s)
            );
            queryClient.setQueryData(['issues', project.projectId], (old = []) =>
                old.map(issue =>
                    issue.statusId === statusId ? { ...issue, statusName: name } : issue
                )
            );
            queryClient.setQueryData(['myIssues', 'filtered'], (old = []) =>
                old.map(issue =>
                    issue.statusId === statusId ? { ...issue, statusName: name } : issue
                )
            );

            return { snapshotStatuses, snapshotIssues };
        },
        onError: (err, vars, context) => {
            const status = err?.response?.status;
            if (status === 409) showToast('Tên cột đã tồn tại', 'error');
            else showToast('Không thể đổi tên cột', 'error');
            if (context?.snapshotStatuses) {
                queryClient.setQueryData(['issue-statuses'], context.snapshotStatuses);
            }
            if (context?.snapshotIssues) {
                queryClient.setQueryData(['issues', project.projectId], context.snapshotIssues);
                queryClient.setQueryData(['myIssues', 'filtered'], context.snapshotIssues);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['issue-statuses'] });
            queryClient.invalidateQueries({ queryKey: ['issues', project.projectId] });
            queryClient.invalidateQueries({ queryKey: ['issues', project.projectId, 'board'] });
            queryClient.invalidateQueries({ queryKey: ['myIssues', 'filtered'] });
        },
        onSuccess: () => {
            showToast('Đã đổi tên cột', 'success');
        },
    });

    // ── Add column mutation
    const addColumnMutation = useMutation({
        mutationFn: async () => {
            return (await apiClient.post(ENDPOINTS.ISSUE_STATUSES.CREATE, {
                name: newColName.trim(),
                color: newColColor,
            })).data;
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['issue-statuses'] });
            const snapshot = queryClient.getQueryData(['issue-statuses']);
            const optimisticCol = {
                statusId: Date.now(),
                name: newColName.trim(),
                color: newColColor,
                orderIndex: (snapshot?.length || 0),
                _optimistic: true,
            };
            queryClient.setQueryData(['issue-statuses'], (old = []) => [...old, optimisticCol]);
            return { snapshot };
        },
        onError: (err, vars, context) => {
            const status = err?.response?.status;
            if (status === 409) showToast('Tên cột đã tồn tại', 'error');
            else showToast('Không thể thêm cột', 'error');
            if (context?.snapshot) {
                queryClient.setQueryData(['issue-statuses'], context.snapshot);
            }
            setNewColName(newColName);
            setNewColColor(newColColor);
            setShowAddColumn(true);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['issue-statuses'] });
        },
        onSuccess: () => {
            setNewColName('');
            setNewColColor('#6366F1');
            setShowAddColumn(false);
            showToast('Đã thêm cột mới', 'success');
        },
    });

    // ── Delete column mutation
    const deleteColumnMutation = useMutation({
        mutationFn: async (statusId) => {
            await apiClient.delete(ENDPOINTS.ISSUE_STATUSES.DELETE(statusId));
        },
        onMutate: async (statusId) => {
            await queryClient.cancelQueries({ queryKey: ['issue-statuses'] });
            const snapshot = queryClient.getQueryData(['issue-statuses']);
            queryClient.setQueryData(['issue-statuses'], (old = []) =>
                old.filter(s => s.statusId !== statusId)
            );
            return { snapshot, deletedStatusId: statusId };
        },
        onError: (err, vars, context) => {
            const status = err?.response?.status;
            if (status === 409) showToast('Không thể xóa: cột còn chứa issue', 'error');
            else if (status === 403) showToast('Không thể xóa cột mặc định', 'error');
            else showToast('Không thể xóa cột', 'error');
            if (context?.snapshot) {
                queryClient.setQueryData(['issue-statuses'], context.snapshot);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['issue-statuses'] });
        },
        onSuccess: () => {
            showToast('Đã xóa cột', 'success');
        },
    });

    const handleDragCancel = useCallback(() => { setActiveId(null); setDragType(null); }, []);

    const activeIssue = activeId ? issues.find(i => i.issueId === activeId) : null;
    const activeColumn = (activeId && dragType === 'Column') ? columns.find(c => c.id === activeId) : null;

    // ── WIP limit helpers
    const handleSetWipLimit = (colId) => {
        const val = parseInt(wipInput, 10);
        if (!isNaN(val) && val >= 0) {
            setWipLimits(prev => ({ ...prev, [colId]: val === 0 ? undefined : val }));
        } else {
            // Remove limit
            setWipLimits(prev => { const n = { ...prev }; delete n[colId]; return n; });
        }
        setEditingWipCol(null);
        setWipInput('');
    };

    const activeFilterCount = [filterMyIssues, filterPriority, searchText.trim()].filter(Boolean).length;

    if (isLoading) return <LoadingBoard />;

    return (
        <>
            {/* ═══ Toolbar ═════════════════════════════════════════════════ */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                {/* Left: Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Backlog toggle */}
                    <button
                        onClick={() => setShowBacklog(p => !p)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-medium ${showBacklog
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <i className="fa-solid fa-inbox mr-1.5" />Backlog
                    </button>

                    {/* Time Log toggle */}
                    <button
                        onClick={() => setShowTimeLog(p => !p)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-medium ${showTimeLog
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <i className="fa-solid fa-clock mr-1.5" />Nhật ký
                    </button>

                    <div className="w-px h-6 bg-gray-200" />

                    {/* My Issues */}
                    <button
                        onClick={() => setFilterMyIssues(p => !p)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-medium ${filterMyIssues
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <i className="fa-solid fa-user mr-1.5" />Của tôi
                    </button>

                    {/* Priority filter */}
                    <select
                        value={filterPriority}
                        onChange={e => setFilterPriority(e.target.value)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-medium appearance-none cursor-pointer ${filterPriority
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'bg-white border-gray-200 text-gray-600'
                            }`}
                    >
                        {PRIORITY_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.value ? o.label : '⚡ Ưu tiên'}</option>
                        ))}
                    </select>

                    {/* Swimlane */}
                    <select
                        value={swimlaneMode}
                        onChange={e => setSwimlaneMode(e.target.value)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-medium appearance-none cursor-pointer ${swimlaneMode !== 'none'
                            ? 'bg-purple-50 border-purple-300 text-purple-700'
                            : 'bg-white border-gray-200 text-gray-600'
                            }`}
                    >
                        {SWIMLANE_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>

                    {/* Search */}
                    <div className="relative">
                        <i className="fa-solid fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            className="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 w-40 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-all"
                        />
                        {searchText && (
                            <button onClick={() => setSearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <i className="fa-solid fa-xmark text-[10px]" />
                            </button>
                        )}
                    </div>

                    {/* Active filter count */}
                    {activeFilterCount > 0 && (
                        <button
                            onClick={() => { setFilterMyIssues(false); setFilterPriority(''); setSearchText(''); }}
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                            <i className="fa-solid fa-filter-circle-xmark mr-1" />Xóa bộ lọc ({activeFilterCount})
                        </button>
                    )}
                </div>

                {/* Right: Count + Create */}
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                        {filteredIssues.length}{filteredIssues.length !== issues.length ? `/${issues.length}` : ''} công việc
                    </span>
                    {canManageIssues && (
                        <>
                            <ExportButton
                                endpoint={ENDPOINTS.EXPORT.ISSUES(project.projectId)}
                                filename={`CongViec_Project_${project.projectId}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '')}.xlsx`}
                                label="Xuất"
                                className="!bg-white !text-gray-600 hover:!bg-gray-100 !border !border-gray-200 !px-4 !py-1.5 !rounded-lg !text-sm !font-medium !transition-all !shadow-none"
                            />
                            <ImportButton
                                endpoint={`${ENDPOINTS.IMPORT.ISSUES}?projectId=${project.projectId}`}
                                templateEndpoint={ENDPOINTS.TEMPLATE.ISSUES}
                                templateFilename="Template_CongViec.xlsx"
                                label="Nhập"
                                onSuccess={() => {
                                    queryClient.invalidateQueries({ queryKey: ['issues', project.projectId] });
                                    queryClient.invalidateQueries({ queryKey: ['issues', project.projectId, 'board'] });
                                    queryClient.invalidateQueries({ queryKey: ['backlog-including-planning'] });
                                }}
                                className="!bg-white !text-gray-600 hover:!bg-gray-100 !border !border-gray-200 !px-4 !py-1.5 !rounded-lg !text-sm !font-medium !transition-all !shadow-none"
                            />
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <i className="fa-solid fa-plus" />
                                Tạo Issue
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ═══ Board ═══════════════════════════════════════════════════ */}
            {showTimeLog && (
                <div className="mb-4 bg-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-clock text-emerald-400" />
                            <span className="text-white font-semibold text-sm">Nhật ký giờ làm</span>
                        </div>
                        <button
                            onClick={() => setShowTimeLog(false)}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <i className="fa-solid fa-times" />
                        </button>
                    </div>
                    <BoardTimeLogPanel issueId={activeTimeLogIssueId} />
                </div>
            )}

            <DndContext
                sensors={sensors}
                collisionDetection={kanbanCollisionDetection}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-300px)]">
                    {/* Backlog Panel */}
                    {showBacklog && (
                        <BacklogPanel
                            issues={backlogIssues}
                            onIssueClick={setSelectedIssue}
                        />
                    )}

                    {/* Columns */}
                    {columns.map(col => (
                        <BoardColumn
                            key={col.id}
                            column={col}
                            issues={boardData[col.id] || []}
                            onIssueClick={setSelectedIssue}
                            wipLimit={wipLimits[col.id]}
                            isEditingWip={editingWipCol === col.id}
                            wipInput={wipInput}
                            onWipInputChange={setWipInput}
                            onRename={(newName) => renameColumnMutation.mutate({ statusId: col.statusId, name: newName })}
                            onStartEditWip={() => { setEditingWipCol(col.id); setWipInput(String(wipLimits[col.id] || '')); }}
                            onSaveWip={() => handleSetWipLimit(col.id)}
                            onCancelWip={() => { setEditingWipCol(null); setWipInput(''); }}
                            getSwimlanes={getSwimlanes}
                            swimlaneMode={swimlaneMode}
                            canDelete={canManageAll && col.title !== 'To Do' && col.title !== 'Done'}
                            onDelete={() => deleteColumnMutation.mutate(col.statusId)}
                        />
                    ))}

                    {/* Add Column */}
                    {canManageAll && (
                    <div className="flex-shrink-0 w-72">
                        {showAddColumn ? (
                            <div className="bg-white rounded-xl border-2 border-dashed border-indigo-200 p-4 space-y-3">
                                <h4 className="text-sm font-bold text-gray-700">Thêm cột mới</h4>
                                <input
                                    type="text"
                                    placeholder="Tên cột (ví dụ: Testing)"
                                    value={newColName}
                                    onChange={e => setNewColName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && newColName.trim()) addColumnMutation.mutate(); if (e.key === 'Escape') setShowAddColumn(false); }}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
                                    autoFocus
                                />
                                <div className="flex gap-1.5 flex-wrap">
                                    {COLUMN_COLORS.map(c => (
                                        <button
                                            key={c.hex}
                                            onClick={() => setNewColColor(c.hex)}
                                            className={`w-6 h-6 rounded-full border-2 transition-all ${newColColor === c.hex ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'}`}
                                            style={{ backgroundColor: c.hex }}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => newColName.trim() && addColumnMutation.mutate()}
                                        disabled={!newColName.trim() || addColumnMutation.isPending}
                                        className="flex-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                    >
                                        {addColumnMutation.isPending ? <i className="fa-solid fa-spinner fa-spin" /> : 'Thêm'}
                                    </button>
                                    <button
                                        onClick={() => { setShowAddColumn(false); setNewColName(''); }}
                                        className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                                    >
                                        Hủy
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAddColumn(true)}
                                className="w-full h-20 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 text-gray-400 hover:text-indigo-500 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                            >
                                <i className="fa-solid fa-plus" /> Thêm cột
                            </button>
                        )}
                    </div>
                    )}
                </div>

                <DragOverlay dropAnimation={null}>
                    {activeIssue && dragType === 'Issue' ? <IssueCard issue={activeIssue} isOverlay /> : null}
                    {activeColumn && dragType === 'Column' ? (
                        <div className="w-80 h-12 rounded-xl bg-indigo-100 border-2 border-indigo-400 shadow-xl flex items-center gap-2 px-4 opacity-90">
                            <i className="fa-solid fa-grip-vertical text-indigo-400" />
                            <span className={`w-2.5 h-2.5 rounded-full ${activeColumn.headerColor}`} />
                            <span className="text-sm font-bold text-indigo-700">{activeColumn.title}</span>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Issue Detail Modal */}
            {selectedIssue && (
                <IssueDetailModal
                    issue={selectedIssue}
                    onClose={() => setSelectedIssue(null)}
                    onUpdate={() => {
                        queryClient.invalidateQueries({ queryKey: ['issues'] });
                        queryClient.invalidateQueries({ queryKey: ['myIssues'] });
                        queryClient.invalidateQueries({ queryKey: ['myReportedIssues'] });
                        queryClient.invalidateQueries({ queryKey: ['backlog-including-planning'] });
                    }}
                />
            )}

            {/* Create Issue Modal */}
            <CreateIssueModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    setShowCreateModal(false);
                    queryClient.invalidateQueries({ queryKey: ['issues'] });
                    queryClient.invalidateQueries({ queryKey: ['myIssues'] });
                    queryClient.invalidateQueries({ queryKey: ['myReportedIssues'] });
                    queryClient.invalidateQueries({ queryKey: ['backlog-including-planning'] });
                }}
                defaultProjectId={project.projectId}
            />

            {/* Quick Review Modal */}
            {quickReviewIssueId && (
                <QuickReviewModal
                    issue={issues.find(i => i.issueId === quickReviewIssueId)}
                    onClose={() => setQuickReviewIssueId(null)}
                    onSuccess={() => {
                        // Auto-stop timer and log time when task is completed
                        fireTaskCompleted(quickReviewIssueId);
                        queryClient.invalidateQueries({ queryKey: ['issues'] });
                        queryClient.invalidateQueries({ queryKey: ['myIssues'] });
                        queryClient.invalidateQueries({ queryKey: ['myReportedIssues'] });
                        queryClient.invalidateQueries({ queryKey: ['backlog-including-planning'] });
                        setQuickReviewIssueId(null);
                    }}
                />
            )}

            {/* Rework Warning Modal */}
            {reworkWarning && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {reworkWarning.alreadyPenalized ? 'Di chuyển ngược' : 'Cảnh báo Rework'}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {reworkWarning.alreadyPenalized
                                    ? 'Task này đã bị phạt rework.'
                                    : 'Bạn đang kéo task ngược về'}
                            </p>
                        </div>
                        <div className="p-6">
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mr-2">
                                    {reworkWarning.issue.issueKey}
                                </span>
                                <span className="text-sm text-gray-700">{reworkWarning.issue.title}</span>
                            </div>
                            {!reworkWarning.alreadyPenalized && (
                                <div className="bg-red-50 rounded-lg p-4 mb-4">
                                    <p className="text-sm font-medium text-red-700">Ảnh hưởng đến điểm Performance</p>
                                    <div className="mt-2 space-y-1 text-sm">
                                        <div className="flex justify-between"><span className="text-gray-600">Rework lần này:</span><span className="font-medium text-red-600">-5%</span></div>
                                        <div className="flex justify-between"><span className="text-gray-600">Tổng penalty:</span><span className="font-medium text-red-600">-{reworkWarning.penalty}% điểm</span></div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                            <button
                                onClick={() => { setReworkWarning(null); setPendingMove(null); }}
                                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={confirmReworkMove}
                                disabled={moveIssueMutation.isPending}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                                Xác nhận Rework
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Submit Task Modal */}
            {submitIssue && (
                <SubmitTaskModal
                    issue={submitIssue}
                    onClose={() => setSubmitIssue(null)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['issues'] });
                        queryClient.invalidateQueries({ queryKey: ['myIssues'] });
                        queryClient.invalidateQueries({ queryKey: ['myReportedIssues'] });
                        queryClient.invalidateQueries({ queryKey: ['backlog-including-planning'] });
                        setSubmitIssue(null);
                    }}
                />
            )}

            <SmartAssistantFAB project={project} />
        </>
    );
}

// ════════════════════════════════════════════════════════════════════════
// ─── BACKLOG PANEL ────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════
function BacklogPanel({ issues, onIssueClick }) {
    const [collapsed, setCollapsed] = useState(false);

    const { planningSprints, unassignedIssues, totalPlanningCount } = useMemo(() => {
        const sprintGroupsMap = {};
        const unassigned = [];

        issues.forEach(issue => {
            if (issue.sprintId || issue.sprintName) {
                const key = issue.sprintId || issue.sprintName;
                if (!sprintGroupsMap[key]) {
                    sprintGroupsMap[key] = {
                        sprintId: issue.sprintId,
                        sprintName: issue.sprintName || `Sprint ${issue.sprintId}`,
                        issues: []
                    };
                }
                sprintGroupsMap[key].issues.push(issue);
            } else {
                unassigned.push(issue);
            }
        });

        // Convert map to array and sort sprints by sprintId
        const planningSprintsList = Object.values(sprintGroupsMap).sort((a, b) => {
            return (a.sprintId || 0) - (b.sprintId || 0);
        });

        // Sort issues within each sprint (by orderIndex, then by createdAt desc)
        planningSprintsList.forEach(group => {
            group.issues.sort((a, b) => {
                const orderA = a.orderIndex ?? 999999;
                const orderB = b.orderIndex ?? 999999;
                if (orderA !== orderB) return orderA - orderB;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
        });

        // Sort unassigned issues
        unassigned.sort((a, b) => {
            const orderA = a.orderIndex ?? 999999;
            const orderB = b.orderIndex ?? 999999;
            if (orderA !== orderB) return orderA - orderB;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return {
            planningSprints: planningSprintsList,
            unassignedIssues: unassigned,
            totalPlanningCount: issues.filter(i => i.sprintId || i.sprintName).length
        };
    }, [issues]);

    return (
        <div className={`flex-shrink-0 ${collapsed ? 'w-10' : 'w-72'} flex flex-col rounded-xl bg-slate-50 border border-slate-200 max-h-full transition-all duration-300 relative`}>
            {/* Header */}
            <div className="p-3 font-bold text-slate-600 flex justify-between items-center bg-slate-100/80 rounded-t-xl sticky top-0 text-sm">
                {!collapsed && (
                    <>
                        <span><i className="fa-solid fa-inbox mr-2 text-slate-400" />Backlog</span>
                        <span className="bg-white px-2 py-0.5 rounded-full text-xs text-slate-500 shadow-sm border border-slate-200">
                            {issues.length}
                        </span>
                    </>
                )}
                <button
                    onClick={() => setCollapsed(p => !p)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                    title={collapsed ? 'Mở Backlog' : 'Thu gọn'}
                >
                    <i className={`fa-solid ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`} />
                </button>
            </div>

            {!collapsed && (
                <div className="flex-1 p-2 overflow-y-auto custom-scrollbar space-y-4">
                    {issues.length === 0 ? (
                        <div className="text-xs text-slate-400 text-center py-8 italic">
                            Không có công việc nào trong backlog
                        </div>
                    ) : (
                        <>
                            {/* Section: Sắp diễn ra (Sprint PLANNING) */}
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                                        <i className="fa-solid fa-clock-rotate-left text-[9px]" /> Sắp diễn ra (Planning)
                                    </span>
                                    <span className="bg-indigo-50 border border-indigo-100 text-indigo-600 px-1.5 py-0.2 rounded-full text-[9px] font-bold">
                                        {totalPlanningCount}
                                    </span>
                                </div>
                                <div className="space-y-3 pl-1.5 border-l-2 border-indigo-100 ml-1">
                                    {planningSprints.length === 0 ? (
                                        <div className="text-[10px] text-slate-400 text-center py-3 bg-white/50 rounded-lg border border-dashed border-slate-200">
                                            Không có công việc nào sắp diễn ra
                                        </div>
                                    ) : (
                                        planningSprints.map(sprintGroup => (
                                            <div key={sprintGroup.sprintId || sprintGroup.sprintName} className="space-y-1.5">
                                                <div className="text-[9px] font-bold text-indigo-700 bg-indigo-50/70 border border-indigo-100/40 rounded px-1.5 py-0.5 flex items-center gap-1 select-none">
                                                    <i className="fa-solid fa-box-archive text-[8px] text-indigo-400" />
                                                    <span className="truncate">{sprintGroup.sprintName}</span>
                                                    <span className="ml-auto text-[8px] text-indigo-500 font-mono">({sprintGroup.issues.length})</span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {sprintGroup.issues.map(issue => (
                                                        <div key={issue.issueId} className="cursor-pointer" onClick={() => onIssueClick?.(issue)}>
                                                            <MiniIssueCard issue={issue} showSprintBadge={false} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-200/60 my-1" />

                            {/* Section: Chưa phân bổ (Backlog / sprint = null) */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                        <i className="fa-solid fa-folder-open text-[9px]" /> Chưa phân bổ
                                    </span>
                                    <span className="bg-slate-200/60 border border-slate-300/40 text-slate-600 px-1.5 py-0.2 rounded-full text-[9px] font-bold">
                                        {unassignedIssues.length}
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    {unassignedIssues.length === 0 ? (
                                        <div className="text-[10px] text-slate-400 text-center py-3 bg-white/50 rounded-lg border border-dashed border-slate-200">
                                            Không có công việc chưa phân bổ
                                        </div>
                                    ) : (
                                        unassignedIssues.map(issue => (
                                            <div key={issue.issueId} className="cursor-pointer" onClick={() => onIssueClick?.(issue)}>
                                                <MiniIssueCard issue={issue} showSprintBadge={false} />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function MiniIssueCard({ issue, showSprintBadge = true }) {
    return (
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 hover:shadow-sm transition-all text-xs">
            <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${getPriorityColor(issue.priority)}`}>
                    {issue.priority || 'MEDIUM'}
                </span>
                <span className="text-slate-400 font-mono text-[10px]">{issue.issueKey || `#${issue.issueId}`}</span>
            </div>
            <p className="text-slate-700 font-medium line-clamp-2 mb-2">{issue.title}</p>
            <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                {showSprintBadge ? (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                        issue.sprintName 
                            ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/50' 
                            : 'bg-slate-100 text-slate-500 border border-slate-200/50'
                    }`}>
                        <i className={`fa-solid ${issue.sprintName ? 'fa-layer-group' : 'fa-inbox'} text-[8px]`} />
                        {issue.sprintName || 'Chưa gán sprint'}
                    </span>
                ) : (
                    <span />
                )}
                {issue.assigneeName ? (
                    <div
                        className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[8px] font-bold"
                        title={`Người thực hiện: ${issue.assigneeName}`}
                    >
                        {issue.assigneeName.charAt(0).toUpperCase()}
                    </div>
                ) : (
                    <div 
                        className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-[8px]"
                        title="Chưa gán người thực hiện"
                    >
                        <i className="fa-solid fa-user text-[7px]" />
                    </div>
                )}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════
// ─── BOARD COLUMN ─────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════
function BoardColumn({
    column, issues, onIssueClick,
    wipLimit, isEditingWip, wipInput, onWipInputChange, onStartEditWip, onSaveWip, onCancelWip,
    getSwimlanes, swimlaneMode,
    canDelete, onDelete, onRename
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
        data: { type: 'Column', statusName: column.id },
    });

    // Column drag handle
    const { attributes: colDragAttrs, listeners: colDragListeners, setNodeRef: setDragRef, isDragging: isColDragging } = useDraggable({
        id: column.id,
        data: { type: 'Column', columnId: column.id },
    });

    // Inline rename state
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(column.title);

    const handleStartRename = () => {
        setRenameValue(column.title);
        setIsRenaming(true);
    };

    const handleSaveRename = () => {
        const trimmed = renameValue.trim();
        if (trimmed && trimmed !== column.title) {
            onRename?.(trimmed);
        }
        setIsRenaming(false);
    };

    const isOverWip = wipLimit && issues.length > wipLimit;
    const swimlanes = getSwimlanes(issues);

    return (
        <div className={`
            flex-shrink-0 w-80 flex flex-col rounded-xl max-h-full transition-all duration-200 group/col
            ${isColDragging ? 'opacity-30 scale-95' : ''}
            ${isOverWip ? 'ring-2 ring-red-300 bg-red-50/40' : column.color}
            ${isOver ? 'ring-2 ring-indigo-400 scale-[1.01] shadow-lg' : ''}
        `}>
            {/* Column Header */}
            <div className={`
                p-3 font-bold flex justify-between items-center rounded-t-xl mb-0.5 sticky top-0 backdrop-blur-sm z-10
                ${isOverWip ? 'bg-red-100/90 text-red-700' : 'bg-white/60 text-gray-700'}
            `}>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Drag handle */}
                    <button
                        ref={setDragRef}
                        {...colDragAttrs}
                        {...colDragListeners}
                        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing opacity-0 group-hover/col:opacity-100 transition-opacity flex-shrink-0"
                        title="Kéo để di chuyển cột"
                    >
                        <i className="fa-solid fa-grip-vertical text-xs" />
                    </button>
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${column.headerColor}`} />
                    {isRenaming ? (
                        <input
                            type="text"
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveRename(); if (e.key === 'Escape') setIsRenaming(false); }}
                            onBlur={handleSaveRename}
                            className="text-sm font-bold bg-white border border-indigo-300 rounded px-1.5 py-0.5 w-full min-w-0 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                            autoFocus
                        />
                    ) : (
                        <span
                            className="text-sm truncate cursor-default select-none"
                            onDoubleClick={handleStartRename}
                            title="Nhấn 2 lần để đổi tên"
                        >
                            {column.title}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    {/* WIP badge */}
                    {isEditingWip ? (
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                min="0"
                                value={wipInput}
                                onChange={e => onWipInputChange(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') onSaveWip(); if (e.key === 'Escape') onCancelWip(); }}
                                className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded text-center"
                                placeholder="∞"
                                autoFocus
                            />
                            <button onClick={onSaveWip} className="text-emerald-500 hover:text-emerald-700 text-xs">
                                <i className="fa-solid fa-check" />
                            </button>
                            <button onClick={onCancelWip} className="text-gray-400 hover:text-gray-600 text-xs">
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <span className={`
                                px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm border
                                ${isOverWip
                                    ? 'bg-red-500 text-white border-red-600 animate-pulse'
                                    : 'bg-white text-gray-500 border-gray-100'
                                }
                            `}>
                                {issues.length}{wipLimit ? `/${wipLimit}` : ''}
                            </span>
                            {isOverWip && (
                                <i className="fa-solid fa-triangle-exclamation text-red-500 text-xs animate-bounce" title="Vượt giới hạn WIP!" />
                            )}
                            <button
                                onClick={onStartEditWip}
                                className="text-gray-300 hover:text-gray-500 text-[10px] opacity-0 group-hover/col:opacity-100 transition-opacity"
                                title="Đặt giới hạn WIP"
                            >
                                <i className="fa-solid fa-gear" />
                            </button>
                            {canDelete && issues.length === 0 && (
                                <button
                                    onClick={onDelete}
                                    className="text-gray-300 hover:text-red-500 text-[10px] opacity-0 group-hover/col:opacity-100 transition-all"
                                    title="Xóa cột này"
                                >
                                    <i className="fa-solid fa-trash-can" />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Column Body */}
            <div
                ref={setNodeRef}
                className={`
                    flex-1 p-2.5 overflow-y-auto custom-scrollbar min-h-[120px] transition-colors duration-200 space-y-1
                    ${isOver ? 'bg-indigo-100/40' : ''}
                `}
            >
                {issues.length === 0 ? (
                    <div className={`
                        h-full flex items-center justify-center text-xs border-2 border-dashed rounded-lg py-8 transition-colors
                        ${isOver ? 'border-indigo-300 text-indigo-400 bg-indigo-50/50' : 'border-gray-200 text-gray-400'}
                    `}>
                        Thả thẻ vào đây
                    </div>
                ) : (
                    swimlanes.map(lane => (
                        <SwimlaneGroup
                            key={lane.key}
                            lane={lane}
                            onIssueClick={onIssueClick}
                            showLabel={swimlaneMode !== 'none'}
                            swimlaneMode={swimlaneMode}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════
// ─── SWIMLANE GROUP ───────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════
function SwimlaneGroup({ lane, onIssueClick, showLabel, swimlaneMode }) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className={showLabel ? 'mb-2' : ''}>
            {showLabel && lane.label && (
                <button
                    onClick={() => setCollapsed(p => !p)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 rounded-md hover:bg-white/60 transition-colors mb-1"
                >
                    <i className={`fa-solid ${collapsed ? 'fa-chevron-right' : 'fa-chevron-down'} text-[9px] text-gray-400`} />
                    {swimlaneMode === 'priority' ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getPriorityColor(lane.label)}`}>
                            {lane.label}
                        </span>
                    ) : (
                        <span>{lane.label}</span>
                    )}
                    <span className="text-gray-400 text-[10px]">({lane.issues.length})</span>
                </button>
            )}
            {!collapsed && (
                <div className="space-y-2.5">
                    {lane.issues.map(issue => (
                        <DraggableIssue key={issue.issueId} issue={issue} onClick={() => onIssueClick?.(issue)} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════
// ─── DRAGGABLE ISSUE ──────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════
function DraggableIssue({ issue, onClick }) {
    const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
        id: issue.issueId,
        data: { type: 'Issue', issue, statusName: issue.statusName },
    });

    const { setNodeRef: setDropRef } = useDroppable({
        id: issue.issueId,
        data: { type: 'Issue', issue, statusName: issue.statusName },
    });

    const setNodeRef = (node) => {
        setDragRef(node);
        setDropRef(node);
    };

    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 999 : 'auto',
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <IssueCard issue={issue} onClick={onClick} />
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════
// ─── ISSUE CARD (Enhanced) ────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════
// ─── Timer status indicator badge for team card
function TimerStatusBadge({ issue }) {
    const { isRunning, issueId: runningIssueId, elapsedSeconds } = useTimerStore();
    const isRunningThis = isRunning && String(runningIssueId) === String(issue.issueId);

    const formatCardTime = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    if (isRunningThis) {
        return (
            <div className="flex items-center gap-1 shrink-0">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded shrink-0">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                    {formatCardTime(elapsedSeconds)}
                </span>
                <button
                    onClick={(e) => { e.stopPropagation(); fireTaskStopped(issue.issueId); }}
                    className="w-5 h-5 rounded bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors text-[9px] shrink-0 cursor-pointer"
                    title="Tạm dừng đếm giờ"
                >
                    <i className="fa-solid fa-pause" />
                </button>
            </div>
        );
    }

    if (issue.statusName === 'In Progress') {
        return (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    useTimerStore.getState().startTimer({
                        issueId: issue.issueId,
                        issueKey: issue.issueKey,
                        issueTitle: issue.title,
                    });
                }}
                className="w-5 h-5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition-colors text-[9px] shrink-0 font-bold cursor-pointer"
                title="Bắt đầu đếm giờ"
            >
                <i className="fa-solid fa-play" />
            </button>
        );
    }

    if (issue.statusName === 'Review') {
        return (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
                <i className="fa-solid fa-pause text-[8px]" />
            </span>
        );
    }

    if (issue.statusName === 'Done') {
        return (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded shrink-0">
                <i className="fa-solid fa-check text-[8px]" />
            </span>
        );
    }

    return null;
}

// ─── Review SLA Chip for team card
function ReviewSlaChip({ issue }) {
    const ts = issue.updatedAt || issue.createdAt ? new Date(issue.updatedAt || issue.createdAt).getTime() : NaN;
    if (!ts || Number.isNaN(ts)) return null;
    const h = (Date.now() - ts) / (1000 * 60 * 60);
    if (h < 0) return null;
    if (h >= 48) return <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded font-medium"><i className="fa-solid fa-triangle-exclamation text-[8px]" />Trễ SLA</span>;
    if (h >= 24) return <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium"><i className="fa-solid fa-clock text-[8px]" />Sắp trễ</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium"><i className="fa-solid fa-check text-[8px]" />SLA OK</span>;
}

function IssueCard({ issue, isOverlay, onClick }) {
    if (!issue) return null;

    const { hasPermission } = useAccessControl();
    const canManageIssues = hasPermission('PROJECT.MANAGE_ISSUES');
    const { isRunning, issueId: runningIssueId, elapsedSeconds } = useTimerStore();
    const isRunningThis = isRunning && String(runningIssueId) === String(issue.issueId);

    const isImportant = issue.isImportant;
    const isUrgent = issue.isUrgent;
    const isBoth = isImportant && isUrgent;

    // Overdue check
    const isOverdue = issue.dueDate && !issue.statusName?.includes('Done') && new Date(issue.dueDate) < new Date();

    const highlightClasses = isBoth
        ? 'border-l-4 border-l-red-500 ring-2 ring-red-200 bg-gradient-to-r from-red-50/80 via-white to-orange-50/60 shadow-md shadow-red-100/50'
        : isUrgent
            ? 'border-l-4 border-l-red-400 bg-red-50/40 ring-1 ring-red-100'
            : isImportant
                ? 'border-l-4 border-l-purple-400 bg-purple-50/40 ring-1 ring-purple-100'
                : '';

    const runningClasses = isRunningThis
        ? 'ring-2 ring-indigo-500/80 bg-indigo-50/10 shadow-lg shadow-indigo-150/40 animate-pulse scale-[1.01] border-indigo-400'
        : '';

    return (
        <div
            className={`
                bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group
                ${isOverlay ? 'shadow-xl rotate-2 ring-2 ring-indigo-500 ring-opacity-50 scale-105' : ''}
                ${!isOverlay ? highlightClasses : ''}
                ${runningClasses}
            `}
            onClick={onClick}
        >
            {/* Top row: priority + badges */}
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${getPriorityColor(issue.priority)}`}>
                        {issue.priority || 'MEDIUM'}
                    </span>
                    {isBoth && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-sm">
                            <i className="fa-solid fa-fire text-[8px]" /> Làm ngay
                        </span>
                    )}
                    {isImportant && !isBoth && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                            <i className="fa-solid fa-star text-[8px]" /> Quan trọng
                        </span>
                    )}
                    {isUrgent && !isBoth && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600">
                            <i className="fa-solid fa-bolt text-[8px]" /> Khẩn cấp
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <TimerStatusBadge issue={issue} />
                    <button
                        className="text-gray-300 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                        title="Xem chi tiết"
                    >
                        <i className="fa-solid fa-expand text-xs" />
                    </button>
                </div>
            </div>

            {/* Title */}
            <h4 className="text-sm font-medium text-gray-800 mb-2 line-clamp-2">{issue.title}</h4>

            {/* Story Points + Actual Hours + Progress */}
            {(() => {
                let actual = Number(issue.loggedHours ?? issue.actualHours ?? 0);
                if (isRunningThis) {
                    actual += elapsedSeconds / 3600;
                } else if (issue.statusName === 'In Progress' && issue.inProgressAt) {
                    const inProgressMs = new Date(issue.inProgressAt).getTime();
                    actual += calculateWorkingSeconds(inProgressMs, Date.now()) / 3600;
                }
                return (
                    <div className="mb-2 flex items-center justify-between text-[10px]">
                        <span className="text-gray-500 flex items-center gap-1 font-medium">
                            <i className="fa-solid fa-clock text-[8px] text-gray-400" />
                            Thời gian thực tế
                        </span>
                        <span className="font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded animate-duration-1000">
                            {actual.toFixed(1)}h
                        </span>
                    </div>
                );
            })()}

            {/* Bottom row: key + due date + assignee */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-mono">
                        {issue.issueKey || `#${issue.issueId}`}
                    </span>
                    {issue.dueDate && (
                        <span className={`
                            inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium
                            ${isOverdue
                                ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
                                : 'bg-gray-50 text-gray-500'
                            }
                        `}>
                            <i className={`fa-solid fa-calendar-day text-[8px] ${isOverdue ? 'text-red-500' : 'text-gray-400'}`} />
                            {new Date(issue.dueDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                        </span>
                    )}
                    {issue.reworkCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-50 text-red-600">
                            <i className="fa-solid fa-rotate-right text-[8px]" />
                            {issue.reworkCount}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    {issue.assigneeName ? (
                        <div
                            className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold ring-2 ring-white"
                            title={issue.assigneeName}
                        >
                            {issue.assigneeName?.charAt(0)}
                        </div>
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-[10px] ring-2 ring-white">
                            <i className="fa-solid fa-user text-[8px]" />
                        </div>
                    )}
                </div>
            </div>

            {/* SLA + Submit row */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 flex-wrap">
                    {issue.statusName === 'Review' && <ReviewSlaChip issue={issue} />}
                </div>
                {canManageIssues && issue.statusName !== 'Done' && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            window.dispatchEvent(new CustomEvent('submit-issue-kanban', { detail: { issue } }));
                        }}
                        className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-[10px] font-medium transition-colors"
                    >
                        Nộp
                    </button>
                )}
                {canManageIssues && issue.statusName === 'Done' && (
                    <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded font-medium">
                        <i className="fa-solid fa-check mr-1 text-[8px]" />
                    </span>
                )}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════
// ─── HELPERS ──────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════
function getPriorityColor(priority) {
    switch (priority) {
        case 'CRITICAL': return 'bg-red-100 text-red-700';
        case 'HIGH': return 'bg-orange-100 text-orange-700';
        case 'LOW': return 'bg-gray-100 text-gray-700';
        default: return 'bg-indigo-50 text-indigo-700'; // MEDIUM
    }
}

function LoadingBoard() {
    return (
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-300px)]">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex-shrink-0 w-80 bg-gray-50 rounded-xl h-full animate-pulse p-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-24 bg-gray-200 rounded-lg"></div>
                        <div className="h-24 bg-gray-200 rounded-lg"></div>
                        <div className="h-20 bg-gray-200 rounded-lg"></div>
                    </div>
                </div>
            ))}
        </div>
    );
}
