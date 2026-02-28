import { describe, it, expect } from 'vitest';
import {
    PLAN_CONFIG,
    getPlanConfig,
    hasFeature,
    canAddMember,
    canCreateProject,
    getRemainingSlots,
    getRequiredPlanForFeature,
} from '@shared/utils/planHelper';

describe('planHelper', () => {
    // =================================================================
    // PLAN_CONFIG structure validation
    // =================================================================
    describe('PLAN_CONFIG', () => {
        it('1. Contains exactly 4 plans: FREE, STARTER, PROFESSIONAL, ENTERPRISE', () => {
            const plans = Object.keys(PLAN_CONFIG);
            expect(plans).toEqual(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']);
            expect(plans).toHaveLength(4);
        });

        it('2. FREE plan limits: 5 users, 3 projects, 1GB', () => {
            expect(PLAN_CONFIG.FREE.maxUsers).toBe(5);
            expect(PLAN_CONFIG.FREE.maxProjects).toBe(3);
            expect(PLAN_CONFIG.FREE.storageGB).toBe(1);
        });

        it('3. ENTERPRISE plan: unlimited (-1) users, projects, storage', () => {
            expect(PLAN_CONFIG.ENTERPRISE.maxUsers).toBe(-1);
            expect(PLAN_CONFIG.ENTERPRISE.maxProjects).toBe(-1);
            expect(PLAN_CONFIG.ENTERPRISE.storageGB).toBe(-1);
        });

        it('4. Feature progression: FREE < STARTER < PRO < ENTERPRISE', () => {
            // FREE: no hr, no ai, no webhook, no api
            expect(PLAN_CONFIG.FREE.features.hr).toBe(false);
            expect(PLAN_CONFIG.FREE.features.ai).toBe(false);

            // STARTER: has ai, no hr
            expect(PLAN_CONFIG.STARTER.features.ai).toBe(true);
            expect(PLAN_CONFIG.STARTER.features.hr).toBe(false);

            // PROFESSIONAL: has hr, has ai, has webhook, no api
            expect(PLAN_CONFIG.PROFESSIONAL.features.hr).toBe(true);
            expect(PLAN_CONFIG.PROFESSIONAL.features.webhook).toBe(true);
            expect(PLAN_CONFIG.PROFESSIONAL.features.api).toBe(false);

            // ENTERPRISE: all features
            expect(PLAN_CONFIG.ENTERPRISE.features.api).toBe(true);
        });
    });

    // =================================================================
    // getPlanConfig
    // =================================================================
    describe('getPlanConfig', () => {
        it('5. Valid plan → returns config', () => {
            const config = getPlanConfig('PROFESSIONAL');
            expect(config.name).toBe('Professional');
            expect(config.maxUsers).toBe(100);
        });

        it('6. Invalid/unknown plan → fallbacks to FREE', () => {
            const config = getPlanConfig('NONEXISTENT');
            expect(config).toEqual(PLAN_CONFIG.FREE);
        });

        it('7. null/undefined → fallbacks to FREE', () => {
            expect(getPlanConfig(null)).toEqual(PLAN_CONFIG.FREE);
            expect(getPlanConfig(undefined)).toEqual(PLAN_CONFIG.FREE);
        });
    });

    // =================================================================
    // hasFeature
    // =================================================================
    describe('hasFeature', () => {
        it('8. FREE + kanban → true', () => {
            expect(hasFeature('FREE', 'kanban')).toBe(true);
        });

        it('9. FREE + hr → false', () => {
            expect(hasFeature('FREE', 'hr')).toBe(false);
        });

        it('10. PROFESSIONAL + hr → true', () => {
            expect(hasFeature('PROFESSIONAL', 'hr')).toBe(true);
        });

        it('11. Unknown feature → false (not undefined)', () => {
            // features.unknownThing is undefined, so === true is false
            expect(hasFeature('ENTERPRISE', 'totallyFake')).toBe(false);
        });

        it('12. Invalid plan → fallback to FREE config', () => {
            expect(hasFeature('INVALID', 'kanban')).toBe(true); // FREE has kanban
            expect(hasFeature('INVALID', 'hr')).toBe(false); // FREE doesn't have hr
        });
    });

    // =================================================================
    // canAddMember
    // =================================================================
    describe('canAddMember', () => {
        it('13. FREE, 4 members → true (limit is 5)', () => {
            expect(canAddMember('FREE', 4)).toBe(true);
        });

        it('14. FREE, 5 members → false (at limit)', () => {
            expect(canAddMember('FREE', 5)).toBe(false);
        });

        it('15. FREE, 6 members → false (over limit)', () => {
            expect(canAddMember('FREE', 6)).toBe(false);
        });

        it('16. ENTERPRISE → always true (unlimited)', () => {
            expect(canAddMember('ENTERPRISE', 0)).toBe(true);
            expect(canAddMember('ENTERPRISE', 99999)).toBe(true);
        });

        it('17. STARTER, 19 → true, 20 → false', () => {
            expect(canAddMember('STARTER', 19)).toBe(true);
            expect(canAddMember('STARTER', 20)).toBe(false);
        });
    });

    // =================================================================
    // canCreateProject
    // =================================================================
    describe('canCreateProject', () => {
        it('18. FREE, 2 projects → true (limit is 3)', () => {
            expect(canCreateProject('FREE', 2)).toBe(true);
        });

        it('19. FREE, 3 projects → false (at limit)', () => {
            expect(canCreateProject('FREE', 3)).toBe(false);
        });

        it('20. ENTERPRISE → always true', () => {
            expect(canCreateProject('ENTERPRISE', 99999)).toBe(true);
        });
    });

    // =================================================================
    // getRemainingSlots
    // =================================================================
    describe('getRemainingSlots', () => {
        it('21. FREE, 3 users → 2 remaining', () => {
            expect(getRemainingSlots('FREE', 3, 'users')).toBe(2);
        });

        it('22. FREE, 5 users → 0 remaining', () => {
            expect(getRemainingSlots('FREE', 5, 'users')).toBe(0);
        });

        it('23. FREE, 10 users (over limit) → 0 (clamped by Math.max)', () => {
            expect(getRemainingSlots('FREE', 10, 'users')).toBe(0);
        });

        it('24. ENTERPRISE → -1 (unlimited)', () => {
            expect(getRemainingSlots('ENTERPRISE', 100, 'users')).toBe(-1);
        });

        it('25. Projects type', () => {
            expect(getRemainingSlots('FREE', 1, 'projects')).toBe(2); // 3 - 1
        });
    });

    // =================================================================
    // getRequiredPlanForFeature
    // =================================================================
    describe('getRequiredPlanForFeature', () => {
        it('26. kanban → FREE (available on all plans)', () => {
            expect(getRequiredPlanForFeature('kanban')).toBe('FREE');
        });

        it('27. ai → STARTER (first plan with ai)', () => {
            expect(getRequiredPlanForFeature('ai')).toBe('STARTER');
        });

        it('28. hr → PROFESSIONAL (first plan with hr)', () => {
            expect(getRequiredPlanForFeature('hr')).toBe('PROFESSIONAL');
        });

        it('29. api → ENTERPRISE (only enterprise)', () => {
            expect(getRequiredPlanForFeature('api')).toBe('ENTERPRISE');
        });

        it('30. Unknown feature → ENTERPRISE (fallback)', () => {
            expect(getRequiredPlanForFeature('nonexistent')).toBe('ENTERPRISE');
        });
    });
});
