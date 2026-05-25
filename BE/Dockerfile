# =====================================================
# Giai đoạn 1: Build mã nguồn bằng Maven & Java 21
# =====================================================
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /app

# Copy pom.xml và các cấu hình dependencies trước để cache (tối ưu tốc độ build lần sau)
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
COPY mvnw.cmd .
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copy toàn bộ mã nguồn vào container và tiến hành đóng gói file WAR
COPY src ./src
RUN ./mvnw clean package -DskipTests

# =====================================================
# Giai đoạn 2: Chạy ứng dụng bằng JDK Runtime siêu nhẹ
# =====================================================
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy file WAR được build từ giai đoạn 1 sang giai đoạn 2
COPY --from=builder /app/target/*.war app.war

# Khai báo cổng lắng nghe mặc định
EXPOSE 8080

# Lệnh chạy ứng dụng ngầm bên trong container
ENTRYPOINT ["java", "-jar", "app.war"]
