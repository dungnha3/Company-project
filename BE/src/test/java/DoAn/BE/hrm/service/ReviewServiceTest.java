package DoAn.BE.hrm.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.Review;
import DoAn.BE.hrm.entity.Review.ReviewStatus;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.repository.ReviewRepository;
import DoAn.BE.user.entity.User;

@ExtendWith(MockitoExtension.class)
public class ReviewServiceTest {

    @Mock
    private ReviewRepository reviewRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private AccessControlService accessControlService;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private ReviewService reviewService;

    private User hrUser;
    private Employee employee;
    private Employee reviewerEmployee;
    private Review testReview;

    @BeforeEach
    void setUp() {
        hrUser = new User();
        hrUser.setUserId(1L);
        hrUser.setUsername("hr_manager");

        employee = new Employee();
        employee.setEmployeeId(10L);
        employee.setFullName("Bob");
        employee.setUser(hrUser);

        reviewerEmployee = new Employee();
        reviewerEmployee.setEmployeeId(20L);
        reviewerEmployee.setUser(hrUser);

        testReview = new Review();
        testReview.setReviewId(100L);
        testReview.setEmployee(employee);
        testReview.setReviewer(reviewerEmployee);
        testReview.setStatus(ReviewStatus.IN_PROGRESS);
        testReview.setComments("Good work");
    }

    @Test
    void getReviewById_AsHR_Success() {
        when(reviewRepository.findById(100L)).thenReturn(Optional.of(testReview));
        doNothing().when(accessControlService).checkHrReviewsPermission();

        Review result = reviewService.getReviewById(100L, hrUser);

        assertNotNull(result);
        assertEquals(100L, result.getReviewId());
    }

    @Test
    void getReviewById_NotFound_Throws() {
        when(reviewRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> reviewService.getReviewById(999L, hrUser));
    }

    @Test
    void approveReview_Success() {
        testReview.setStatus(ReviewStatus.PENDING);
        doNothing().when(accessControlService).checkHrReviewsPermission();
        when(reviewRepository.findById(100L)).thenReturn(Optional.of(testReview));
        when(reviewRepository.save(any(Review.class))).thenAnswer(i -> i.getArgument(0));

        Review result = reviewService.approveReview(100L, "Approved", hrUser);

        assertEquals(ReviewStatus.APPROVED, result.getStatus());
        assertNotNull(result.getCompletedDate());
    }

    @Test
    void approveReview_NotHR_ThrowsForbidden() {
        doThrow(new ForbiddenException("No permission")).when(accessControlService).checkHrReviewsPermission();

        assertThrows(ForbiddenException.class, () -> reviewService.approveReview(100L, "note", hrUser));
    }

    @Test
    void approveReview_NotPending_ThrowsBadRequest() {
        testReview.setStatus(ReviewStatus.IN_PROGRESS);
        doNothing().when(accessControlService).checkHrReviewsPermission();
        when(reviewRepository.findById(100L)).thenReturn(Optional.of(testReview));

        assertThrows(BadRequestException.class, () -> reviewService.approveReview(100L, "note", hrUser));
    }

    @Test
    void rejectReview_Success() {
        testReview.setStatus(ReviewStatus.PENDING);
        doNothing().when(accessControlService).checkHrReviewsPermission();
        when(reviewRepository.findById(100L)).thenReturn(Optional.of(testReview));
        when(reviewRepository.save(any(Review.class))).thenAnswer(i -> i.getArgument(0));

        Review result = reviewService.rejectReview(100L, "Needs improvement", hrUser);

        assertEquals(ReviewStatus.REJECTED, result.getStatus());
    }

    @Test
    void submitForApproval_Success() {
        testReview.setStatus(ReviewStatus.IN_PROGRESS);
        doNothing().when(accessControlService).checkHrReviewsPermission();
        when(reviewRepository.findById(100L)).thenReturn(Optional.of(testReview));
        when(reviewRepository.save(any(Review.class))).thenAnswer(i -> i.getArgument(0));

        Review result = reviewService.submitForApproval(100L, hrUser);

        assertEquals(ReviewStatus.PENDING, result.getStatus());
    }

    @Test
    void deleteReview_Approved_ThrowsBadRequest() {
        testReview.setStatus(ReviewStatus.APPROVED);
        doNothing().when(accessControlService).checkHrReviewsPermission();
        when(reviewRepository.findById(100L)).thenReturn(Optional.of(testReview));

        assertThrows(BadRequestException.class, () -> reviewService.deleteReview(100L, hrUser));
    }

    @Test
    void deleteReview_NotHR_ThrowsForbidden() {
        doThrow(new ForbiddenException("No permission")).when(accessControlService).checkHrReviewsPermission();

        assertThrows(ForbiddenException.class, () -> reviewService.deleteReview(100L, hrUser));
    }

