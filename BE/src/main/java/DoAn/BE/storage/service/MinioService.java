package DoAn.BE.storage.service;

import DoAn.BE.common.exception.BadRequestException;
import io.minio.*;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.concurrent.TimeUnit;

// [Service xử lý lưu trữ MinIO] (Role: System)
@Service
@RequiredArgsConstructor
@Slf4j
public class MinioService {

    private final MinioClient minioClient;

    @Value("${minio.bucket-name:dacn-files}")
    private String bucketName;

    // [Thời hạn presigned URL (ngày)] (Role: Config)
    private static final int PRESIGNED_URL_EXPIRY_DAYS = 7;

    // [Upload file lên MinIO] (Role: Internal)
    public String uploadFile(MultipartFile file, String objectName) {
        // [Validate input] (Role: Guard)
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File không được để trống");
        }
        if (objectName == null || objectName.isBlank()) {
            throw new BadRequestException("Tên object không được để trống");
        }

        try {
            // [Kiểm tra và tạo bucket nếu chưa tồn tại] (Role: Initialization)
            ensureBucketExists();

            // [Upload file] (Role: Upload)
            try (InputStream stream = file.getInputStream()) {
                minioClient.putObject(
                        PutObjectArgs.builder()
                                .bucket(bucketName)
                                .object(objectName)
                                .stream(stream, file.getSize(), -1)
                                .contentType(file.getContentType())
                                .build());
            }

            // [Tạo presigned URL để download] (Role: URL Generation)
            String presignedUrl = minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucketName)
                            .object(objectName)
                            .expiry(PRESIGNED_URL_EXPIRY_DAYS, TimeUnit.DAYS)
                            .build());

            log.info("✅ Đã upload file lên MinIO: {}", objectName);
            return presignedUrl;

        } catch (Exception e) {
            log.error("❌ Lỗi upload lên MinIO: {}", e.getMessage());
            throw new RuntimeException("Không thể upload file lên MinIO", e);
        }
    }

    // [Lấy file từ MinIO] (Role: Internal)
    public InputStream getFile(String objectName) {
        // [Validate input] (Role: Guard)
        if (objectName == null || objectName.isBlank()) {
            throw new BadRequestException("Tên object không được để trống");
        }

        try {
            return minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .build());
        } catch (Exception e) {
            log.error("❌ Lỗi lấy file từ MinIO: {}", e.getMessage());
            throw new RuntimeException("Không thể download file từ MinIO", e);
        }
    }

    // [Xóa file từ MinIO] (Role: Internal)
    public void deleteFile(String objectName) {
        // [Validate input] (Role: Guard)
        if (objectName == null || objectName.isBlank()) {
            log.warn("Tên object trống, bỏ qua xóa");
            return;
        }

        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .build());
            log.info("🗑️ Đã xóa file từ MinIO: {}", objectName);
        } catch (Exception e) {
            log.error("❌ Lỗi xóa file từ MinIO: {}", e.getMessage());
        }
    }

    // [Kiểm tra và tạo bucket] (Role: Internal)
    private void ensureBucketExists() throws Exception {
        boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
        if (!found) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
            log.info("📁 Đã tạo bucket MinIO: {}", bucketName);
        }
    }
}
