import { useEffect, useRef } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'

export default function JitsiMeeting({
    meetingId,
    meetingTitle,
    roomInfo,
    onClose
}) {
    const { user } = useAuth()
    const jitsiContainerRef = useRef(null)
    const apiRef = useRef(null)

    useEffect(() => {
        // Load Jitsi Meet External API script
        const script = document.createElement('script')
        script.src = 'https://meet.jit.si/external_api.js'
        script.async = true
        script.onload = initJitsi
        document.body.appendChild(script)

        return () => {
            // Cleanup
            if (apiRef.current) {
                apiRef.current.dispose()
            }
            document.body.removeChild(script)
        }
    }, [])

    const initJitsi = () => {
        if (!jitsiContainerRef.current) return

        // Generate room name from meetingId or random
        const roomName = `DACN_${meetingId || Date.now()}_${roomInfo?.roomId || 'room'}`

        const domain = 'meet.jit.si'
        const options = {
            roomName: roomName,
            width: '100%',
            height: '100%',
            parentNode: jitsiContainerRef.current,
            userInfo: {
                displayName: user?.username || 'Guest',
                email: user?.email || ''
            },
            configOverwrite: {
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                prejoinPageEnabled: false,
                disableDeepLinking: true,
                enableWelcomePage: false,
                enableClosePage: false,
                defaultLanguage: 'vi'
            },
            interfaceConfigOverwrite: {
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'closedcaptions', 'desktop',
                    'fullscreen', 'fodeviceselection', 'hangup', 'chat',
                    'raisehand', 'videoquality', 'filmstrip', 'participants-pane',
                    'tileview', 'select-background', 'mute-everyone'
                ],
                SETTINGS_SECTIONS: ['devices', 'language'],
                MOBILE_APP_PROMO: false,
                DISABLE_JOIN_LEAVE_NOTIFICATIONS: false
            }
        }

        apiRef.current = new window.JitsiMeetExternalAPI(domain, options)

        // Event listeners
        apiRef.current.addListener('readyToClose', () => {
            handleClose()
        })

        apiRef.current.addListener('participantJoined', (participant) => {
            console.log('Participant joined:', participant)
        })

        apiRef.current.addListener('participantLeft', (participant) => {
            console.log('Participant left:', participant)
        })

        // Set subject/title
        if (meetingTitle) {
            apiRef.current.executeCommand('subject', meetingTitle)
        }
    }

    const handleClose = () => {
        if (apiRef.current) {
            apiRef.current.dispose()
        }
        onClose?.()
    }

    return (
        <div style={styles.container}>
            {/* Header with close button */}
            <div style={styles.header}>
                <div style={styles.headerInfo}>
                    <span style={styles.title}>{meetingTitle || 'Cuộc họp'}</span>
                    <span style={styles.roomName}>{roomInfo?.name}</span>
                </div>
                <button style={styles.closeBtn} onClick={handleClose} title="Rời cuộc họp">
                    ✕ Rời khỏi
                </button>
            </div>

            {/* Jitsi container */}
            <div ref={jitsiContainerRef} style={styles.jitsiContainer} />
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
        padding: '8px 16px',
        backgroundColor: '#1a1a2e',
        borderBottom: '1px solid #3c4043'
    },
    headerInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    title: {
        color: '#fff',
        fontSize: '14px',
        fontWeight: '500'
    },
    roomName: {
        color: '#9aa0a6',
        fontSize: '12px'
    },
    closeBtn: {
        padding: '8px 16px',
        backgroundColor: '#ea4335',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    },
    jitsiContainer: {
        flex: 1,
        backgroundColor: '#000'
    }
}
