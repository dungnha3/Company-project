package DoAn.BE.user.mapper;

import DoAn.BE.hr.repository.NhanVienRepository;
import DoAn.BE.user.dto.UserDTO;
import DoAn.BE.user.entity.User;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class UserMapper {

    private final NhanVienRepository nhanVienRepository;

    public UserMapper(NhanVienRepository nhanVienRepository) {
        this.nhanVienRepository = nhanVienRepository;
    }

    /**
     * Convert User entity to UserDTO
     */
    public UserDTO toDTO(User user) {
        if (user == null) {
            return null;
        }

        UserDTO dto = new UserDTO();
        dto.setUserId(user.getUserId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setPhoneNumber(user.getPhoneNumber());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setRole(user.getRole());
        dto.setIsActive(user.getIsActive());
        dto.setIsOnline(user.getIsOnline());
        dto.setLastSeen(user.getLastSeen());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setLastLogin(user.getLastLogin());

        // Lấy nhanvienId và fullName nếu user có liên kết với NhanVien
        nhanVienRepository.findByUser_UserId(user.getUserId())
                .ifPresent(nhanVien -> {
                    dto.setNhanvienId(nhanVien.getNhanvienId());
                    dto.setFullName(nhanVien.getHoTen());
                });

        if (dto.getFullName() == null) {
            dto.setFullName(user.getUsername()); // Fallback
        }

        return dto;
    }

    /**
     * Convert list of User entities to list of UserDTOs
     */
    public List<UserDTO> toDTOList(List<User> users) {
        if (users == null) {
            return null;
        }

        return users.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }
}
