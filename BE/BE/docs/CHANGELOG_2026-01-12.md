# Backend Changes Summary (2026-01-12)

> **Total Files Affected**: ~140 files
> **Impact**: HIGH - Affects FE API calls, events, and SaaS features

---

## 🗑️ DELETED (16 files)

### Automation Module (Complete Removal)
| File | Reason |
|------|--------|
| `automation/controller/AutomationController.java` | Module was incomplete placeholder |
| `automation/dto/ActionDTO.java` | |
| `automation/dto/AutomationLogDTO.java` | |
| `automation/dto/AutomationRuleDTO.java` | |
| `automation/dto/ConditionDTO.java` | |
| `automation/dto/CreateRuleRequest.java` | |
| `automation/entity/AutomationAction.java` | |
| `automation/entity/AutomationCondition.java` | |
| `automation/entity/AutomationLog.java` | |
| `automation/entity/AutomationRule.java` | |
| `automation/repository/AutomationLogRepository.java` | |
| `automation/repository/AutomationRuleRepository.java` | |
| `automation/service/AutomationEngine.java` | |
| `automation/service/AutomationService.java` | |

### Other Deletions
| File | Reason |
|------|--------|
| `common/exception/EntityNotFoundException.java` | Duplicate of ResourceNotFoundException |
| `hrm/service/ExportService.java` | Replaced by HrmExportService |
| `notification/service/LeaveRequestNotificationService.java` | Merged into event-driven pattern |

---

## 🆕 NEW FILES (35+ files)

### Events (Event-Driven Architecture)
| File | Purpose |
|------|---------|
| `auth/event/AuthEvent.java` | LOGIN_NEW_DEVICE, PASSWORD_CHANGED, ACCOUNT_LOCKED |
| `hrm/event/HrmEvent.java` | ATTENDANCE_LATE, LEAVE_APPROVED, CONTRACT_EXPIRING |
| `project/event/ProjectEvent.java` | CREATED, MEMBER_ADDED, DELETED, ROLE_CHANGED |
| `project/event/IssueEvent.java` | CREATED, UPDATED, DELETED, OVERDUE |
| `project/event/SprintEvent.java` | CREATED, STARTED, COMPLETED, ENDING_SOON |
| `calendar/event/CalendarEventPublished.java` | EVENT_CREATED, EVENT_UPDATED |

### Notification Listener
| File | Purpose |
|------|---------|
| `notification/listener/InternalNotificationListener.java` | Central handler for ALL events |

### SSO (Enterprise)
| File | Purpose |
|------|---------|
| `auth/controller/SsoController.java` | SSO endpoints |
| `auth/dto/SsoDto.java` | SSO request/response |
| `auth/entity/SsoProvider.java` | SAML/OIDC provider config |
| `auth/repository/SsoProviderRepository.java` | |
| `auth/service/SsoService.java` | SSO logic |

### Integration Module
| File | Purpose |
|------|---------|
| `integration/controller/WebhookController.java` | Webhook endpoints |
| `integration/entity/Webhook.java` | Webhook config entity |
| `integration/service/IntegrationService.java` | |
| `integration/service/WebhookConnector.java` | Send webhook requests |

### Project Enhancements
| File | Purpose |
|------|---------|
| `project/entity/IssueDependency.java` | Issue dependencies (blocks/blocked by) |
| `project/entity/IssueCustomField.java` | Custom field definitions |
| `project/entity/IssueCustomFieldValue.java` | Custom field values |
| `project/controller/CustomFieldController.java` | Custom field API |
| `project/controller/GanttController.java` | Gantt chart API |
| `project/service/CustomFieldService.java` | |
| `project/service/GanttService.java` | |

### Common Utilities
| File | Purpose |
|------|---------|
| `common/config/CacheConfig.java` | Redis caching |
| `common/config/OpenApiConfig.java` | Swagger docs |
| `common/search/SearchService.java` | Elasticsearch integration |
| `common/controller/SearchController.java` | `/api/search` endpoint |
| `common/service/PdfExportService.java` | PDF generation |
| `common/service/EncryptionService.java` | Data encryption |
| `common/filter/RateLimitingFilter.java` | Rate limiting |

### Documentation
| File | Purpose |
|------|---------|
| `docs/CLAUDE.md` | Quick reference for AI assistants |
| `docs/03_indexes.sql` | Database indexes |

---

## ✏️ MODIFIED - FE Impact Summary

### 🔴 HIGH IMPACT (API Response Changes)

| File | Change | FE Impact |
|------|--------|-----------|
| `company/entity/Plan.java` | Added `aiModuleEnabled`, `webhookEnabled`, pricing, tier methods | Plan API response has new fields |
| `company/entity/CompanySettings.java` | Removed `automationEnabled`, added `webhookEnabled`, `maxFileUploadBytes` | Settings API response changed |
| `common/service/QuotaService.java` | New `QuotaLevel` (OK/WARNING/CRITICAL), `QuotaItem` with percentage | `/api/companies/quota` response structure changed |
| `company/controller/CompanyController.java` | Quota endpoint returns `QuotaUsageWithLevels` | New quota response format |

### 🟡 MEDIUM IMPACT (New Events/Notifications)

| File | Change | FE Impact |
|------|--------|-----------|
| `notification/listener/InternalNotificationListener.java` | Handles ALL events centrally | New notification types may appear |
| `project/service/IssueService.java` | Zombie sprint validation, delete event | Issue creation may fail if sprint is completed |
| `project/service/ProjectMemberService.java` | Role change event, ghost assignee cleanup | Role change triggers notification |
| `hrm/service/AttendanceScheduledService.java` | Migrated to Event pattern | Same notifications, different trigger |

### 🟢 LOW IMPACT (Internal Changes)

| File | Change |
|------|--------|
| All `*NotificationService.java` | Some methods commented out (spam reduction) |
| `FeatureFlagInterceptor.java` | AUTOMATION → WEBHOOK |
| `TenantFilter.java` | Cleanup, no API change |
| Various Services | Removed verbose AI comments |

---

## 📋 FE Action Items

### Must Do
1. **Update SaaS Plan Display**: New fields in Plan (price, aiEnabled, webhookEnabled)
2. **Update Quota Dashboard**: New response format with `level` and `percentage`
3. **Remove Automation UI**: `/api/automations` endpoints no longer exist

### Should Do
1. **Handle new notification types**: COMMENT_EDITED, COMMENT_DELETED, ROLE_CHANGED
2. **Show upgrade prompts**: When `quota.level === "WARNING"` or `"CRITICAL"`

### Nice to Have
1. Use new `/api/search` endpoint for global search
2. Implement custom fields UI for issues

---

## 🔧 Database Changes Required

```sql
-- Add new columns to company_settings
ALTER TABLE company_settings ADD max_file_upload_bytes BIGINT DEFAULT 10485760;
ALTER TABLE company_settings ADD webhook_enabled BIT DEFAULT 0;

-- Remove automation_enabled (optional, can keep for migration)
-- ALTER TABLE company_settings DROP COLUMN automation_enabled;
```
