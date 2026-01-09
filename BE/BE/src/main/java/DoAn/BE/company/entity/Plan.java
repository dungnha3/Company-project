package DoAn.BE.company.entity;

/**
 * Enum định nghĩa các gói subscription
 * 
 * FREE: 5 users, 3 projects, 1GB - Full features (giới hạn capacity)
 * STARTER: 20 users, unlimited projects, 10GB - Team đang grow
 * PROFESSIONAL: 100 users, 100GB, HR enabled - Doanh nghiệp
 * ENTERPRISE: Unlimited, SSO/API - Enterprise
 */
public enum Plan {
    FREE(5, 3, 1L * 1024 * 1024 * 1024, false, false),
    STARTER(20, -1, 10L * 1024 * 1024 * 1024, false, false),
    PROFESSIONAL(100, -1, 100L * 1024 * 1024 * 1024, true, false),
    ENTERPRISE(-1, -1, -1L, true, true);

    private final int maxUsers; // -1 = unlimited
    private final int maxProjects; // -1 = unlimited
    private final long maxStorageBytes; // -1 = unlimited
    private final boolean hrModuleEnabled;
    private final boolean apiAccessEnabled;

    Plan(int maxUsers, int maxProjects, long maxStorageBytes,
            boolean hrModuleEnabled, boolean apiAccessEnabled) {
        this.maxUsers = maxUsers;
        this.maxProjects = maxProjects;
        this.maxStorageBytes = maxStorageBytes;
        this.hrModuleEnabled = hrModuleEnabled;
        this.apiAccessEnabled = apiAccessEnabled;
    }

    public int getMaxUsers() {
        return maxUsers;
    }

    public int getMaxProjects() {
        return maxProjects;
    }

    public long getMaxStorageBytes() {
        return maxStorageBytes;
    }

    public boolean isHrModuleEnabled() {
        return hrModuleEnabled;
    }

    public boolean isApiAccessEnabled() {
        return apiAccessEnabled;
    }

    public boolean isUnlimitedUsers() {
        return maxUsers == -1;
    }

    public boolean isUnlimitedProjects() {
        return maxProjects == -1;
    }

    public boolean isUnlimitedStorage() {
        return maxStorageBytes == -1;
    }

    // Helper để hiển thị storage friendly
    public String getMaxStorageDisplay() {
        if (maxStorageBytes == -1)
            return "Unlimited";
        long gb = maxStorageBytes / (1024 * 1024 * 1024);
        return gb + " GB";
    }
}
