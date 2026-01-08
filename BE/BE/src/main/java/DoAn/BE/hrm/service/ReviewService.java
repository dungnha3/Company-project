package DoAn.BE.hrm.service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.hrm.dto.ReviewRequest;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.Review;
import DoAn.BE.hrm.entity.Review.ReviewStatus;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.repository.ReviewRepository;
import DoAn.BE.user.entity.User;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

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
    private final AccessControlService accessControlService;

    public Review createReview(ReviewRequest request, User currentUser) {
        if (!accessControlService.isHRManager() && !accessControlService.isProjectManager()) {
            throw new ForbiddenException(
                    "Only HR Manager and Project Manager can create reviews");
        }

        log.info("User {} creating review for employee ID: {}", currentUser.getUsername(), request.getEmployeeId());
        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new EntityNotFoundException("Employee not found"));

        Optional<Review> existingReview = reviewRepository.findByEmployeeAndPeriodAndType(
                request.getEmployeeId(), request.getReviewPeriod(), request.getReviewType());

        if (existingReview.isPresent()) {
            throw new BadRequestException("Employee already has a review for this period");
        }

        Employee reviewer = employeeRepository.findByUser_UserId(currentUser.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("Reviewer employee profile not found"));

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

        return reviewRepository.save(review);
    }

    public Review getReviewById(Long id, User currentUser) {
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Review not found"));

        if (accessControlService.isHRManager() || accessControlService.isProjectManager()) {
            return review;
        }

        if (!review.getEmployee().getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("You do not have permission to view this review");
        }

        return review;
    }

    public List<Review> getAllReviews(User currentUser) {
        if (!accessControlService.isHRManager() && !accessControlService.isProjectManager()) {
            throw new ForbiddenException("You do not have permission to view all reviews");
        }

        if (accessControlService.isHRManager()) {
            return reviewRepository.findAll();
        }

        Employee pmEmployee = employeeRepository.findByUser_UserId(currentUser.getUserId()).orElse(null);
        if (pmEmployee != null) {
            return reviewRepository.findByReviewer_EmployeeIdOrderByCreatedAtDesc(pmEmployee.getEmployeeId());
        }

        return List.of();
    }

    public Page<Review> getAllReviewsPage(Pageable pageable, User currentUser) {
        if (!accessControlService.isHRManager() && !accessControlService.isProjectManager()) {
            throw new ForbiddenException("You do not have permission to view reviews");
        }

        return reviewRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    public Review updateReview(Long id, ReviewRequest request, User currentUser) {
        Review review = getReviewById(id, currentUser);

        if (!accessControlService.isHRManager() &&
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
        // Fix: Use generic access check or add specific HR check if implemented
        if (!accessControlService.isHRManager()) {
            throw new ForbiddenException("Only HR can approve reviews");
        }

        Review review = getReviewById(id, currentUser);

        if (review.getStatus() != ReviewStatus.PENDING) {
            throw new BadRequestException("Can only approve pending reviews");
        }

        log.info("HR Manager {} approving review ID: {}", currentUser.getUsername(), id);

        review.setStatus(ReviewStatus.APPROVED);
        review.setCompletedDate(LocalDate.now());

        if (note != null && !note.trim().isEmpty()) {
            review.setComments(review.getComments() + "\n\nHR Note: " + note);
        }

        return reviewRepository.save(review);
    }

    public Review rejectReview(Long id, String reason, User currentUser) {
        if (!accessControlService.isHRManager()) {
            throw new ForbiddenException("Only HR can reject reviews");
        }

        Review review = getReviewById(id, currentUser);

        if (review.getStatus() != ReviewStatus.PENDING) {
            throw new BadRequestException("Can only reject pending reviews");
        }

        log.info("HR Manager {} rejecting review ID: {}", currentUser.getUsername(), id);

        review.setStatus(ReviewStatus.REJECTED);

        if (reason != null && !reason.trim().isEmpty()) {
            review.setComments(review.getComments() + "\n\nRejection Reason: " + reason);
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
        if (accessControlService.isHRManager() || accessControlService.isProjectManager()) {
            return reviewRepository.findByEmployee_EmployeeIdOrderByCreatedAtDesc(employeeId);
        }

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new EntityNotFoundException("Employee not found"));

        if (!employee.getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("You can only view your own reviews");
        }

        return reviewRepository.findByEmployee_EmployeeIdOrderByCreatedAtDesc(employeeId);
    }

    public List<Review> getPendingReviews(User currentUser) {
        if (!accessControlService.isHRManager()) {
            throw new ForbiddenException("Only HR can view pending reviews");
        }
        return reviewRepository.findPendingApproval();
    }

    public void deleteReview(Long id, User currentUser) {
        if (!accessControlService.isHRManager()) {
            throw new ForbiddenException("Only HR can delete reviews");
        }

        Review review = getReviewById(id, currentUser);

        if (review.getStatus() == ReviewStatus.APPROVED) {
            throw new BadRequestException("Cannot delete approved reviews");
        }

        log.info("HR Manager {} deleting review ID: {}", currentUser.getUsername(), id);
        reviewRepository.delete(review);
    }
}
