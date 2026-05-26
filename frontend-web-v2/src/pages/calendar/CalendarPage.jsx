import { useState, useEffect, useMemo } from 'react';
import { calendarApi } from '../../shared/api/featureApi';
import { formatDate, formatDateTime } from '@shared/utils/formatters';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { useAuthStore } from '@shared/stores/authStore';

// ─── Event type config - Minimalist colors ─────────────────────────────────
const EVENT_TYPES = {
    MEETING: { label: 'Cuộc họp', icon: 'fa-calendar-check', dot: 'bg-indigo-500' },
    DEADLINE: { label: 'Deadline', icon: 'fa-clock', dot: 'bg-red-500' },
    REMINDER: { label: 'Nhắc nhở', icon: 'fa-bell', dot: 'bg-amber-500' },
    HOLIDAY: { label: 'Ngày nghỉ', icon: 'fa-umbrella-beach', dot: 'bg-green-500' },
    OTHER: { label: 'Khác', icon: 'fa-thumbtack', dot: 'bg-gray-400' },
};

const FILTER_OPTIONS = [
    { value: '', label: 'Tất cả loại', icon: 'fa-layer-group' },
    { value: 'MEETING', label: 'Cuộc họp', icon: 'fa-calendar-check' },
    { value: 'DEADLINE', label: 'Deadline', icon: 'fa-clock' },
    { value: 'REMINDER', label: 'Nhắc nhở', icon: 'fa-bell' },
    { value: 'HOLIDAY', label: 'Ngày nghỉ', icon: 'fa-umbrella-beach' },
    { value: 'OTHER', label: 'Khác', icon: 'fa-thumbtack' },
];

