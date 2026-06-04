import React, { useEffect, useRef, useState } from 'react';
import { AUTH_CONFIG } from '../../config/authConfig';
import { useAuthStore } from '../../shared/stores/authStore';
import { useWorkspaceStore } from '../../shared/stores/workspaceStore';
import { useNavigate } from 'react-router-dom';

// Helper function to check if Google Client ID is properly configured
const isGoogleConfigured = () => {
    const clientId = AUTH_CONFIG.GOOGLE_CLIENT_ID;
    return clientId && !clientId.includes("YOUR_GOOGLE_CLIENT_ID");
};

// Google "G" Logo SVG — official brand colors
const GoogleLogo = () => (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
);

const GoogleLoginButton = ({ text = "Đăng nhập với Google" }) => {
    const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
    const navigate = useNavigate();
    const hiddenGoogleRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Hàm callback khi Google trả về kết quả
        const handleCredentialResponse = async (response) => {
            setIsLoading(true);
            try {
                const result = await loginWithGoogle(response.credential);

                if (result.success) {
                    await useWorkspaceStore.getState().clearWorkspace();
                    await useWorkspaceStore.getState().fetchWorkspaces();
                    if (result.user.isSystemAdmin) {
                        navigate('/admin/companies', { replace: true });
                    } else {
                        navigate('/app', { replace: true });
                    }
                } else {
                    alert("Đăng nhập Google thất bại: " + (result.error || "Lỗi không xác định"));
                }
            } catch (error) {
                console.error("Google Login Error:", error);
                alert("Đăng nhập Google thất bại: " + (error.response?.data?.message || error.message));
            } finally {
                setIsLoading(false);
            }
        };

        const initGoogle = () => {
            if (window.google && window.google.accounts && isGoogleConfigured()) {
                window.google.accounts.id.initialize({
                    client_id: AUTH_CONFIG.GOOGLE_CLIENT_ID,
                    callback: handleCredentialResponse
                });

                // Render nút Google ẩn — dùng để nhận click thật
                if (hiddenGoogleRef.current) {
                    window.google.accounts.id.renderButton(
                        hiddenGoogleRef.current,
                        { theme: "outline", size: "large", width: 400, shape: "rectangular" }
                    );
                }
                return true;
            }
            return false;
        };

        if (initGoogle()) return;

        // Script might be loading asynchronously, poll for it
        const interval = setInterval(() => {
            if (initGoogle()) {
                clearInterval(interval);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [loginWithGoogle, navigate]);

    if (!isGoogleConfigured()) {
        return null; // Hide button when Google OAuth is not configured
    }

    return (
        <div className="relative w-full" style={{ height: '48px' }}>
            {/* Layer 1: Custom beautiful button (visible, non-interactive) */}
            <div
                className="absolute inset-0 flex items-center justify-center gap-3 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-medium transition-all duration-200 hover:border-indigo-300 hover:shadow-md hover:bg-gray-50 pointer-events-none select-none"
                style={{ fontSize: '15px' }}
            >
                {isLoading ? (
                    <div
                        className="animate-spin rounded-full"
                        style={{
                            width: 20,
                            height: 20,
                            border: '2.5px solid #e2e8f0',
                            borderTopColor: '#4285f4'
                        }}
                    />
                ) : (
                    <GoogleLogo />
                )}
                <span>{isLoading ? 'Đang xử lý...' : text}</span>
            </div>

            {/* Layer 2: Real Google button (invisible, on top, receives clicks) */}
            <div
                ref={hiddenGoogleRef}
                className="absolute inset-0 overflow-hidden cursor-pointer"
                style={{ opacity: 0.001 }}
            />
        </div>
    );
};

export default GoogleLoginButton;
