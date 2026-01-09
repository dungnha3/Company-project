package DoAn.BE.workspace.service;

import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.user.entity.PersonalWorkspace;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.PersonalWorkspaceRepository;
import DoAn.BE.workspace.dto.WorkspaceDto;
import DoAn.BE.workspace.dto.WorkspaceDto.WorkspaceType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Service quản lý workspace context (Personal + Company)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WorkspaceService {

    private final PersonalWorkspaceRepository personalWorkspaceRepository;
    private final CompanyMemberRepository companyMemberRepository;

    /**
     * Lấy tất cả workspaces của user (Personal + Company memberships)
     */
    @Transactional(readOnly = true)
    public List<WorkspaceDto.WorkspaceResponse> getAllWorkspaces(User user) {
        List<WorkspaceDto.WorkspaceResponse> workspaces = new ArrayList<>();

        // 1. Personal Workspace
        personalWorkspaceRepository.findByUser_UserId(user.getUserId())
                .ifPresent(pw -> workspaces.add(WorkspaceDto.WorkspaceResponse.builder()
                        .id(pw.getWorkspaceId())
                        .name(pw.getName())
                        .type(WorkspaceType.PERSONAL)
                        .plan(user.getPersonalPlan())
                        .role("OWNER")
                        .isActive(true)
                        .build()));

        // 2. Company Workspaces
        List<CompanyMember> memberships = companyMemberRepository
                .findByUser_UserIdAndIsActiveTrue(user.getUserId());

        for (CompanyMember m : memberships) {
            workspaces.add(WorkspaceDto.WorkspaceResponse.builder()
                    .id(m.getCompany().getCompanyId())
                    .name(m.getCompany().getName())
                    .type(WorkspaceType.COMPANY)
                    .plan(m.getCompany().getPlan())
                    .role(m.getRole().name())
                    .isActive(m.getCompany().getIsActive())
                    .build());
        }

        return workspaces;
    }

    /**
     * Lấy Personal Workspace của user
     */
    @Transactional(readOnly = true)
    public WorkspaceDto.PersonalWorkspaceResponse getPersonalWorkspace(User user) {
        PersonalWorkspace pw = personalWorkspaceRepository.findByUser_UserId(user.getUserId())
                .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException(
                        "Personal workspace not found for user: " + user.getUserId()));

        return WorkspaceDto.PersonalWorkspaceResponse.builder()
                .workspaceId(pw.getWorkspaceId())
                .name(pw.getName())
                .plan(user.getPersonalPlan())
                .createdAt(pw.getCreatedAt())
                .build();
    }

    /**
     * Kiểm tra user có Personal Workspace chưa (dùng cho migration)
     */
    public boolean hasPersonalWorkspace(Long userId) {
        return personalWorkspaceRepository.existsByUser_UserId(userId);
    }

    /**
     * Tạo Personal Workspace cho user (nếu chưa có - dùng cho migration/fix)
     */
    @Transactional
    public PersonalWorkspace createPersonalWorkspaceIfNotExists(User user) {
        if (hasPersonalWorkspace(user.getUserId())) {
            return personalWorkspaceRepository.findByUser_UserId(user.getUserId()).orElse(null);
        }

        PersonalWorkspace pw = PersonalWorkspace.createFor(user);
        pw = personalWorkspaceRepository.save(pw);
        log.info("Created personal workspace for existing user: {}", user.getUserId());
        return pw;
    }
}