// ─── Shared helpers ──────────────────────────────────────────────────────
const HOUR_HEIGHT = 64;
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
    const [viewMode, setViewMode] = useState('month');

    // ── Form state
    const [showForm, setShowForm] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const [formData, setFormData] = useState({
        title: '', description: '', startTime: '', endTime: '', eventType: 'MEETING', location: '', meetingLink: ''
    });

    // ── Filter state
    const [searchText, setSearchText] = useState('');
    const [filterMyEvents, setFilterMyEvents] = useState(false);
    const [filterType, setFilterType] = useState('');
    const activeFilterCount = [filterMyEvents, filterType, searchText.trim()].filter(Boolean).length;

    // ── Reset date when switching views
    const handleViewChange = (mode) => {
        setViewMode(mode);
        if (mode === 'day') setCurrentDay(new Date());
        else if (mode === 'week') setCurrentWeek(new Date());
        else setCurrentMonth(new Date());
    };

    // ── Load events (query 3 months before to include past events)
    useEffect(() => { loadEvents(); }, [currentMonth, currentWeek, currentDay, viewMode]);

    const loadEvents = async () => {
        try {
            setLoading(true);
            let start, end;
            // Query 3 months before current month to show historical events
            if (viewMode === 'month') {
                start = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 3, 1);
                end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 2, 0, 23, 59, 59);
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

    // ── Filter events
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
    const navigateMonth = (delta) => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
    const navigateWeek = (delta) => { const d = new Date(currentWeek); d.setDate(d.getDate() + delta * 7); setCurrentWeek(d); };
    const navigateDay = (delta) => { const d = new Date(currentDay); d.setDate(d.getDate() + delta); setCurrentDay(d); };
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
    const getWeekStart = (date) => { const d = new Date(date); d.setDate(d.getDate() - d.getDay()); return d; };
    const getWeekDays = () => {
        const start = getWeekStart(currentWeek);
        return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
    };
    const getEventsForWeekDay = (date) => filteredEvents.filter(e => e.startTime?.startsWith(date.toISOString().slice(0, 10)));
    const getWeekNumber = (date) => {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    };

    // ── Day view helpers
    const getEventsForHour = (hour) => filteredEvents.filter(e => {
        if (!e.startTime) return false;
        const d = new Date(e.startTime);
        return d.getHours() === hour;
    });

    // ── Form handlers
    const openCreateForm = () => {
        setEditingEvent(null);
        setFormData({ title: '', description: '', startTime: '', endTime: '', eventType: 'MEETING', location: '', meetingLink: '' });
        setShowForm(true);
    };
    const openEditForm = (event) => {
        setEditingEvent(event);
        setFormData({
            title: event.title || '', description: event.description || '',
            startTime: event.startTime ? new Date(event.startTime).toISOString().slice(0, 16) : '',
            endTime: event.endTime ? new Date(event.endTime).toISOString().slice(0, 16) : '',
            eventType: event.eventType || 'MEETING', location: event.location || '', meetingLink: event.meetingLink || '',
        });
        setShowForm(true);
        setSelectedEvent(null);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, startTime: new Date(formData.startTime).toISOString(), endTime: new Date(formData.endTime).toISOString() };
            if (editingEvent) await calendarApi.updateEvent(editingEvent.eventId, payload);
            else await calendarApi.createEvent(payload);
            setShowForm(false);
            loadEvents();
        } catch (error) { console.error('Failed to save event:', error); }
    };
    const handleDelete = async (eventId) => {
        if (!confirm('Xóa sự kiện này?')) return;
        try { await calendarApi.deleteEvent(eventId); setSelectedEvent(null); loadEvents(); }
        catch (error) { console.error('Failed to delete event:', error); }
    };

    const renderHeaderTitle = () => {
        if (viewMode === 'month') return `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
        if (viewMode === 'week') return `Tuần ${getWeekNumber(currentWeek)}, ${currentWeek.getFullYear()}`;
        const wd = weekdayFullNames[currentDay.getDay()];
        return `${wd}, ngày ${currentDay.getDate()} tháng ${currentDay.getMonth() + 1}`;
    };
    const navigateHandler = () => { if (viewMode === 'month') return navigateMonth; if (viewMode === 'week') return navigateWeek; return navigateDay; };

    return (
        <div className="max-w-full mx-auto p-6 space-y-6">
            {/* Header Banner - Clean white card */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-xl border border-gray-100 px-6 py-5 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-calendar-days text-gray-500 text-xl" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Lịch cá nhân</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {filteredEvents.length} sự kiện
                            {filteredEvents.length !== events.length && ` / ${events.length} tổng`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Switcher */}
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
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <i className={`fa-solid ${view.icon} text-xs`} />
                                <span className="hidden sm:inline">{view.label}</span>
                            </button>
                        ))}
                    </div>

                    {canManage && (
                        <button onClick={openCreateForm}
                            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                            <i className="fa-solid fa-plus text-xs" />
                            Tạo sự kiện
                        </button>
                    )}
                </div>
            </div>

            {/* Toolbar - Clean minimal */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setFilterMyEvents(p => !p)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-medium ${filterMyEvents
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}>
                        <i className="fa-solid fa-user mr-1.5" />Của tôi
                    </button>

                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-medium appearance-none cursor-pointer bg-white ${filterType
                            ? 'border-gray-900 text-gray-900'
                            : 'border-gray-200 text-gray-600'
                            }`}>
                        {FILTER_OPTIONS.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>

                    <div className="relative">
                        <i className="fa-solid fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                        <input type="text" placeholder="Tìm kiếm..." value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            className="pl-7 pr-8 py-1.5 text-xs rounded-lg border border-gray-200 w-40 focus:outline-none focus:border-gray-300 bg-white transition-all" />
                        {searchText && (
                            <button onClick={() => setSearchText('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <i className="fa-solid fa-xmark text-xs" />
                            </button>
                        )}
                    </div>

                    {activeFilterCount > 0 && (
                        <button onClick={() => { setFilterMyEvents(false); setFilterType(''); setSearchText(''); }}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium px-2">
                            <i className="fa-solid fa-filter-circle-xmark mr-1" />
                            Xóa lọc ({activeFilterCount})
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => navigateHandler()(-1)}
                        className="w-9 h-9 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center">
                        <i className="fa-solid fa-chevron-left text-xs" />
                    </button>
                    <button onClick={goToToday}
                        className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                        Hôm nay
                    </button>
                    <button onClick={() => navigateHandler()(1)}
                        className="w-9 h-9 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center">
                        <i className="fa-solid fa-chevron-right text-xs" />
                    </button>
                    <h2 className="text-sm font-medium text-gray-900 min-w-[160px] text-center">{renderHeaderTitle()}</h2>
                </div>
            </div>

            {/* Calendar Views */}
            {loading ? (<LoadingCalendar viewMode={viewMode} />) : (
                <>
                    {viewMode === 'month' && <MonthView days={getDaysInMonth()} getEventsForDay={getEventsForDay} isToday={isToday} onEventClick={setSelectedEvent} />}
                    {viewMode === 'week' && <WeekView weekDays={getWeekDays()} getEventsForDay={getEventsForWeekDay} onEventClick={setSelectedEvent} currentMonth={currentMonth} />}
                    {viewMode === 'day' && <DayView currentDay={currentDay} getEventsForHour={getEventsForHour} filteredEvents={filteredEvents} onEventClick={setSelectedEvent} />}
                </>
            )}

            {/* Modals */}
            {showForm && <EventFormModal formData={formData} setFormData={setFormData} onSubmit={handleSubmit} onClose={() => setShowForm(false)} isEditing={!!editingEvent} />}
            {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onEdit={() => openEditForm(selectedEvent)} onDelete={() => handleDelete(selectedEvent.eventId)} canManage={canManage} />}
        </div>
    );
}

// ─── MONTH VIEW ─────────────────────────────────────────────────────────
function MonthView({ days, getEventsForDay, isToday, onEventClick }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="grid grid-cols-7 border-b border-gray-100">
                {weekdayNames.map((day, i) => (
                    <div key={day} className={`py-3 text-center text-xs font-medium ${i === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {days.map((day, idx) => {
                    const dayEvents = getEventsForDay(day);
                    const today = isToday(day);
                    return (
                        <div key={idx}
                            className={`min-h-[110px] p-2 border-b border-r border-gray-100 transition-colors group
                                ${!day ? 'bg-gray-50/50' : 'hover:bg-gray-50/30'}
                                ${today ? 'bg-gray-50 ring-1 ring-inset ring-gray-200' : ''}`}>
                            {day && (
                                <>
                                    <div className="flex justify-center mb-1.5">
                                        <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium transition-colors
                                            ${today ? 'bg-gray-900 text-white' : 'text-gray-600 group-hover:bg-gray-100'}
                                            ${idx % 7 === 0 ? 'text-red-500' : ''}`}>
                                            {day}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        {dayEvents.slice(0, 3).map(event => (
                                            <EventChip key={event.eventId} event={event} onClick={() => onEventClick(event)} compact />
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <span className="text-[10px] text-gray-400 pl-1">+{dayEvents.length - 3} sự kiện</span>
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

// ─── WEEK VIEW ─────────────────────────────────────────────────────────
function WeekView({ weekDays, getEventsForDay, onEventClick, currentMonth }) {
    const hours = getHours();
    return (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="grid grid-cols-8 border-b border-gray-100 sticky top-0 z-10 bg-white">
                <div className="py-3 text-center text-xs font-medium text-gray-400 border-r border-gray-100">Giờ</div>
                {weekDays.map((date, i) => {
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                    return (
                        <div key={i} className={`py-3 text-center border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-gray-50' : ''}`}>
                            <div className={`text-[10px] font-medium ${i === 0 ? 'text-red-400' : 'text-gray-400'}`}>{weekdayNames[i]}</div>
                            <div className={`text-sm font-medium mt-0.5 ${isToday ? 'text-gray-900' : isCurrentMonth ? 'text-gray-800' : 'text-gray-400'}`}>
                                {date.getDate()}
                            </div>
                            {isToday && <div className="w-1.5 h-1.5 rounded-full bg-gray-900 mx-auto mt-0.5" />}
                        </div>
                    );
                })}
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-340px)] custom-scrollbar">
                <div className="grid grid-cols-8 relative">
                    <div className="border-r border-gray-100">
                        {hours.map(h => (
                            <div key={h} className="h-16 border-b border-gray-50 pr-2 pl-2 relative">
                                <span className="absolute -top-2.5 right-2 text-[10px] text-gray-400">{String(h).padStart(2, '0')}:00</span>
                            </div>
                        ))}
                    </div>
                    {weekDays.map((date, dayIdx) => {
                        const dayEvents = getEventsForDay(date);
                        const isToday = date.toDateString() === new Date().toDateString();
                        return (
                            <div key={dayIdx} className={`relative border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-gray-50/30' : ''}`}>
                                {hours.map(h => (
                                    <div key={h} className="h-16 border-b border-gray-50 hover:bg-gray-50/30 transition-colors" />
                                ))}
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
                                        <div key={event.eventId} onClick={() => onEventClick(event)}
                                            className="absolute left-0.5 right-0.5 rounded-md px-2 py-1 cursor-pointer overflow-hidden transition-all hover:shadow-sm hover:z-10 bg-white border border-gray-200"
                                            style={{ top: `${top}px`, height: `${height}px` }}>
                                            <div className="flex items-center gap-1 mb-0.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${type.dot}`} />
                                                <span className="text-[10px] font-medium text-gray-700 truncate">{event.title}</span>
                                            </div>
                                            {height >= 44 && (
                                                <div className="text-[9px] text-gray-400">
                                                    {new Date(event.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
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

// ─── DAY VIEW ───────────────────────────────────────────────────────────
function DayView({ currentDay, getEventsForHour, filteredEvents, onEventClick }) {
    const hours = getHours();
    const isToday = currentDay.toDateString() === new Date().toDateString();
    const allDayEvents = filteredEvents.filter(e => { if (!e.startTime) return false; const d = new Date(e.startTime); return d.getHours() === 0 && d.getMinutes() === 0; });

    return (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h3 className="text-base font-medium text-gray-900">
                        {weekdayFullNames[currentDay.getDay()]}, {currentDay.getDate()} tháng {currentDay.getMonth() + 1} {currentDay.getFullYear()}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">{filteredEvents.length} sự kiện trong ngày</p>
                </div>
                {isToday && (
                    <span className="px-3 py-1 bg-gray-900 text-white rounded-full text-xs font-medium">Hôm nay</span>
                )}
            </div>

            {allDayEvents.length > 0 && (
                <div className="px-5 py-3 border-b border-gray-100">
                    <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">Cả ngày</div>
                    <div className="flex flex-wrap gap-2">
                        {allDayEvents.map(event => <EventChip key={event.eventId} event={event} onClick={() => onEventClick(event)} />)}
                    </div>
                </div>
            )}

            <div className="overflow-y-auto max-h-[calc(100vh-380px)] custom-scrollbar">
                <div className="grid grid-cols-[70px_1fr]">
                    {hours.map(h => {
                        const hourEvents = getEventsForHour(h);
                        const isCurrentHour = isToday && new Date().getHours() === h;
                        return (
                            <div key={h} className={`flex border-b border-gray-50 min-h-[80px] ${isCurrentHour ? 'bg-gray-50/50' : ''}`}>
                                <div className="flex-shrink-0 w-[70px] py-3 pr-3 text-right border-r border-gray-100 relative">
                                    <span className={`text-[11px] font-medium ${isCurrentHour ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {String(h).padStart(2, '0')}:00
                                    </span>
                                </div>
                                <div className="flex-1 p-2 relative">
                                    {isCurrentHour && (
                                        <div className="absolute left-0 right-0 border-t-2 border-gray-900 z-10 pointer-events-none" style={{ top: `${(new Date().getMinutes() / 60) * 80}px` }} />
                                    )}
                                    {hourEvents.length === 0 ? (
                                        <div className="h-full min-h-[64px] hover:bg-gray-50/50 rounded transition-colors cursor-pointer" />
                                    ) : (
                                        <div className="space-y-1.5">
                                            {hourEvents.map(event => <EventCard key={event.eventId} event={event} onClick={() => onEventClick(event)} />)}
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

// ─── EVENT CHIP ─────────────────────────────────────────────────────────
function EventChip({ event, onClick, compact }) {
    const type = EVENT_TYPES[event.eventType] || EVENT_TYPES.OTHER;
    return (
        <div onClick={onClick}
            className="px-2 py-1 rounded-md text-xs cursor-pointer transition-all hover:shadow-sm bg-white border border-gray-200"
            title={event.title}>
            <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${type.dot}`} />
                <span className="font-medium text-gray-700 truncate">{event.title}</span>
            </div>
        </div>
    );
}

// ─── EVENT CARD ────────────────────────────────────────────────────────
function EventCard({ event, onClick }) {
    const type = EVENT_TYPES[event.eventType] || EVENT_TYPES.OTHER;
    const startTime = event.startTime ? new Date(event.startTime) : null;
    const endTime = event.endTime ? new Date(event.endTime) : null;
    const duration = startTime && endTime ? Math.round((endTime - startTime) / 60000) : 0;
    const isOver = endTime && endTime < new Date();

    return (
        <div onClick={onClick}
            className={`px-3 py-2 rounded-lg border transition-all hover:shadow-sm cursor-pointer bg-white border-gray-200 ${isOver ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${type.dot}`} />
                        <span className="text-xs font-medium text-gray-700 truncate">{event.title}</span>
                    </div>
                    {startTime && (
                        <div className="text-[11px] text-gray-400 flex items-center gap-1">
                            <i className="fa-regular fa-clock text-[9px]" />
                            {startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            {endTime && ` – ${endTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} (${duration}p)`}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── EVENT DETAIL MODAL ────────────────────────────────────────────────
function EventDetailModal({ event, onClose, onEdit, onDelete, canManage }) {
    const type = EVENT_TYPES[event.eventType] || EVENT_TYPES.OTHER;
    const startTime = event.startTime ? new Date(event.startTime) : null;
    const endTime = event.endTime ? new Date(event.endTime) : null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="h-1 bg-gray-200" />
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                                <div className={`w-2 h-2 rounded-full ${type.dot}`} />
                                <span className="text-xs font-medium text-gray-500">{type.label}</span>
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">{event.title}</h2>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-4">
                            <i className="fa-solid fa-xmark text-lg" />
                        </button>
                    </div>

                    {startTime && (
                        <div className="flex items-start gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                            <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
                                <i className="fa-solid fa-calendar text-gray-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-800">
                                    {startTime.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                                <p className="text-sm text-gray-600 mt-0.5">
                                    {startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                    {endTime && ` – ${endTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                                </p>
                            </div>
                        </div>
                    )}

                    {event.location && (
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-location-dot text-gray-400 text-sm" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-medium">Địa điểm</p>
                                <p className="text-sm text-gray-700">{event.location}</p>
                            </div>
                        </div>
                    )}

                    {event.meetingLink && (
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-link text-gray-400 text-sm" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-400 font-medium">Link họp</p>
                                <a href={event.meetingLink} target="_blank" rel="noopener noreferrer"
                                    className="text-sm text-indigo-600 hover:underline truncate block">{event.meetingLink}</a>
                            </div>
                        </div>
                    )}

                    {event.description && (
                        <div className="mb-4">
                            <p className="text-xs text-gray-400 font-medium mb-1.5">Mô tả</p>
                            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">{event.description}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-3 border-t border-gray-100 mt-4">
                        {canManage && (
                            <>
                                <button onClick={onEdit}
                                    className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                                    <i className="fa-solid fa-pen text-xs" />
                                    Chỉnh sửa
                                </button>
                                <button onClick={onDelete}
                                    className="px-4 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                                    <i className="fa-solid fa-trash text-xs" />
                                    Xóa
                                </button>
                            </>
                        )}
                        <button onClick={onClose}
                            className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── EVENT FORM MODAL ────────────────────────────────────────────────
function EventFormModal({ formData, setFormData, onSubmit, onClose, isEditing }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <i className="fa-solid fa-calendar-plus text-gray-400" />
                        {isEditing ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <i className="fa-solid fa-xmark text-lg" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-6 flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Tiêu đề *</label>
                        <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required
                            placeholder="Nhập tiêu đề sự kiện..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-gray-300 transition-all" autoFocus />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Loại sự kiện</label>
                        <div className="grid grid-cols-5 gap-2">
                            {Object.entries(EVENT_TYPES).map(([key, val]) => (
                                <button key={key} type="button" onClick={() => setFormData({ ...formData, eventType: key })}
                                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-xs font-medium
                                        ${formData.eventType === key
                                            ? 'border-gray-900 bg-gray-50 text-gray-900'
                                            : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                                        }`}>
                                    <div className={`w-3 h-3 rounded-full ${val.dot}`} />
                                    <span className="text-[10px] leading-tight">{val.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Bắt đầu *</label>
                            <input type="datetime-local" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-gray-300 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Kết thúc *</label>
                            <input type="datetime-local" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-gray-300 transition-all" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Địa điểm</label>
                        <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })}
                            placeholder="Ví dụ: Phòng họp A, Online..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-gray-300 transition-all" />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Link họp online</label>
                        <input type="url" value={formData.meetingLink} onChange={e => setFormData({ ...formData, meetingLink: e.target.value })}
                            placeholder="https://meet.google.com/..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-gray-300 transition-all" />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Mô tả</label>
                        <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Thêm mô tả chi tiết..." rows={3}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-gray-300 transition-all resize-none" />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                            Hủy
                        </button>
                        <button type="submit"
                            className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                            <i className={`fa-solid ${isEditing ? 'fa-check' : 'fa-plus'} text-xs`} />
                            {isEditing ? 'Lưu thay đổi' : 'Tạo sự kiện'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── SKELETON LOADING ─────────────────────────────────────────────────
function LoadingCalendar({ viewMode }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="grid grid-cols-7 border-b border-gray-100">
                {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                    <div key={d} className="py-3 text-center text-xs font-medium text-gray-400">{d}</div>
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
