import { describe, it, expect } from 'vitest';
import {
    isFeatureEnabled,
    isSectionEnabled,
    isMenuItemEnabled,
    isProjectFeatureEnabled,
    hasUserPermission,
} from '@shared/utils/featureHelper';

describe('featureHelper', () => {
    // =================================================================
    // isFeatureEnabled — Plan + Settings + Permissions
    // =================================================================
    describe('isFeatureEnabled', () => {
        it('1. FREE + null settings + "kanban" → true (kanban available on FREE)', () => {
            expect(isFeatureEnabled('FREE', null, 'kanban')).toBe(true);
        });

        it('2. FREE + null settings + "hr" → false (hr not on FREE plan)', () => {
            expect(isFeatureEnabled('FREE', null, 'hr')).toBe(false);
        });

        it('3. PROFESSIONAL + settings { hrModuleEnabled: true } + "hr" → true', () => {
            expect(isFeatureEnabled('PROFESSIONAL', { hrModuleEnabled: true }, 'hr')).toBe(true);
        });

        it('4. PROFESSIONAL + settings { hrModuleEnabled: false } + "hr" → false (admin disabled)', () => {
            expect(isFeatureEnabled('PROFESSIONAL', { hrModuleEnabled: false }, 'hr')).toBe(false);
        });

        // 🐛 BUG CHECK: HR sub-feature depends on HR module being enabled
        it('5. PROFESSIONAL + hrModuleEnabled=false + "attendance" → false (parent module off)', () => {
            const settings = { hrModuleEnabled: false, attendanceEnabled: true };
            expect(isFeatureEnabled('PROFESSIONAL', settings, 'attendance')).toBe(false);
        });

        it('6. PROFESSIONAL + hrModuleEnabled=true, attendanceEnabled=false → false (sub-feature off)', () => {
            const settings = { hrModuleEnabled: true, attendanceEnabled: false };
            expect(isFeatureEnabled('PROFESSIONAL', settings, 'attendance')).toBe(false);
        });

        it('7. PROFESSIONAL + hrModuleEnabled=true, attendanceEnabled=true → true', () => {
            const settings = { hrModuleEnabled: true, attendanceEnabled: true };
            expect(isFeatureEnabled('PROFESSIONAL', settings, 'attendance')).toBe(true);
        });

        // Project sub-features
        it('8. PROFESSIONAL + projectModuleEnabled=false + "timeTracking" → false', () => {
            const settings = { projectModuleEnabled: false, timeTrackingEnabled: true };
            expect(isFeatureEnabled('PROFESSIONAL', settings, 'timeTracking')).toBe(false);
        });

        // Permissions check
        it('9. With permissions: feature allowed → true', () => {
            const settings = { hrModuleEnabled: true, attendanceEnabled: true };
            const permissions = { attendanceViewAll: true };
            expect(isFeatureEnabled('PROFESSIONAL', settings, 'attendance', permissions)).toBe(true);
        });

        it('10. With permissions: feature denied → false', () => {
            const settings = { hrModuleEnabled: true, attendanceEnabled: true };
            const permissions = { attendanceViewAll: false };
            expect(isFeatureEnabled('PROFESSIONAL', settings, 'attendance', permissions)).toBe(false);
        });

        it('11. With null permissions (Admin/Owner) → always true (no restriction)', () => {
            const settings = { hrModuleEnabled: true };
            expect(isFeatureEnabled('PROFESSIONAL', settings, 'hr', null)).toBe(true);
        });

        // FREE plan + null settings check → uses FREE plan features
        it('12. FREE + null settings + "chat" → true (FREE has chat)', () => {
            expect(isFeatureEnabled('FREE', null, 'chat')).toBe(true);
        });

        it('13. FREE + null settings + "ai" → false (FREE has no ai)', () => {
            expect(isFeatureEnabled('FREE', null, 'ai')).toBe(false);
        });
    });

    // =================================================================
    // hasUserPermission
    // =================================================================
    describe('hasUserPermission', () => {
        it('14. null permissions → true (admin/personal)', () => {
            expect(hasUserPermission(null, 'anything')).toBe(true);
        });

        it('15. Direct field match', () => {
            expect(hasUserPermission({ hrViewList: true }, 'hrViewList')).toBe(true);
            expect(hasUserPermission({ hrViewList: false }, 'hrViewList')).toBe(false);
        });

        it('16. Mapped feature → permission key', () => {
            // 'salary' maps to 'salaryView'
            expect(hasUserPermission({ salaryView: true }, 'salary')).toBe(true);
            expect(hasUserPermission({ salaryView: false }, 'salary')).toBe(false);
        });

        it('17. Unmapped feature → default true', () => {
            expect(hasUserPermission({ someField: true }, 'unknownFeature')).toBe(true);
        });
    });

    // =================================================================
    // isSectionEnabled
    // =================================================================
    describe('isSectionEnabled', () => {
        it('18. "hr" section + PROFESSIONAL + hrModuleEnabled → true', () => {
            expect(isSectionEnabled('hr', 'PROFESSIONAL', { hrModuleEnabled: true })).toBe(true);
        });

        it('19. "hr" section + FREE → false (no HR on FREE)', () => {
            expect(isSectionEnabled('hr', 'FREE', null)).toBe(false);
        });

        it('20. "time" section → same as "hr" (depends on HR module)', () => {
            expect(isSectionEnabled('time', 'FREE', null)).toBe(false);
            expect(isSectionEnabled('time', 'PROFESSIONAL', { hrModuleEnabled: true })).toBe(true);
        });

        it('21. "finance" section → same as "hr"', () => {
            expect(isSectionEnabled('finance', 'FREE', null)).toBe(false);
        });

        it('22. "project" section + FREE → true (FREE has project)', () => {
            expect(isSectionEnabled('project', 'FREE', null)).toBe(true);
        });

        it('23. "other" section → always true', () => {
            expect(isSectionEnabled('other', 'FREE', null)).toBe(true);
            expect(isSectionEnabled('other', 'ENTERPRISE', {})).toBe(true);
        });

        it('24. Unknown section → default true', () => {
            expect(isSectionEnabled('random', 'FREE', null)).toBe(true);
        });
    });

    // =================================================================
    // isMenuItemEnabled
    // =================================================================
    describe('isMenuItemEnabled', () => {
        it('25. /app/hr/attendance + PROFESSIONAL + settings OK → true', () => {
            const settings = { hrModuleEnabled: true, attendanceEnabled: true };
            expect(isMenuItemEnabled('/app/hr/attendance', 'PROFESSIONAL', settings)).toBe(true);
        });

        it('26. /app/hr/attendance + FREE → false', () => {
            expect(isMenuItemEnabled('/app/hr/attendance', 'FREE', null)).toBe(false);
        });

        it('27. Unknown path → true (no feature mapping)', () => {
            expect(isMenuItemEnabled('/app/settings', 'FREE', null)).toBe(true);
        });

        it('28. /app/projects + FREE → true', () => {
            expect(isMenuItemEnabled('/app/projects', 'FREE', null)).toBe(true);
        });

        it('29. With permissions denied', () => {
            const settings = { hrModuleEnabled: true, attendanceEnabled: true };
            const perms = { attendanceViewAll: false };
            expect(isMenuItemEnabled('/app/hr/attendance', 'PROFESSIONAL', settings, perms)).toBe(false);
        });
    });

    // =================================================================
    // isProjectFeatureEnabled
    // =================================================================
    describe('isProjectFeatureEnabled', () => {
        it('30. null settings (Personal) → true', () => {
            expect(isProjectFeatureEnabled(null, 'timeTracking')).toBe(true);
        });

        it('31. projectModuleEnabled=false → false for all project sub-features', () => {
            expect(isProjectFeatureEnabled({ projectModuleEnabled: false }, 'timeTracking')).toBe(false);
            expect(isProjectFeatureEnabled({ projectModuleEnabled: false }, 'analytics')).toBe(false);
        });

        it('32. projectModuleEnabled=true, timeTrackingEnabled=true → true', () => {
            expect(isProjectFeatureEnabled({ projectModuleEnabled: true, timeTrackingEnabled: true }, 'timeTracking')).toBe(true);
        });

        it('33. projectModuleEnabled=true, timeTrackingEnabled=false → false', () => {
            expect(isProjectFeatureEnabled({ projectModuleEnabled: true, timeTrackingEnabled: false }, 'timeTracking')).toBe(false);
        });

        it('34. Unknown feature + projectModuleEnabled=true → true (default)', () => {
            expect(isProjectFeatureEnabled({ projectModuleEnabled: true }, 'unknownFeature')).toBe(true);
        });
    });
});
