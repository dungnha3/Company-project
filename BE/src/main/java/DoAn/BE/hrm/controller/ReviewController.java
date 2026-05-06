package DoAn.BE.hrm.controller;

import DoAn.BE.hrm.dto.ReviewDTO;
import DoAn.BE.hrm.dto.ReviewRequest;
import DoAn.BE.hrm.entity.Review;
import DoAn.BE.hrm.mapper.ReviewMapper;
import DoAn.BE.hrm.service.ReviewService;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import DoAn.BE.common.annotation.FeatureFlag;
@RestController
@RequestMapping("/api/reviews")
@FeatureFlag("REVIEW")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReviewController {

    private final ReviewService reviewService;
    private final ReviewMapper reviewMapper;
    @PostMapping
    public ResponseEntity<ReviewDTO> createReview(
            @Valid @RequestBody ReviewRequest request,
            @AuthenticationPrincipal User currentUser) {
        Review review = reviewService.createReview(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(reviewMapper.toDTO(review));
    }
    @GetMapping("/{id}")
    public ResponseEntity<ReviewDTO> getReviewById(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        Review review = reviewService.getReviewById(id, currentUser);
        return ResponseEntity.ok(reviewMapper.toDTO(review));
    }
    @GetMapping
    public ResponseEntity<List<ReviewDTO>> getAllReviews(@AuthenticationPrincipal User currentUser) {
        List<Review> reviews = reviewService.getAllReviews(currentUser);
        return ResponseEntity.ok(reviewMapper.toDTOList(reviews));
    }
    @GetMapping("/page")
    public ResponseEntity<Page<ReviewDTO>> getAllReviewsPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @AuthenticationPrincipal User currentUser) {

        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Review> reviewPage = reviewService.getAllReviewsPage(pageable, currentUser);
        Page<ReviewDTO> dtoPage = reviewPage.map(reviewMapper::toDTO);

        return ResponseEntity.ok(dtoPage);
    }
    @PutMapping("/{id}")
    public ResponseEntity<ReviewDTO> updateReview(
            @PathVariable Long id,
            @Valid @RequestBody ReviewRequest request,
            @AuthenticationPrincipal User currentUser) {
        Review review = reviewService.updateReview(id, request, currentUser);
        return ResponseEntity.ok(reviewMapper.toDTO(review));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteReview(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        reviewService.deleteReview(id, currentUser);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Deleted review successfully");
        return ResponseEntity.ok(response);
    }
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<ReviewDTO>> getReviewsByEmployee(
            @PathVariable Long employeeId,
            @AuthenticationPrincipal User currentUser) {
        List<Review> reviews = reviewService.getReviewsByEmployee(employeeId, currentUser);
        return ResponseEntity.ok(reviewMapper.toDTOList(reviews));
    }
    @GetMapping("/pending")
    public ResponseEntity<List<ReviewDTO>> getPendingReviews(@AuthenticationPrincipal User currentUser) {
        List<Review> reviews = reviewService.getPendingReviews(currentUser);
        return ResponseEntity.ok(reviewMapper.toDTOList(reviews));
    }
    @PatchMapping("/{id}/submit")
    public ResponseEntity<ReviewDTO> submitForApproval(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        Review review = reviewService.submitForApproval(id, currentUser);
        return ResponseEntity.ok(reviewMapper.toDTO(review));
    }
    @PatchMapping("/{id}/approve")
    public ResponseEntity<ReviewDTO> approveReview(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal User currentUser) {
        String note = body != null ? body.get("note") : null;
        Review review = reviewService.approveReview(id, note, currentUser);
        return ResponseEntity.ok(reviewMapper.toDTO(review));
    }
    @PatchMapping("/{id}/reject")
    public ResponseEntity<ReviewDTO> rejectReview(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User currentUser) {
        String reason = body.get("reason");
        Review review = reviewService.rejectReview(id, reason, currentUser);
        return ResponseEntity.ok(reviewMapper.toDTO(review));
    }

    /**
     * GET /api/reviews/project/{projectId}
     * Lấy tất cả đánh giá gắn với một dự án cụ thể.
     */
    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<ReviewDTO>> getReviewsByProject(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser) {
        List<Review> reviews = reviewService.getReviewsByProject(projectId);
        return ResponseEntity.ok(reviewMapper.toDTOList(reviews));
    }
}
