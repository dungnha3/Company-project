package DoAn.BE.chat.repository;

import DoAn.BE.chat.entity.ChatRoomMember;
import DoAn.BE.chat.entity.ChatRoomMemberId;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatRoomMemberRepository extends JpaRepository<ChatRoomMember, ChatRoomMemberId> {

    // [OPTIMIZED: Fetch with User for member list display]
    @EntityGraph(attributePaths = { "user" })
    List<ChatRoomMember> findByChatRoom_RoomId(Long roomId);

    // [OPTIMIZED: Fetch with ChatRoom for user's room list]
    @EntityGraph(attributePaths = { "chatRoom", "chatRoom.project" })
    List<ChatRoomMember> findByUser_UserId(Long userId);

    Long countByChatRoom_RoomId(Long roomId);

    boolean existsByChatRoom_RoomIdAndUser_UserId(Long roomId, Long userId);

    Optional<ChatRoomMember> findByChatRoom_RoomIdAndUser_UserId(Long roomId, Long userId);

    // Find members by role
    List<ChatRoomMember> findByChatRoom_RoomIdAndRole(Long roomId, ChatRoomMember.MemberRole role);

    // Count members by role
    Long countByChatRoom_RoomIdAndRole(Long roomId, ChatRoomMember.MemberRole role);

    // Check if user is admin
    boolean existsByChatRoom_RoomIdAndUser_UserIdAndRole(Long roomId, Long userId, ChatRoomMember.MemberRole role);
}
