package DoAn.BE.common.service;

import java.math.BigDecimal;

// Port interface for revenue data.
// Decouples Dashboard from ProjectRepository (cross-module coupling).
// /
public interface RevenueProvider {
    BigDecimal getTotalActiveRevenue();
}
