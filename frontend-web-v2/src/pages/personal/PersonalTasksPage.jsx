import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { formatDate } from '@shared/utils/formatters';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const STATUS_OPTIONS = [
    { value: '', label: 'Tất cả', icon: 'fa-layer-group' },
    { value: 'TODO', label: 'Cần làm', icon: 'fa-circle', color: 'text-gray-500' },
    { value: 'IN_PROGRESS', label: 'Đang làm', icon: 'fa-spinner', color: 'text-indigo-500' },
    { value: 'DONE', label: 'Hoàn thành', icon: 'fa-check-circle', color: 'text-green-500' },
];

const PRIORITY_OPTIONS = [
    { value: 'LOW', label: 'Thấp', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
    { value: 'MEDIUM', label: 'Trung bình', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
    { value: 'HIGH', label: 'Cao', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
];

const RECURRING_OPTIONS = [
    { value: '', label: 'Không lặp lại' },
    { value: 'DAILY', label: 'Hàng ngày' },
    { value: 'WEEKLY', label: 'Hàng tuần' },
    { value: 'MONTHLY', label: 'Hàng tháng' },
];

const LABEL_PRESETS = [
    { name: 'Công việc', color: 'bg-indigo-500' },
    { name: 'Cá nhân', color: 'bg-purple-500' },
    { name: 'Sức khỏe', color: 'bg-green-500' },
    { name: 'Tài chính', color: 'bg-yellow-500' },
    { name: 'Học tập', color: 'bg-pink-500' },
];

export default function PersonalTasksPage() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        dueDate: '',
        priority: 'MEDIUM',
        labels: [],
        recurringPattern: '',
        reminderAt: '',
    });

    // Fetch tasks
    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['personalTasks', statusFilter],
        queryFn: async () => {
            const url = statusFilter
                ? `${ENDPOINTS.PERSONAL_TASKS.LIST}?status=${statusFilter}`
                : ENDPOINTS.PERSONAL_TASKS.LIST;
            return (await apiClient.get(url)).data;
        },
    });

    // Fetch stats
    const { data: stats } = useQuery({
        queryKey: ['personalTasksStats'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PERSONAL_TASKS.STATS)).data,
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data) => apiClient.post(ENDPOINTS.PERSONAL_TASKS.CREATE, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['personalTasks']);
            queryClient.invalidateQueries(['personalTasksStats']);
            toast.success('Đã tạo task mới');
            closeModal();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Không thể tạo task');
        }
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => apiClient.put(ENDPOINTS.PERSONAL_TASKS.UPDATE(id), data),
        onSuccess: () => {
            queryClient.invalidateQueries(['personalTasks']);
            queryClient.invalidateQueries(['personalTasksStats']);
            toast.success('Đã cập nhật task');
            closeModal();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Không thể cập nhật');
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id) => apiClient.delete(ENDPOINTS.PERSONAL_TASKS.DELETE(id)),
        onSuccess: () => {
            queryClient.invalidateQueries(['personalTasks']);
            queryClient.invalidateQueries(['personalTasksStats']);
            toast.success('Đã xóa task');
        },
    });

    // Quick status update
    const quickUpdateStatus = (taskId, newStatus) => {
        updateMutation.mutate({ id: taskId, data: { status: newStatus } });
    };

    const openCreateModal = () => {
        setEditingTask(null);
        setFormData({
            title: '', description: '', dueDate: '', priority: 'MEDIUM',
            labels: [], recurringPattern: '', reminderAt: ''
        });
        setShowModal(true);
    };

    const openEditModal = (task) => {
        setEditingTask(task);
        setFormData({
            title: task.title,
            description: task.description || '',
            dueDate: task.dueDate || '',
            priority: task.priority || 'MEDIUM',
            labels: task.labels || [],
            recurringPattern: task.recurringPattern || '',
            reminderAt: task.reminderAt ? task.reminderAt.slice(0, 16) : '',
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingTask(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            labels: formData.labels.length > 0 ? formData.labels : null,
            recurringPattern: formData.recurringPattern || null,
            reminderAt: formData.reminderAt || null,
        };
        if (editingTask) {
            updateMutation.mutate({ id: editingTask.taskId, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const toggleLabel = (label) => {
        setFormData(prev => ({
            ...prev,
            labels: prev.labels.includes(label)
                ? prev.labels.filter(l => l !== label)
                : [...prev.labels, label]
        }));
    };

    const isPro = stats?.isPro;
    const progressPercent = stats ? Math.round((stats.done / Math.max(stats.total, 1)) * 100) : 0;

    // Group tasks for Kanban
    const kanbanTasks = useMemo(() => ({
        TODO: tasks.filter(t => t.status === 'TODO'),
        IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
        DONE: tasks.filter(t => t.status === 'DONE'),
    }), [tasks]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
                            <i className="fa-solid fa-list-check" />
                        </div>
                        Tasks cá nhân
                    </h1>
                    <p className="text-gray-500 mt-1 ml-13">
                        Quản lý công việc cá nhân hiệu quả
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <i className="fa-solid fa-list mr-1.5" />
                            Danh sách
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'kanban'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <i className="fa-solid fa-columns mr-1.5" />
                            Kanban
                        </button>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="btn-primary flex items-center gap-2 shadow-lg shadow-primary/25"
                    >
                        <i className="fa-solid fa-plus" />
                        Tạo task
                    </button>
                </div>
            </div>

            {/* Stats Cards with Progress Ring */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    {/* Progress Ring Card */}
                    <div className="col-span-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 text-white">
                        <div className="flex items-center gap-4">
                            <div className="relative w-20 h-20">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                                    <circle
                                        cx="18" cy="18" r="16" fill="none"
                                        stroke="white" strokeWidth="3"
                                        strokeDasharray={`${progressPercent} 100`}
                                        strokeLinecap="round"
                                        className="transition-all duration-500"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-lg font-bold">{progressPercent}%</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-white/80 text-sm">Tiến độ</p>
                                <p className="text-2xl font-bold">{stats.done}/{stats.total}</p>
                                <p className="text-white/70 text-xs mt-1">tasks hoàn thành</p>
                            </div>
                        </div>
                    </div>

                    <StatCard icon="fa-circle" label="Cần làm" value={stats.todo} color="gray" />
                    <StatCard icon="fa-play" label="Đang làm" value={stats.inProgress} color="blue" />
                    <StatCard icon="fa-check" label="Hoàn thành" value={stats.done} color="green" />
                    <StatCard icon="fa-clock" label="Quá hạn" value={stats.overdue} color="red" highlight />
                </div>
            )}

            {/* Filter Tabs - Only show in List view */}
            {viewMode === 'list' && (
                <div className="flex gap-2 flex-wrap">
                    {STATUS_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setStatusFilter(opt.value)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2
                                ${statusFilter === opt.value
                                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-purple-500/25'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                }`}
                        >
                            <i className={`fa-solid ${opt.icon} ${opt.color || ''}`} />
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Content */}
            {isLoading ? (
                <div className="py-20 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mb-4">
                        <i className="fa-solid fa-spinner fa-spin text-2xl text-violet-600" />
                    </div>
                    <p className="text-gray-500">Đang tải tasks...</p>
                </div>
            ) : viewMode === 'kanban' ? (
                <KanbanBoard
                    tasks={kanbanTasks}
                    onEdit={openEditModal}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onStatusChange={quickUpdateStatus}
                    isPro={isPro}
                />
            ) : (
                <ListView
                    tasks={tasks}
                    onEdit={openEditModal}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onStatusChange={quickUpdateStatus}
                    isPro={isPro}
                />
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <TaskModal
                    isEditing={!!editingTask}
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleSubmit}
                    onClose={closeModal}
                    isPending={createMutation.isPending || updateMutation.isPending}
                    isPro={isPro}
                    toggleLabel={toggleLabel}
                />
            )}
        </div>
    );
}

// Stats Card Component
function StatCard({ icon, label, value, color, highlight }) {
    const colorMap = {
        gray: 'from-gray-50 to-gray-100 text-gray-600',
        blue: 'from-indigo-50 to-indigo-100 text-indigo-600',
        green: 'from-green-50 to-green-100 text-green-600',
        red: 'from-red-50 to-red-100 text-red-600',
    };
    const iconColorMap = {
        gray: 'bg-gray-200 text-gray-600',
        blue: 'bg-indigo-200 text-indigo-600',
        green: 'bg-green-200 text-green-600',
        red: 'bg-red-200 text-red-600',
    };

    return (
        <div className={`bg-gradient-to-br ${colorMap[color]} rounded-2xl p-4 ${highlight && value > 0 ? 'ring-2 ring-red-300 animate-pulse' : ''}`}>
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${iconColorMap[color]} flex items-center justify-center`}>
                    <i className={`fa-solid ${icon}`} />
                </div>
                <div>
                    <div className={`text-2xl font-bold ${highlight && value > 0 ? 'text-red-600' : ''}`}>{value}</div>
                    <div className="text-sm opacity-70">{label}</div>
                </div>
            </div>
        </div>
    );
}

// List View Component
function ListView({ tasks, onEdit, onDelete, onStatusChange, isPro }) {
    if (tasks.length === 0) {
        return (
            <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 p-12 text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mb-4">
                    <i className="fa-solid fa-inbox text-3xl text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có task nào</h3>
                <p className="text-gray-500 text-sm">Nhấn "Tạo task" để bắt đầu quản lý công việc</p>
            </div>
        );
    }

    return (
        <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
                {tasks.map(task => (
                    <TaskItem
                        key={task.taskId}
                        task={task}
                        onEdit={() => onEdit(task)}
                        onDelete={() => onDelete(task.taskId)}
                        onStatusChange={(status) => onStatusChange(task.taskId, status)}
                        isPro={isPro}
                    />
                ))}
            </div>
        </div>
    );
}

// Kanban Board Component with Drag & Drop
function KanbanBoard({ tasks, onEdit, onDelete, onStatusChange, isPro }) {
    const [activeTask, setActiveTask] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 }, // 5px drag threshold to avoid accidental drags
        })
    );

    const columns = [
        { key: 'TODO', label: 'Cần làm', color: 'border-gray-300', bg: 'bg-gray-50' },
        { key: 'IN_PROGRESS', label: 'Đang làm', color: 'border-indigo-400', bg: 'bg-indigo-50' },
        { key: 'DONE', label: 'Hoàn thành', color: 'border-green-400', bg: 'bg-green-50' },
    ];

    // Find the task by ID from all columns
    const findTask = (taskId) => {
        for (const key of ['TODO', 'IN_PROGRESS', 'DONE']) {
            const task = tasks[key].find(t => t.taskId === taskId);
            if (task) return { task, status: key };
        }
        return null;
    };

    const handleDragStart = (event) => {
        const found = findTask(event.active.id);
        if (found) setActiveTask(found.task);
    };

    const handleDragEnd = (event) => {
        setActiveTask(null);
        const { active, over } = event;
        if (!over) return;

        const taskId = active.id;
        const found = findTask(taskId);
        if (!found) return;

        // The droppable ID is the column key (TODO, IN_PROGRESS, DONE)
        const targetStatus = over.id;

        // Only update if dropping into a different column
        if (found.status !== targetStatus && ['TODO', 'IN_PROGRESS', 'DONE'].includes(targetStatus)) {
            onStatusChange(taskId, targetStatus);
        }
    };

    const handleDragCancel = () => setActiveTask(null);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {columns.map(col => (
                    <KanbanColumn
                        key={col.key}
                        column={col}
                        tasks={tasks[col.key]}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onStatusChange={onStatusChange}
                        isPro={isPro}
                    />
                ))}
            </div>

            {/* Drag Overlay — follows cursor */}
            <DragOverlay>
                {activeTask ? (
                    <div className="rotate-2 opacity-90">
                        <KanbanCardContent task={activeTask} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

// Droppable Column
function KanbanColumn({ column, tasks, onEdit, onDelete, onStatusChange, isPro }) {
    const { setNodeRef, isOver } = useDroppable({ id: column.key });

    return (
        <div
            ref={setNodeRef}
            className={`rounded-2xl p-4 border-t-4 transition-colors duration-200 ${column.color} ${isOver ? 'bg-indigo-100/60 ring-2 ring-indigo-300' : column.bg
                }`}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">{column.label}</h3>
                <span className="px-2 py-1 bg-white rounded-full text-xs font-medium text-gray-500 shadow-sm">
                    {tasks.length}
                </span>
            </div>
            <div className="space-y-3 min-h-[200px]">
                {tasks.map(task => (
                    <DraggableKanbanCard
                        key={task.taskId}
                        task={task}
                        onEdit={() => onEdit(task)}
                        onDelete={() => onDelete(task.taskId)}
                        onStatusChange={(status) => onStatusChange(task.taskId, status)}
                        currentStatus={column.key}
                        isPro={isPro}
                    />
                ))}
                {tasks.length === 0 && (
                    <div className={`text-center py-8 text-sm rounded-xl border-2 border-dashed transition-colors ${isOver ? 'border-indigo-400 text-indigo-500 bg-indigo-50' : 'border-gray-200 text-gray-400'
                        }`}>
                        <i className={`fa-solid ${isOver ? 'fa-plus' : 'fa-inbox'} mb-2 block`} />
                        {isOver ? 'Thả vào đây' : 'Kéo task vào đây'}
                    </div>
                )}
            </div>
        </div>
    );
}

// Draggable Kanban Card wrapper
function DraggableKanbanCard({ task, onEdit, onDelete, onStatusChange, currentStatus, isPro }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.taskId,
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : 1,
        cursor: 'grab',
    };

    const nextStatus = {
        TODO: 'IN_PROGRESS',
        IN_PROGRESS: 'DONE',
        DONE: 'TODO',
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <KanbanCardContent task={task}>
                {/* Actions on hover */}
                <div className="flex justify-end gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => onStatusChange(nextStatus[currentStatus])}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                        title="Chuyển trạng thái"
                    >
                        <i className="fa-solid fa-arrow-right" />
                    </button>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={onEdit} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded">
                        <i className="fa-solid fa-pen" />
                    </button>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <i className="fa-solid fa-trash" />
                    </button>
                </div>
            </KanbanCardContent>
        </div>
    );
}

// Pure visual card content (used by both real card and drag overlay)
function KanbanCardContent({ task, children }) {
    const priorityDot = {
        LOW: 'bg-gray-400',
        MEDIUM: 'bg-amber-400',
        HIGH: 'bg-red-500',
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${priorityDot[task.priority]}`} />
                <div className="flex-1 min-w-0">
                    <p className={`font-medium text-gray-900 ${task.status === 'DONE' ? 'line-through text-gray-400' : ''}`}>
                        {task.title}
                    </p>
                    {task.description && (
                        <p className="text-sm text-gray-500 truncate mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {task.dueDate && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${task.overdue ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                <i className="fa-regular fa-calendar mr-1" />
                                {formatDate(task.dueDate)}
                            </span>
                        )}
                        {task.labels?.map(label => (
                            <span key={label} className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-600">
                                {label}
                            </span>
                        ))}
                        {task.recurringPattern && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">
                                <i className="fa-solid fa-repeat mr-1" />
                                {task.recurringPattern}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            {children}
        </div>
    );
}

// Task Item Component (for List view)
function TaskItem({ task, onEdit, onDelete, onStatusChange, isPro }) {
    const priorityColor = {
        LOW: 'bg-gray-100 text-gray-600',
        MEDIUM: 'bg-amber-100 text-amber-700',
        HIGH: 'bg-red-100 text-red-700',
    };

    const statusOptions = [
        { value: 'TODO', label: 'Cần làm' },
        { value: 'IN_PROGRESS', label: 'Đang làm' },
        { value: 'DONE', label: 'Hoàn thành' },
    ];

    return (
        <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
            {/* Status Dropdown */}
            <select
                value={task.status}
                onChange={(e) => onStatusChange(e.target.value)}
                className={`w-8 h-8 rounded-full border-2 appearance-none cursor-pointer transition-all
                    ${task.status === 'DONE'
                        ? 'bg-green-500 border-green-500'
                        : task.status === 'IN_PROGRESS'
                            ? 'bg-indigo-500 border-indigo-500'
                            : 'bg-white border-gray-300 hover:border-violet-500'
                    }`}
                style={{
                    backgroundImage: task.status === 'DONE'
                        ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='white' viewBox='0 0 24 24'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/%3E%3C/svg%3E")`
                        : 'none',
                    backgroundSize: '16px',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }}
            >
                {statusOptions.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                ))}
            </select>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${task.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {task.title}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColor[task.priority]}`}>
                        {task.priority === 'HIGH' ? '🔥 Cao' : task.priority === 'MEDIUM' ? 'TB' : 'Thấp'}
                    </span>
                    {task.overdue && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <i className="fa-solid fa-clock mr-1" />
                            Quá hạn
                        </span>
                    )}
                    {task.labels?.map(label => (
                        <span key={label} className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-600">
                            {label}
                        </span>
                    ))}
                    {task.recurringPattern && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-600">
                            <i className="fa-solid fa-repeat mr-1" />
                        </span>
                    )}
                    {task.reminderAt && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
                            <i className="fa-solid fa-bell mr-1" />
                        </span>
                    )}
                </div>
                {task.description && (
                    <p className="text-sm text-gray-500 truncate mt-0.5">{task.description}</p>
                )}
                {task.dueDate && (
                    <p className={`text-xs mt-1 ${task.overdue ? 'text-red-600' : 'text-gray-400'}`}>
                        <i className="fa-regular fa-calendar mr-1" />
                        {formatDate(task.dueDate)}
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onEdit} className="p-2 text-gray-400 hover:text-violet-600 rounded-lg hover:bg-violet-50">
                    <i className="fa-solid fa-pen" />
                </button>
                <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                    <i className="fa-solid fa-trash" />
                </button>
            </div>
        </div>
    );
}

// Task Modal Component
function TaskModal({ isEditing, formData, setFormData, onSubmit, onClose, isPending, isPro, toggleLabel }) {
    return (
        <div className="modal-overlay animate-fade-in">
            <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">
                            {isEditing ? 'Sửa task' : 'Tạo task mới'}
                        </h3>
                        <button onClick={onClose} className="text-white/80 hover:text-white">
                            <i className="fa-solid fa-times text-lg" />
                        </button>
                    </div>
                </div>

                <form onSubmit={onSubmit}>
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                                className="input"
                                placeholder="Nhập tiêu đề task..."
                                required
                                autoFocus
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                className="input"
                                rows={3}
                                placeholder="Mô tả chi tiết (tùy chọn)"
                            />
                        </div>

                        {/* Due Date & Priority */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hạn chót</label>
                                <input
                                    type="date"
                                    value={formData.dueDate}
                                    onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Độ ưu tiên</label>
                                <select
                                    value={formData.priority}
                                    onChange={e => setFormData(p => ({ ...p, priority: e.target.value }))}
                                    className="input"
                                >
                                    {PRIORITY_OPTIONS.map(p => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* PRO Features */}
                        {isPro ? (
                            <>
                                {/* Labels */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <i className="fa-solid fa-tags mr-1 text-violet-500" />
                                        Labels
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {LABEL_PRESETS.map(preset => (
                                            <button
                                                key={preset.name}
                                                type="button"
                                                onClick={() => toggleLabel(preset.name)}
                                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${formData.labels.includes(preset.name)
                                                    ? `${preset.color} text-white`
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {preset.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Recurring */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <i className="fa-solid fa-repeat mr-1 text-indigo-500" />
                                        Lặp lại
                                    </label>
                                    <select
                                        value={formData.recurringPattern}
                                        onChange={e => setFormData(p => ({ ...p, recurringPattern: e.target.value }))}
                                        className="input"
                                    >
                                        {RECURRING_OPTIONS.map(r => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Reminder */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <i className="fa-solid fa-bell mr-1 text-orange-500" />
                                        Nhắc nhở
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.reminderAt}
                                        onChange={e => setFormData(p => ({ ...p, reminderAt: e.target.value }))}
                                        className="input"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                        <i className="fa-solid fa-crown text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-800">Mở khóa tính năng PRO</p>
                                        <p className="text-sm text-gray-500">Labels, Lặp lại, Nhắc nhở</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Hủy
                        </button>
                        <button type="submit" className="btn-primary" disabled={isPending}>
                            {isPending && <i className="fa-solid fa-spinner fa-spin mr-2" />}
                            {isEditing ? 'Cập nhật' : 'Tạo task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
