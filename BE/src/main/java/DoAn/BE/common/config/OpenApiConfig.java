package DoAn.BE.common.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

// OpenAPI/Swagger Configuration
//
// Access documentation at:
// - Swagger UI: http://localhost:8080/swagger-ui.html
// - OpenAPI JSON: http://localhost:8080/v3/api-docs
// /
@Configuration
public class OpenApiConfig {

    @Value("${spring.application.name:Gemini ERP}")
    private String applicationName;

    @Bean
    public OpenAPI customOpenAPI() {
        final String securitySchemeName = "bearerAuth";

        return new OpenAPI()
                .info(new Info()
                        .title("Gemini ERP API")
                        .version("2.0.0")
                        .description("""
                                ## Multi-tenant SaaS Platform API

                                Enterprise HR & Project Management System with Dual Workspace Architecture.

                                ### Features:
                                - **HR Management**: Employees, Attendance, Leave, Salary, Contracts
                                - **Project Management**: Kanban, Sprints, Issues, Analytics
                                - **Communication**: Real-time Chat, Video Calls (WebRTC)
                                - **AI Assistant**: Powered by Google Gemini

                                ### Authentication:
                                All endpoints (except `/api/auth/*` and `/api/public/*`) require JWT Bearer token.

                                ### Multi-tenancy:
                                Include `X-Company-ID` header for company-specific endpoints.
                                """)
                        .contact(new Contact()
                                .name("Gemini ERP Team")
                                .email("support@gemini-erp.com"))
                        .license(new License()
                                .name("Proprietary")
                                .url("https://gemini-erp.com/license")))
                .servers(List.of(
                        new Server()
                                .url("http://localhost:8080")
                                .description("Development Server"),
                        new Server()
                                .url("https://api.gemini-erp.com")
                                .description("Production Server")))
                .addSecurityItem(new SecurityRequirement()
                        .addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName,
                                new SecurityScheme()
                                        .name(securitySchemeName)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Enter JWT token obtained from /api/auth/login")));
    }
}
