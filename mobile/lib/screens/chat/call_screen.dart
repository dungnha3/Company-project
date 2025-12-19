import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:mobile/data/services/signaling_service.dart';
import 'package:mobile/data/services/websocket_service.dart';
import 'package:mobile/config/app_colors.dart';
import 'dart:async';
import 'dart:ui'; // For ImageFilter

enum CallState { kConnecting, kConnected, kEnded }

class CallScreen extends StatefulWidget {
  final int roomId;
  final bool isCaller;
  final WebSocketService webSocketService;
  final Map<String, dynamic>? offer;
  final Stream<Map<String, dynamic>>? signalStream;
  final bool isVideoCall;
  final String otherUserName;
  final String? otherUserAvatar;

  const CallScreen({
    Key? key,
    required this.roomId,
    required this.isCaller,
    required this.webSocketService,
    this.offer,
    this.signalStream,
    this.isVideoCall = true,
    required this.otherUserName,
    this.otherUserAvatar,
  }) : super(key: key);

  @override
  _CallScreenState createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> {
  final _localRenderer = RTCVideoRenderer();
  final _remoteRenderer = RTCVideoRenderer();
  late SignalingService _signalingService;
  StreamSubscription? _signalSubscription;
  bool _isMicMuted = false;
  bool _isVideoOff = false;
  CallState _callState = CallState.kConnecting;
  Timer? _durationTimer;
  Timer? _noAnswerTimer; // Add timeout timer
  int _callDurationSeconds = 0;

  @override
  void initState() {
    super.initState();
    _initRenderers();
    _signalingService = SignalingService(widget.webSocketService);
    
    // Start timeout if we are the caller
    if (widget.isCaller) {
      _noAnswerTimer = Timer(const Duration(seconds: 30), () {
         if (mounted && _callState == CallState.kConnecting) {
             ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Người nhận không trả lời')));
             _hangUp();
         }
      });
    }

    if (widget.signalStream != null) {
      _signalSubscription = widget.signalStream!.listen((data) {
         handleSignal(data);
      });
    }
    
    _signalingService.onAddRemoteStream = ((stream) {
      setState(() {
        _remoteRenderer.srcObject = stream;
        _callState = CallState.kConnected;
        _noAnswerTimer?.cancel(); // Cancel timeout on connection
        _startTimer();
      });
    });

    _isVideoOff = !widget.isVideoCall;

    _signalingService.openUserMedia(_localRenderer, _remoteRenderer, video: widget.isVideoCall).then((_) {
        if (widget.isCaller) {
             _signalingService.createOffer(widget.roomId, video: widget.isVideoCall);
        } else if (widget.offer != null) {
             _signalingService.handleOffer(widget.offer!, widget.roomId, video: widget.isVideoCall);
        }
    });
  }

  void _startTimer() {
    _durationTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _callDurationSeconds++;
        });
      }
    });
  }

  String _formatDuration(int seconds) {
    final int minutes = seconds ~/ 60;
    final int remainingSeconds = seconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${remainingSeconds.toString().padLeft(2, '0')}';
  }
  
  void handleSignal(Map<String, dynamic> data) async {
       var type = data['type'];
       var payload = data['data']; 
       if (data['data'] == null && data.containsKey('sdp')) {
          payload = data; 
       }
       if (data.containsKey('data')) payload = data['data'];

       print("CallScreen received signal: $type"); // Debug log

       switch (type) {
           case 'CALL_ANSWER':
               _noAnswerTimer?.cancel(); // Cancel timeout
               await _signalingService.handleAnswer(payload);
               break;
           case 'ICE_CANDIDATE':
               await _signalingService.handleCandidate(payload);
               break;
           case 'CALL_END':
               _endCall();
               break;
       }
  }

  Future<void> _initRenderers() async {
    await _localRenderer.initialize();
    await _remoteRenderer.initialize();
  }

  @override
  void dispose() {
    _durationTimer?.cancel();
    _noAnswerTimer?.cancel();
    _signalSubscription?.cancel();
    _signalingService.hangUp();
    _localRenderer.dispose();
    _remoteRenderer.dispose();
    super.dispose();
  }

  void _toggleMic() {
    setState(() {
      _isMicMuted = !_isMicMuted;
    });
    // Add SignalingService mute logic if available
  }

  void _toggleVideo() {
    setState(() {
      _isVideoOff = !_isVideoOff;
    });
    // Add SignalingService video toggle logic
  }

  void _endCall() {
     _signalingService.hangUp();
     if (mounted) Navigator.pop(context);
  }

  void _hangUp() {
    _signalingService.hangUp();
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black, // Base dark background
      body: Stack(
        fit: StackFit.expand,
        children: [
          // 1. Background Content (Video or Blur)
          if (_callState == CallState.kConnected && widget.isVideoCall)
             RTCVideoView(_remoteRenderer, objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover)
          else 
             _buildBlurredBackground(),

          // 2. Main Content Layer
          SafeArea(
            child: Column(
              children: [
                const Spacer(flex: 1),
                
                // Avatar & Name (Always visible in Audio / Connecting, or small in Video?)
                // If Video Call Connected: Hide Avatar, maybe show small name?
                // If Audio/Connecting: Show Big Avatar.
                if (_callState != CallState.kConnected || !widget.isVideoCall)
                   _buildUserInfo(),

                const Spacer(flex: 2),

                // Controls
                _buildControls(),
                
                const SizedBox(height: 40),
              ],
            ),
          ),

          // 3. Local Video (Picture in Picture) - Only for Video Call
          if (widget.isVideoCall && !_isVideoOff)
            Positioned(
              right: 20,
              top: 50,
              width: 100,
              height: 150,
              child: ClipRRect(
                 borderRadius: BorderRadius.circular(12),
                 child: RTCVideoView(_localRenderer, mirror: true, objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildBlurredBackground() {
    return Stack(
      fit: StackFit.expand,
      children: [
        Container(color: const Color(0xFF2C3E50)), // Fallback dark color
        // Optional: Background Image with blur
        if (widget.otherUserAvatar != null)
           Image.network(
             widget.otherUserAvatar!, 
             fit: BoxFit.cover,
             errorBuilder: (_, __, ___) => Container(color: const Color(0xFF2C3E50)),
           ),
        BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            color: Colors.black.withOpacity(0.6),
          ),
        ),
      ],
    );
  }

  Widget _buildUserInfo() {
    return Column(
      children: [
        Container(
          width: 120,
          height: 120,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white.withOpacity(0.2), width: 4),
            image: widget.otherUserAvatar != null 
                ? DecorationImage(image: NetworkImage(widget.otherUserAvatar!), fit: BoxFit.cover)
                : null,
            color: AppColors.primary,
          ),
          child: widget.otherUserAvatar == null 
              ? Center(child: Text(widget.otherUserName.isNotEmpty ? widget.otherUserName[0] : '?', 
                                  style: TextStyle(fontSize: 48, color: Colors.white)))
              : null,
        ),
        const SizedBox(height: 24),
        Text(
          widget.otherUserName,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 28,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        // Status Text
        Text(
          _callState == CallState.kConnected 
             ? _formatDuration(_callDurationSeconds)
             : 'Đang gọi...',
          style: TextStyle(
            color: Colors.white.withOpacity(0.8),
            fontSize: 18,
          ),
        ),
      ],
    );
  }

  Widget _buildControls() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        // Mute
        _buildCircleButton(
          icon: _isMicMuted ? Icons.mic_off : Icons.mic,
          color: Colors.white.withOpacity(0.2),
          iconColor: Colors.white,
          onPressed: _toggleMic,
        ),
        
        // End Call
        _buildCircleButton(
          icon: Icons.call_end,
          color: Colors.red,
          iconColor: Colors.white,
          size: 72,
          onPressed: _hangUp,
        ),

        // Video Toggle (only for Video Call) or Speaker (Audio)
        if (widget.isVideoCall)
          _buildCircleButton(
            icon: _isVideoOff ? Icons.videocam_off : Icons.videocam,
             color: Colors.white.withOpacity(0.2),
            iconColor: Colors.white,
            onPressed: _toggleVideo,
          )
        else
           _buildCircleButton(
            icon: Icons.volume_up, // Placeholder for speaker toggle
             color: Colors.white.withOpacity(0.2),
            iconColor: Colors.white,
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Tính năng đang phát triển')),
              );
            },
          ),
      ],
    );
  }

  Widget _buildCircleButton({
    required IconData icon,
    required Color color,
    required VoidCallback onPressed,
    Color iconColor = Colors.white,
    double size = 56,
  }) {
    return GestureDetector(
        onTap: onPressed,
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: iconColor, size: size * 0.5),
        )
    );
  }
}
