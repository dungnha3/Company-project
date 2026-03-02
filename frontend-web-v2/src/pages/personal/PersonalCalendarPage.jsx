import { useState, useEffect } from 'react';
import { calendarApi } from '@shared/api/featureApi';
import { useToast } from '@app/providers/ToastProvider';
import { formatDate, formatDateTime } from '@shared/utils/formatters';

const EVENT_TYPES = {
    MEETING: { label: 'Cuộc họp', icon: 'fa-calendar-check', color: 'bg-indigo-600' },
    DEADLINE: { label: 'Deadline', icon: 'fa-clock', color: 'bg-red-500' },
    REMINDER: { label: 'Nhắc nhở', icon: 'fa-bell', color: 'bg-amber-500' },
    HOLIDAY: { label: 'Ngày nghỉ', icon: 'fa-mug-hot', color: 'bg-emerald-500' },
    OTHER: { label: 'Khác', icon: 'fa-thumbtack', color: 'bg-gray-500' }
};

export default function PersonalCalendarPage() {
    const { success, error } = useToast();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('month');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [showForm, setShowForm] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        eventType: 'PERSONAL',
        location: '',
        meetingLink: ''
    });
    // ...

    const loadEvents = async () => {
        try {
            setLoading(true);
            const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

            // Adjust for week view if needed, but fetching month data is usually safe cache
            const data = await calendarApi.getEvents(start.toISOString().slice(0, 19), end.toISOString().slice(0, 19));
            setEvents(data || []);
        } catch (err) {
            console.error('Failed to load events:', err);
            error('Không thể tải lịch');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await calendarApi.createEvent({
                ...formData,
                startTime: new Date(formData.startTime).toISOString().slice(0, 19),
                endTime: new Date(formData.endTime).toISOString().slice(0, 19)
            });
            setShowForm(false);
            setFormData({ title: '', description: '', startTime: '', endTime: '', eventType: 'PERSONAL', location: '', meetingLink: '' });
            loadEvents();
            success('Đã tạo sự kiện');
        } catch (err) {
            console.error('Failed to create event:', err);
            error('Không thể tạo sự kiện');
        }
    };

    const handleDelete = async (eventId) => {
        if (!confirm('Bạn có chắc muốn xóa sự kiện này?')) return;
        try {
            await calendarApi.deleteEvent(eventId);
            setSelectedEvent(null);
            loadEvents();
            success('Đã xóa sự kiện');
        } catch (err) {
            console.error('Failed to delete event:', err);
            error('Không thể xóa sự kiện');
        }
    };

    const navigateMonth = (delta) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
    };

    const navigateWeek = (delta) => {
        const newDate = new Date(currentWeek);
        newDate.setDate(newDate.getDate() + (delta * 7));
        setCurrentWeek(newDate);
    };

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
        return events.filter(e => e.startTime?.startsWith(dateStr));
    };

    return (
        <div className="space-y-6 animate-fade-in relative z-0"> {/* z-0 ensures modals are on top */}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
                        <i className="fa-solid fa-calendar-days text-xl" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Lịch của tôi</h1>
                        <p className="text-gray-500 text-sm">Quản lý lịch trình cá nhân của bạn</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'month' ? 'bg-white shadow-sm text-violet-600' : 'text-gray-500'}`}
                        >
                            Tháng
                        </button>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="btn-primary shadow-lg shadow-violet-500/25"
                    >
                        <i className="fa-solid fa-plus mr-2" />
                        Tạo sự kiện
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <button
                    onClick={() => navigateMonth(-1)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 text-gray-500 transition-colors"
                >
                    <i className="fa-solid fa-chevron-left" />
                </button>
                <h2 className="text-xl font-bold text-gray-800 capitalize">
                    {formatDate(currentMonth, { month: 'long', year: 'numeric' })}
                </h2>
                <button
                    onClick={() => navigateMonth(1)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 text-gray-500 transition-colors"
                >
                    <i className="fa-solid fa-chevron-right" />
                </button>
            </div>

            {/* Calendar Grid */}
            <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
                    {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
                        <div key={day} className="py-3 text-center text-sm font-semibold text-gray-500">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)] divide-x divide-gray-100">
                    {getDaysInMonth().map((day, idx) => {
                        const dayEvents = getEventsForDay(day);
                        const isToday = day === new Date().getDate() &&
                            currentMonth.getMonth() === new Date().getMonth() &&
                            currentMonth.getFullYear() === new Date().getFullYear();

                        return (
                            <div
                                key={idx}
                                className={`
                                    relative p-2 transition-colors min-h-[120px] border-b border-gray-100
                                    ${!day ? 'bg-gray-50/50' : 'hover:bg-gray-50'}
                                    ${isToday ? 'bg-violet-50/30' : ''}
                                `}
                            >
                                {day && (
                                    <>
                                        <span className={`
                                            inline-flex w-7 h-7 items-center justify-center rounded-full text-sm font-medium mb-1
                                            ${isToday ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30' : 'text-gray-700'}
                                        `}>
                                            {day}
                                        </span>
                                        <div className="space-y-1">
                                            {dayEvents.map(event => (
                                                <div
                                                    key={event.id || event.eventId}
                                                    onClick={() => setSelectedEvent(event)}
                                                    className={`
                                                        px-2 py-1 rounded text-xs text-white cursor-pointer truncate shadow-sm hover:opacity-90 transition-opacity flex items-center gap-1.5
                                                        ${EVENT_TYPES[event.eventType]?.color || 'bg-gray-500'}
                                                    `}
                                                    title={event.title}
                                                >
                                                    <i className={`fa-solid ${EVENT_TYPES[event.eventType]?.icon || 'fa-circle'} text-[10px]`} />
                                                    {event.title}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Create Modal */}
            {showForm && (
                <div className="modal-overlay z-[100]">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
                        <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Tạo sự kiện mới</h3>
                            <button onClick={() => setShowForm(false)} className="text-white/80 hover:text-white">
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="label">Tiêu đề <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="input"
                                    placeholder="Ví dụ: Họp team, Đi nha khoa..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Bắt đầu <span className="text-red-500">*</span></label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formData.startTime}
                                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="label">Kết thúc <span className="text-red-500">*</span></label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formData.endTime}
                                        onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                        className="input"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Loại sự kiện</label>
                                    <select
                                        value={formData.eventType}
                                        onChange={e => setFormData({ ...formData, eventType: e.target.value })}
                                        className="input"
                                    >
                                        {Object.entries(EVENT_TYPES).map(([key, val]) => (
                                            <option key={key} value={key}>{val.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Địa điểm</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                        className="input"
                                        placeholder="Văn phòng, Online..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Mô tả</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="input min-h-[80px]"
                                    placeholder="Chi tiết sự kiện..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Hủy</button>
                                <button type="submit" className="btn-primary">Tạo sự kiện</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Detail Modal */}
            {selectedEvent && (
                <div className="modal-overlay z-[100]">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
                        <div className={`px-6 py-4 flex items-center justify-between ${EVENT_TYPES[selectedEvent.eventType]?.color || 'bg-gray-600'}`}>
                            <div className="flex items-center gap-2 text-white">
                                <i className={`fa-solid ${EVENT_TYPES[selectedEvent.eventType]?.icon}`} />
                                <span className="font-semibold">{EVENT_TYPES[selectedEvent.eventType]?.label}</span>
                            </div>
                            <button onClick={() => setSelectedEvent(null)} className="text-white/80 hover:text-white">
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>

                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">{selectedEvent.title}</h3>

                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                        <i className="fa-regular fa-clock text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Thời gian</p>
                                        <p className="text-sm text-gray-600">
                                            {formatDateTime(selectedEvent.startTime)} - <br />
                                            {formatDateTime(selectedEvent.endTime)}
                                        </p>
                                    </div>
                                </div>

                                {selectedEvent.location && (
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                            <i className="fa-solid fa-location-dot text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Địa điểm</p>
                                            <p className="text-sm text-gray-600">{selectedEvent.location}</p>
                                        </div>
                                    </div>
                                )}

                                {selectedEvent.description && (
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                            <i className="fa-solid fa-align-left text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Mô tả</p>
                                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedEvent.description}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => handleDelete(selectedEvent.id || selectedEvent.eventId)}
                                    className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-medium transition-colors"
                                >
                                    <i className="fa-solid fa-trash mr-2" />
                                    Xóa
                                </button>
                                <button
                                    onClick={() => setSelectedEvent(null)}
                                    className="btn-secondary"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
