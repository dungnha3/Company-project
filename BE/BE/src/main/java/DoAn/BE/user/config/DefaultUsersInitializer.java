package DoAn.BE.user.config;

import DoAn.BE.company.entity.Company;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.user.dto.CreateUserRequest;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import DoAn.BE.user.service.UserService;
import DoAn.BE.company.service.RoleTemplateService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

// Cấu hình khởi tạo tài khoản và công ty mặc định khi start app
@Configuration
@Slf4j
public class DefaultUsersInitializer {

        @org.springframework.beans.factory.annotation.Value("${app.default.password:Admin@123}")
        private String defaultPassword;

        @Bean
        @org.springframework.core.annotation.Order(1) // Chạy TRƯỚC DataSeed
        CommandLineRunner initDefaultUsers(UserService userService,
                        UserRepository userRepository,
                        CompanyRepository companyRepository,
                        CompanyMemberRepository companyMemberRepository,
                        PasswordEncoder passwordEncoder,
                        RoleTemplateService roleTemplateService) {
                return args -> {
                        // Kiểm tra nếu đã có users thì skip
                        if (userRepository.count() > 0) {
                                log.info("⏭️  Users already exist, skipping initialization");
                                return;
                        }

                        log.info("🌱 Initializing default users and company...");

                        // 1. Tạo công ty mặc định
                        Company defaultCompany = new Company();
                        defaultCompany.setName("QLNV Demo Company");
                        defaultCompany.setSlug("qlnv-demo");
                        defaultCompany.setIsActive(true);
                        defaultCompany = companyRepository.save(defaultCompany);
                        log.info("✅ Đã tạo công ty mặc định: {}", defaultCompany.getName());

                        // 2. [SAAS] Tạo System Admin (Quản trị viên hệ thống toàn cục)
                        createSystemAdmin(userRepository, passwordEncoder,
                                        "sysadmin", defaultPassword, "sysadmin@system.com");

                        // 3. Tạo các user với CompanyMember (Sử dụng password từ config hoặc mặc định)
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "admin", defaultPassword, "admin@example.com", defaultCompany,
                                        CompanyRole.OWNER);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "hr", defaultPassword, "hr@example.com", defaultCompany,
                                        CompanyRole.MANAGER_HR);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "accounting", defaultPassword, "accounting@example.com", defaultCompany,
                                        CompanyRole.MANAGER_ACCOUNTING);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "pm", defaultPassword, "pm@example.com", defaultCompany,
                                        CompanyRole.MANAGER_PROJECT);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "employee", defaultPassword, "employee@example.com", defaultCompany,
                                        CompanyRole.EMPLOYEE);

                        // ===== 5 ADMIN ACCOUNTS =====
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "admin1", defaultPassword, "admin1@dacn.com", defaultCompany,
                                        CompanyRole.ADMIN);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "admin2", defaultPassword, "admin2@dacn.com", defaultCompany,
                                        CompanyRole.ADMIN);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "admin3", defaultPassword, "admin3@dacn.com", defaultCompany,
                                        CompanyRole.ADMIN);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "admin4", defaultPassword, "admin4@dacn.com", defaultCompany,
                                        CompanyRole.ADMIN);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "admin5", defaultPassword, "admin5@dacn.com", defaultCompany,
                                        CompanyRole.ADMIN);

                        // ===== 5 HR MANAGER ACCOUNTS =====
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "hr_nguyen_van_a", defaultPassword, "nguyen.van.a@dacn.com", defaultCompany,
                                        CompanyRole.MANAGER_HR);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "hr_tran_thi_b", defaultPassword, "tran.thi.b@dacn.com", defaultCompany,
                                        CompanyRole.MANAGER_HR);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "hr_le_van_c", defaultPassword, "le.van.c@dacn.com", defaultCompany,
                                        CompanyRole.MANAGER_HR);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "hr_pham_thi_d", defaultPassword, "pham.thi.d@dacn.com", defaultCompany,
                                        CompanyRole.MANAGER_HR);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "hr_hoang_van_e", defaultPassword, "hoang.van.e@dacn.com", defaultCompany,
                                        CompanyRole.MANAGER_HR);

                        // ===== 5 ACCOUNTING MANAGER ACCOUNTS =====
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "acc_nguyen_thi_f", defaultPassword, "nguyen.thi.f@dacn.com", defaultCompany,
                                        CompanyRole.MANAGER_ACCOUNTING);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "acc_tran_van_g", defaultPassword, "tran.van.g@dacn.com", defaultCompany,
                                        CompanyRole.MANAGER_ACCOUNTING);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "acc_le_thi_h", defaultPassword, "le.thi.h@dacn.com", defaultCompany,
                                        CompanyRole.MANAGER_ACCOUNTING);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "acc_pham_van_i", defaultPassword, "pham.van.i@dacn.com", defaultCompany,
                                        CompanyRole.MANAGER_ACCOUNTING);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "acc_hoang_thi_j", defaultPassword, "hoang.thi.j@dacn.com", defaultCompany,
                                        CompanyRole.MANAGER_ACCOUNTING);

                        // ===== 5 PROJECT MANAGER ACCOUNTS =====
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "pm_nguyen_van_k", defaultPassword, "nguyen.van.k@dacn.com",
                                        defaultCompany, CompanyRole.MANAGER_PROJECT);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "pm_tran_thi_l", defaultPassword, "tran.thi.l@dacn.com", defaultCompany,
                                        CompanyRole.MANAGER_PROJECT);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "pm_le_van_m", defaultPassword, "le.van.m@dacn.com", defaultCompany,
                                        CompanyRole.MANAGER_PROJECT);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "pm_pham_thi_n", defaultPassword, "pham.thi.n@dacn.com", defaultCompany,
                                        CompanyRole.MANAGER_PROJECT);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "pm_hoang_van_o", defaultPassword, "hoang.van.o@dacn.com", defaultCompany,
                                        CompanyRole.MANAGER_PROJECT);

                        // ===== 5 EMPLOYEE ACCOUNTS =====
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "emp_nguyen_thi_p", defaultPassword, "nguyen.thi.p@dacn.com", defaultCompany,
                                        CompanyRole.EMPLOYEE);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "emp_tran_van_q", defaultPassword, "tran.van.q@dacn.com", defaultCompany,
                                        CompanyRole.EMPLOYEE);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "emp_le_thi_r", defaultPassword, "le.thi.r@dacn.com", defaultCompany,
                                        CompanyRole.EMPLOYEE);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "emp_pham_van_s", defaultPassword, "pham.van.s@dacn.com", defaultCompany,
                                        CompanyRole.EMPLOYEE);
                        createUserWithMembership(userService, userRepository, companyMemberRepository, passwordEncoder,
                                        roleTemplateService,
                                        "emp_hoang_thi_t", defaultPassword, "hoang.thi.t@dacn.com", defaultCompany,
                                        CompanyRole.EMPLOYEE);

                        log.info("✅ Đã khởi tạo xong users và company memberships");
                };
        }

        private void createUserWithMembership(UserService userService,
                        UserRepository userRepository,
                        CompanyMemberRepository companyMemberRepository,
                        PasswordEncoder passwordEncoder,
                        RoleTemplateService roleTemplateService,
                        String username,
                        String password,
                        String email,
                        Company company,
                        CompanyRole companyRole) {

                // Tạo user
                if (userRepository.findByUsername(username).isPresent()) {
                        log.info("⏭️  User {} already exists, skipping", username);
                        return;
                }

                CreateUserRequest req = new CreateUserRequest();
                req.setUsername(username);
                req.setPassword(password);
                req.setEmail(email);
                req.setPhoneNumber(null);
                req.setRole(CompanyRole.EMPLOYEE); // Dùng CompanyRole thay vì User.Role

                String avatarUrl = "https://ui-avatars.com/api/?name=" + username.replace(" ", "+")
                                + "&background=random&color=fff&size=128";
                req.setAvatarUrl(avatarUrl);

                User user = userService.createUser(req);

                // Tạo CompanyMember để liên kết user với company
                CompanyMember member = new CompanyMember();
                member.setUser(user);
                member.setCompany(company);
                member.setRole(companyRole);
                member.setPermissions(roleTemplateService.getTemplate(companyRole)); // Set Perms
                member.setIsActive(true);
                member.setJoinedAt(LocalDateTime.now());
                companyMemberRepository.save(member);

                log.info("✅ Đã tạo tài khoản: {} (CompanyRole: {})", username, companyRole);
        }

        // [SAAS] Tạo System Admin account (không thuộc công ty nào)
        private void createSystemAdmin(UserRepository userRepository,
                        PasswordEncoder passwordEncoder,
                        String username,
                        String password,
                        String email) {

                if (userRepository.findByUsername(username).isPresent()) {
                        log.info("⏭️  System Admin {} already exists, skipping", username);
                        return;
                }

                User sysAdmin = User.builder()
                                .username(username)
                                .passwordHash(passwordEncoder.encode(password))
                                .email(email)
                                .isActive(true)
                                .isSystemAdmin(true) // [SAAS] Key flag!
                                .status(User.UserStatus.ACTIVE)
                                .avatarUrl("https://ui-avatars.com/api/?name=System+Admin&background=7c3aed&color=fff&size=128")
                                .build();

                userRepository.save(sysAdmin);
                log.info("✅ Đã tạo System Admin: {} (isSystemAdmin=true)", username);
        }
}
