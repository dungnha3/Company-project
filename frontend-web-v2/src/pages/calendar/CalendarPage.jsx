import { useState, useEffect, useMemo } from 'react';
import { calendarApi } from '../../shared/api/featureApi';
import { formatDate, formatDateTime } from '@shared/utils/formatters';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { useAuthStore } from '@shared/stores/authStore';

// ─── Event type config (matching Kanban color system) ─────────────────
const EVENT_TYPES = {
    MEETING: { label: 'Cuộc họp', icon: 'fa-calendar-check', color: '#6366F1', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
    DEADLINE: { label: 'Deadline', icon: 'fa-clock', color: '#EF4444', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
    REMINDER: { label: 'Nhắc nhở', icon: 'fa-bell', color: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    HOLIDAY: { label: 'Ngày nghỉ', icon: 'fa-umbrella-beach', color: '#10B981', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    OTHER: { label: 'Khác', icon: 'fa-thumbtack', color: '#8B5CF6', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
};

const FILTER_OPTIONS = [
    { value: '', label: 'Tất cả loại', icon: 'fa-layer-group' },
    { value: 'MEETING', label: '📅 Cuộc họp', icon: 'fa-calendar-check' },
    { value: 'DEADLINE', label: '⏰ Deadline', icon: 'fa-clock' },
    { value: 'REMINDER', label: '🔔 Nhắc nhở', icon: 'fa-bell' },
    { value: 'HOLIDAY', label: '🎉 Ngày nghỉ', icon: 'fa-umbrella-beach' },
    { value: 'OTHER', label: '📌 Khác', icon: 'fa-thumbtack' },
];

// ─── Shared helpers ──────────────────────────────────────────────────────
const HOUR_HEIGHT = 64; // px per hour in day/week view
const getHours = () => Array.from({ length: 24 }, (_, i) => i);

const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
const weekdayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const weekdayFullNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

// ════════════════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ───────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
export default function CalendarPage() {
    const currentUser = useAuthStore(s => s.user);
    const { hasPermission } = useWorkspaceStore();
    const canManage = hasPermission('calendarManage');

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [currentDay, setCurrentDay] = useState(new Date());
    const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'

    // ── Form state
    const [showForm, setShowForm] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        eventType: 'MEETING',
        location: '',
        meetingLink: ''
    });

    // ── Filter state (matching Kanban toolbar pattern)
    const [searchText, setSearchText] = useState('');
    const [filterMyEvents, setFilterMyEvents] = useState(false);
    const [filterType, setFilterType] = useState('');

    // ── Calculate active filter count (like Kanban)
    const activeFilterCount = [filterMyEvents, filterType, searchText.trim()].filter(Boolean).length;

    // ── Reset date when switching views
    const handleViewChange = (mode) => {
        setViewMode(mode);
        if (mode === 'day') setCurrentDay(new Date());
        else if (mode === 'week') setCurrentWeek(new Date());
        else setCurrentMonth(new Date());
    };

    // ── Load events
    useEffect(() => {
        loadEvents();
    }, [currentMonth, currentWeek, currentDay, viewMode]);

    const loadEvents = async () => {
        try {
            setLoading(true);
            let start, end;
            if (viewMode === 'month') {
                start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);
            } else if (viewMode === 'week') {
                const weekStart = getWeekStart(currentWeek);
                start = weekStart;
                end = new Date(weekStart);
                end.setDate(end.getDate() + 6);
                end.setHours(23, 59, 59, 999);
            } else {
                start = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate(), 0, 0, 0);
                end = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate(), 23, 59, 59);
            }
            const data = await calendarApi.getEvents(start.toISOString(), end.toISOString());
            setEvents(data || []);
        } catch (error) {
            console.error('Failed to load events:', error);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    };

    // ── Filter events (like Kanban's filteredIssues)
    const filteredEvents = useMemo(() => {
        let result = events;
        const uid = currentUser?.userId || currentUser?.id;

        if (filterMyEvents && uid) {
            result = result.filter(e => e.organizer?.userId === uid || e.organizer?.id === uid);
        }
        if (filterType) {
            result = result.filter(e => e.eventType === filterType);
        }
        if (searchText.trim()) {
            const q = searchText.toLowerCase();
            result = result.filter(e =>
                e.title?.toLowerCase().includes(q) ||
                e.description?.toLowerCase().includes(q) ||
                e.location?.toLowerCase().includes(q)
            );
        }
        return result;
    }, [events, filterMyEvents, filterType, searchText, currentUser]);

    // ── Navigation helpers
    const navigateMonth = (delta) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
    };
    const navigateWeek = (delta) => {
        const d = new Date(currentWeek);
        d.setDate(d.getDate() + delta * 7);
        setCurrentWeek(d);
    };
    const navigateDay = (delta) => {
        const d = new Date(currentDay);
        d.setDate(d.getDate() + delta);
        setCurrentDay(d);
    };
    const goToToday = () => {
        const now = new Date();
        if (viewMode === 'month') setCurrentMonth(now);
        else if (viewMode === 'week') setCurrentWeek(now);
        else setCurrentDay(now);
    };

    // ── Month view helpers
    const getDaysInMonth = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(i);
        return days;
    };
    const getEventsForDay = (day) => {
        if (!day) return [];
        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return filteredEvents.filter(e => e.startTime?.startsWith(dateStr));
    };
    const isToday = (day) => day === new Date().getDate()
        && currentMonth.getMonth() === new Date().getMonth()
        && currentMonth.getFullYear() === new Date().getFullYear();

    // ── Week view helpers
    const getWeekStart = (date) => {
        const d = new Date(date);
        const dayOfWeek = d.getDay();
        d.setDate(d.getDate() - dayOfWeek);
        return d;
    };
    const getWeekDays = () => {
        const start = getWeekStart(currentWeek);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });
    };
    const getEventsForWeekDay = (date) => {
        const dateStr = date.toISOString().slice(0, 10);
        return filteredEvents.filter(e => e.startTime?.startsWith(dateStr));
    };
    const getWeekNumber = (date) => {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    };

    // ── Day view helpers
    const getEventsForHour = (hour) => {
        return filteredEvents.filter(e => {
            if (!e.startTime) return false;
            const d = new Date(e.startTime);
            return d.getHours() === hour;
        });
    };

    // ── Form handlers
    const openCreateForm = () => {
        setEditingEvent(null);
        setFormData({ title: '', description: '', startTime: '', endTime: '', eventType: 'MEETING', location: '', meetingLink: '' });
        setShowForm(true);
    };
    const openEditForm = (event) => {
        setEditingEvent(event);
        setFormData({
            title: event.title || '',
            description: event.description || '',
            startTime: event.startTime ? new Date(event.startTime).toISOString().slice(0, 16) : '',
            endTime: event.endTime ? new Date(event.endTime).toISOString().slice(0, 16) : '',
            eventType: event.eventType || 'MEETING',
            location: event.location || '',
            meetingLink: event.meetingLink || '',
        });
        setShowForm(true);
        setSelectedEvent(null);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                startTime: new Date(formData.startTime).toISOString(),
                endTime: new Date(formData.endTime).toISOString()
            };
            if (editingEvent) {
                await calendarApi.updateEvent(editingEvent.eventId, payload);
            } else {
                await calendarApi.createEvent(payload);
            }
            setShowForm(false);
            loadEvents();
        } catch (error) {
            console.error('Failed to save event:', error);
        }
    };
    const handleDelete = async (eventId) => {
        if (!confirm('Bạn có chắc muốn xóa sự kiện này?')) return;
        try {
            await calendarApi.deleteEvent(eventId);
            setSelectedEvent(null);
            loadEvents();
        } catch (error) {
            console.error('Failed to delete event:', error);
        }
    };

    // ── Render header title based on view
    const renderHeaderTitle = () => {
        if (viewMode === 'month') return `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
        if (viewMode === 'week') return `Tuần ${getWeekNumber(currentWeek)}, ${currentWeek.getFullYear()}`;
        const wd = weekdayFullNames[currentDay.getDay()];
        return `${wd}, ngày ${currentDay.getDate()} tháng ${currentDay.getMonth() + 1}`;
    };

    // ── Render navigate button based on view
    const navigateHandler = () => {
        if (viewMode === 'month') return navigateMonth;
        if (viewMode === 'week') return navigateWeek;
        return navigateDay;
    };

    return (
        <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
            {/* ═══ Header ═══════════════════════════════════════════════════ */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                {/* Title + breadcrumb */}
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <i className="fa-solid fa-calendar-days text-indigo-500" />
                            Lịch cá nhân
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {filteredEvents.length} sự kiện
                            {filteredEvents.length !== events.length && ` / ${events.length} tổng`}
                        </p>
                    </div>
                </div>

                {/* Right: View switcher + create button */}
                <div className="flex items-center gap-3">
                    {/* View Switcher (like Kanban toolbar) */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {[
                            { id: 'month', label: 'Tháng', icon: 'fa-calendar' },
                            { id: 'week', label: 'Tuần', icon: 'fa-calendar-week' },
                            { id: 'day', label: 'Ngày', icon: 'fa-calendar-day' },
                        ].map(view => (
                            <button
                                key={view.id}
                                onClick={() => handleViewChange(view.id)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${viewMode === view.id
                                    ? 'bg-white shadow-sm text-gray-900 ring-1 ring-gray-200'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <i className={`fa-solid ${view.icon} text-xs`} />
                                <span className="hidden sm:inline">{view.label}</span>
                            </button>
                        ))}
                    </div>

                    {canManage && (
                        <button
                            onClick={openCreateForm}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <i className="fa-solid fa-plus text-xs" />
                            Tạo sự kiện
                        </button>
                    )}
                </div>
            </div>

            {/* ═══ Toolbar (matching Kanban pattern) ═══════════════════════ */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 bg-white rounded-xl border border-gray-200 p-3">
                {/* Left: Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* My Events */}
                    <button
                        onClick={() => setFilterMyEvents(p => !p)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-medium ${filterMyEvents
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <i className="fa-solid fa-user mr-1.5" />Của tôi
                    </button>

                    {/* Type filter */}
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-medium appearance-none cursor-pointer ${filterType
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'bg-white border-gray-200 text-gray-600'
                            }`}
                    >
                        {FILTER_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>

                    {/* Search (matching Kanban search pattern) */}
                    <div className="relative">
                        <i className="fa-solid fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm sự kiện..."
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            className="pl-7 pr-8 py-1.5 text-xs rounded-lg border border-gray-200 w-44 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-all"
                        />
                        {searchText && (
                            <button
                                onClick={() => setSearchText('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <i className="fa-solid fa-xmark text-[10px]" />
                            </button>
                        )}
                    </div>

                    {/* Clear filters */}
                    {activeFilterCount > 0 && (
                        <button
                            onClick={() => { setFilterMyEvents(false); setFilterType(''); setSearchText(''); }}
                            className="text-xs text-red-500 hover:text-red-700 font-medium px-2"
                        >
                            <i className="fa-solid fa-filter-circle-xmark mr-1" />
                            Xóa lọc ({activeFilterCount})
                        </button>
                    )}
                </div>

                {/* Right: Navigation */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigateHandler()(-1)}
                        className="w-9 h-9 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center justify-center"
                        title="Trước"
                    >
                        <i className="fa-solid fa-chevron-left text-xs" />
                    </button>
                    <button
                        onClick={goToToday}
                        className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
                    >
                        Hôm nay
                    </button>
                    <button
                        onClick={() => navigateHandler()(1)}
                        className="w-9 h-9 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center justify-center"
                        title="Sau"
                    >
                        <i className="fa-solid fa-chevron-right text-xs" />
                    </button>
                    <h2 className="text-sm font-semibold text-gray-800 min-w-[160px] text-center">
                        {renderHeaderTitle()}
                    </h2>
                </div>
            </div>

            {/* ═══ Calendar Views ════════════════════════════════════════════ */}
            {loading ? (
                <LoadingCalendar viewMode={viewMode} />
            ) : (
                <>
                    {viewMode === 'month' && (
                        <MonthView
                            days={getDaysInMonth()}
                            getEventsForDay={getEventsForDay}
                            isToday={isToday}
                            onEventClick={setSelectedEvent}
                        />
                    )}
                    {viewMode === 'week' && (
                        <WeekView
                            weekDays={getWeekDays()}
                            getEventsForDay={getEventsForWeekDay}
                            onEventClick={setSelectedEvent}
                            currentMonth={currentMonth}
                        />
                    )}
                    {viewMode === 'day' && (
                        <DayView
                            currentDay={currentDay}
                            getEventsForHour={getEventsForHour}
                            filteredEvents={filteredEvents}
                            onEventClick={setSelectedEvent}
                        />
                    )}
                </>
            )}

            {/* ═══ Create / Edit Modal ════════════════════════════════════════ */}
            {showForm && (
                <EventFormModal
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleSubmit}
                    onClose={() => setShowForm(false)}
                    isEditing={!!editingEvent}
                />
            )}

            {/* ═══ Event Detail Modal ════════════════════════════════════════ */}
            {selectedEvent && (
                <EventDetailModal
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    onEdit={() => openEditForm(selectedEvent)}
                    onDelete={() => handleDelete(selectedEvent.eventId)}
                    canManage={canManage}
                />
            )}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// ─── MONTH VIEW ────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
function MonthView({ days, getEventsForDay, isToday, onEventClick }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
                {weekdayNames.map((day, i) => (
                    <div key={day} className={`py-3 text-center text-xs font-semibold ${i === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
                {days.map((day, idx) => {
                    const dayEvents = getEventsForDay(day);
                    const today = isToday(day);
                    return (
                        <div
                            key={idx}
                            className={`
                                min-h-[110px] p-2 border-b border-r border-gray-100 transition-colors group
                                ${!day ? 'bg-gray-50/50' : 'hover:bg-gray-50/50'}
                                ${today ? 'bg-indigo-50/30 ring-1 ring-inset ring-indigo-200' : ''}
                            `}
                        >
                            {day && (
                                <>
                                    {/* Day number */}
                                    <div className={`flex justify-center mb-1.5`}>
                                        <span className={`
                                            w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors
                                            ${today
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-gray-500 group-hover:bg-gray-100'
                                            }
                                            ${idx % 7 === 0 ? 'text-red-500' : ''}
                                        `}>
                                            {day}
                                        </span>
                                    </div>

                                    {/* Events */}
                                    <div className="flex flex-col gap-1">
                                        {dayEvents.slice(0, 3).map(event => (
                                            <EventChip key={event.eventId} event={event} onClick={() => onEventClick(event)} compact />
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <span className="text-[10px] text-gray-400 pl-1 font-medium">
                                                +{dayEvents.length - 3} sự kiện
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// ─── WEEK VIEW ─────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
function WeekView({ weekDays, getEventsForDay, onEventClick, currentMonth }) {
    const hours = getHours();

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-8 border-b border-gray-100 sticky top-0 z-10 bg-white">
                <div className="py-3 text-center text-xs font-semibold text-gray-400 border-r border-gray-100">Giờ</div>
                {weekDays.map((date, i) => {
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                    return (
                        <div key={i} className={`py-3 text-center border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-indigo-50' : ''}`}>
                            <div className={`text-[10px] font-medium ${i === 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                {weekdayNames[i]}
                            </div>
                            <div className={`text-sm font-bold mt-0.5 ${isToday ? 'text-indigo-600' : isCurrentMonth ? 'text-gray-800' : 'text-gray-400'}`}>
                                {date.getDate()}
                            </div>
                            {isToday && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mx-auto mt-0.5" />}
                        </div>
                    );
                })}
            </div>

            {/* Time grid */}
            <div className="overflow-y-auto max-h-[calc(100vh-340px)] custom-scrollbar">
                <div className="grid grid-cols-8 relative">
                    {/* Hour labels */}
                    <div className="border-r border-gray-100">
                        {hours.map(h => (
                            <div key={h} className="h-16 border-b border-gray-50 pr-2 pl-2 relative">
                                <span className="absolute -top-2.5 right-2 text-[10px] text-gray-400 font-medium">
                                    {String(h).padStart(2, '0')}:00
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Day columns */}
                    {weekDays.map((date, dayIdx) => {
                        const dayEvents = getEventsForDay(date);
                        const isToday = date.toDateString() === new Date().toDateString();
                        return (
                            <div key={dayIdx} className={`relative border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-indigo-50/20' : ''}`}>
                                {/* Hour grid lines */}
                                {hours.map(h => (
                                    <div key={h} className="h-16 border-b border-gray-50 hover:bg-gray-50/30 transition-colors" />
                                ))}

                                {/* Events positioned by time */}
                                {dayEvents.map(event => {
                                    const startHour = new Date(event.startTime).getHours();
                                    const startMin = new Date(event.startTime).getMinutes();
                                    const endHour = new Date(event.endTime).getHours();
                                    const endMin = new Date(event.endTime).getMinutes();
                                    const top = (startHour * HOUR_HEIGHT) + (startMin / 60 * HOUR_HEIGHT);
                                    const durationH = (endHour - startHour) + (endMin - startMin) / 60;
                                    const height = Math.max(durationH * HOUR_HEIGHT, 28);
                                    const type = EVENT_TYPES[event.eventType] || EVENT_TYPES.OTHER;
                                    return (
                                        <div
                                            key={event.eventId}
                                            onClick={() => onEventClick(event)}
                                            className={`
                                                absolute left-0.5 right-0.5 rounded-md px-2 py-1 cursor-pointer overflow-hidden
                                                transition-all hover:shadow-md hover:z-10 group
                                                ${type.bg} ${type.text} border ${type.border}
                                            `}
                                            style={{ top: `${top}px`, height: `${height}px` }}
                                            title={event.title}
                                        >
                                            <div className="flex items-center gap-1 mb-0.5">
                                                <i className={`fa-solid ${type.icon} text-[9px] opacity-70`} />
                                                <span className="text-[10px] font-bold truncate">{event.title}</span>
                                            </div>
                                            {height >= 44 && (
                                                <div className="text-[9px] opacity-70">
                                                    {new Date(event.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                    {event.location && (
                                                        <span className="ml-1">📍 {event.location}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// ─── DAY VIEW ───────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
function DayView({ currentDay, getEventsForHour, filteredEvents, onEventClick }) {
    const hours = getHours();
    const isToday = currentDay.toDateString() === new Date().toDateString();

    // Group events that span multiple hours for better display
    const allDayEvents = filteredEvents.filter(e => {
        if (!e.startTime) return false;
        const d = new Date(e.startTime);
        return d.getHours() === 0 && d.getMinutes() === 0;
    });

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Day header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-gray-800">
                        {weekdayFullNames[currentDay.getDay()]}, {currentDay.getDate()} tháng {currentDay.getMonth() + 1} {currentDay.getFullYear()}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">{filteredEvents.length} sự kiện trong ngày</p>
                </div>
                {isToday && (
                    <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-semibold shadow-sm">
                        Hôm nay
                    </span>
                )}
            </div>

            {/* All-day events strip */}
            {allDayEvents.length > 0 && (
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        <i className="fa-solid fa-sun mr-1" />Cả ngày
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {allDayEvents.map(event => (
                            <EventChip key={event.eventId} event={event} onClick={() => onEventClick(event)} />
                        ))}
                    </div>
                </div>
            )}

            {/* Hour grid */}
            <div className="overflow-y-auto max-h-[calc(100vh-380px)] custom-scrollbar">
                <div className="grid grid-cols-[70px_1fr]">
                    {hours.map(h => {
                        const hourEvents = getEventsForHour(h);
                        const isCurrentHour = isToday && new Date().getHours() === h;
                        return (
                            <div key={h} className={`flex border-b border-gray-50 min-h-[80px] ${isCurrentHour ? 'bg-indigo-50/40' : ''}`}>
                                {/* Time label */}
                                <div className="flex-shrink-0 w-[70px] py-3 pr-3 text-right border-r border-gray-100 relative">
                                    <span className={`text-[11px] font-medium ${isCurrentHour ? 'text-indigo-600' : 'text-gray-400'}`}>
                                        {String(h).padStart(2, '0')}:00
                                    </span>
                                    {isCurrentHour && (
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                    )}
                                </div>

                                {/* Hour content */}
                                <div className="flex-1 p-2 relative">
                                    {/* Current time line */}
                                    {isCurrentHour && (
                                        <div
                                            className="absolute left-0 right-0 border-t-2 border-indigo-500 z-10 pointer-events-none"
                                            style={{ top: `${(new Date().getMinutes() / 60) * 80}px` }}
                                        />
                                    )}

                                    {hourEvents.length === 0 ? (
                                        <div className="h-full min-h-[64px] hover:bg-gray-50/50 rounded transition-colors cursor-pointer" />
                                    ) : (
                                        <div className="space-y-1.5">
                                            {hourEvents.map(event => (
                                                <div key={event.eventId} onClick={() => onEventClick(event)}>
                                                    <EventCard event={event} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// ─── EVENT CHIP (compact, for month/week grid) ─────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
function EventChip({ event, onClick, compact }) {
    const type = EVENT_TYPES[event.eventType] || EVENT_TYPES.OTHER;
    return (
        <div
            onClick={onClick}
            className={`
                px-2 py-1 rounded-md text-xs cursor-pointer transition-all hover:shadow-sm hover:scale-[1.01]
                ${type.bg} ${type.text} border ${type.border}
                ${compact ? 'truncate max-w-full' : ''}
            `}
            title={event.title}
        >
            <div className="flex items-center gap-1">
                <i className={`fa-solid ${type.icon} text-[9px]`} />
                <span className="font-medium truncate">{event.title}</span>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// ─── EVENT CARD (detailed, for day view) ───────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
function EventCard({ event }) {
    const type = EVENT_TYPES[event.eventType] || EVENT_TYPES.OTHER;
    const startTime = event.startTime ? new Date(event.startTime) : null;
    const endTime = event.endTime ? new Date(event.endTime) : null;
    const duration = startTime && endTime
        ? Math.round((endTime - startTime) / 60000)
        : 0;
    const isOver = endTime && endTime < new Date();

    return (
        <div className={`
            px-3 py-2 rounded-lg border transition-all hover:shadow-md cursor-pointer
            ${type.bg} ${type.text} border ${type.border}
            ${isOver ? 'opacity-60' : ''}
        `}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <i className={`fa-solid ${type.icon} text-[10px]`} />
                        <span className="text-xs font-semibold truncate">{event.title}</span>
                    </div>
                    {startTime && (
                        <div className="text-[11px] opacity-70 flex items-center gap-1.5">
                            <i className="fa-regular fa-clock text-[9px]" />
                            {startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            {endTime && (
                                <>
                                    {' – '}
                                    {endTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                    <span className="text-[10px] opacity-60">({duration}p)</span>
                                </>
                            )}
                        </div>
                    )}
                    {event.location && (
                        <div className="text-[11px] opacity-70 flex items-center gap-1 mt-0.5">
                            <i className="fa-solid fa-location-dot text-[9px]" />
                            <span className="truncate">{event.location}</span>
                        </div>
                    )}
                </div>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${type.dot}`} />
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// ─── EVENT DETAIL MODAL ────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
function EventDetailModal({ event, onClose, onEdit, onDelete, canManage }) {
    const type = EVENT_TYPES[event.eventType] || EVENT_TYPES.OTHER;
    const startTime = event.startTime ? new Date(event.startTime) : null;
    const endTime = event.endTime ? new Date(event.endTime) : null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Color banner */}
                <div className={`h-2 ${type.bg.replace('50', '500')}`} />

                <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${type.bg} ${type.text} border ${type.border} mb-3`}>
                                <i className={`fa-solid ${type.icon} text-[10px]`} />
                                {type.label}
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">{event.title}</h2>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-4">
                            <i className="fa-solid fa-xmark text-lg" />
                        </button>
                    </div>

                    {/* Time */}
                    {startTime && (
                        <div className="flex items-start gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                                <i className={`fa-solid ${type.icon} text-indigo-500`} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800">
                                    {startTime.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                                <p className="text-sm text-gray-600 mt-0.5">
                                    {startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                    {endTime && ` – ${endTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Location */}
                    {event.location && (
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                                <i className="fa-solid fa-location-dot text-amber-500 text-sm" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-medium">Địa điểm</p>
                                <p className="text-sm text-gray-700">{event.location}</p>
                            </div>
                        </div>
                    )}

                    {/* Meeting link */}
                    {event.meetingLink && (
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <i className="fa-solid fa-link text-blue-500 text-sm" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-400 font-medium">Link họp</p>
                                <a href={event.meetingLink} target="_blank" rel="noopener noreferrer"
                                    className="text-sm text-indigo-600 hover:underline truncate block">
                                    {event.meetingLink}
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    {event.description && (
                        <div className="mb-4">
                            <p className="text-xs text-gray-400 font-medium mb-1.5">Mô tả</p>
                            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3">{event.description}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-3 border-t border-gray-100 mt-4">
                        {canManage && (
                            <>
                                <button
                                    onClick={onEdit}
                                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <i className="fa-solid fa-pen text-xs" />
                                    Chỉnh sửa
                                </button>
                                <button
                                    onClick={onDelete}
                                    className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <i className="fa-solid fa-trash text-xs" />
                                    Xóa
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// ─── EVENT FORM MODAL ─────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
function EventFormModal({ formData, setFormData, onSubmit, onClose, isEditing }) {
    const handleTypeChange = (e) => {
        setFormData({ ...formData, eventType: e.target.value });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <i className="fa-solid fa-calendar-plus text-indigo-500" />
                        {isEditing ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <i className="fa-solid fa-xmark text-lg" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={onSubmit} className="p-6 flex flex-col gap-4">
                    {/* Title */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tiêu đề *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            required
                            placeholder="Nhập tiêu đề sự kiện..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-all"
                            autoFocus
                        />
                    </div>

                    {/* Event type */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Loại sự kiện</label>
                        <div className="grid grid-cols-5 gap-2">
                            {Object.entries(EVENT_TYPES).map(([key, val]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, eventType: key })}
                                    className={`
                                        flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-xs font-medium
                                        ${formData.eventType === key
                                            ? `${val.bg} ${val.text} border-current shadow-sm`
                                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <i className={`fa-solid ${val.icon} text-sm`} />
                                    <span className="text-[10px] leading-tight text-center">{val.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Bắt đầu *</label>
                            <input
                                type="datetime-local"
                                value={formData.startTime}
                                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Kết thúc *</label>
                            <input
                                type="datetime-local"
                                value={formData.endTime}
                                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-all"
                            />
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Địa điểm</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                            placeholder="Ví dụ: Phòng họp A, Online..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-all"
                        />
                    </div>

                    {/* Meeting link */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Link họp online</label>
                        <input
                            type="url"
                            value={formData.meetingLink}
                            onChange={e => setFormData({ ...formData, meetingLink: e.target.value })}
                            placeholder="https://meet.google.com/..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-all"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Mô tả</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Thêm mô tả chi tiết..."
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-all resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                            <i className={`fa-solid ${isEditing ? 'fa-check' : 'fa-plus'} text-xs`} />
                            {isEditing ? 'Lưu thay đổi' : 'Tạo sự kiện'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// ─── SKELETON LOADING ──────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
function LoadingCalendar({ viewMode }) {
    if (viewMode === 'day') {
        return (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <div className="h-5 bg-gray-200 rounded w-48 animate-pulse" />
                </div>
                <div className="divide-y divide-gray-50">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="flex h-20 animate-pulse">
                            <div className="w-[70px] flex-shrink-0 p-3 pr-2 text-right border-r border-gray-100">
                                <div className="h-3 bg-gray-200 rounded w-10 ml-auto" />
                            </div>
                            <div className="flex-1 p-3">
                                <div className="h-12 bg-gray-100 rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    if (viewMode === 'week') {
        return (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-8 border-b border-gray-100">
                    <div className="p-3"><div className="h-4 bg-gray-200 rounded w-8 mx-auto animate-pulse" /></div>
                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                        <div key={i} className="p-3 text-center"><div className="h-8 bg-gray-200 rounded-full w-8 mx-auto animate-pulse" /></div>
                    ))}
                </div>
                <div className="grid grid-cols-8">
                    <div className="border-r border-gray-100">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-16 border-b border-gray-50 flex items-start justify-end p-2">
                                <div className="h-3 bg-gray-200 rounded w-8 animate-pulse" />
                            </div>
                        ))}
                    </div>
                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                        <div key={i} className="border-r border-gray-100">
                            {Array.from({ length: 8 }).map((_, j) => (
                                <div key={j} className="h-16 border-b border-gray-50 p-1">
                                    <div className="h-6 bg-gray-100 rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    // Month view
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-100">
                {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                    <div key={d} className="py-3 text-center text-xs font-semibold text-gray-400">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {[...Array(35)].map((_, i) => (
                    <div key={i} className="min-h-[110px] p-2 border-b border-r border-gray-100">
                        <div className="flex justify-center mb-2">
                            <div className="w-7 h-7 bg-gray-100 rounded-full animate-pulse" />
                        </div>
                        <div className="space-y-1">
                            <div className="h-5 bg-gray-100 rounded animate-pulse" />
                            <div className="h-5 bg-gray-50 rounded animate-pulse w-3/4" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