    @Test
    void getAllReviews_AsHR_ReturnsAll() {
        doNothing().when(accessControlService).checkHrReviewsPermission();
        when(reviewRepository.findAll()).thenReturn(java.util.List.of(testReview));

        java.util.List<Review> result = reviewService.getAllReviews(hrUser);

        assertEquals(1, result.size());
    }

    @Test
    void getAllReviews_NotManager_ThrowsForbidden() {
        doThrow(new ForbiddenException("No permission")).when(accessControlService).checkHrReviewsPermission();

        assertThrows(ForbiddenException.class, () -> reviewService.getAllReviews(hrUser));
    }

    @Test
    void updateReview_ApprovedReview_ThrowsBadRequest() {
        testReview.setStatus(ReviewStatus.APPROVED);
        doNothing().when(accessControlService).checkHrReviewsPermission();
        when(reviewRepository.findById(100L)).thenReturn(Optional.of(testReview));

        assertThrows(BadRequestException.class,
                () -> reviewService.updateReview(100L, new DoAn.BE.hrm.dto.ReviewRequest(), hrUser));
    }

    @Test
    void getPendingReviews_AsHR_ReturnsList() {
        doNothing().when(accessControlService).checkHrReviewsPermission();
        when(reviewRepository.findPendingApproval()).thenReturn(java.util.List.of(testReview));

        java.util.List<Review> result = reviewService.getPendingReviews(hrUser);

        assertEquals(1, result.size());
    }

    @Test
    void getPendingReviews_NotHR_ThrowsForbidden() {
        doThrow(new ForbiddenException("No permission")).when(accessControlService).checkHrReviewsPermission();

        assertThrows(ForbiddenException.class, () -> reviewService.getPendingReviews(hrUser));
    }

    @Test
    void rejectReview_NotPending_ThrowsBadRequest() {
        testReview.setStatus(ReviewStatus.IN_PROGRESS);
        doNothing().when(accessControlService).checkHrReviewsPermission();
        when(reviewRepository.findById(100L)).thenReturn(Optional.of(testReview));

        assertThrows(BadRequestException.class,
                () -> reviewService.rejectReview(100L, "reason", hrUser));
    }

    @Test
    void deleteReview_Success() {
        testReview.setStatus(ReviewStatus.IN_PROGRESS);
        doNothing().when(accessControlService).checkHrReviewsPermission();
        when(reviewRepository.findById(100L)).thenReturn(Optional.of(testReview));

        reviewService.deleteReview(100L, hrUser);

        verify(reviewRepository).delete(testReview);
    }
    // CREATE REVIEW

