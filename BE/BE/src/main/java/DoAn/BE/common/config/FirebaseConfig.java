package DoAn.BE.common.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.cloud.FirestoreClient;
import com.google.firebase.database.FirebaseDatabase;
import com.google.cloud.firestore.Firestore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import jakarta.annotation.PostConstruct;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${firebase.credentials.path:serviceAccountKey.json}")
    private String credentialsPath;

    @Value("${firebase.database.url:https://PLACEHOLDER.firebaseio.com}")
    private String databaseUrl;

    @PostConstruct
    public void initialize() {
        if (!FirebaseApp.getApps().isEmpty()) {
            return;
        }

        try {
            InputStream serviceAccount = null;
            if (credentialsPath.startsWith("classpath:")) {
                ClassPathResource resource = new ClassPathResource(credentialsPath.replace("classpath:", ""));
                if (resource.exists()) {
                    serviceAccount = resource.getInputStream();
                }
            } else {
                // Try file system first, then classpath as fallback
                try {
                    serviceAccount = new FileInputStream(credentialsPath);
                } catch (IOException e) {
                    serviceAccount = getClass().getClassLoader().getResourceAsStream(credentialsPath);
                }
            }

            if (serviceAccount == null) {
                logger.warn("⚠️ Firebase serviceAccountKey.json not found at '{}'. Firebase features will be DISABLED.",
                        credentialsPath);
                return;
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .setDatabaseUrl(databaseUrl) // Required for RTDB & Auth
                    .build();

            FirebaseApp.initializeApp(options);
            logger.info("✅ Firebase initialized successfully");

        } catch (IOException e) {
            logger.error("❌ Failed to initialize Firebase: {}", e.getMessage());
        }
    }

    @Bean
    public Firestore firestore() {
        if (FirebaseApp.getApps().isEmpty()) {
            return null; // This will likely cause autowiring issues unless required=false
        }
        return FirestoreClient.getFirestore();
    }

    @Bean
    public FirebaseAuth firebaseAuth() {
        if (FirebaseApp.getApps().isEmpty()) {
            return null;
        }
        return FirebaseAuth.getInstance();
    }

    @Bean
    public FirebaseDatabase firebaseDatabase() {
        if (FirebaseApp.getApps().isEmpty()) {
            return null;
        }
        return FirebaseDatabase.getInstance();
    }
}
