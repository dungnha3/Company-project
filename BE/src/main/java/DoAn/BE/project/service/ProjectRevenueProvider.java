package DoAn.BE.project.service;

import java.math.BigDecimal;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.common.service.RevenueProvider;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;

// Adapter implementing RevenueProvider using ProjectRepository.
// Lives in project module — provides revenue data to other modules without
// exposing internals.
// /
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ProjectRevenueProvider implements RevenueProvider {

    private final ProjectRepository projectRepository;

    @Override
    public BigDecimal getTotalActiveRevenue() {
        return projectRepository.findByStatus(Project.ProjectStatus.ACTIVE)
                .stream()
                .map(p -> p.getBudget() != null ? p.getBudget() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
