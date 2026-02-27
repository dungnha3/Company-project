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
@Service
@RequiredArgsConstructor
@Slf4j
public class MinioService {

    private final MinioClient minioClient;

    @Value("${minio.bucket-name:dacn-files}")
    private String bucketName;
    private static final int PRESIGNED_URL_EXPIRY_DAYS = 7;
    public String uploadFile(MultipartFile file, String objectName) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File không được để trống");
        }
        if (objectName == null || objectName.isBlank()) {
            throw new BadRequestException("Tên object không được để trống");
        }

        try {
            ensureBucketExists();
            try (InputStream stream = file.getInputStream()) {
                minioClient.putObject(
                        PutObjectArgs.builder()
                                .bucket(bucketName)
                                .object(objectName)
                                .stream(stream, file.getSize(), -1)
                                .contentType(file.getContentType())
                                .build());
            }
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
    public InputStream getFile(String objectName) {
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
    public void deleteFile(String objectName) {
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
    private void ensureBucketExists() throws Exception {
        boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
        if (!found) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
            log.info("📁 Đã tạo bucket MinIO: {}", bucketName);
        }
    }
}
