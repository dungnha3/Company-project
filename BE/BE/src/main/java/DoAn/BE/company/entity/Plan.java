package DoAn.BE.company.entity;

/**
 * Enum định nghĩa các gói subscription
 * 
 * FREE: 5 users, 3 projects, 1GB - Test thử miễn phí
 * STARTER: 20 users, 20 projects, 10GB - Team nhỏ (99,000 VND/tháng)
 * PROFESSIONAL: 100 users, 100 projects, 100GB, HR enabled - Doanh nghiệp
 * (199,000 VND/tháng)
 * ENTERPRISE: Unlimited, SSO/API - Enterprise (Liên hệ báo giá)
 */
public enum Plan {
    FREE(5, 3, 1L * 1024 * 1024 * 1024, 10 * 1024 * 1024L,
            false, false, false, false, 0, "Miễn phí"),

    STARTER(20, 20, 10L * 1024 * 1024 * 1024, 50 * 1024 * 1024L,
            false, true, false, false, 99_000, "99,000 VND/tháng"),

    PROFESSIONAL(100, 100, 100L * 1024 * 1024 * 1024, 100 * 1024 * 1024L,
            true, true, true, false, 199_000, "199,000 VND/tháng"),

    ENTERPRISE(-1, -1, -1L, 500 * 1024 * 1024L,
            true, true, true, true, -1, "Liên hệ báo giá");

    private final int maxUsers; // -1 = unlimited
    private final int maxProjects; // -1 = unlimited
    private final long maxStorageBytes; // -1 = unlimited
    private final long maxFileUploadBytes; // Max single file size
    private final boolean hrModuleEnabled;
    private final boolean aiModuleEnabled;
    private final boolean webhookEnabled;
    private final boolean apiAccessEnabled;
    private final int priceVnd; // -1 = contact sales
    private final String priceDisplay;

    Plan(int maxUsers, int maxProjects, long maxStorageBytes, long maxFileUploadBytes,
            boolean hrModuleEnabled, boolean aiModuleEnabled, boolean webhookEnabled,
            boolean apiAccessEnabled, int priceVnd, String priceDisplay) {
        this.maxUsers = maxUsers;
        this.maxProjects = maxProjects;
        this.maxStorageBytes = maxStorageBytes;
        this.maxFileUploadBytes = maxFileUploadBytes;
        this.hrModuleEnabled = hrModuleEnabled;
        this.aiModuleEnabled = aiModuleEnabled;
        this.webhookEnabled = webhookEnabled;
        this.apiAccessEnabled = apiAccessEnabled;
        this.priceVnd = priceVnd;
        this.priceDisplay = priceDisplay;
    }

    // Getters
    public int getMaxUsers() {
        return maxUsers;
    }

    public int getMaxProjects() {
        return maxProjects;
    }

    public long getMaxStorageBytes() {
        return maxStorageBytes;
    }

    public long getMaxFileUploadBytes() {
        return maxFileUploadBytes;
    }

    public boolean isHrModuleEnabled() {
        return hrModuleEnabled;
    }

    public boolean isAiModuleEnabled() {
        return aiModuleEnabled;
    }

    public boolean isWebhookEnabled() {
        return webhookEnabled;
    }

    public boolean isApiAccessEnabled() {
        return apiAccessEnabled;
    }

    public int getPriceVnd() {
        return priceVnd;
    }

    public String getPriceDisplay() {
        return priceDisplay;
    }

    // Unlimited checks
    public boolean isUnlimitedUsers() {
        return maxUsers == -1;
    }

    public boolean isUnlimitedProjects() {
        return maxProjects == -1;
    }

    public boolean isUnlimitedStorage() {
        return maxStorageBytes == -1;
    }

    public boolean isContactSales() {
        return priceVnd == -1;
    }

    // Display helpers
    public String getMaxStorageDisplay() {
        if (maxStorageBytes == -1)
            return "Không giới hạn";
        long gb = maxStorageBytes / (1024 * 1024 * 1024);
        return gb + " GB";
    }

    public String getMaxFileUploadDisplay() {
        long mb = maxFileUploadBytes / (1024 * 1024);
        return mb + " MB";
    }

    public String getMaxUsersDisplay() {
        if (maxUsers == -1)
            return "Không giới hạn";
        return String.valueOf(maxUsers);
    }

    public String getMaxProjectsDisplay() {
        if (maxProjects == -1)
            return "Không giới hạn";
        return String.valueOf(maxProjects);
    }

    // Plan comparison (for upgrade/downgrade checks)
    public int getTier() {
        return switch (this) {
            case FREE -> 0;
            case STARTER -> 1;
            case PROFESSIONAL -> 2;
            case ENTERPRISE -> 3;
        };
    }

    public boolean isHigherThan(Plan other) {
        return this.getTier() > other.getTier();
    }

    public boolean isLowerThan(Plan other) {
        return this.getTier() < other.getTier();
    }
}
