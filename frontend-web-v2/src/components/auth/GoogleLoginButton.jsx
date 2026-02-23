import React, { useEffect } from 'react';
import { AUTH_CONFIG } from '../../config/authConfig';
import { useAuthStore } from '../../shared/stores/authStore';
import { useNavigate } from 'react-router-dom';

// Helper function to check if Google Client ID is properly configured
const isGoogleConfigured = () => {
    const clientId = AUTH_CONFIG.GOOGLE_CLIENT_ID;
    return clientId && !clientId.includes("YOUR_GOOGLE_CLIENT_ID");
};

const GoogleLoginButton = ({ text = "Đăng nhập với Google" }) => {
    const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
    const navigate = useNavigate();

    useEffect(() => {
        // Hàm callback khi Google trả về kết quả
        const handleCredentialResponse = async (response) => {
            console.log("Encoded JWT ID token: " + response.credential);
            try {
                const result = await loginWithGoogle(response.credential);

                if (result.success) {
                    // [NEW FLOW] Backend đã tự động tạo Personal Workspace
                    // Chỉ cần redirect đến đúng nơi
                    if (result.user.isSystemAdmin) {
                        navigate('/admin/companies', { replace: true });
                    } else {
                        // User có Personal Workspace + có thể có thêm Company Workspaces
                        // Navigate đến /app (Personal Workspace context mặc định)
                        navigate('/app', { replace: true });
                    }
                } else {
                    alert("Đăng nhập Google thất bại: " + (result.error || "Lỗi không xác định"));
                }
            } catch (error) {
                console.error("Google Login Error:", error);
                alert("Đăng nhập Google thất bại: " + (error.response?.data?.message || error.message));
            }
        };

        // Khởi tạo Google Button nếu script đã load
        if (window.google && window.google.accounts) {
            // Kiểm tra xem Client ID đã được config chưa
            if (!isGoogleConfigured()) {
                console.debug("Chưa cấu hình Google Client ID");
                return;
            }

            window.google.accounts.id.initialize({
                client_id: AUTH_CONFIG.GOOGLE_CLIENT_ID,
                callback: handleCredentialResponse
            });

            window.google.accounts.id.renderButton(
                document.getElementById("googleButtonDiv"),
                { theme: "outline", size: "large", text: "continue_with" }  // removed width: "100%" as it causes error. default is fine or fixed px like "350"
            );
        }
    }, [loginWithGoogle, navigate]);

    if (!isGoogleConfigured()) {
        return (
            <div className="p-3 bg-gray-100 text-gray-500 rounded-lg text-center text-sm border border-dashed border-gray-300">
                <i className="fa-brands fa-google mr-2"></i>
                Cần cấu hình Google Client ID
            </div>
        );
    }

    return (
        <div id="googleButtonDiv" className="w-full h-[40px] flex justify-center">
            {/* Google sẽ render nút vào đây */}
        </div>
    );
};

export default GoogleLoginButton;
