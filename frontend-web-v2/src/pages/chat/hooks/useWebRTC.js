import { useState, useRef, useCallback, useEffect } from 'react';
import { useWebSocketStore } from '@shared/stores/websocketStore';
import { useAuthStore } from '@shared/stores/authStore';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

// Call states
export const CALL_STATE = {
    IDLE: 'idle',
    CALLING: 'calling',       // outgoing, waiting for answer
    INCOMING: 'incoming',     // incoming, waiting for user to accept/reject
    CONNECTING: 'connecting', // accepted, setting up WebRTC
    CONNECTED: 'connected',   // call active
    ENDED: 'ended',
};

export function useWebRTC() {
    const { sendMessage } = useWebSocketStore();
    const { user } = useAuthStore();

    const [callState, setCallState] = useState(CALL_STATE.IDLE);
    const [isVideo, setIsVideo] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isCamOff, setIsCamOff] = useState(false);
    const [callRoomId, setCallRoomId] = useState(null);
    const [remoteUser, setRemoteUser] = useState(null);
    const [callDuration, setCallDuration] = useState(0);

    const peerConnection = useRef(null);
    const localStream = useRef(null);
    const remoteStream = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const timerRef = useRef(null);
    const pendingCandidates = useRef([]);
    const ringtoneRef = useRef(null);
    const callDurationRef = useRef(0); // track duration in ref for callbacks
    const wasConnectedRef = useRef(false); // track if call was actually connected
    const isVideoRef = useRef(false); // track call type for log message
    const endCallRef = useRef(null); // stable ref for endCall to avoid stale closures

    // Cleanup function
    const cleanup = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (localStream.current) {
            localStream.current.getTracks().forEach(t => t.stop());
            localStream.current = null;
        }
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        remoteStream.current = null;
        pendingCandidates.current = [];
        if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current = null;
        }
        setCallDuration(0);
        setIsMuted(false);
        setIsCamOff(false);
        callDurationRef.current = 0;
    }, []);

    // Create peer connection
    const createPeerConnection = useCallback((roomId) => {
        const pc = new RTCPeerConnection(ICE_SERVERS);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendMessage('/app/chat.signal', {
                    type: 'ICE_CANDIDATE',
                    roomId,
                    userId: user?.userId,
                    username: user?.username,
                    data: { candidate: event.candidate },
                });
            }
        };

        pc.ontrack = (event) => {
            remoteStream.current = event.streams[0];
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                setCallState(CALL_STATE.CONNECTED);
                wasConnectedRef.current = true;
                // Start timer
                const start = Date.now();
                timerRef.current = setInterval(() => {
                    const dur = Math.floor((Date.now() - start) / 1000);
                    setCallDuration(dur);
                    callDurationRef.current = dur;
                }, 1000);
            } else if (pc.iceConnectionState === 'failed') {
                // Only end on 'failed', not 'disconnected' (which can be temporary)
                console.warn('[WebRTC] ICE connection failed');
                if (endCallRef.current) endCallRef.current(roomId);
            }
        };

        // Fallback: some browsers fire connectionstatechange instead of iceconnectionstatechange
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') {
                setCallState(CALL_STATE.CONNECTED);
                wasConnectedRef.current = true;
                if (!timerRef.current) {
                    const start = Date.now();
                    timerRef.current = setInterval(() => {
                        const dur = Math.floor((Date.now() - start) / 1000);
                        setCallDuration(dur);
                        callDurationRef.current = dur;
                    }, 1000);
                }
            } else if (pc.connectionState === 'failed') {
                console.warn('[WebRTC] Connection failed');
                if (endCallRef.current) endCallRef.current(roomId);
            }
        };

        peerConnection.current = pc;
        return pc;
    }, [sendMessage, user]);

    // Start outgoing call
    const startCall = useCallback(async (roomId, withVideo) => {
        try {
            setCallRoomId(roomId);
            setIsVideo(withVideo);
            isVideoRef.current = withVideo;
            setCallState(CALL_STATE.CALLING);

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: withVideo,
            });
            localStream.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            const pc = createPeerConnection(roomId);
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            sendMessage('/app/chat.signal', {
                type: 'CALL_OFFER',
                roomId,
                userId: user?.userId,
                username: user?.username,
                data: {
                    sdp: offer,
                    isVideo: withVideo,
                    callerName: user?.fullName || user?.username,
                },
            });
        } catch (err) {
            console.error('[WebRTC] Error starting call:', err);
            cleanup();
            setCallState(CALL_STATE.IDLE);
        }
    }, [createPeerConnection, sendMessage, user, cleanup]);

    // Answer incoming call
    const answerCall = useCallback(async () => {
        try {
            setCallState(CALL_STATE.CONNECTING);
            if (ringtoneRef.current) {
                ringtoneRef.current.pause();
                ringtoneRef.current = null;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: isVideo,
            });
            localStream.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            const pc = peerConnection.current;
            if (!pc) return;

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // Process any pending ICE candidates
            for (const candidate of pendingCandidates.current) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidates.current = [];

            sendMessage('/app/chat.signal', {
                type: 'CALL_ANSWER',
                roomId: callRoomId,
                userId: user?.userId,
                username: user?.username,
                data: { sdp: answer },
            });
        } catch (err) {
            console.error('[WebRTC] Error answering call:', err);
            cleanup();
            setCallState(CALL_STATE.IDLE);
        }
    }, [callRoomId, isVideo, sendMessage, user, cleanup]);

    // Reject incoming call
    const rejectCall = useCallback(() => {
        if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current = null;
        }
        sendMessage('/app/chat.signal', {
            type: 'CALL_REJECT',
            roomId: callRoomId,
            userId: user?.userId,
            username: user?.username,
            data: {},
        });
        cleanup();
        setCallState(CALL_STATE.IDLE);
        setCallRoomId(null);
        setRemoteUser(null);
    }, [callRoomId, sendMessage, user, cleanup]);

    // End active call
    const endCall = useCallback((roomIdOverride) => {
        // Ignore React SyntheticEvent passed by onClick
        const rid = (typeof roomIdOverride === 'number' ? roomIdOverride : null) || callRoomId;
        if (rid) {
            sendMessage('/app/chat.signal', {
                type: 'CALL_END',
                roomId: rid,
                userId: user?.userId,
                username: user?.username,
                data: {},
            });

            // Send call log as a chat message
            const dur = callDurationRef.current;
            const wasConnected = wasConnectedRef.current;
            const callType = isVideoRef.current ? 'video' : 'thoại';
            const formatDur = (s) => {
                const m = Math.floor(s / 60).toString().padStart(2, '0');
                const sec = (s % 60).toString().padStart(2, '0');
                return `${m}:${sec}`;
            };
            const logContent = wasConnected
                ? `📞 Cuộc gọi ${callType} — ${formatDur(dur)}`
                : `📞 Cuộc gọi ${callType} nhỡ`;

            sendMessage('/app/chat.sendMessage', {
                type: 'CHAT_MESSAGE',
                roomId: rid,
                userId: user?.userId,
                username: user?.username,
                content: logContent,
            });
        }
        wasConnectedRef.current = false;
        cleanup();
        setCallState(CALL_STATE.ENDED);
        setTimeout(() => {
            setCallState(CALL_STATE.IDLE);
            setCallRoomId(null);
            setRemoteUser(null);
        }, 1500);
    }, [callRoomId, sendMessage, user, cleanup]);

    // Keep endCallRef in sync so oniceconnectionstatechange always uses the latest
    endCallRef.current = endCall;

    // Toggle mute
    const toggleMute = useCallback(() => {
        if (localStream.current) {
            const audioTrack = localStream.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    }, []);

    // Toggle camera
    const toggleVideo = useCallback(() => {
        if (localStream.current) {
            const videoTrack = localStream.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCamOff(!videoTrack.enabled);
            }
        }
    }, []);

    // Handle incoming WebSocket signals
    const handleSignal = useCallback(async (signal) => {
        // Ignore own signals
        if (signal.userId === user?.userId) return;

        switch (signal.type) {
            case 'CALL_OFFER': {
                if (callState !== CALL_STATE.IDLE) return; // busy
                setCallRoomId(signal.roomId);
                setIsVideo(signal.data?.isVideo || false);
                isVideoRef.current = signal.data?.isVideo || false;
                setRemoteUser({ userId: signal.userId, username: signal.username, fullName: signal.data?.callerName });
                setCallState(CALL_STATE.INCOMING);

                // Set up peer connection with remote offer
                const pc = createPeerConnection(signal.roomId);
                await pc.setRemoteDescription(new RTCSessionDescription(signal.data.sdp));
                break;
            }

            case 'CALL_ANSWER': {
                if (!peerConnection.current) return;
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.data.sdp));
                // Flush any pending ICE candidates that arrived before remote description was set
                for (const candidate of pendingCandidates.current) {
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
                }
                pendingCandidates.current = [];
                setCallState(CALL_STATE.CONNECTING);
                break;
            }

            case 'ICE_CANDIDATE': {
                if (!peerConnection.current) return;
                const candidate = signal.data?.candidate;
                if (candidate) {
                    if (peerConnection.current.remoteDescription) {
                        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
                    } else {
                        pendingCandidates.current.push(candidate);
                    }
                }
                break;
            }

            case 'CALL_REJECT': {
                cleanup();
                setCallState(CALL_STATE.ENDED);
                setTimeout(() => {
                    setCallState(CALL_STATE.IDLE);
                    setCallRoomId(null);
                    setRemoteUser(null);
                }, 1500);
                break;
            }

            case 'CALL_END': {
                cleanup();
                setCallState(CALL_STATE.ENDED);
                setTimeout(() => {
                    setCallState(CALL_STATE.IDLE);
                    setCallRoomId(null);
                    setRemoteUser(null);
                }, 1500);
                break;
            }
        }
    }, [user, callState, createPeerConnection, cleanup]);

    // Re-attach streams to video elements when callState changes
    // (video elements may not exist when ontrack/getUserMedia first fires)
    useEffect(() => {
        if (localVideoRef.current && localStream.current) {
            localVideoRef.current.srcObject = localStream.current;
        }
        if (remoteVideoRef.current && remoteStream.current) {
            remoteVideoRef.current.srcObject = remoteStream.current;
        }
    }, [callState]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    return {
        // State
        callState,
        isVideo,
        isMuted,
        isCamOff,
        callRoomId,
        remoteUser,
        callDuration,
        // Refs for video elements
        localVideoRef,
        remoteVideoRef,
        // Actions
        startCall,
        answerCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        handleSignal,
    };
}
