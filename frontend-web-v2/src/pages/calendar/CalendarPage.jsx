import { useState, useEffect } from 'react';
import { calendarApi } from '../../shared/api/featureApi';

const EVENT_TYPES = {
    MEETING: { label: 'Cuộc họp', icon: '📅', color: 'bg-indigo-600' },
    DEADLINE: { label: 'Deadline', icon: '⏰', color: 'bg-red-500' },
    REMINDER: { label: 'Nhắc nhở', icon: '🔔', color: 'bg-amber-500' },
    HOLIDAY: { label: 'Ngày nghỉ', icon: '🎉', color: 'bg-green-500' },
    OTHER: { label: 'Khác', icon: '📌', color: 'bg-purple-500' }
};

export default function CalendarPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showForm, setShowForm] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        eventType: 'MEETING',
        location: '',
        meetingLink: ''
    });

    useEffect(() => {
        loadEvents();
    }, [currentMonth]);

    const loadEvents = async () => {
        try {
            setLoading(true);
            const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

            const data = await calendarApi.getEvents(start.toISOString(), end.toISOString());
            setEvents(data);
        } catch (error) {
            console.error('Failed to load events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await calendarApi.createEvent({
                ...formData,
                startTime: new Date(formData.startTime).toISOString(),
                endTime: new Date(formData.endTime).toISOString()
            });
            setShowForm(false);
            setFormData({ title: '', description: '', startTime: '', endTime: '', eventType: 'MEETING', location: '', meetingLink: '' });
            loadEvents();
        } catch (error) {
            console.error('Failed to create event:', error);
            alert('Không thể tạo sự kiện');
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

    const navigateMonth = (delta) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
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

    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">📅 Lịch</h1>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
                >
                    + Tạo sự kiện
                </button>
            </div>

            {/* Month Navigation */}
            <div className="flex justify-center items-center gap-6 mb-5">
                <button onClick={() => navigateMonth(-1)} className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-lg text-white text-lg hover:bg-slate-700 transition-colors">←</button>
                <h2 className="text-xl font-semibold text-white min-w-[200px] text-center">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h2>
                <button onClick={() => navigateMonth(1)} className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-lg text-white text-lg hover:bg-slate-700 transition-colors">→</button>
            </div>

            {loading ? (
                <div className="text-center text-slate-400 py-16">Đang tải...</div>
            ) : (
                <div className="grid grid-cols-7 gap-1 bg-slate-700 rounded-xl p-2">
                    {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
                        <div key={day} className="text-center py-3 font-semibold text-slate-400 text-sm">{day}</div>
                    ))}
                    {getDaysInMonth().map((day, idx) => {
                        const dayEvents = getEventsForDay(day);
                        const isToday = day === new Date().getDate() &&
                            currentMonth.getMonth() === new Date().getMonth() &&
                            currentMonth.getFullYear() === new Date().getFullYear();
                        return (
                            <div
                                key={idx}
                                className={`min-h-[100px] bg-slate-800 rounded-lg p-2 transition-colors ${!day ? 'bg-transparent' : 'hover:bg-slate-900'} ${isToday ? 'ring-2 ring-indigo-500' : ''}`}
                            >
                                {day && (
                                    <>
                                        <span className={`block font-semibold mb-1.5 ${isToday ? 'text-indigo-400' : 'text-white'}`}>{day}</span>
                                        <div className="flex flex-col gap-1">
                                            {dayEvents.slice(0, 3).map(event => (
                                                <div
                                                    key={event.eventId}
                                                    onClick={() => setSelectedEvent(event)}
                                                    className={`${EVENT_TYPES[event.eventType]?.color} px-1.5 py-0.5 rounded text-white text-xs cursor-pointer truncate hover:scale-[1.02] transition-transform`}
                                                >
                                                    {EVENT_TYPES[event.eventType]?.icon} {event.title}
                                                </div>
                                            ))}
                                            {dayEvents.length > 3 && <span className="text-xs text-slate-400">+{dayEvents.length - 3}</span>}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Event Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
                    <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-semibold text-white mb-5">Tạo sự kiện mới</h2>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                            <input type="text" placeholder="Tiêu đề *" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required
                                className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500" />
                            <select value={formData.eventType} onChange={e => setFormData({ ...formData, eventType: e.target.value })}
                                className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500">
                                {Object.entries(EVENT_TYPES).map(([key, val]) => <option key={key} value={key}>{val.icon} {val.label}</option>)}
                            </select>
                            <div className="flex gap-3">
                                <input type="datetime-local" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} required
                                    className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500" />
                                <input type="datetime-local" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} required
                                    className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500" />
                            </div>
                            <input type="text" placeholder="Địa điểm" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })}
                                className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500" />
                            <input type="url" placeholder="Link họp online" value={formData.meetingLink} onChange={e => setFormData({ ...formData, meetingLink: e.target.value })}
                                className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500" />
                            <textarea placeholder="Mô tả" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 min-h-[80px] resize-y" />
                            <div className="flex gap-3 justify-end mt-3">
                                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-colors">Hủy</button>
                                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">Tạo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setSelectedEvent(null)}>
                    <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <span className={`inline-block ${EVENT_TYPES[selectedEvent.eventType]?.color} px-3 py-1 rounded-full text-white text-xs font-medium mb-3`}>
                            {EVENT_TYPES[selectedEvent.eventType]?.icon} {EVENT_TYPES[selectedEvent.eventType]?.label}
                        </span>
                        <h2 className="text-xl font-semibold text-white mb-2">{selectedEvent.title}</h2>
                        <p className="text-slate-400 text-sm mb-3">
                            🕐 {new Date(selectedEvent.startTime).toLocaleString('vi-VN')} - {new Date(selectedEvent.endTime).toLocaleString('vi-VN')}
                        </p>
                        {selectedEvent.location && <p className="text-slate-300 mb-2">📍 {selectedEvent.location}</p>}
                        {selectedEvent.meetingLink && <a href={selectedEvent.meetingLink} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline block mb-2">🔗 Tham gia họp</a>}
                        {selectedEvent.description && <p className="text-slate-400 mt-4 leading-relaxed">{selectedEvent.description}</p>}
                        <div className="flex gap-3 justify-end mt-6">
                            <button onClick={() => handleDelete(selectedEvent.eventId)} className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">Xóa</button>
                            <button onClick={() => setSelectedEvent(null)} className="px-5 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-colors">Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
