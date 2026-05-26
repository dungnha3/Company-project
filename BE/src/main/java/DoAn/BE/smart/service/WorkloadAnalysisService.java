package DoAn.BE.smart.service;

import DoAn.BE.project.entity.*;
import DoAn.BE.project.repository.*;
import DoAn.BE.smart.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
@RequiredArgsConstructor
public class WorkloadAnalysisService {

    private final ProjectMemberRepository projectMemberRepository;
    private final IssueRepository issueRepository;

    public WorkloadAnalysisDTO getWorkload(Long projectId) {
        if (projectId == null) return WorkloadAnalysisDTO.builder().balanceScore(0).members(List.of()).build();

        List<ProjectMember> members = projectMemberRepository.findByProject_ProjectId(projectId);
        if (members.isEmpty()) return WorkloadAnalysisDTO.builder().balanceScore(100).members(List.of()).build();

        List<WorkloadAnalysisDTO.MemberWorkload> memberWorkloads = new ArrayList<>();
        List<Integer> weights = new ArrayList<>();

        for (ProjectMember pm : members) {
            if (pm.getUser() == null) continue;
            Long userId = pm.getUser().getUserId();

            List<Issue> issues = issueRepository.findByAssignee_UserId(userId);
            List<Issue> active = issues.stream()
                    .filter(i -> i.getIssueStatus() != null && !"Done".equals(i.getIssueStatus().getName()))
                    .toList();

            int activeTasks = active.size();
            int totalWeight = active.stream()
                    .mapToInt(i -> i.getWeight() != null ? i.getWeight() : 0)
                    .sum();
            BigDecimal totalHours = active.stream()
                    .map(i -> i.getEstimatedHours() != null ? i.getEstimatedHours() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            String level;
            String color;
            if (totalWeight >= 15) {
                level = "QUÁ_TẢI";
                color = "red";
            } else if (totalWeight >= 10) {
                level = "BẬN";
                color = "orange";
            } else if (totalWeight >= 5) {
                level = "BÌNH_THƯỜNG";
                color = "green";
            } else {
                level = "NHẸ";
                color = "blue";
            }

            memberWorkloads.add(WorkloadAnalysisDTO.MemberWorkload.builder()
                    .userId(userId)
                    .username(pm.getUser().getUsername())
                    .fullName(pm.getUser().getFullName())
                    .activeTasks(activeTasks)
                    .totalHours(totalHours.setScale(1, RoundingMode.HALF_UP))
                    .totalWeight(totalWeight)
                    .workloadLevel(level)
                    .color(color)
                    .build());

            weights.add(totalWeight);
        }

        // Calculate balance score
        int balanceScore = 100;
        if (!weights.isEmpty()) {
            double avg = weights.stream().mapToInt(Integer::intValue).average().orElse(0);
            double variance = weights.stream()
                    .mapToDouble(w -> Math.pow(w - avg, 2))
                    .average().orElse(0);
            double stdDev = Math.sqrt(variance);
            balanceScore = Math.max(0, 100 - (int) (stdDev * 10));
        }

        return WorkloadAnalysisDTO.builder()
                .balanceScore(balanceScore)
                .members(memberWorkloads)
                .build();
    }
}
