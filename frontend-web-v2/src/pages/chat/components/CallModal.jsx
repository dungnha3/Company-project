import { useEffect } from 'react';
import { CALL_STATE } from '../hooks/useWebRTC';

function formatDuration(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

export default function CallModal({
    callState,
    isVideo,
    isMuted,
    isCamOff,
    remoteUser,
    callDuration,
    localVideoRef,
    remoteVideoRef,
    onAnswer,
    onReject,
    onEnd,
    onToggleMute,
    onToggleVideo,
}) {
    // Don't render if idle
    if (callState === CALL_STATE.IDLE) return null;

    const isIncoming = callState === CALL_STATE.INCOMING;
    const isCalling = callState === CALL_STATE.CALLING;
    const isConnecting = callState === CALL_STATE.CONNECTING;
    const isConnected = callState === CALL_STATE.CONNECTED;
    const isEnded = callState === CALL_STATE.ENDED;
    const callerName = remoteUser?.fullName || remoteUser?.username || 'Người dùng';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm" style={{ animation: 'fadeIn 0.3s ease' }}>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(1.4); opacity: 0; } }
                @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
                @keyframes slide-up { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>

            <div
                className="relative w-full max-w-lg mx-4 rounded-3xl overflow-hidden shadow-2xl"
                style={{
                    background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                    animation: 'slide-up 0.4s ease',
                }}
            >
                {/* Video area (when video call and connected) */}
                {isVideo && (isConnected || isConnecting) && (
                    <div className="relative w-full" style={{ aspectRatio: '16/9', background: '#0a0a1a' }}>
                        {/* Remote video */}
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                            style={{ transform: 'scaleX(1)' }}
                        />
                        {/* No remote video overlay */}
                        {!isConnected && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                                        {callerName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex items-center gap-2 text-white/70">
                                        <i className="fa-solid fa-spinner fa-spin text-sm" />
                                        <span className="text-sm">Đang kết nối...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Local video (PiP) */}
                        <div className="absolute bottom-4 right-4 w-36 rounded-xl overflow-hidden shadow-lg border-2 border-white/20" style={{ aspectRatio: '4/3' }}>
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                                style={{ transform: 'scaleX(-1)' }}
                            />
                            {isCamOff && (
                                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                                    <i className="fa-solid fa-video-slash text-white/50" />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Non-video / pre-connect content area */}
                {(!isVideo || (!isConnected && !isConnecting)) && (
                    <div className="px-8 pt-10 pb-6 flex flex-col items-center">
                        {/* Avatar with pulse effect for ringing */}
                        <div className="relative mb-6">
                            {(isIncoming || isCalling) && (
                                <>
                                    <div className="absolute inset-0 rounded-full bg-indigo-500/30" style={{ animation: 'pulse-ring 1.5s ease-out infinite' }} />
                                    <div className="absolute inset-0 rounded-full bg-indigo-500/20" style={{ animation: 'pulse-ring 1.5s ease-out infinite 0.5s' }} />
                                </>
                            )}
                            <div
                                className="relative w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl"
                                style={isCalling || isIncoming ? { animation: 'float 2s ease-in-out infinite' } : {}}
                            >
                                {callerName.charAt(0).toUpperCase()}
                            </div>
                        </div>

                        {/* Caller info */}
                        <h2 className="text-xl font-bold text-white mb-1">{callerName}</h2>
                        <p className="text-sm text-white/60 flex items-center gap-2">
                            {isIncoming && (
                                <>
                                    <i className={`fa-solid ${isVideo ? 'fa-video' : 'fa-phone'}`} />
                                    <span>{isVideo ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến'}</span>
                                </>
                            )}
                            {isCalling && (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin text-xs" />
                                    <span>Đang gọi...</span>
                                </>
                            )}
                            {isConnecting && (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin text-xs" />
                                    <span>Đang kết nối...</span>
                                </>
                            )}
                            {isConnected && (
                                <>
                                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                                    <span>{formatDuration(callDuration)}</span>
                                </>
                            )}
                            {isEnded && (
                                <>
                                    <i className="fa-solid fa-phone-slash" />
                                    <span>Cuộc gọi đã kết thúc</span>
                                </>
                            )}
                        </p>
                    </div>
                )}

                {/* Connected info bar (video mode) */}
                {isVideo && isConnected && (
                    <div className="px-6 py-3 flex items-center justify-between" style={{ background: 'rgba(0,0,0,0.3)' }}>
                        <div className="flex items-center gap-2 text-white">
                            <span className="w-2 h-2 bg-green-400 rounded-full" />
                            <span className="text-sm font-medium">{callerName}</span>
                        </div>
                        <span className="text-sm text-white/70 font-mono">{formatDuration(callDuration)}</span>
                    </div>
                )}

                {/* Action buttons */}
                <div className="px-8 pb-8 pt-4 flex items-center justify-center gap-5">
                    {/* Incoming call: Accept & Reject */}
                    {isIncoming && (
                        <>
                            <button
                                onClick={onReject}
                                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30 transition-all hover:scale-110 active:scale-95"
                                title="Từ chối"
                            >
                                <i className="fa-solid fa-phone-slash text-xl" />
                            </button>
                            <button
                                onClick={onAnswer}
                                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-lg shadow-green-500/30 transition-all hover:scale-110 active:scale-95"
                                title="Chấp nhận"
                            >
                                <i className={`fa-solid ${isVideo ? 'fa-video' : 'fa-phone'} text-xl`} />
                            </button>
                        </>
                    )}

                    {/* Active call controls */}
                    {(isConnected || isConnecting || isCalling) && (
                        <>
                            {/* Mute mic */}
                            <button
                                onClick={onToggleMute}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${isMuted ? 'bg-red-500/80 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                                    }`}
                                title={isMuted ? 'Bật mic' : 'Tắt mic'}
                            >
                                <i className={`fa-solid ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`} />
                            </button>

                            {/* Toggle camera (video calls only) */}
                            {isVideo && (
                                <button
                                    onClick={onToggleVideo}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${isCamOff ? 'bg-red-500/80 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                                        }`}
                                    title={isCamOff ? 'Bật camera' : 'Tắt camera'}
                                >
                                    <i className={`fa-solid ${isCamOff ? 'fa-video-slash' : 'fa-video'}`} />
                                </button>
                            )}

                            {/* End call */}
                            <button
                                onClick={onEnd}
                                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30 transition-all hover:scale-110 active:scale-95"
                                title="Kết thúc cuộc gọi"
                            >
                                <i className="fa-solid fa-phone-slash text-lg" />
                            </button>
                        </>
                    )}

                    {/* Call ended */}
                    {isEnded && (
                        <div className="text-white/50 text-sm py-2">
                            <i className="fa-solid fa-check mr-2" />
                            Đã kết thúc
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
