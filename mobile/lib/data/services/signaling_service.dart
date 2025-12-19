import 'dart:convert';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:mobile/data/services/websocket_service.dart';

typedef StreamStateCallback = void Function(MediaStream stream);

class SignalingService {
  final WebSocketService _socketService;
  
  SignalingService(this._socketService);

  Map<String, dynamic> configuration = {
    'iceServers': [
      {'urls': ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']}
    ]
  };

  RTCPeerConnection? peerConnection;
  MediaStream? localStream;
  String? roomId;

  StreamStateCallback? onLocalStream;
  StreamStateCallback? onAddRemoteStream;
  Function()? onRemoveRemoteStream;

  Future<void> openUserMedia(RTCVideoRenderer localVideo, RTCVideoRenderer remoteVideo, {bool video = true}) async {
    var stream = await navigator.mediaDevices.getUserMedia({
      'video': video,
      'audio': true,
    });
    
    localVideo.srcObject = stream;
    localStream = stream;
    onLocalStream?.call(stream);

    peerConnection = await createPeerConnection(configuration);

    peerConnection!.onIceCandidate = (candidate) {
        if (roomId != null) {
            _socketService.sendSignal(roomId!, 'ICE_CANDIDATE', {
                'candidate': candidate.candidate,
                'sdpMid': candidate.sdpMid,
                'sdpMLineIndex': candidate.sdpMLineIndex,
            });
        }
    };

    peerConnection!.onTrack = (event) {
        if (event.streams.isNotEmpty) {
            remoteVideo.srcObject = event.streams[0];
            onAddRemoteStream?.call(event.streams[0]);
        }
    };

    stream.getTracks().forEach((track) {
        peerConnection!.addTrack(track, stream);
    });
  }

  Future<void> createOffer(int roomId, {bool video = true}) async {
      this.roomId = roomId.toString();
      RTCSessionDescription description = await peerConnection!.createOffer({'offerToReceiveVideo': video ? 1 : 0});
      await peerConnection!.setLocalDescription(description);
      
      _socketService.sendSignal(roomId.toString(), 'CALL_OFFER', {
          'sdp': description.sdp,
          'type': description.type,
          'isVideo': video
      });
  }

  Future<void> createAnswer(int roomId, {bool video = true}) async {
      this.roomId = roomId.toString();
      RTCSessionDescription description = await peerConnection!.createAnswer({'offerToReceiveVideo': video ? 1 : 0});
      await peerConnection!.setLocalDescription(description);
      
      _socketService.sendSignal(roomId.toString(), 'CALL_ANSWER', {
          'sdp': description.sdp,
          'type': description.type
      });
  }

  Future<void> handleOffer(Map<String, dynamic> data, int roomId, {bool video = true}) async {
      this.roomId = roomId.toString();
      var description = RTCSessionDescription(data['sdp'], data['type']);
      await peerConnection!.setRemoteDescription(description);
      await createAnswer(roomId, video: video);
  }

  Future<void> handleAnswer(Map<String, dynamic> data) async {
      var description = RTCSessionDescription(data['sdp'], data['type']);
      await peerConnection!.setRemoteDescription(description);
  }

  Future<void> handleCandidate(Map<String, dynamic> data) async {
      if (peerConnection == null) return;
      var candidate = RTCIceCandidate(
          data['candidate'],
          data['sdpMid'],
          data['sdpMLineIndex'],
      );
      await peerConnection!.addCandidate(candidate);
  }

  Future<void> hangUp() async {
      if (roomId != null) {
          _socketService.sendSignal(roomId!, 'CALL_END', {});
      }
      dispose();
  }
  
  void dispose() {
      if (localStream != null) {
        localStream!.getTracks().forEach((track) {
          track.stop();
        });
        localStream!.dispose();
        localStream = null;
      }
      peerConnection?.close();
      peerConnection = null;
  }
}