    @Test
    void createReview_AsHR_Success() {
        DoAn.BE.hrm.dto.ReviewRequest request = new DoAn.BE.hrm.dto.ReviewRequest();
        request.setEmployeeId(10L);
        request.setReviewPeriod("Q1-2026");
        request.setReviewType(DoAn.BE.hrm.entity.Review.ReviewType.QUARTERLY);
        request.setTechnicalScore(java.math.BigDecimal.valueOf(8.5));
        request.setAttitudeScore(java.math.BigDecimal.valueOf(9.0));
        request.setSoftSkillsScore(java.math.BigDecimal.valueOf(7.5));
        request.setTeamworkScore(java.math.BigDecimal.valueOf(8.0));
        request.setComments("Good performance");
        request.setStartDate(java.time.LocalDate.of(2026, 1, 1));
        request.setEndDate(java.time.LocalDate.of(2026, 3, 31));

        doNothing().when(accessControlService).checkHrReviewsPermission();
        when(employeeRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(reviewRepository.findByEmployeeAndPeriodAndType(10L, "Q1-2026",
                DoAn.BE.hrm.entity.Review.ReviewType.QUARTERLY)).thenReturn(Optional.empty());
        when(employeeRepository.findByUser_UserId(1L)).thenReturn(Optional.of(reviewerEmployee));
        when(reviewRepository.save(any(Review.class))).thenAnswer(i -> i.getArgument(0));

        Review result = reviewService.createReview(request, hrUser);

        assertNotNull(result);
        assertEquals(employee, result.getEmployee());
        assertEquals(reviewerEmployee, result.getReviewer());
        assertEquals(java.math.BigDecimal.valueOf(8.5), result.getTechnicalScore());
        verify(eventPublisher).publishEvent(any());
    }

    @Test
    void createReview_NotManager_ThrowsForbidden() {
        doThrow(new ForbiddenException("No permission")).when(accessControlService).checkHrReviewsPermission();

        assertThrows(ForbiddenException.class,
                () -> reviewService.createReview(new DoAn.BE.hrm.dto.ReviewRequest(), hrUser));
    }

    @Test
    void createReview_DuplicatePeriod_ThrowsBadRequest() {
        DoAn.BE.hrm.dto.ReviewRequest request = new DoAn.BE.hrm.dto.ReviewRequest();
        request.setEmployeeId(10L);
        request.setReviewPeriod("Q1-2026");
        request.setReviewType(DoAn.BE.hrm.entity.Review.ReviewType.QUARTERLY);

        doNothing().when(accessControlService).checkHrReviewsPermission();
        when(employeeRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(reviewRepository.findByEmployeeAndPeriodAndType(10L, "Q1-2026",
                DoAn.BE.hrm.entity.Review.ReviewType.QUARTERLY)).thenReturn(Optional.of(testReview));

        assertThrows(BadRequestException.class, () -> reviewService.createReview(request, hrUser));
    }

    @Test
    void createReview_EndDateBeforeStart_ThrowsBadRequest() {
        DoAn.BE.hrm.dto.ReviewRequest request = new DoAn.BE.hrm.dto.ReviewRequest();
        request.setEmployeeId(10L);
        request.setReviewPeriod("Q1-2026");
        request.setReviewType(DoAn.BE.hrm.entity.Review.ReviewType.QUARTERLY);
        request.setStartDate(java.time.LocalDate.of(2026, 3, 31));
        request.setEndDate(java.time.LocalDate.of(2026, 1, 1));

        doNothing().when(accessControlService).checkHrReviewsPermission();
        when(employeeRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(reviewRepository.findByEmployeeAndPeriodAndType(10L, "Q1-2026",
                DoAn.BE.hrm.entity.Review.ReviewType.QUARTERLY)).thenReturn(Optional.empty());
        when(employeeRepository.findByUser_UserId(1L)).thenReturn(Optional.of(reviewerEmployee));

        assertThrows(BadRequestException.class, () -> reviewService.createReview(request, hrUser));
    }
    // GET REVIEWS BY EMPLOYEE

    @Test
    void getReviewsByEmployee_AsHR_ReturnsAll() {
        doNothing().when(accessControlService).checkHrReviewsPermission();
        when(reviewRepository.findByEmployee_EmployeeIdOrderByCreatedAtDesc(10L))
                .thenReturn(java.util.List.of(testReview));

        java.util.List<Review> result = reviewService.getReviewsByEmployee(10L, hrUser);

        assertEquals(1, result.size());
    }

    @Test
    void getReviewsByEmployee_AsOwner_ReturnsOwn() {
        doThrow(new ForbiddenException("No permission")).when(accessControlService).checkHrReviewsPermission();
        when(employeeRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(reviewRepository.findByEmployee_EmployeeIdOrderByCreatedAtDesc(10L))
                .thenReturn(java.util.List.of(testReview));

        // hrUser.userId=1 owns employee (employee.user.userId=1)
        java.util.List<Review> result = reviewService.getReviewsByEmployee(10L, hrUser);

        assertEquals(1, result.size());
    }

    @Test
    void getReviewsByEmployee_NotOwner_ThrowsForbidden() {
        User otherUser = new User();
        otherUser.setUserId(999L);

        doThrow(new ForbiddenException("No permission")).when(accessControlService).checkHrReviewsPermission();
        when(employeeRepository.findById(10L)).thenReturn(Optional.of(employee));

        assertThrows(ForbiddenException.class,
                () -> reviewService.getReviewsByEmployee(10L, otherUser));
    }
    // UPDATE REVIEW - SUCCESS CASE

    @Test
    void updateReview_AsReviewer_Success() {
        testReview.setStatus(ReviewStatus.IN_PROGRESS);
        DoAn.BE.hrm.dto.ReviewRequest request = new DoAn.BE.hrm.dto.ReviewRequest();
        request.setTechnicalScore(java.math.BigDecimal.valueOf(9.0));
        request.setAttitudeScore(java.math.BigDecimal.valueOf(8.5));
        request.setSoftSkillsScore(java.math.BigDecimal.valueOf(8.0));
        request.setTeamworkScore(java.math.BigDecimal.valueOf(9.5));
        request.setComments("Updated comments");

        doNothing().when(accessControlService).checkHrReviewsPermission();
        when(reviewRepository.findById(100L)).thenReturn(Optional.of(testReview));
        when(reviewRepository.save(any(Review.class))).thenAnswer(i -> i.getArgument(0));

        Review result = reviewService.updateReview(100L, request, hrUser);

        assertEquals(java.math.BigDecimal.valueOf(9.0), result.getTechnicalScore());
        assertEquals("Updated comments", result.getComments());
        verify(reviewRepository).save(testReview);
    }
}
