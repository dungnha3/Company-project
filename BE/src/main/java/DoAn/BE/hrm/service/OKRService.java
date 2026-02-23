package DoAn.BE.hrm.service;

import DoAn.BE.hrm.entity.OKR;
import DoAn.BE.hrm.entity.KeyResult;
import DoAn.BE.hrm.repository.OKRRepository;
import DoAn.BE.hrm.repository.KeyResultRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.common.util.SecurityUtil;
import DoAn.BE.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OKRService {

    private final OKRRepository okrRepository;
    private final KeyResultRepository keyResultRepository;

    public List<OKR> findAll(String period) {
        if (period != null && !period.isEmpty()) {
            return okrRepository.findByPeriod(period);
        }
        return okrRepository.findAll();
    }

    public List<OKR> findByCurrentUser() {
        User currentUser = SecurityUtil.getCurrentUser();
        return okrRepository.findByOwnerId(currentUser.getUserId());
    }

    public List<OKR> findByDepartment(Long deptId) {
        return okrRepository.findByDepartmentId(deptId);
    }

    public OKR findById(Long id) {
        return okrRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OKR not found with id: " + id));
    }

    @Transactional
    public OKR create(Map<String, Object> request) {
        User currentUser = SecurityUtil.getCurrentUser();

        OKR okr = new OKR();
        okr.setTitle((String) request.get("title"));
        okr.setDescription((String) request.get("description"));
        okr.setPeriod((String) request.get("period"));
        okr.setOwner(currentUser);
        okr.setStatus(OKR.OKRStatus.IN_PROGRESS);
        okr.setProgress(0);

        // Save OKR first
        okr = okrRepository.save(okr);

        // Add key results if provided
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> keyResultsData = (List<Map<String, Object>>) request.get("keyResults");
        if (keyResultsData != null) {
            for (Map<String, Object> krData : keyResultsData) {
                KeyResult kr = new KeyResult();
                kr.setTitle((String) krData.get("title"));
                kr.setTarget(parseDouble(krData.get("target")));
                kr.setCurrent(0.0);
                kr.setUnit((String) krData.get("unit"));
                kr.setOkr(okr);
                okr.getKeyResults().add(kr);
            }
            okr = okrRepository.save(okr);
        }

        return okr;
    }

    @Transactional
    public OKR update(Long id, Map<String, Object> request) {
        OKR okr = findById(id);

        if (request.containsKey("title")) {
            okr.setTitle((String) request.get("title"));
        }
        if (request.containsKey("description")) {
            okr.setDescription((String) request.get("description"));
        }
        if (request.containsKey("period")) {
            okr.setPeriod((String) request.get("period"));
        }
        if (request.containsKey("status")) {
            okr.setStatus(OKR.OKRStatus.valueOf((String) request.get("status")));
        }

        // Update key results progress
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> keyResultsData = (List<Map<String, Object>>) request.get("keyResults");
        if (keyResultsData != null) {
            for (Map<String, Object> krData : keyResultsData) {
                Long krId = parseLong(krData.get("id"));
                if (krId != null) {
                    KeyResult kr = keyResultRepository.findById(krId).orElse(null);
                    if (kr != null) {
                        if (krData.containsKey("current")) {
                            kr.setCurrent(parseDouble(krData.get("current")));
                        }
                        if (krData.containsKey("title")) {
                            kr.setTitle((String) krData.get("title"));
                        }
                        keyResultRepository.save(kr);
                    }
                }
            }
        }

        // Recalculate progress
        okr.calculateProgress();

        // Auto-update status based on progress
        if (okr.getProgress() >= 100) {
            okr.setStatus(OKR.OKRStatus.COMPLETED);
        } else if (okr.getProgress() >= 70) {
            okr.setStatus(OKR.OKRStatus.ON_TRACK);
        } else if (okr.getProgress() >= 40) {
            okr.setStatus(OKR.OKRStatus.IN_PROGRESS);
        } else {
            okr.setStatus(OKR.OKRStatus.AT_RISK);
        }

        return okrRepository.save(okr);
    }

    @Transactional
    public void delete(Long id) {
        OKR okr = findById(id);
        okrRepository.delete(okr);
    }

    private Double parseDouble(Object value) {
        if (value == null)
            return 0.0;
        if (value instanceof Number)
            return ((Number) value).doubleValue();
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    private Long parseLong(Object value) {
        if (value == null)
            return null;
        if (value instanceof Number)
            return ((Number) value).longValue();
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
