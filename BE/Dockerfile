# =====================================================
# Multi-stage Dockerfile - Optimized for Fast Builds
# =====================================================

# Stage 1: Build
FROM maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /app

# Copy pom.xml first for dependency caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build
COPY src ./src
RUN mvn package -DskipTests -B -q

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy built artifact
COPY --from=builder /app/target/*.war app.war

# Add a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "app.war"]
