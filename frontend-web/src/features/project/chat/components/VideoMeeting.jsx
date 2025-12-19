import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { meetingApi } from '../api/meetingApi'
import { useToast } from '@/shared/components/ui'

export default function VideoMeeting({
    meetingId,
    meetingTitle,
    roomInfo,
    onClose
}) {
    const { user } = useAuth()
    const [localStream, setLocalStream] = useState(null)
    const [isMuted, setIsMuted] = useState(false)
    const [isCameraOff, setIsCameraOff] = useState(false)
    const [isScreenSharing, setIsScreenSharing] = useState(false)
    const [participants, setParticipants] = useState([])
    const [showChat, setShowChat] = useState(false)
    const [showParticipants, setShowParticipants] = useState(false)
    const [meetingDuration, setMeetingDuration] = useState(0)
    const [error, setError] = useState(null)
    const toast = useToast()

    const localVideoRef = useRef(null)
    const screenStreamRef = useRef(null)
    const timerRef = useRef(null)
    const participantsRefreshRef = useRef(null)

    // Initialize media stream and load participants
    useEffect(() => {
        startMedia()
        startTimer()
        loadParticipants()

        // Refresh participants every 5 seconds
        participantsRefreshRef.current = setInterval(() => {
            loadParticipants()
        }, 5000)

        return () => {
            stopMedia()
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
            if (participantsRefreshRef.current) {
                clearInterval(participantsRefreshRef.current)
            }
        }
    }, [meetingId])

    const loadParticipants = async () => {
        // Skip if local meeting (starts with 'local_')
        if (!meetingId || String(meetingId).startsWith('local_')) {
            console.log('Local meeting, skipping API load')
            return
        }

        try {
            console.log('Loading participants for meeting:', meetingId)
            const meetingData = await meetingApi.getMeetingById(meetingId)
            console.log('Meeting data received:', meetingData)

            if (meetingData?.participants) {
                // Filter out current user from participants list, only show JOINED
                const otherParticipants = meetingData.participants.filter(
                    p => p.userId !== user?.userId && p.status === 'JOINED'
                )
                console.log('Other participants:', otherParticipants)
                setParticipants(otherParticipants)
            }
        } catch (err) {
            console.log('Could not load participants:', err)
        }
    }

    const startTimer = () => {
        timerRef.current = setInterval(() => {
            setMeetingDuration(prev => prev + 1)
        }, 1000)
    }

    const formatDuration = (seconds) => {
        const hrs = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const startMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            })
            setLocalStream(stream)
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream
            }
            setError(null)
        } catch (err) {
            console.error('Error accessing media devices:', err)
            setError('Không thể truy cập camera hoặc microphone. Vui lòng kiểm tra quyền truy cập.')
        }
    }

    const stopMedia = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop())
        }
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop())
        }
    }

    const toggleMute = () => {
        if (localStream) {
            const audioTracks = localStream.getAudioTracks()
            audioTracks.forEach(track => {
                track.enabled = !track.enabled
            })
            setIsMuted(!isMuted)
        }
    }

    const toggleCamera = () => {
        if (localStream) {
            const videoTracks = localStream.getVideoTracks()
            videoTracks.forEach(track => {
                track.enabled = !track.enabled
            })
            setIsCameraOff(!isCameraOff)
        }
    }

    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            // Stop screen sharing
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop())
                screenStreamRef.current = null
            }
            // Restore camera
            if (localVideoRef.current && localStream) {
                localVideoRef.current.srcObject = localStream
            }
            setIsScreenSharing(false)
        } else {
            // Start screen sharing
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true
                })
                screenStreamRef.current = screenStream
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = screenStream
                }
                setIsScreenSharing(true)

                // Listen for screen share stop
                screenStream.getVideoTracks()[0].onended = () => {
                    if (localVideoRef.current && localStream) {
                        localVideoRef.current.srcObject = localStream
                    }
                    setIsScreenSharing(false)
                }
            } catch (err) {
                console.error('Error sharing screen:', err)
            }
        }
    }

    const handleEndCall = async () => {
        // Leave meeting via API
        if (meetingId && !String(meetingId).startsWith('local_')) {
            try {
                await meetingApi.leaveMeeting(meetingId)
            } catch (err) {
                console.log('Could not leave meeting:', err)
            }
        }
        stopMedia()
        onClose?.()
    }

    const handleCopyLink = () => {
        const link = `${window.location.origin}/meeting/${meetingId}`
        navigator.clipboard.writeText(link)
        toast.success('Đã sao chép link cuộc họp!')
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <span style={styles.meetingTitle}>{meetingTitle || 'Cuộc họp'}</span>
                    <span style={styles.meetingTime}>{formatDuration(meetingDuration)}</span>
                </div>
                <div style={styles.headerRight}>
                    <button style={styles.headerBtn} onClick={handleCopyLink} title="Sao chép link">
                        🔗
                    </button>
                    <button
                        style={styles.headerBtn}
                        onClick={() => setShowParticipants(!showParticipants)}
                        title="Người tham gia"
                    >
                        👥 {participants.length + 1}
                    </button>
                    <button
                        style={styles.headerBtn}
                        onClick={() => setShowChat(!showChat)}
                        title="Chat"
                    >
                        💬
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div style={styles.mainContent}>
                {/* Video Grid */}
                <div style={styles.videoGrid}>
                    {error ? (
                        <div style={styles.errorContainer}>
                            <div style={styles.errorIcon}>⚠️</div>
                            <div style={styles.errorText}>{error}</div>
                            <button style={styles.retryBtn} onClick={startMedia}>
                                Thử lại
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Local Video (Main) */}
                            <div style={styles.videoContainer}>
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    style={{
                                        ...styles.video,
                                        ...(isCameraOff && !isScreenSharing ? styles.videoHidden : {})
                                    }}
                                />
                                {isCameraOff && !isScreenSharing && (
                                    <div style={styles.avatarPlaceholder}>
                                        <div style={styles.avatarCircle}>
                                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                    </div>
                                )}
                                <div style={styles.videoLabel}>
                                    <span style={styles.videoLabelText}>
                                        {user?.username || 'Bạn'} {isScreenSharing && '(Đang chia sẻ màn hình)'}
                                    </span>
                                    {isMuted && <span style={styles.mutedIcon}>🔇</span>}
                                </div>
                            </div>

                            {/* Participants */}
                            {participants.map((participant, index) => (
                                <div key={index} style={styles.participantVideo}>
                                    <div style={styles.avatarPlaceholder}>
                                        <div style={styles.avatarCircle}>
                                            {participant.username?.charAt(0).toUpperCase() || 'P'}
                                        </div>
                                    </div>
                                    <div style={styles.videoLabel}>
                                        <span style={styles.videoLabelText}>{participant.username}</span>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                {/* Side Panel */}
                {(showChat || showParticipants) && (
                    <div style={styles.sidePanel}>
                        <div style={styles.sidePanelHeader}>
                            <span style={styles.sidePanelTitle}>
                                {showParticipants ? '👥 Người tham gia' : '💬 Chat'}
                            </span>
                            <button
                                style={styles.closePanelBtn}
                                onClick={() => {
                                    setShowChat(false)
                                    setShowParticipants(false)
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={styles.sidePanelContent}>
                            {showParticipants ? (
                                <div style={styles.participantsList}>
                                    <div style={styles.participantItem}>
                                        <div style={styles.participantAvatar}>
                                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <span style={styles.participantName}>{user?.username || 'Bạn'} (Bạn)</span>
                                    </div>
                                    {participants.map((p, i) => (
                                        <div key={i} style={styles.participantItem}>
                                            <div style={styles.participantAvatar}>
                                                {p.username?.charAt(0).toUpperCase() || 'P'}
                                            </div>
                                            <span style={styles.participantName}>{p.username}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={styles.chatContainer}>
                                    <div style={styles.chatMessages}>
                                        <div style={styles.noChatMessages}>Chưa có tin nhắn</div>
                                    </div>
                                    <div style={styles.chatInput}>
                                        <input
                                            type="text"
                                            placeholder="Gửi tin nhắn..."
                                            style={styles.chatInputField}
                                        />
                                        <button style={styles.chatSendBtn}>➤</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Controls Bar */}
            <div style={styles.controlsBar}>
                <div style={styles.controlsCenter}>
                    <button
                        style={{
                            ...styles.controlBtn,
                            ...(isMuted ? styles.controlBtnActive : {})
                        }}
                        onClick={toggleMute}
                        title={isMuted ? 'Bật mic' : 'Tắt mic'}
                    >
                        {isMuted ? '🔇' : '🎤'}
                    </button>

                    <button
                        style={{
                            ...styles.controlBtn,
                            ...(isCameraOff ? styles.controlBtnActive : {})
                        }}
                        onClick={toggleCamera}
                        title={isCameraOff ? 'Bật camera' : 'Tắt camera'}
                    >
                        {isCameraOff ? '📷' : '📹'}
                    </button>

                    <button
                        style={{
                            ...styles.controlBtn,
                            ...(isScreenSharing ? styles.controlBtnSharing : {})
                        }}
                        onClick={toggleScreenShare}
                        title={isScreenSharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}
                    >
                        🖥️
                    </button>

                    <button
                        style={styles.endCallBtn}
                        onClick={handleEndCall}
                        title="Kết thúc cuộc gọi"
                    >
                        📞
                    </button>
                </div>
            </div>
        </div>
    )
}

const styles = {
    container: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#202124',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10000
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        backgroundColor: '#202124',
        borderBottom: '1px solid #3c4043'
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
    },
    meetingTitle: {
        color: '#fff',
        fontSize: '16px',
        fontWeight: '500'
    },
    meetingTime: {
        color: '#9aa0a6',
        fontSize: '14px'
    },
    headerRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    headerBtn: {
        background: 'none',
        border: 'none',
        color: '#fff',
        fontSize: '18px',
        padding: '8px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'background 0.2s'
    },
    mainContent: {
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
    },
    videoGrid: {
        flex: 1,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        gap: '16px'
    },
    errorContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px'
    },
    errorIcon: {
        fontSize: '64px',
        marginBottom: '16px'
    },
    errorText: {
        color: '#fff',
        fontSize: '16px',
        textAlign: 'center',
        marginBottom: '24px'
    },
    retryBtn: {
        padding: '12px 24px',
        backgroundColor: '#8ab4f8',
        color: '#202124',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer'
    },
    videoContainer: {
        position: 'relative',
        width: '100%',
        maxWidth: '800px',
        aspectRatio: '16/9',
        backgroundColor: '#3c4043',
        borderRadius: '16px',
        overflow: 'hidden'
    },
    video: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    },
    videoHidden: {
        display: 'none'
    },
    avatarPlaceholder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3c4043'
    },
    avatarCircle: {
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        backgroundColor: '#8ab4f8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '48px',
        fontWeight: '500',
        color: '#202124'
    },
    videoLabel: {
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: '6px'
    },
    videoLabelText: {
        color: '#fff',
        fontSize: '13px'
    },
    mutedIcon: {
        fontSize: '14px'
    },
    participantVideo: {
        position: 'relative',
        width: '300px',
        aspectRatio: '16/9',
        backgroundColor: '#3c4043',
        borderRadius: '12px',
        overflow: 'hidden'
    },
    sidePanel: {
        width: '320px',
        backgroundColor: '#fff',
        borderLeft: '1px solid #3c4043',
        display: 'flex',
        flexDirection: 'column'
    },
    sidePanelHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        borderBottom: '1px solid #e0e0e0'
    },
    sidePanelTitle: {
        fontSize: '16px',
        fontWeight: '500',
        color: '#202124'
    },
    closePanelBtn: {
        background: 'none',
        border: 'none',
        fontSize: '18px',
        color: '#5f6368',
        cursor: 'pointer',
        padding: '4px'
    },
    sidePanelContent: {
        flex: 1,
        overflow: 'auto'
    },
    participantsList: {
        padding: '8px'
    },
    participantItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        borderRadius: '8px',
        transition: 'background 0.2s'
    },
    participantAvatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#8ab4f8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        fontWeight: '500',
        color: '#202124'
    },
    participantName: {
        fontSize: '14px',
        color: '#202124'
    },
    chatContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
    },
    chatMessages: {
        flex: 1,
        padding: '16px',
        overflow: 'auto'
    },
    noChatMessages: {
        textAlign: 'center',
        color: '#5f6368',
        fontSize: '14px',
        marginTop: '48px'
    },
    chatInput: {
        display: 'flex',
        padding: '12px',
        borderTop: '1px solid #e0e0e0',
        gap: '8px'
    },
    chatInputField: {
        flex: 1,
        padding: '10px 16px',
        border: '1px solid #e0e0e0',
        borderRadius: '24px',
        fontSize: '14px',
        outline: 'none'
    },
    chatSendBtn: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: '#1a73e8',
        color: '#fff',
        fontSize: '18px',
        cursor: 'pointer'
    },
    controlsBar: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px 24px',
        backgroundColor: '#202124'
    },
    controlsCenter: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    controlBtn: {
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: '#3c4043',
        color: '#fff',
        fontSize: '24px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    controlBtnActive: {
        backgroundColor: '#ea4335'
    },
    controlBtnSharing: {
        backgroundColor: '#34a853'
    },
    endCallBtn: {
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: '#ea4335',
        color: '#fff',
        fontSize: '24px',
        cursor: 'pointer',
        marginLeft: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: 'rotate(135deg)'
    }
}
