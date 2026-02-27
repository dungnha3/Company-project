package DoAn.BE.hrm.service;

import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.util.SecurityUtil;
import DoAn.BE.hrm.dto.CreateOKRRequest;
import DoAn.BE.hrm.dto.UpdateOKRRequest;
import DoAn.BE.hrm.entity.KeyResult;
import DoAn.BE.hrm.entity.OKR;
import DoAn.BE.hrm.repository.KeyResultRepository;
import DoAn.BE.hrm.repository.OKRRepository;
import DoAn.BE.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("OKR Service Unit Tests")
class OKRServiceTest {

    @Mock
    private OKRRepository okrRepository;
    @Mock
    private KeyResultRepository keyResultRepository;

    @InjectMocks
    private OKRService okrService;

    private User testUser;
    private OKR testOkr;
    private KeyResult testKeyResult;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUserId(1L);
        testUser.setUsername("john.doe");

        testKeyResult = new KeyResult();
        testKeyResult.setId(10L);
        testKeyResult.setTitle("Close 5 deals");
        testKeyResult.setTarget(5.0);
        testKeyResult.setCurrent(2.0);
        testKeyResult.setUnit("deals");

        testOkr = new OKR();
        testOkr.setId(1L);
        testOkr.setTitle("Increase Revenue");
        testOkr.setDescription("Q1 revenue target");
        testOkr.setPeriod("Q1-2026");
        testOkr.setOwner(testUser);
        testOkr.setStatus(OKR.OKRStatus.IN_PROGRESS);
        testOkr.setProgress(0);
        testOkr.setKeyResults(new ArrayList<>(List.of(testKeyResult)));
        testKeyResult.setOkr(testOkr);
    }
    // FIND OPERATIONS
    @Nested
    @DisplayName("Find Operations")
    class FindTests {

        @Test
        @DisplayName("Find all without filter returns all OKRs")
        void findAll_noFilter() {
            when(okrRepository.findAll()).thenReturn(List.of(testOkr));

            List<OKR> result = okrService.findAll(null);

            assertEquals(1, result.size());
            verify(okrRepository).findAll();
            verify(okrRepository, never()).findByPeriod(any());
        }

        @Test
        @DisplayName("Find all with empty filter returns all OKRs")
        void findAll_emptyFilter() {
            when(okrRepository.findAll()).thenReturn(List.of(testOkr));

            List<OKR> result = okrService.findAll("");

            assertEquals(1, result.size());
            verify(okrRepository).findAll();
        }

        @Test
        @DisplayName("Find all with period filter returns filtered OKRs")
        void findAll_withPeriod() {
            when(okrRepository.findByPeriod("Q1-2026")).thenReturn(List.of(testOkr));

            List<OKR> result = okrService.findAll("Q1-2026");

            assertEquals(1, result.size());
            verify(okrRepository).findByPeriod("Q1-2026");
        }

        @Test
        @DisplayName("Find by current user returns user's OKRs")
        void findByCurrentUser_success() {
            try (MockedStatic<SecurityUtil> mockedSec = mockStatic(SecurityUtil.class)) {
                mockedSec.when(SecurityUtil::getCurrentUser).thenReturn(testUser);
                when(okrRepository.findByOwnerId(1L)).thenReturn(List.of(testOkr));

                List<OKR> result = okrService.findByCurrentUser();

                assertEquals(1, result.size());
                assertEquals("Increase Revenue", result.get(0).getTitle());
            }
        }

        @Test
        @DisplayName("Find by department returns department OKRs")
        void findByDepartment_success() {
            when(okrRepository.findByDepartmentId(5L)).thenReturn(List.of(testOkr));

            List<OKR> result = okrService.findByDepartment(5L);

            assertEquals(1, result.size());
        }

        @Test
        @DisplayName("Find by ID returns OKR")
        void findById_success() {
            when(okrRepository.findById(1L)).thenReturn(Optional.of(testOkr));

            OKR result = okrService.findById(1L);

            assertNotNull(result);
            assertEquals("Increase Revenue", result.getTitle());
        }

        @Test
        @DisplayName("Find by ID not found throws ResourceNotFoundException")
        void findById_notFound() {
            when(okrRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class, () -> okrService.findById(999L));
        }
    }
    // CREATE
    @Nested
    @DisplayName("Create OKR")
    class CreateTests {

        @Test
        @DisplayName("Create OKR with key results")
        void create_withKeyResults() {
            CreateOKRRequest request = new CreateOKRRequest();
            request.setTitle("New OKR");
            request.setDescription("Desc");
            request.setPeriod("Q2-2026");

            CreateOKRRequest.KeyResultRequest kr = new CreateOKRRequest.KeyResultRequest();
            kr.setTitle("KR1");
            kr.setTarget(10.0);
            kr.setUnit("items");
            request.setKeyResults(List.of(kr));

            try (MockedStatic<SecurityUtil> mockedSec = mockStatic(SecurityUtil.class)) {
                mockedSec.when(SecurityUtil::getCurrentUser).thenReturn(testUser);
                when(okrRepository.save(any(OKR.class))).thenAnswer(i -> {
                    OKR o = i.getArgument(0);
                    o.setId(2L);
                    return o;
                });

                OKR result = okrService.create(request);

                assertNotNull(result);
                assertEquals("New OKR", result.getTitle());
                assertEquals(OKR.OKRStatus.IN_PROGRESS, result.getStatus());
                assertEquals(0, result.getProgress());
                verify(okrRepository, times(2)).save(any(OKR.class));
            }
        }

        @Test
        @DisplayName("Create OKR without key results")
        void create_withoutKeyResults() {
            CreateOKRRequest request = new CreateOKRRequest();
            request.setTitle("Simple OKR");
            request.setDescription("No KRs");
            request.setPeriod("Q1-2026");

            try (MockedStatic<SecurityUtil> mockedSec = mockStatic(SecurityUtil.class)) {
                mockedSec.when(SecurityUtil::getCurrentUser).thenReturn(testUser);
                when(okrRepository.save(any(OKR.class))).thenAnswer(i -> {
                    OKR o = i.getArgument(0);
                    o.setId(3L);
                    return o;
                });

                OKR result = okrService.create(request);

                assertNotNull(result);
                assertEquals("Simple OKR", result.getTitle());
                verify(okrRepository, times(1)).save(any(OKR.class));
            }
        }
    }
    // UPDATE
    @Nested
    @DisplayName("Update OKR")
    class UpdateTests {

        @Test
        @DisplayName("Update OKR title only")
        void update_titleOnly() {
            try (MockedStatic<SecurityUtil> mockedSec = mockStatic(SecurityUtil.class)) {
                mockedSec.when(SecurityUtil::getCurrentUser).thenReturn(testUser);
                UpdateOKRRequest request = new UpdateOKRRequest();
                request.setTitle("Updated Title");

                when(okrRepository.findById(1L)).thenReturn(Optional.of(testOkr));
                when(okrRepository.save(any(OKR.class))).thenAnswer(i -> i.getArgument(0));

                OKR result = okrService.update(1L, request);

                assertEquals("Updated Title", result.getTitle());
            }
        }

        @Test
        @DisplayName("Update key result current value and auto-set status AT_RISK (<40%)")
        void update_keyResult_atRisk() {
            try (MockedStatic<SecurityUtil> mockedSec = mockStatic(SecurityUtil.class)) {
                mockedSec.when(SecurityUtil::getCurrentUser).thenReturn(testUser);
                testKeyResult.setCurrent(1.0); // 1/5 = 20%
                UpdateOKRRequest request = new UpdateOKRRequest();
                UpdateOKRRequest.KeyResultUpdateRequest krUpdate = new UpdateOKRRequest.KeyResultUpdateRequest();
                krUpdate.setId(10L);
                krUpdate.setCurrent(1.0);
                request.setKeyResults(List.of(krUpdate));

                when(okrRepository.findById(1L)).thenReturn(Optional.of(testOkr));
                when(keyResultRepository.findById(10L)).thenReturn(Optional.of(testKeyResult));
                when(okrRepository.save(any(OKR.class))).thenAnswer(i -> i.getArgument(0));

                OKR result = okrService.update(1L, request);

                assertEquals(OKR.OKRStatus.AT_RISK, result.getStatus());
            }
        }

        @Test
        @DisplayName("Update key result to 100% auto-completes OKR")
        void update_keyResult_completed() {
            try (MockedStatic<SecurityUtil> mockedSec = mockStatic(SecurityUtil.class)) {
                mockedSec.when(SecurityUtil::getCurrentUser).thenReturn(testUser);
                testKeyResult.setCurrent(5.0); // 5/5 = 100%
                UpdateOKRRequest request = new UpdateOKRRequest();
                UpdateOKRRequest.KeyResultUpdateRequest krUpdate = new UpdateOKRRequest.KeyResultUpdateRequest();
                krUpdate.setId(10L);
                krUpdate.setCurrent(5.0);
                request.setKeyResults(List.of(krUpdate));

                when(okrRepository.findById(1L)).thenReturn(Optional.of(testOkr));
                when(keyResultRepository.findById(10L)).thenReturn(Optional.of(testKeyResult));
                when(okrRepository.save(any(OKR.class))).thenAnswer(i -> i.getArgument(0));

                OKR result = okrService.update(1L, request);

                assertEquals(OKR.OKRStatus.COMPLETED, result.getStatus());
            }
        }

        @Test
        @DisplayName("Update with non-existent key result ID is silently ignored")
        void update_keyResult_notFound_ignored() {
            try (MockedStatic<SecurityUtil> mockedSec = mockStatic(SecurityUtil.class)) {
                mockedSec.when(SecurityUtil::getCurrentUser).thenReturn(testUser);
                UpdateOKRRequest request = new UpdateOKRRequest();
                UpdateOKRRequest.KeyResultUpdateRequest krUpdate = new UpdateOKRRequest.KeyResultUpdateRequest();
                krUpdate.setId(999L);
                krUpdate.setCurrent(3.0);
                request.setKeyResults(List.of(krUpdate));

                when(okrRepository.findById(1L)).thenReturn(Optional.of(testOkr));
                when(keyResultRepository.findById(999L)).thenReturn(Optional.empty());
                when(okrRepository.save(any(OKR.class))).thenAnswer(i -> i.getArgument(0));

                OKR result = okrService.update(1L, request);

                assertNotNull(result);
                verify(keyResultRepository, never()).save(any());
            }
        }
    }
    // DELETE
    @Nested
    @DisplayName("Delete OKR")
    class DeleteTests {

        @Test
        @DisplayName("Delete OKR successfully")
        void delete_success() {
            when(okrRepository.findById(1L)).thenReturn(Optional.of(testOkr));

            okrService.delete(1L);

            verify(okrRepository).delete(testOkr);
        }

        @Test
        @DisplayName("Delete non-existent OKR throws ResourceNotFoundException")
        void delete_notFound() {
            when(okrRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class, () -> okrService.delete(999L));
        }
    }
}
