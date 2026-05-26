package DoAn.BE.hrm.service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.hrm.dto.QuickScoreRequest;
import DoAn.BE.hrm.dto.ReviewRequest;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.Review;
import DoAn.BE.hrm.entity.Review.ReviewStatus;
import DoAn.BE.hrm.entity.Review.ReviewType;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.repository.ReviewRepository;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.IssueStatus;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.IssueStatusRepository;
import DoAn.BE.user.entity.User;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final EmployeeRepository employeeRepository;
    private final IssueRepository issueRepository;
    private final IssueStatusRepository issueStatusRepository;
    private final AccessControlService accessControlService;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    public Review createReview(ReviewRequest request, User currentUser) {
        accessControlService.checkReviewCreatePermission();

        log.info("User {} creating review for employee ID: {}", currentUser.getUsername(), request.getEmployeeId());
        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        Optional<Review> existingReview = reviewRepository.findByEmployeeAndPeriodAndType(
                request.getEmployeeId(), request.getReviewPeriod(), request.getReviewType());

        if (existingReview.isPresent()) {
            throw new BadRequestException("Employee already has a review for this period");
        }

        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        Employee reviewer;
        if (companyId != null) {
            reviewer = employeeRepository.findByUser_UserIdAndCompany_CompanyId(currentUser.getUserId(), companyId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Reviewer employee profile not found in current company"));
        } else {
            reviewer = employeeRepository.findByUser_UserId(currentUser.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Reviewer employee profile not found"));
        }

        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("End date must be after start date");
        }

        Review review = new Review();
        review.setEmployee(employee);
        review.setReviewer(reviewer);
        review.setReviewPeriod(request.getReviewPeriod());
        review.setReviewType(request.getReviewType());

        review.setTechnicalScore(request.getTechnicalScore());
        review.setAttitudeScore(request.getAttitudeScore());
        review.setSoftSkillsScore(request.getSoftSkillsScore());
        review.setTeamworkScore(request.getTeamworkScore());

        review.setComments(request.getComments());
        review.setNextGoals(request.getNextGoals());
        review.setDevelopmentPlan(request.getDevelopmentPlan());

        review.setStartDate(request.getStartDate());
        review.setEndDate(request.getEndDate());

        // Optional project link
        review.setProjectId(request.getProjectId());
        review.setProjectName(request.getProjectName());

        review = reviewRepository.save(review);

        // Publish Event
        eventPublisher.publishEvent(new DoAn.BE.hrm.event.HrmEvent(this, DoAn.BE.hrm.event.HrmEvent.Type.REVIEW_CREATED,
                review, currentUser.getUserId(), "New Review for " + employee.getFullName()));

        return review;
    }

    public Review getReviewById(Long id, User currentUser) {
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));

        try {
            accessControlService.checkReviewViewAllPermission();
            return review;
        } catch (ForbiddenException ignored) {
            // Fall through to self-view check
        }

        if (!review.getEmployee().getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("You do not have permission to view this review");
        }

        return review;
    }

    public List<Review> getAllReviews(User currentUser) {
        // Nếu có quyền VIEW_ALL: trả về tất cả review của công ty
        try {
            accessControlService.checkReviewViewAllPermission();
            Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
            if (companyId == null) {
                return java.util.Collections.emptyList();
            }
            return reviewRepository.findByCompanyId(companyId);
        } catch (ForbiddenException ignored) {
            // Fallback: user thường chỉ xem được reviews của chính mình
        }
        return reviewRepository.findByEmployee_User_UserIdOrderByCreatedAtDesc(currentUser.getUserId());
    }

    public Page<Review> getAllReviewsPage(Pageable pageable, User currentUser) {
        try {
            accessControlService.checkReviewViewAllPermission();
            Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
            if (companyId == null)
                return Page.empty(pageable);
            return reviewRepository.findByCompanyId(companyId, pageable);
        } catch (ForbiddenException ignored) {
            // Fallback: user thường chỉ xem được reviews của chính mình
        }
        // Trả về list của chính user dưới dạng Page
        List<Review> myReviews = reviewRepository
                .findByEmployee_User_UserIdOrderByCreatedAtDesc(currentUser.getUserId());
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), myReviews.size());
        List<Review> pageContent = start >= myReviews.size() ? java.util.Collections.emptyList()
                : myReviews.subList(start, end);
        return new org.springframework.data.domain.PageImpl<>(pageContent, pageable, myReviews.size());
    }

    public Review updateReview(Long id, ReviewRequest request, User currentUser) {
        Review review = getReviewById(id, currentUser);

        boolean hasReviewPermission;
        try {
            accessControlService.checkReviewCreatePermission();
            hasReviewPermission = true;
        } catch (ForbiddenException e) {
            hasReviewPermission = false;
        }

        if (!hasReviewPermission &&
                !review.getReviewer().getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("You do not have permission to edit this review");
        }

        if (review.getStatus() == ReviewStatus.APPROVED) {
            throw new BadRequestException("Cannot edit approved reviews");
        }

        log.info("User {} updating review ID: {}", currentUser.getUsername(), id);

        review.setTechnicalScore(request.getTechnicalScore());
        review.setAttitudeScore(request.getAttitudeScore());
        review.setSoftSkillsScore(request.getSoftSkillsScore());
        review.setTeamworkScore(request.getTeamworkScore());

        review.setComments(request.getComments());
        review.setNextGoals(request.getNextGoals());
        review.setDevelopmentPlan(request.getDevelopmentPlan());

        return reviewRepository.save(review);
    }

    public Review approveReview(Long id, String note, User currentUser) {
        accessControlService.checkReviewApprovePermission();

        Review review = getReviewById(id, currentUser);

        if (review.getStatus() != ReviewStatus.PENDING) {
            throw new BadRequestException("Can only approve pending reviews");
        }

        log.info("HR Manager {} approving review ID: {}", currentUser.getUsername(), id);

        review.setStatus(ReviewStatus.APPROVED);
        review.setCompletedDate(LocalDate.now());

        if (note != null && !note.trim().isEmpty()) {
            String existing = review.getComments() != null ? review.getComments() : "";
            review.setComments(existing + "\n\nHR Note: " + note);
        }

        review = reviewRepository.save(review);

        // Publish Event
        eventPublisher
                .publishEvent(new DoAn.BE.hrm.event.HrmEvent(this, DoAn.BE.hrm.event.HrmEvent.Type.REVIEW_APPROVED,
                        review, currentUser.getUserId(), "Review Approved for " + review.getEmployee().getFullName()));

        return review;
    }

    public Review rejectReview(Long id, String reason, User currentUser) {
        accessControlService.checkReviewApprovePermission();

        Review review = getReviewById(id, currentUser);

        if (review.getStatus() != ReviewStatus.PENDING) {
            throw new BadRequestException("Can only reject pending reviews");
        }

        log.info("HR Manager {} rejecting review ID: {}", currentUser.getUsername(), id);

        review.setStatus(ReviewStatus.REJECTED);

        if (reason != null && !reason.trim().isEmpty()) {
            String existing = review.getComments() != null ? review.getComments() : "";
            review.setComments(existing + "\n\nRejection Reason: " + reason);
        }

        return reviewRepository.save(review);
    }

    public Review submitForApproval(Long id, User currentUser) {
        Review review = getReviewById(id, currentUser);

        if (!review.getReviewer().getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("Only the reviewer can submit for approval");
        }

        if (review.getStatus() != ReviewStatus.IN_PROGRESS) {
            throw new BadRequestException("Can only submit draft reviews");
        }

        log.info("User {} submitting review ID: {} for approval", currentUser.getUsername(), id);

        review.setStatus(ReviewStatus.PENDING);
        return reviewRepository.save(review);
    }

    public List<Review> getReviewsByEmployee(Long employeeId, User currentUser) {
        try {
            accessControlService.checkReviewViewAllPermission();
            return reviewRepository.findByEmployee_EmployeeIdOrderByCreatedAtDesc(employeeId);
        } catch (ForbiddenException ignored) {
            // Fall through to self-view check
        }

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        if (!employee.getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("You can only view your own reviews");
        }

        return reviewRepository.findByEmployee_EmployeeIdOrderByCreatedAtDesc(employeeId);
    }

    public List<Review> getPendingReviews(User currentUser) {
        accessControlService.checkReviewApprovePermission();
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId == null) {
            return java.util.Collections.emptyList();
        }
        return reviewRepository.findPendingApproval().stream()
                .filter(r -> r.getEmployee() != null && r.getEmployee().getCompany() != null
                        && companyId.equals(r.getEmployee().getCompany().getCompanyId()))
                .toList();
    }

    public void deleteReview(Long id, User currentUser) {
        accessControlService.checkReviewApprovePermission();

        Review review = getReviewById(id, currentUser);

        if (review.getStatus() == ReviewStatus.APPROVED) {
            throw new BadRequestException("Cannot delete approved reviews");
        }

        log.info("HR Manager {} deleting review ID: {}", currentUser.getUsername(), id);
        reviewRepository.delete(review);
    }

    /**
     * Lấy tất cả review liên quan đến một dự án cụ thể.
     * Project member có thể xem review của dự án mình tham gia.
     */
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<Review> getReviewsByProject(Long projectId) {
        return reviewRepository.findByProjectId(projectId);
    }

    @Transactional
    public Review quickScoreAndCompleteIssue(Long issueId, QuickScoreRequest request, User currentUser) {
        // 1. Check permissions
        accessControlService.checkProjectManageIssuesPermission();

        // 2. Find Issue
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy issue"));

        if (issue.getAssignee() == null) {
            throw new BadRequestException("Issue chưa được giao cho ai, không thể chấm điểm");
        }

        // 3. Find Employee profile of Assignee
        Employee employee = employeeRepository.findByUser_UserId(issue.getAssignee().getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Người được giao chưa có hồ sơ nhân sự"));

        // 4. Find Reviewer
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        Employee reviewer = null;
        if (companyId != null) {
            reviewer = employeeRepository.findByUser_UserIdAndCompany_CompanyId(currentUser.getUserId(), companyId)
                    .orElse(null);
        }
        if (reviewer == null) {
            reviewer = employeeRepository.findByUser_UserId(currentUser.getUserId()).orElse(null);
        }

        // 5. Map quick score to review scores:
        // performanceScore (1-10) -> used as all 4 sub-scores for simplicity
        // reworkCount -> recorded in comments
        BigDecimal perf = request.getPerformanceScore();

        StringBuilder sb = new StringBuilder();
        if (request.getReviewerNote() != null && !request.getReviewerNote().isBlank()) {
            sb.append(request.getReviewerNote()).append("\n\n");
        }
        if (request.getReworkCount() != null && request.getReworkCount() > 0) {
            sb.append("Rework count: ").append(request.getReworkCount()).append(" lần");
        }
        String combinedComments = sb.length() > 0 ? sb.toString() : "Quick review from Kanban board";

        Review review = new Review();
        review.setEmployee(employee);
        review.setReviewer(reviewer);
        review.setReviewPeriod("Quick - " + issue.getIssueKey());
        review.setReviewType(ReviewType.PROJECT);
        review.setProjectId(issue.getProject().getProjectId());
        review.setProjectName(issue.getProject().getName());
        review.setStartDate(LocalDate.now());
        review.setEndDate(LocalDate.now());

        // Set individual scores using the same performance score for all 4 dimensions
        review.setTechnicalScore(perf);
        review.setAttitudeScore(perf);
        review.setSoftSkillsScore(perf);
        review.setTeamworkScore(perf);

        review.setComments(combinedComments);
        review.setStatus(ReviewStatus.APPROVED);
        review.setCompletedDate(LocalDate.now());

        review = reviewRepository.save(review);

        // 6. Update Issue status to Done
        IssueStatus doneStatus = issueStatusRepository.findByName("Done")
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy trạng thái Done"));
        issue.changeStatus(doneStatus);
        issueRepository.save(issue);

        // Publish Event
        eventPublisher.publishEvent(new DoAn.BE.hrm.event.HrmEvent(this, DoAn.BE.hrm.event.HrmEvent.Type.REVIEW_CREATED,
                review, currentUser.getUserId(), "Quick Review for " + employee.getFullName()));

        return review;
    }

    /**
     * Bulk create review drafts for multiple employees at once.
     * Auto-assigns reviewers: uses the manager field on employee if available,
     * otherwise falls back to the current user as reviewer.
     */
    @Transactional
    public DoAn.BE.hrm.dto.BulkReviewResponse bulkCreateReviews(
            DoAn.BE.hrm.dto.BulkReviewRequest request, User currentUser) {

        accessControlService.checkReviewCreatePermission();

        log.info("User {} bulk creating reviews for {} employees, period: {}, type: {}",
                currentUser.getUsername(), request.getEmployeeIds().size(),
                request.getReviewPeriod(), request.getReviewType());

        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();

        // Resolve current user as reviewer
        Employee currentReviewer = null;
        if (companyId != null) {
            currentReviewer = employeeRepository.findByUser_UserIdAndCompany_CompanyId(
                    currentUser.getUserId(), companyId).orElse(null);
        }
        if (currentReviewer == null) {
            currentReviewer = employeeRepository.findByUser_UserId(currentUser.getUserId()).orElse(null);
        }

        int createdCount = 0;
        int skippedCount = 0;
        java.util.ArrayList<String> createdNames = new java.util.ArrayList<>();
        java.util.ArrayList<String> skippedNames = new java.util.ArrayList<>();
        java.util.ArrayList<String> errors = new java.util.ArrayList<>();

        for (Long employeeId : request.getEmployeeIds()) {
            try {
                Employee employee = employeeRepository.findById(employeeId).orElse(null);
                if (employee == null) {
                    errors.add("Employee ID " + employeeId + " not found");
                    continue;
                }

                // Check if review already exists
                java.util.Optional<Review> existing = reviewRepository.findByEmployeeAndPeriodAndType(
                        employeeId, request.getReviewPeriod(), request.getReviewType());
                if (existing.isPresent()) {
                    skippedNames.add(employee.getFullName());
                    skippedCount++;
                    continue;
                }

                // Determine reviewer: current user is the reviewer for bulk operations
                Employee reviewer = currentReviewer;

                Review review = new Review();
                review.setEmployee(employee);
                review.setReviewer(reviewer);
                review.setReviewPeriod(request.getReviewPeriod());
                review.setReviewType(request.getReviewType());
                review.setStartDate(request.getStartDate() != null ? request.getStartDate() : LocalDate.now());
                review.setEndDate(request.getEndDate() != null ? request.getEndDate() : LocalDate.now());
                if (request.getProjectId() != null) {
                    review.setProjectId(request.getProjectId());
                    review.setProjectName(request.getProjectName());
                }

                reviewRepository.save(review);
                createdNames.add(employee.getFullName());
                createdCount++;

            } catch (Exception e) {
                log.error("Error creating review for employee ID {}: {}", employeeId, e.getMessage());
                errors.add("Error for employee ID " + employeeId + ": " + e.getMessage());
            }
        }

        log.info("Bulk review created: {} new, {} skipped, {} errors",
                createdCount, skippedCount, errors.size());

        return DoAn.BE.hrm.dto.BulkReviewResponse.builder()
                .totalRequested(request.getEmployeeIds().size())
                .createdCount(createdCount)
                .skippedCount(skippedCount)
                .createdNames(createdNames)
                .skippedNames(skippedNames)
                .errors(errors)
                .build();
    }

    /**
     * Get list of active employees who need evaluation for a given period.
     */
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public java.util.List<DoAn.BE.hrm.dto.EmployeeSimpleDTO> findEmployeesNeedingReview(
            String reviewPeriod, String reviewType) {
        accessControlService.checkReviewCreatePermission();

        java.util.List<Object[]> results = reviewRepository.findEmployeesNeedingReview(reviewPeriod, reviewType);
        java.util.List<DoAn.BE.hrm.dto.EmployeeSimpleDTO> employees = new java.util.ArrayList<>();
        for (Object[] row : results) {
            DoAn.BE.hrm.dto.EmployeeSimpleDTO dto = new DoAn.BE.hrm.dto.EmployeeSimpleDTO();
            dto.setEmployeeId(((Number) row[0]).longValue());
            dto.setFullName((String) row[1]);
            dto.setPositionName((String) row[2]);
            dto.setDepartmentName((String) row[3]);
            employees.add(dto);
        }
        return employees;
    }
}
