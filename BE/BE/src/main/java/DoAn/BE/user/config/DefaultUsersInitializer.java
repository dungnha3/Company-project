package DoAn.BE.user.config;

import DoAn.BE.user.dto.CreateUserRequest;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import DoAn.BE.user.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

// Cấu hình khởi tạo tài khoản mặc định khi start app
@Configuration
@Slf4j
public class DefaultUsersInitializer {

        @Bean
        @org.springframework.core.annotation.Order(1) // Chạy TRƯỚC DataSeed
        CommandLineRunner initDefaultUsers(UserService userService,
                        UserRepository userRepository,
                        PasswordEncoder passwordEncoder) {
                return args -> {
                        // Kiểm tra nếu đã có users thì skip
                        if (userRepository.count() > 0) {
                                log.info("⏭️  Users already exist, skipping initialization");
                                return;
                        }

                        log.info("🌱 Initializing default users...");

                        // Tài khoản mặc định gốc
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "admin", "Admin@123", "admin@example.com", User.Role.ADMIN);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "hr", "HrManager@123", "hr@example.com", User.Role.MANAGER_HR);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "accounting", "Accounting@123", "accounting@example.com",
                                        User.Role.MANAGER_ACCOUNTING);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "pm", "ProjectManager@123", "pm@example.com", User.Role.MANAGER_PROJECT);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "employee", "Employee@123", "employee@example.com", User.Role.EMPLOYEE);

                        // ===== 5 ADMIN ACCOUNTS =====
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "admin1", "Admin@123", "admin1@dacn.com", User.Role.ADMIN);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "admin2", "Admin@123", "admin2@dacn.com", User.Role.ADMIN);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "admin3", "Admin@123", "admin3@dacn.com", User.Role.ADMIN);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "admin4", "Admin@123", "admin4@dacn.com", User.Role.ADMIN);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "admin5", "Admin@123", "admin5@dacn.com", User.Role.ADMIN);

                        // ===== 5 HR MANAGER ACCOUNTS =====
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "hr_nguyen_van_a", "HrManager@123", "nguyen.van.a@dacn.com",
                                        User.Role.MANAGER_HR);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "hr_tran_thi_b", "HrManager@123", "tran.thi.b@dacn.com", User.Role.MANAGER_HR);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "hr_le_van_c", "HrManager@123", "le.van.c@dacn.com", User.Role.MANAGER_HR);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "hr_pham_thi_d", "HrManager@123", "pham.thi.d@dacn.com", User.Role.MANAGER_HR);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "hr_hoang_van_e", "HrManager@123", "hoang.van.e@dacn.com",
                                        User.Role.MANAGER_HR);

                        // ===== 5 ACCOUNTING MANAGER ACCOUNTS =====
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "acc_nguyen_thi_f", "Accounting@123", "nguyen.thi.f@dacn.com",
                                        User.Role.MANAGER_ACCOUNTING);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "acc_tran_van_g", "Accounting@123", "tran.van.g@dacn.com",
                                        User.Role.MANAGER_ACCOUNTING);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "acc_le_thi_h", "Accounting@123", "le.thi.h@dacn.com",
                                        User.Role.MANAGER_ACCOUNTING);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "acc_pham_van_i", "Accounting@123", "pham.van.i@dacn.com",
                                        User.Role.MANAGER_ACCOUNTING);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "acc_hoang_thi_j", "Accounting@123", "hoang.thi.j@dacn.com",
                                        User.Role.MANAGER_ACCOUNTING);

                        // ===== 5 PROJECT MANAGER ACCOUNTS =====
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "pm_nguyen_van_k", "ProjectManager@123", "nguyen.van.k@dacn.com",
                                        User.Role.MANAGER_PROJECT);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "pm_tran_thi_l", "ProjectManager@123", "tran.thi.l@dacn.com",
                                        User.Role.MANAGER_PROJECT);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "pm_le_van_m", "ProjectManager@123", "le.van.m@dacn.com",
                                        User.Role.MANAGER_PROJECT);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "pm_pham_thi_n", "ProjectManager@123", "pham.thi.n@dacn.com",
                                        User.Role.MANAGER_PROJECT);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "pm_hoang_van_o", "ProjectManager@123", "hoang.van.o@dacn.com",
                                        User.Role.MANAGER_PROJECT);

                        // ===== 5 EMPLOYEE ACCOUNTS =====
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "emp_nguyen_thi_p", "Employee@123", "nguyen.thi.p@dacn.com",
                                        User.Role.EMPLOYEE);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "emp_tran_van_q", "Employee@123", "tran.van.q@dacn.com", User.Role.EMPLOYEE);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "emp_le_thi_r", "Employee@123", "le.thi.r@dacn.com", User.Role.EMPLOYEE);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "emp_pham_van_s", "Employee@123", "pham.van.s@dacn.com", User.Role.EMPLOYEE);
                        upsertUser(userService, userRepository, passwordEncoder,
                                        "emp_hoang_thi_t", "Employee@123", "hoang.thi.t@dacn.com", User.Role.EMPLOYEE);
                };
        }

        private void upsertUser(UserService userService,
                        UserRepository userRepository,
                        PasswordEncoder passwordEncoder,
                        String username,
                        String password,
                        String email,
                        User.Role role) {
                // Chỉ tạo mới, không update (vì đã check count() ở trên)
                if (userRepository.findByUsername(username).isPresent()) {
                        log.info("⏭️  User {} already exists, skipping", username);
                        return;
                }

                CreateUserRequest req = new CreateUserRequest();
                req.setUsername(username);
                req.setPassword(password);
                req.setEmail(email);
                req.setPhoneNumber(null);
                req.setRole(role);

                // Generate Avatar URL based on username
                String avatarUrl = "https://ui-avatars.com/api/?name=" + username.replace(" ", "+")
                                + "&background=random&color=fff&size=128";
                req.setAvatarUrl(avatarUrl);

                userService.createUser(req);
                log.info("✅ Đã tạo tài khoản mặc định: {} ({})", username, role);
        }
}
