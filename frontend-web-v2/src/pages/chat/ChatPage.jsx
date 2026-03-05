import { useState } from 'react';
import { useWebSocketStore } from '@shared/stores/websocketStore';
import { useAuthStore } from '@shared/stores/authStore';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import ConversationList from './components/ConversationList';
import ChatWindow from './components/ChatWindow';
import CreateRoomModal from './components/CreateRoomModal';
import RoomInfoPanel from './components/RoomInfoPanel';
import CallModal from './components/CallModal';
import { useWebRTC, CALL_STATE } from './hooks/useWebRTC';

export default function ChatPage() {
    const { connect, disconnect, connected } = useWebSocketStore();
    const { token } = useAuthStore();
    const { hasPermission } = useWorkspaceStore();
    const canCreateGroup = hasPermission('chatCreateGroup');
    const [selectedRoomId, setSelectedRoomId] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRoomInfo, setShowRoomInfo] = useState(false);

    // WebRTC hook for voice/video calling
    const webrtc = useWebRTC();

    const handleRoomCreated = (room) => {
        setSelectedRoomId(room.roomId);
    };

    const handleStartCall = (withVideo) => {
        if (selectedRoomId && webrtc.callState === CALL_STATE.IDLE) {
            webrtc.startCall(selectedRoomId, withVideo);
        }
    };

    // Forward call signals from ChatWindow's WebSocket subscription
    const handleCallSignal = (wsMessage) => {
        webrtc.handleSignal(wsMessage);
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
                onCreateRoom={canCreateGroup ? () => setShowCreateModal(true) : undefined}
            />

            {/* Main Chat Area */}
            <ChatWindow
                roomId={selectedRoomId}
                onOpenRoomInfo={() => setShowRoomInfo(true)}
                onStartCall={handleStartCall}
                onCallSignal={handleCallSignal}
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

            {/* Call Modal — renders when call is active */}
            <CallModal
                callState={webrtc.callState}
                isVideo={webrtc.isVideo}
                isMuted={webrtc.isMuted}
                isCamOff={webrtc.isCamOff}
                remoteUser={webrtc.remoteUser}
                callDuration={webrtc.callDuration}
                localVideoRef={webrtc.localVideoRef}
                remoteVideoRef={webrtc.remoteVideoRef}
                onAnswer={webrtc.answerCall}
                onReject={webrtc.rejectCall}
                onEnd={webrtc.endCall}
                onToggleMute={webrtc.toggleMute}
                onToggleVideo={webrtc.toggleVideo}
            />
        </div>
    );
}
