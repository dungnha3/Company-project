package DoAn.BE.storage.service;

import com.google.api.client.auth.oauth2.TokenResponse;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.http.InputStreamContent;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import DoAn.BE.company.entity.CompanySettings;
import DoAn.BE.company.repository.CompanySettingsRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Collections;

@Service
public class GoogleDriveIntegrationService {

    @Value("${app.storage.google.client-id}")
    private String clientId;

    @Value("${app.storage.google.client-secret}")
    private String clientSecret;

    @Value("${app.storage.google.redirect-uri}")
    private String redirectUri;

    private final CompanySettingsRepository companySettingsRepository;

    public GoogleDriveIntegrationService(CompanySettingsRepository companySettingsRepository) {
        this.companySettingsRepository = companySettingsRepository;
    }

    private GoogleAuthorizationCodeFlow getFlow() {
        GoogleClientSecrets.Details web = new GoogleClientSecrets.Details();
        web.setClientId(clientId);
        web.setClientSecret(clientSecret);
        GoogleClientSecrets clientSecrets = new GoogleClientSecrets().setWeb(web);

        return new GoogleAuthorizationCodeFlow.Builder(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance(),
                clientSecrets,
                Collections.singletonList(DriveScopes.DRIVE_FILE))
                .setAccessType("offline")
                .setApprovalPrompt("force") // Ensure we get a refresh token
                .build();
    }

    public String getAuthorizationUrl(Long companyId) {
        // Pass companyId as state so we know which company to save tokens for
        return getFlow().newAuthorizationUrl()
                .setRedirectUri(redirectUri)
                .setState(String.valueOf(companyId))
                .build();
    }

    public void handleCallback(String code, String state) throws IOException {
        Long companyId = Long.parseLong(state);
        TokenResponse response = getFlow().newTokenRequest(code)
                .setRedirectUri(redirectUri)
                .execute();

        CompanySettings settings = companySettingsRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Company settings not found"));

        settings.setGoogleDriveAccessToken(response.getAccessToken());
        if (response.getRefreshToken() != null) {
            settings.setGoogleDriveRefreshToken(response.getRefreshToken());
        }

        // Initialize root folder if not exists
        Drive driveService = getDriveService(settings.getGoogleDriveAccessToken(), settings.getGoogleDriveRefreshToken());
        String folderId = initializeRootFolder(driveService);
        settings.setDriveFolderId(folderId);

        companySettingsRepository.save(settings);
    }

    @SuppressWarnings("deprecation")
    private Drive getDriveService(String accessToken, String refreshToken) {
        GoogleCredential credential = new GoogleCredential.Builder()
                .setTransport(new NetHttpTransport())
                .setJsonFactory(GsonFactory.getDefaultInstance())
                .setClientSecrets(clientId, clientSecret)
                .build()
                .setAccessToken(accessToken)
                .setRefreshToken(refreshToken);

        return new Drive.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance(), credential)
                .setApplicationName("SaaS Enterprise Storage")
                .build();
    }

    private String initializeRootFolder(Drive driveService) throws IOException {
        // Check if folder exists
        FileList result = driveService.files().list()
                .setQ("mimeType='application/vnd.google-apps.folder' and name='SaaS_Storage' and trashed=false")
                .setSpaces("drive")
                .setFields("files(id, name)")
                .execute();

        if (!result.getFiles().isEmpty()) {
            return result.getFiles().get(0).getId();
        }

        // Create folder
        File fileMetadata = new File();
        fileMetadata.setName("SaaS_Storage");
        fileMetadata.setMimeType("application/vnd.google-apps.folder");

        File file = driveService.files().create(fileMetadata)
                .setFields("id")
                .execute();

        return file.getId();
    }

    public String uploadFile(Long companyId, MultipartFile multipartFile) throws IOException {
        CompanySettings settings = companySettingsRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Company settings not found"));

        if (settings.getGoogleDriveAccessToken() == null) {
            throw new RuntimeException("Google Drive is not connected for this company.");
        }

        Drive driveService = getDriveService(settings.getGoogleDriveAccessToken(), settings.getGoogleDriveRefreshToken());

        File fileMetadata = new File();
        fileMetadata.setName(multipartFile.getOriginalFilename());
        fileMetadata.setParents(Collections.singletonList(settings.getDriveFolderId()));

        InputStreamContent mediaContent = new InputStreamContent(
                multipartFile.getContentType(),
                multipartFile.getInputStream());

        File file = driveService.files().create(fileMetadata, mediaContent)
                .setFields("id")
                .execute();

        return file.getId();
    }

    public byte[] downloadFile(Long companyId, String googleDriveFileId) throws IOException {
        CompanySettings settings = companySettingsRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Company settings not found"));

        if (settings.getGoogleDriveAccessToken() == null) {
            throw new RuntimeException("Google Drive is not connected for this company.");
        }

        Drive driveService = getDriveService(settings.getGoogleDriveAccessToken(), settings.getGoogleDriveRefreshToken());

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        driveService.files().get(googleDriveFileId).executeMediaAndDownloadTo(outputStream);
        return outputStream.toByteArray();
    }

    public void deleteFile(Long companyId, String googleDriveFileId) throws IOException {
        CompanySettings settings = companySettingsRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Company settings not found"));

        if (settings.getGoogleDriveAccessToken() == null) {
            throw new RuntimeException("Google Drive is not connected for this company.");
        }

        Drive driveService = getDriveService(settings.getGoogleDriveAccessToken(), settings.getGoogleDriveRefreshToken());
        driveService.files().delete(googleDriveFileId).execute();
    }

    public void disconnect(Long companyId) {
        CompanySettings settings = companySettingsRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Company settings not found"));
        settings.setGoogleDriveAccessToken(null);
        settings.setGoogleDriveRefreshToken(null);
        settings.setDriveFolderId(null);
        companySettingsRepository.save(settings);
    }
}
