package DoAn.BE.smart.service;

import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.smart.dto.SmartEstimateDTO;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Smart Estimate Service — ML-based time estimation using Ordinary Least Squares (OLS).
 *
 * Algorithm: Simple Linear Regression (single-variable OLS)
 * Model: actualHours = a * weight + b * isBug + c
 *
 * Training data: completed issues (Done status) with actualHours and weight.
 * Fallback: When sample size < MIN_SAMPLES_FOR_ML, uses team average velocity
 *           with issue-type multipliers.
 *
 * Confidence scoring:
 *   HIGH  : >= 10 samples AND R² > 0.7
 *   MEDIUM: >= 5 samples
 *   LOW   : < 5 samples (heuristic or baseline)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmartEstimateService {

    private final IssueRepository issueRepository;
    private final UserRepository userRepository;
    private final DoAn.BE.project.repository.ProjectMemberRepository projectMemberRepository;

    private static final int MIN_SAMPLES_FOR_ML = 3;
    private static final int MIN_SAMPLES_FOR_MEDIUM = 5;
    private static final int MIN_SAMPLES_FOR_HIGH = 10;
    private static final double MIN_R_SQUARED_FOR_HIGH = 0.7;

    /**
     * Suggest estimated hours for a new issue.
     * Uses OLS regression when enough historical data exists.
     *
     * @param projectId   the project context (required)
     * @param assigneeId  the person who will do the task (required for personal velocity)
     * @param weight      task weight 1-10 (required)
     * @param issueType   BUG, TASK, STORY (optional)
     */
    public SmartEstimateDTO suggestEstimate(Long projectId, Long assigneeId, Integer weight, String issueType) {
        if (projectId == null) {
            return SmartEstimateDTO.noProjectSelected();
        }

        if (assigneeId == null) {
            return SmartEstimateDTO.noAssigneeSelected();
        }

        if (weight == null || weight < 1) {
            weight = 5;
        }

        User assignee = userRepository.findById(assigneeId).orElse(null);
        String assigneeName = assignee != null ? assignee.getFullName() : null;

        // Fetch completed issues for this user in this project
        List<Issue> completedIssues = issueRepository.findByAssignee_UserId(assigneeId).stream()
                .filter(i -> i.isDone())
                .filter(i -> i.getActualHours() != null && i.getActualHours().compareTo(BigDecimal.ZERO) > 0)
                .filter(i -> i.getWeight() != null && i.getWeight() > 0)
                .filter(i -> i.getProject() != null && projectId.equals(i.getProject().getProjectId()))
                .toList();

        int sampleCount = completedIssues.size();

        if (sampleCount >= MIN_SAMPLES_FOR_ML) {
            return buildMlEstimate(completedIssues, weight, issueType, assigneeName);
        } else if (sampleCount > 0) {
            return buildHeuristicEstimate(completedIssues, weight, issueType, assigneeName, sampleCount);
        } else {
            return buildBaselineEstimate(weight, issueType, assigneeName);
        }
    }

    /**
     * OLS Linear Regression: actualHours = a * weight + b * isBug + c
     *
     * Solved via normal equations:
     *   Let w[i] = weight, b[i] = isBug(0|1), y[i] = actualHours
     *   Solve 3x3 system: X'X * beta = X'y
     */
    private SmartEstimateDTO buildMlEstimate(List<Issue> completedIssues, Integer weight, String issueType, String assigneeName) {
        int n = completedIssues.size();

        // Build X matrix: [1, weight, isBug]
        double sumW = 0, sumB = 0, sumY = 0;
        double sumWW = 0, sumWB = 0, sumWY = 0;
        double sumBW = 0, sumBB = 0, sumBY = 0;

        for (Issue issue : completedIssues) {
            double w = issue.getWeight();
            double b = isBug(issue) ? 1.0 : 0.0;
            double y = issue.getActualHours().doubleValue();

            sumW += w; sumB += b; sumY += y;
            sumWW += w * w; sumWB += w * b; sumWY += w * y;
            sumBW += b * w; sumBB += b * b; sumBY += b * y;
        }

        // Solve normal equations for [c, a, b] in: y = a*w + b*b + c
        // Matrix form: X'X * [c, a, b]' = X'y
        double[][] XtX = {
                { n,      sumW,   sumB   },
                { sumW,   sumWW,  sumWB  },
                { sumB,   sumBW,  sumBB  }
        };
        double[] XtY = { sumY, sumWY, sumBY };

        double[] coeffs = solve3x3(XtX, XtY);
        if (coeffs == null) {
            return buildHeuristicEstimate(completedIssues, weight, issueType, assigneeName, n);
        }

        double coefC = coeffs[0]; // intercept
        double coefA = coeffs[1]; // weight coefficient
        double coefB = coeffs[2]; // bug coefficient

        // Compute prediction
        double isBug = isBugType(issueType) ? 1.0 : 0.0;
        double predictedHours = coefA * weight + coefB * isBug + coefC;
        predictedHours = Math.max(0.5, predictedHours);

        // Compute R² to assess model quality
        double rSquared = computeRSquared(completedIssues, coefA, coefB, coefC);

        // Determine confidence
        String confidence = determineConfidence(n, rSquared);
        String method = "OLS";

        BigDecimal result = BigDecimal.valueOf(predictedHours).setScale(1, RoundingMode.HALF_UP);

        String basis = String.format(
                "Học từ %d task đã hoàn thành của %s (R²=%.2f)",
                n, assigneeName != null ? assigneeName : "user", rSquared
        );

        String explanation = buildNlExplanation(assigneeName, n, weight,
                coefA, coefB, coefC, predictedHours, rSquared, isBugType(issueType));

        return SmartEstimateDTO.builder()
                .suggestedHours(result)
                .confidence(confidence)
                .method(method)
                .basis(basis)
                .explanation(explanation)
                .derivedFromNSamples(n)
                .rSquared(Math.round(rSquared * 100.0) / 100.0)
                .assigneeName(assigneeName)
                .build();
    }

    /**
     * Heuristic estimate: personal average with type multipliers.
     * Used when we have a few samples but not enough for reliable ML.
     */
    private SmartEstimateDTO buildHeuristicEstimate(List<Issue> completedIssues, Integer weight, String issueType,
                                                   String assigneeName, int sampleCount) {
        double totalHours = completedIssues.stream()
                .mapToDouble(i -> i.getActualHours().doubleValue())
                .sum();
        double totalWeight = completedIssues.stream()
                .mapToDouble(Issue::getWeight)
                .sum();

        double avgHoursPerWeight = totalWeight > 0 ? totalHours / totalWeight : 1.6;

        // Type multipliers from data
        double typeMultiplier = computeTypeMultiplier(completedIssues, issueType);

        double suggestedHours = avgHoursPerWeight * weight * typeMultiplier;
        suggestedHours = Math.max(0.5, suggestedHours);

        BigDecimal result = BigDecimal.valueOf(suggestedHours).setScale(1, RoundingMode.HALF_UP);

        String basis = String.format(
                "Dựa trên %d task quá khứ của %s (avg %.1fh/weight × weight %d × type %.1f)",
                sampleCount,
                assigneeName != null ? assigneeName : "user",
                avgHoursPerWeight, weight, typeMultiplier
        );

        String explanation = String.format(
                "Dựa trên %d task %s đã hoàn thành trước đó, trung bình mỗi đơn vị weight mất %.1f giờ. " +
                "Với weight %d cho task mới, ước tính %.1f giờ. " +
                "Hệ số điều chỉnh cho %s là %.1fx.",
                sampleCount,
                assigneeName != null ? assigneeName : "user",
                avgHoursPerWeight, weight, suggestedHours,
                isBugType(issueType) ? "BUG" : isStoryType(issueType) ? "STORY" : "TASK",
                typeMultiplier
        );

        return SmartEstimateDTO.builder()
                .suggestedHours(result)
                .confidence("medium")
                .method("Heuristic")
                .basis(basis)
                .explanation(explanation)
                .derivedFromNSamples(sampleCount)
                .rSquared(null)
                .assigneeName(assigneeName)
                .build();
    }

    /**
     * Baseline estimate: industry average when no personal data exists.
     * Uses weight × 1.6h as baseline with type adjustments.
     */
    private SmartEstimateDTO buildBaselineEstimate(Integer weight, String issueType, String assigneeName) {
        double baselinePerWeight = 1.6; // hours per weight unit (industry average)
        double typeMultiplier = isBugType(issueType) ? 1.5
                : isStoryType(issueType) ? 1.2
                : 1.0;

        double suggestedHours = baselinePerWeight * weight * typeMultiplier;
        suggestedHours = Math.max(0.5, suggestedHours);

        BigDecimal result = BigDecimal.valueOf(suggestedHours).setScale(1, RoundingMode.HALF_UP);

        String basis = String.format(
                "Chưa có data. Dùng industry baseline: weight %d × %.1fh × type %.1f",
                weight, baselinePerWeight, typeMultiplier
        );

        String explanation = String.format(
                "Chưa có dữ liệu lịch sử cho người này. Sử dụng ước tính industry standard: trung bình %.1f giờ cho mỗi đơn vị weight. " +
                "Với weight %d cho task %s, ước tính %.1f giờ. " +
                "⚠️ Độ chính xác thấp — nên cập nhật estimate sau khi hoàn thành task đầu tiên để cải thiện dự đoán.",
                baselinePerWeight, weight,
                isBugType(issueType) ? "BUG" : isStoryType(issueType) ? "STORY" : "TASK",
                suggestedHours
        );

        return SmartEstimateDTO.builder()
                .suggestedHours(result)
                .confidence("low")
                .method("Baseline")
                .basis(basis)
                .explanation(explanation)
                .derivedFromNSamples(0)
                .rSquared(null)
                .assigneeName(assigneeName)
                .build();
    }

    /**
     * Build natural language explanation of the OLS estimate.
     */
    private String buildNlExplanation(String assigneeName, int n, int weight,
                                      double coefA, double coefB, double coefC,
                                      double predictedHours, double rSquared, boolean isBug) {
        String name = assigneeName != null ? assigneeName : "user";

        // Interpret coefficient A: hours per weight unit
        String coefDesc;
        if (coefA < 0.8) coefDesc = "nhanh hơn trung bình";
        else if (coefA < 1.2) coefDesc = "đúng nhịp trung bình";
        else if (coefA < 1.8) coefDesc = "chậm hơn trung bình";
        else coefDesc = "đáng chú ý là chậm";

        // Interpret R²
        String rDesc;
        if (rSquared >= 0.85) rDesc = "rất đáng tin cậy";
        else if (rSquared >= 0.7) rDesc = "đáng tin cậy";
        else if (rSquared >= 0.4) rDesc = "khá chính xác";
        else rDesc = "dữ liệu còn nhiễu";

        StringBuilder sb = new StringBuilder();
        sb.append(String.format(
                "Phân tích %d task đã hoàn thành của %s: ",
                n, name
        ));
        sb.append(String.format(
                "trung bình mỗi đơn vị weight mất %.1f giờ (%s so với team). ",
                coefA, coefDesc
        ));

        if (isBug) {
            sb.append(String.format("Với hệ số BUG điều chỉnh thêm %.1f giờ. ", coefB));
        }

        sb.append(String.format(
                "Với weight %d cho task mới → %.1f giờ. ",
                weight, predictedHours
        ));

        sb.append(String.format(
                "Độ tin cậy của mô hình: %s (R²=%.2f).",
                rDesc, rSquared
        ));

        if (coefC < -2 || coefC > 2) {
            sb.append(String.format(" Lưu ý: hệ số baseline %.1f cho thấy có overhead bất thường.", coefC));
        }

        return sb.toString();
    }

    /**
     * Suggest assignee based on issue title keywords.
     * Extracts technical keywords from title → finds similar past issues → suggests best-fit assignee.
     * Uses keyword matching against historical issue titles + velocity scoring.
     */
    public Map<Long, SkillMatchResult> suggestByTitle(Long projectId, String title, String issueType, int weight) {
        Map<Long, SkillMatchResult> results = new java.util.LinkedHashMap<>();

        if (projectId == null || title == null || title.trim().length() < 3) {
            return results;
        }

        Set<String> keywords = extractKeywords(title);

        List<DoAn.BE.project.entity.ProjectMember> projectMembers;
        try {
            projectMembers = projectMemberRepository.findByProject_ProjectId(projectId);
        } catch (Exception e) {
            log.warn("Failed to load project members for projectId={}: {}", projectId, e.getMessage());
            return results;
        }

        for (DoAn.BE.project.entity.ProjectMember pm : projectMembers) {
            DoAn.BE.user.entity.User user = pm.getUser();
            if (user == null) continue;

            List<Issue> userIssues = issueRepository.findByAssignee_UserId(user.getUserId()).stream()
                    .filter(Issue::isDone)
                    .filter(i -> i.getActualHours() != null && i.getWeight() != null && i.getWeight() > 0)
                    .filter(i -> i.getProject() != null && projectId.equals(i.getProject().getProjectId()))
                    .toList();

            if (userIssues.isEmpty()) continue;

            int matchedKeywords = 0;
            String matchedTerms = "";
            for (Issue pastIssue : userIssues) {
                Set<String> pastKeywords = extractKeywords(pastIssue.getTitle());
                for (String kw : keywords) {
                    if (pastKeywords.contains(kw)) {
                        matchedKeywords++;
                        if (matchedTerms.length() < 50) {
                            matchedTerms += kw + " ";
                        }
                    }
                }
            }

            double matchRatio = keywords.isEmpty() ? 0 : Math.min((double) matchedKeywords / keywords.size(), 1.0);

            double avgHoursPerWeight = userIssues.stream()
                    .mapToDouble(i -> i.getActualHours().doubleValue() / i.getWeight())
                    .average().orElse(1.6);

            double skillScore = matchRatio * 100;
            double velocityScore = avgHoursPerWeight <= 1.5 ? 90
                    : avgHoursPerWeight <= 2.0 ? 75
                    : avgHoursPerWeight <= 2.5 ? 60 : 40;
            double totalScore = skillScore * 0.6 + velocityScore * 0.4;

            String reason = !matchedTerms.isBlank()
                    ? "Đã làm task liên quan: " + matchedTerms.trim()
                    : "Tốc độ phù hợp: avg " + String.format("%.1f", avgHoursPerWeight) + "h/weight";

            results.put(user.getUserId(), new SkillMatchResult(
                    user.getUserId(),
                    user.getFullName(),
                    (int) Math.round(totalScore),
                    skillScore,
                    velocityScore,
                    userIssues.size(),
                    reason
            ));
        }

        return results.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue().totalScore, a.getValue().totalScore))
                .limit(5)
                .collect(java.util.stream.Collectors.toMap(
                        java.util.Map.Entry::getKey,
                        java.util.Map.Entry::getValue,
                        (e1, e2) -> e1,
                        java.util.LinkedHashMap::new
                ));
    }

    private static Set<String> STOP_WORDS = Set.of(
            "the", "a", "an", "of", "in", "on", "at", "to", "for", "and", "or", "is",
            "build", "implement", "fix", "add", "create", "update", "delete", "remove",
            "api", "bug", "feature", "task", "issue", "module", "page", "component",
            "với", "của", "cho", "trong", "bằng", "từ", "lên", "xuống", "vào", "ra",
            "thêm", "sửa", "xóa", "tạo", "cập", "nhật", "làm"
    );

    private Set<String> extractKeywords(String text) {
        if (text == null) return Set.of();
        Set<String> keywords = new java.util.HashSet<>();
        String[] words = text.toLowerCase()
                .replaceAll("[^a-zA-Z0-9\\sàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹđ]", " ")
                .trim().split("\\s+");
        for (String word : words) {
            if (word.length() >= 3 && !STOP_WORDS.contains(word)) {
                keywords.add(word);
            }
        }
        return keywords;
    }

    // Simple result class for title-based matching
    public record SkillMatchResult(
            Long userId,
            String fullName,
            int totalScore,
            double skillMatchScore,
            double velocityScore,
            int relatedTaskCount,
            String reason
    ) {}

    // ── Math helpers ────────────────────────────────────────────────────────

    /**
     * Solve 3x3 linear system Ax = b using Cramer's rule.
     * Returns null if the matrix is singular.
     */
    private double[] solve3x3(double[][] A, double[] b) {
        double det = A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1])
                   - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0])
                   + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);

        if (Math.abs(det) < 1e-10) return null;

        double det0 = b[0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1])
                    - A[0][1] * (b[1] * A[2][2] - A[1][2] * b[2])
                    + A[0][2] * (b[1] * A[2][1] - A[1][1] * b[2]);

        double det1 = A[0][0] * (b[1] * A[2][2] - A[1][2] * b[2])
                    - b[0] * (A[1][0] * A[2][2] - A[1][2] * A[2][0])
                    + A[0][2] * (A[1][0] * b[2] - b[1] * A[2][0]);

        double det2 = A[0][0] * (A[1][1] * b[2] - b[1] * A[2][1])
                    - A[0][1] * (A[1][0] * b[2] - b[1] * A[2][0])
                    + b[0] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);

        return new double[] { det0 / det, det1 / det, det2 / det };
    }

    /**
     * Compute R² (coefficient of determination) for the OLS model.
     * R² = 1 - SS_res / SS_tot
     */
    private double computeRSquared(List<Issue> issues, double coefA, double coefB, double coefC) {
        double yMean = issues.stream()
                .mapToDouble(i -> i.getActualHours().doubleValue())
                .average().orElse(0);

        double ssTot = 0, ssRes = 0;
        for (Issue issue : issues) {
            double yActual = issue.getActualHours().doubleValue();
            double yPredicted = coefA * issue.getWeight() + coefB * (isBug(issue) ? 1 : 0) + coefC;
            ssTot += (yActual - yMean) * (yActual - yMean);
            ssRes += (yActual - yPredicted) * (yActual - yPredicted);
        }

        if (ssTot < 1e-10) return 0.0;
        return 1.0 - ssRes / ssTot;
    }

    private String determineConfidence(int sampleCount, double rSquared) {
        if (sampleCount >= MIN_SAMPLES_FOR_HIGH && rSquared >= MIN_R_SQUARED_FOR_HIGH) {
            return "high";
        }
        if (sampleCount >= MIN_SAMPLES_FOR_MEDIUM) {
            return "medium";
        }
        return "low";
    }

    private boolean isBug(Issue issue) {
        return issue.getIssueType() != null
                && "BUG".equals(issue.getIssueType().name());
    }

    private boolean isBugType(String issueType) {
        return "BUG".equalsIgnoreCase(issueType);
    }

    private boolean isStoryType(String issueType) {
        return "STORY".equalsIgnoreCase(issueType);
    }

    /**
     * Compute average type multiplier from historical data.
     * Falls back to fixed multipliers if insufficient data.
     */
    private double computeTypeMultiplier(List<Issue> issues, String targetType) {
        double bugSum = 0, bugCount = 0;
        double taskSum = 0, taskCount = 0;
        double storySum = 0, storyCount = 0;

        for (Issue issue : issues) {
            if (issue.getActualHours() == null || issue.getWeight() == null || issue.getWeight() == 0) continue;
            double ratio = issue.getActualHours().doubleValue() / issue.getWeight();
            if (isBug(issue)) { bugSum += ratio; bugCount++; }
            else if (issue.getIssueType() != null && "STORY".equals(issue.getIssueType().name())) { storySum += ratio; storyCount++; }
            else { taskSum += ratio; taskCount++; }
        }

        double avgBug = bugCount > 0 ? bugSum / bugCount : 1.5;
        double avgTask = taskCount > 0 ? taskSum / taskCount : 1.0;
        double avgStory = storyCount > 0 ? storySum / storyCount : 1.2;

        // Normalize so TASK = 1.0
        double baseline = avgTask;
        double targetRatio = isBugType(targetType) ? avgBug / baseline
                : isStoryType(targetType) ? avgStory / baseline
                : 1.0;

        return Math.round(targetRatio * 100.0) / 100.0;
    }
}
