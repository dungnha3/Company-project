# =====================================================
# Multi-stage Dockerfile - Optimized for Docker Layer Caching
# Build context: repo root (Render default)
# =====================================================

# Build stage
FROM maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /app

# Copy pom.xml first for dependency caching (Docker will cache this layer)
COPY BE/pom.xml ./

# Download dependencies (cached unless pom.xml changes)
RUN mvn dependency:go-offline -B

# Copy source code
COPY BE/src ./src

# Build the WAR file
RUN mvn package -DskipTests -B

# Runtime stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy the built artifact
COPY --from=builder /app/target/BE-0.0.1-SNAPSHOT.jar app.jar

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8080

# JVM optimizations for tight 512MB RAM containers on Render (Optimized JIT, GC, Metaspace and Stacks)
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=60.0", "-XX:+UseSerialGC", "-XX:TieredStopAtLevel=1", "-XX:MaxMetaspaceSize=100m", "-Xss256k", "-jar", "app.jar"]
