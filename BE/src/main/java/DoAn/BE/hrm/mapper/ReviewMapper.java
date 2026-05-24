package DoAn.BE.hrm.mapper;

import DoAn.BE.hrm.dto.ReviewDTO;
import DoAn.BE.hrm.entity.Review;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ReviewMapper {

    public ReviewDTO toDTO(Review review) {
        if (review == null) {
            return null;
        }

        ReviewDTO dto = new ReviewDTO();
        dto.setReviewId(review.getReviewId());
        dto.setReviewPeriod(review.getReviewPeriod());
        dto.setReviewType(review.getReviewType());

        // Scores
        dto.setTechnicalScore(review.getTechnicalScore());
        dto.setAttitudeScore(review.getAttitudeScore());
        dto.setSoftSkillsScore(review.getSoftSkillsScore());
        dto.setTeamworkScore(review.getTeamworkScore());
        dto.setTotalScore(review.getTotalScore());
        dto.setRating(review.getRating());

        // Comments
        dto.setComments(review.getComments());
        dto.setNextGoals(review.getNextGoals());
        dto.setDevelopmentPlan(review.getDevelopmentPlan());

        // Status
        dto.setStatus(review.getStatus());
        dto.setStartDate(review.getStartDate());
        dto.setEndDate(review.getEndDate());
        dto.setCompletedDate(review.getCompletedDate());
        dto.setCreatedAt(review.getCreatedAt());
        dto.setUpdatedAt(review.getUpdatedAt());

        // Employee Info
        if (review.getEmployee() != null) {
            dto.setEmployeeId(review.getEmployee().getEmployeeId());
            dto.setEmployeeName(review.getEmployee().getFullName());

            if (review.getEmployee().getUser() != null) {
                dto.setEmployeeEmail(review.getEmployee().getUser().getEmail());
                dto.setAvatar(review.getEmployee().getUser().getAvatarUrl());
            }


        }

        // Reviewer Info
        if (review.getReviewer() != null) {
            dto.setReviewerId(review.getReviewer().getEmployeeId());
            dto.setReviewerName(review.getReviewer().getFullName());
        }

        // Project link
        dto.setProjectId(review.getProjectId());
        dto.setProjectName(review.getProjectName());

        return dto;
    }

    public List<ReviewDTO> toDTOList(List<Review> reviews) {
        return reviews.stream()
                .map(this::toDTO)
                .toList();
    }
}
