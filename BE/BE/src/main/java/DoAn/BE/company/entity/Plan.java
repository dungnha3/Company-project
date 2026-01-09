package DoAn.BE.company.entity;

// Enum định nghĩa các gói subscription của công ty
public enum Plan {
    FREE(12, 2, 3), // Gói Startup: 12 Users, 2GB, 3 Projects (Aggressive Free)
    PRO(50, 100, 20), // Gói Pro: 50 Users, 100GB, 20 Projects
    ENTERPRISE(Integer.MAX_VALUE, 10240, Integer.MAX_VALUE); // Gói VIP: Unlimited

    private final int maxUsers;
    private final int maxStorageGB;
    private final int maxProjects;

    Plan(int maxUsers, int maxStorageGB, int maxProjects) {
        this.maxUsers = maxUsers;
        this.maxStorageGB = maxStorageGB;
        this.maxProjects = maxProjects;
    }

    public int getMaxUsers() {
        return maxUsers;
    }

    public int getMaxStorageGB() {
        return maxStorageGB;
    }

    public int getMaxProjects() {
        return maxProjects;
    }
}
