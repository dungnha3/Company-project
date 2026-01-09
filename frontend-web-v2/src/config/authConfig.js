// Cấu hình cho Authentication
export const AUTH_CONFIG = {
    // Thay thế bằng Client ID thật của bạn từ Google Cloud Console
    // Làm theo hướng dẫn trong file: google_login_guide.md
    // Client ID được lấy từ .env để bảo mật và dễ quản lý môi trường
    GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID
};
