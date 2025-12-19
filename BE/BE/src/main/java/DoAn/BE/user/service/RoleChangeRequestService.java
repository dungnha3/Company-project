package DoAn.BE.user.service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.common.util.PermissionUtil;
import DoAn.BE.notification.service.HRNotificationService;
import DoAn.BE.user.dto.RoleChangeRequestDTO;
import DoAn.BE.user.entity.RoleChangeRequest;
import DoAn.BE.user.entity.RoleChangeRequest.RequestStatus;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.RoleChangeRequestRepository;
import DoAn.BE.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
public class RoleChangeRequestService {
    
    private final RoleChangeRequestRepository requestRepository;
    private final UserRepository userRepository;
    private final HRNotificationService hrNotificationService;
    
    public RoleChangeRequestService(RoleChangeRequestRepository requestRepository,
                                   UserRepository userRepository,
                                   HRNotificationService hrNotificationService) {
        this.requestRepository = requestRepository;
        this.userRepository = userRepository;
        this.hrNotificationService = hrNotificationService;
    }
    
    // HR Manager tạo yêu cầu thay đổi role
    public RoleChangeRequestDTO createRequest(RoleChangeRequestDTO dto, User currentUser) {
        log.info("HR Manager {} tạo yêu cầu thay đổi role cho user {}", 
                 currentUser.getUsername(), dto.getTargetUserId());
        
        PermissionUtil.checkHRPermission(currentUser);
        User targetUser = userRepository.findById(dto.getTargetUserId())
            .orElseThrow(() -> new EntityNotFoundException("User không tồn tại"));
        if (targetUser.isAdmin()) {
            throw new BadRequestException("Không thể thay đổi role của Admin");
        }
        if (targetUser.getUserId().equals(currentUser.getUserId())) {
            throw new BadRequestException("Không thể thay đổi role của chính mình");
        }
        
        RoleChangeRequest request = new RoleChangeRequest();
        request.setTargetUser(targetUser);
        request.setCurrentRole(targetUser.getRole());
        request.setRequestedRole(dto.getRequestedRole());
        request.setRequestedBy(currentUser);
        request.setReason(dto.getReason());
        request.setStatus(RequestStatus.PENDING);
        
        request = requestRepository.save(request);
        
        log.info("✅ Đã tạo yêu cầu thay đổi role: {} -> {}", 
                 request.getCurrentRole(), request.getRequestedRole());
        
        // Gửi notification cho tất cả Admin
        List<User> admins = userRepository.findByRole(User.Role.ADMIN);
        for (User admin : admins) {
            hrNotificationService.createRoleChangeRequestNotification(
                admin.getUserId(),
                currentUser.getUsername(),
                targetUser.getUsername(),
                request.getCurrentRole().toString(),
                request.getRequestedRole().toString()
            );
        }
        
        return toDTO(request);
    }
    
    /**
     * Admin duyệt yêu cầu
     */
    public RoleChangeRequestDTO approveRequest(Long requestId, String note, User admin) {
        log.info("Admin {} duyệt yêu cầu thay đổi role {}", admin.getUsername(), requestId);
        
        PermissionUtil.checkAdminPermission(admin);
        
        RoleChangeRequest request = requestRepository.findById(requestId)
            .orElseThrow(() -> new EntityNotFoundException("Yêu cầu không tồn tại"));
        
        if (request.getStatus() != RequestStatus.PENDING) {
            throw new BadRequestException("Yêu cầu đã được xử lý");
        }
        
        request.approve(admin, note);
        
        // Cập nhật role của user
        User targetUser = request.getTargetUser();
        targetUser.setRole(request.getRequestedRole());
        userRepository.save(targetUser);
        
        requestRepository.save(request);
        
        log.info("✅ Đã duyệt thay đổi role: {} -> {} cho user {}", 
                 request.getCurrentRole(), request.getRequestedRole(), targetUser.getUsername());
        
        // Gửi notification cho target user
        hrNotificationService.createRoleChangeApprovedNotification(
            targetUser.getUserId(),
            request.getCurrentRole().toString(),
            request.getRequestedRole().toString()
        );
        
        // Gửi notification cho HR Manager
        hrNotificationService.createRoleChangeProcessedNotification(
            request.getRequestedBy().getUserId(),
            targetUser.getUsername(),
            "duyệt",
            note
        );
        
        return toDTO(request);
    }
    
    /**
     * Admin từ chối yêu cầu
     */
    public RoleChangeRequestDTO rejectRequest(Long requestId, String note, User admin) {
        log.info("Admin {} từ chối yêu cầu thay đổi role {}", admin.getUsername(), requestId);
        
        PermissionUtil.checkAdminPermission(admin);
        
        RoleChangeRequest request = requestRepository.findById(requestId)
            .orElseThrow(() -> new EntityNotFoundException("Yêu cầu không tồn tại"));
        
        if (request.getStatus() != RequestStatus.PENDING) {
            throw new BadRequestException("Yêu cầu đã được xử lý");
        }
        
        request.reject(admin, note);
        requestRepository.save(request);
        
        log.info("❌ Đã từ chối yêu cầu thay đổi role cho user {}", 
                 request.getTargetUser().getUsername());
        
        // Gửi notification cho HR Manager
        hrNotificationService.createRoleChangeProcessedNotification(
            request.getRequestedBy().getUserId(),
            request.getTargetUser().getUsername(),
            "từ chối",
            note
        );
        
        return toDTO(request);
    }
    
    /**
     * Lấy danh sách yêu cầu chờ duyệt
     */
    public List<RoleChangeRequestDTO> getPendingRequests(User currentUser) {
        PermissionUtil.checkAdminPermission(currentUser);
        return requestRepository.findByStatusOrderByCreatedAtDesc(RequestStatus.PENDING)
            .stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }
    
    /**
     * Lấy danh sách yêu cầu của HR Manager
     */
    public List<RoleChangeRequestDTO> getMyRequests(User currentUser) {
        PermissionUtil.checkHRPermission(currentUser);
        return requestRepository.findByRequestedBy_UserId(currentUser.getUserId())
            .stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }
    
    private RoleChangeRequestDTO toDTO(RoleChangeRequest request) {
        RoleChangeRequestDTO dto = new RoleChangeRequestDTO();
        dto.setTargetUserId(request.getTargetUser().getUserId());
        dto.setTargetUsername(request.getTargetUser().getUsername());
        dto.setCurrentRole(request.getCurrentRole());
        dto.setRequestedRole(request.getRequestedRole());
        dto.setReason(request.getReason());
        dto.setStatus(request.getStatus());
        dto.setRequestedById(request.getRequestedBy().getUserId());
        dto.setRequestedByUsername(request.getRequestedBy().getUsername());
        
        if (request.getReviewedBy() != null) {
            dto.setReviewedById(request.getReviewedBy().getUserId());
            dto.setReviewedByUsername(request.getReviewedBy().getUsername());
        }
        
        dto.setReviewNote(request.getReviewNote());
        dto.setCreatedAt(request.getCreatedAt());
        dto.setReviewedAt(request.getReviewedAt());
        
        return dto;
    }
}
