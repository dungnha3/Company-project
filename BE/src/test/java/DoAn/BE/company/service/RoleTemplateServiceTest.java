package DoAn.BE.company.service;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Set;

import org.junit.jupiter.api.Test;

import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.entity.UserPermissions;

// RoleTemplateService has ZERO dependencies - pure logic only.
// No mocks needed. Easiest service to test.
// /
public class RoleTemplateServiceTest {

    private final RoleTemplateService service = new RoleTemplateService();

    @Test
    void getTemplate_Owner_HasFullPermissions() {
        UserPermissions p = service.getTemplate(Set.of(CompanyRole.OWNER));

        assertTrue(p.isHrViewList());
        assertTrue(p.isHrEditProfile());
        assertTrue(p.isHrManageContracts());
        assertTrue(p.isSalaryView());
        assertTrue(p.isSalaryCalculate());
        assertTrue(p.isSalaryApprove());
        assertTrue(p.isLeaveApprove());
        assertTrue(p.isLeaveViewAll());
        assertTrue(p.isAttendanceViewAll());
        assertTrue(p.isAttendanceEdit());
        assertTrue(p.isProjectCreate());
        assertTrue(p.isProjectManageAll());
        assertTrue(p.isProjectDelete());
        assertTrue(p.isChatCreateGroup());
        assertTrue(p.isStorageUpload());
        assertEquals(10L * 1024 * 1024 * 1024, p.getStorageLimit()); // 10GB
    }

    @Test
    void getTemplate_Admin_HasFullPermissions() {
        UserPermissions p = service.getTemplate(Set.of(CompanyRole.ADMIN));

        assertTrue(p.isHrViewList());
        assertTrue(p.isProjectDelete());
        assertTrue(p.isSalaryApprove());
    }

    @Test
    void getTemplate_ManagerHR_HasHRPermissionsOnly() {
        UserPermissions p = service.getTemplate(Set.of(CompanyRole.MANAGER_HR));

        assertTrue(p.isHrViewList());
        assertTrue(p.isHrEditProfile());
        assertTrue(p.isHrManageContracts());
        assertTrue(p.isAttendanceViewAll());
        assertTrue(p.isLeaveApprove());
        // Should NOT have project or salary permissions
        assertFalse(p.isProjectCreate());
        assertFalse(p.isSalaryView());
    }

    @Test
    void getTemplate_ManagerAccounting_HasSalaryPermissions() {
        UserPermissions p = service.getTemplate(Set.of(CompanyRole.MANAGER_ACCOUNTING));

        assertTrue(p.isSalaryView());
        assertTrue(p.isSalaryCalculate());
        assertTrue(p.isSalaryApprove());
        assertTrue(p.isAttendanceViewAll());
        // Should NOT have HR edit
        assertFalse(p.isHrEditProfile());
    }

    @Test
    void getTemplate_ManagerProject_HasProjectPermissions() {
        UserPermissions p = service.getTemplate(Set.of(CompanyRole.MANAGER_PROJECT));

        assertTrue(p.isProjectCreate());
        assertTrue(p.isProjectManageAll());
        assertTrue(p.isProjectDelete());
        // Should NOT have salary
        assertFalse(p.isSalaryView());
    }

    @Test
    void getTemplate_Employee_HasBasicPermissions() {
        UserPermissions p = service.getTemplate(Set.of(CompanyRole.EMPLOYEE));

        assertTrue(p.isChatCreateGroup());
        assertTrue(p.isStorageUpload());
        assertEquals(100 * 1024 * 1024L, p.getStorageLimit()); // 100MB
        // Should NOT have management permissions
        assertFalse(p.isHrViewList());
        assertFalse(p.isProjectCreate());
        assertFalse(p.isSalaryView());
    }

    @Test
    void getTemplate_NullRoles_ReturnsEmptyPermissions() {
        UserPermissions p = service.getTemplate(null);

        assertFalse(p.isHrViewList());
        assertFalse(p.isProjectCreate());
    }

    @Test
    void getTemplate_EmptyRoles_ReturnsEmptyPermissions() {
        UserPermissions p = service.getTemplate(Set.of());

        assertFalse(p.isHrViewList());
    }

    @Test
    void getTemplate_MultipleRoles_MergesPermissions() {
        // HR + Project Manager should get both HR and Project permissions
        UserPermissions p = service.getTemplate(Set.of(CompanyRole.MANAGER_HR, CompanyRole.MANAGER_PROJECT));

        assertTrue(p.isHrViewList());
        assertTrue(p.isHrEditProfile());
        assertTrue(p.isProjectCreate());
        assertTrue(p.isProjectManageAll());
        // Storage limit should be max of both (500MB > default)
        assertEquals(500 * 1024 * 1024L, p.getStorageLimit());
    }
}
