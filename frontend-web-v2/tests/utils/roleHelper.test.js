import { describe, it, expect } from 'vitest';
import {
    ROLES,
    getRoleDisplay,
    getRoleLabel,
    isManager,
    isOwner,
} from '@shared/utils/roleHelper';

describe('roleHelper', () => {
    // =================================================================
    // ROLES config
    // =================================================================
    describe('ROLES', () => {
        it('1. Contains all expected backend roles', () => {
            const roleKeys = Object.keys(ROLES);
            expect(roleKeys).toContain('OWNER');
            expect(roleKeys).toContain('ADMIN');
            expect(roleKeys).toContain('DIRECTOR');
            expect(roleKeys).toContain('EMPLOYEE');
            expect(roleKeys).toContain('MEMBER');
            expect(roleKeys).toContain('MANAGER_HR');
            expect(roleKeys).toContain('MANAGER_PROJECT');
            expect(roleKeys).toContain('MANAGER_ACCOUNTING');
            expect(roleKeys).toContain('SYSTEM_ADMIN');
        });

        it('2. DIRECTOR maps to Owner label (legacy mapping)', () => {
            expect(ROLES.DIRECTOR.label).toBe('Owner');
            expect(ROLES.DIRECTOR.color).toBe('gold');
        });

        it('3. EMPLOYEE maps to Member label', () => {
            expect(ROLES.EMPLOYEE.label).toBe('Member');
            expect(ROLES.EMPLOYEE.color).toBe('gray');
        });

        it('4. Each role has label, color, icon properties', () => {
            Object.values(ROLES).forEach(role => {
                expect(role).toHaveProperty('label');
                expect(role).toHaveProperty('color');
                expect(role).toHaveProperty('icon');
                expect(typeof role.label).toBe('string');
                expect(typeof role.color).toBe('string');
                expect(typeof role.icon).toBe('string');
            });
        });
    });

    // =================================================================
    // getRoleDisplay
    // =================================================================
    describe('getRoleDisplay', () => {
        it('5. ADMIN → { label: "Admin", color: "purple" }', () => {
            const display = getRoleDisplay('ADMIN');
            expect(display.label).toBe('Admin');
            expect(display.color).toBe('purple');
        });

        it('6. Unknown role → fallback to MEMBER', () => {
            const display = getRoleDisplay('NONEXISTENT');
            expect(display).toEqual(ROLES.MEMBER);
            expect(display.label).toBe('Member');
        });

        it('7. null → fallback to MEMBER', () => {
            expect(getRoleDisplay(null).label).toBe('Member');
            expect(getRoleDisplay(undefined).label).toBe('Member');
        });
    });

    // =================================================================
    // getRoleLabel
    // =================================================================
    describe('getRoleLabel', () => {
        it('8. DIRECTOR → "Owner"', () => {
            expect(getRoleLabel('DIRECTOR')).toBe('Owner');
        });

        it('9. MANAGER_HR → "HR Admin"', () => {
            expect(getRoleLabel('MANAGER_HR')).toBe('HR Admin');
        });

        it('10. Unknown → "Member"', () => {
            expect(getRoleLabel('INVALID')).toBe('Member');
        });
    });

    // =================================================================
    // isManager
    // =================================================================
    describe('isManager', () => {
        it('11. OWNER → true', () => {
            expect(isManager('OWNER')).toBe(true);
        });

        it('12. ADMIN → true', () => {
            expect(isManager('ADMIN')).toBe(true);
        });

        it('13. DIRECTOR → true', () => {
            expect(isManager('DIRECTOR')).toBe(true);
        });

        it('14. MANAGER_HR → true', () => {
            expect(isManager('MANAGER_HR')).toBe(true);
        });

        it('15. EMPLOYEE → false', () => {
            expect(isManager('EMPLOYEE')).toBe(false);
        });

        it('16. MEMBER → false', () => {
            expect(isManager('MEMBER')).toBe(false);
        });

        // SYSTEM_ADMIN là role cấp hệ thống (platform admin), KHÔNG phải company role
        // isManager() chỉ check company management roles → đúng khi return false
        it('17. SYSTEM_ADMIN → false (system-level role, not company manager)', () => {
            expect(isManager('SYSTEM_ADMIN')).toBe(false);
        });
    });

    // =================================================================
    // isOwner
    // =================================================================
    describe('isOwner', () => {
        it('18. OWNER → true', () => {
            expect(isOwner('OWNER')).toBe(true);
        });

        it('19. DIRECTOR → true (legacy owner)', () => {
            expect(isOwner('DIRECTOR')).toBe(true);
        });

        it('20. ADMIN → false (admin ≠ owner)', () => {
            expect(isOwner('ADMIN')).toBe(false);
        });

        it('21. EMPLOYEE → false', () => {
            expect(isOwner('EMPLOYEE')).toBe(false);
        });

        it('22. null → false', () => {
            expect(isOwner(null)).toBe(false);
            expect(isOwner(undefined)).toBe(false);
        });
    });
});
