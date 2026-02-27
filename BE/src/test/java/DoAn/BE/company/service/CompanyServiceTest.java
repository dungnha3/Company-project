package DoAn.BE.company.service;

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

import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.company.dto.CompanyDto;
import DoAn.BE.company.dto.CompanyDto.CompanyResponse;
import DoAn.BE.company.entity.Company;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.entity.CompanySettings;
import DoAn.BE.company.entity.Plan;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.company.repository.CompanySettingsRepository;
import DoAn.BE.user.entity.User;

@ExtendWith(MockitoExtension.class)
public class CompanyServiceTest {

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private CompanyMemberRepository companyMemberRepository;

    @Mock
    private CompanySettingsRepository companySettingsRepository;

    @Mock
    private AccessControlService accessControlService;

    @InjectMocks
    private CompanyService companyService;

    @Mock
    private DoAn.BE.project.repository.ProjectRepository projectRepository;

    @Mock
    private DoAn.BE.hrm.repository.EmployeeRepository employeeRepository;

    @InjectMocks
    private CompanyAdminService companyAdminService;

    private User testUser;
    private Company testCompany;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUserId(1L);
        testUser.setEmail("test@ex.com");

        testCompany = new Company();
        testCompany.setCompanyId(100L);
        testCompany.setName("Test Corp");
        testCompany.setPlan(Plan.FREE);
    }

    @Test
    void getCompanyById_AdminOrOwner() {
        CompanyMember member = new CompanyMember();
        member.setCompany(testCompany);
        member.setUser(testUser);
        member.getRoles().add(CompanyRole.OWNER);

        when(companyRepository.existsById(100L)).thenReturn(true);
        when(companyMemberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(1L, 100L))
                .thenReturn(Optional.of(member));

        CompanyResponse response = companyService.getCompanyById(100L, testUser);

        assertNotNull(response);
        assertEquals("Test Corp", response.getName());
        verify(companyMemberRepository).findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(1L, 100L);
    }

    @Test
    void getCompanyById_NotFound() {
        when(companyRepository.existsById(999L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> companyService.getCompanyById(999L, testUser));
    }

    @Test
    void createCompany_Success() {
        CompanyDto.CompanyCreateRequest req = new CompanyDto.CompanyCreateRequest();
        req.setName("New Corp");
        req.setEmail("contact@newcorp.com");

        when(companyRepository.save(any(Company.class))).thenAnswer(i -> {
            Company c = i.getArgument(0);
            c.setCompanyId(200L);
            return c;
        });

        CompanyResponse response = companyService.createCompany(req, testUser);

        assertNotNull(response);
        assertEquals("New Corp", response.getName());
        verify(companyMemberRepository).save(any(CompanyMember.class));
        verify(companySettingsRepository).save(any(CompanySettings.class));
    }

    @Test
    void changePlan_Success() {
        when(companyRepository.findById(100L)).thenReturn(Optional.of(testCompany));
        when(companySettingsRepository.findById(100L)).thenReturn(Optional.of(new CompanySettings()));

        companyAdminService.changePlan(100L, "ENTERPRISE");

        assertEquals(Plan.ENTERPRISE, testCompany.getPlan());
        verify(companyRepository).save(testCompany);
    }

    @Test
    void toggleCompanyStatus_Success() {
        testCompany.setIsActive(true);
        when(companyRepository.findById(100L)).thenReturn(Optional.of(testCompany));

        boolean status = companyAdminService.toggleCompanyStatus(100L);

        assertFalse(status);
        assertFalse(testCompany.getIsActive());
        verify(companyRepository).save(testCompany);
    }
}
