import { useState, useEffect } from 'react';
import { useWebSocketStore } from '@shared/stores/websocketStore';
import ConversationList from './components/ConversationList';
import ChatWindow from './components/ChatWindow';
import CreateRoomModal from './components/CreateRoomModal';
import RoomInfoPanel from './components/RoomInfoPanel';

export default function ChatPage() {
    const { connect, disconnect, connected } = useWebSocketStore();
    const [selectedRoomId, setSelectedRoomId] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRoomInfo, setShowRoomInfo] = useState(false);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, []);

    const handleRoomCreated = (room) => {
        setSelectedRoomId(room.roomId);
    };

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Connection Indicator */}
            {!connected && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-xs flex items-center gap-2 shadow-sm z-50">
                    <i className="fa-solid fa-spinner fa-spin" />
                    Đang kết nối...
                </div>
            )}

            {/* Sidebar - Conversation List */}
            <ConversationList
                selectedRoomId={selectedRoomId}
                onSelectRoom={setSelectedRoomId}
                onCreateRoom={() => setShowCreateModal(true)}
            />

            {/* Main Chat Area */}
            <ChatWindow
                roomId={selectedRoomId}
                onOpenRoomInfo={() => setShowRoomInfo(true)}
            />

            {/* Room Info Panel */}
            {showRoomInfo && selectedRoomId && (
                <RoomInfoPanel
                    roomId={selectedRoomId}
                    onClose={() => setShowRoomInfo(false)}
                />
            )}

            {/* Create Room Modal */}
            {showCreateModal && (
                <CreateRoomModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={handleRoomCreated}
                />
            )}
        </div>
    );
}
