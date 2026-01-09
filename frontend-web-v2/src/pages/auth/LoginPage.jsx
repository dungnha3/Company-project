import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@shared/stores/authStore';
import GoogleLoginButton from '../../components/auth/GoogleLoginButton';

export default function LoginPage() {
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuthStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(form);

            if (result.success) {
                // [NEW FLOW] Backend đã tự động tạo Personal Workspace cho user
                // Chỉ cần redirect đến đúng nơi
                if (result.user.isSystemAdmin) {
                    navigate('/admin/companies', { replace: true });
                } else {
                    // User có Personal Workspace (tự động tạo bởi Backend)
                    // Navigate đến /app (Personal Workspace context mặc định)
                    navigate('/app', { replace: true });
                }
            } else {
                setError(result.error || 'Đăng nhập thất bại');
            }
        } catch (err) {
            setError('Đã có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card-glass w-full max-w-md p-8">
            {/* Logo */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto bg-primary rounded-2xl flex items-center justify-center mb-4">
                    <i className="fa-solid fa-building text-white text-2xl" />
                </div>
                <h1 className="text-2xl font-bold text-gray-800">Company Portal</h1>
                <p className="text-gray-500 mt-1">Đăng nhập để tiếp tục</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                        <i className="fa-solid fa-circle-exclamation mr-2" />
                        {error}
                    </div>
                )}

                <div>
                    <label className="label">Tên đăng nhập</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="Nhập tên đăng nhập"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        required
                    />
                </div>

                <div>
                    <label className="label">Mật khẩu</label>
                    <input
                        type="password"
                        className="input"
                        placeholder="Nhập mật khẩu"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full py-3"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Đang đăng nhập...
                        </>
                    ) : (
                        <>
                            <i className="fa-solid fa-right-to-bracket" />
                            Đăng nhập
                        </>
                    )}
                </button>
            </form>

            {/* Footer */}
            <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Hoặc tiếp tục với</span>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3">
                    <GoogleLoginButton text="Đăng nhập bằng Google" />
                </div>
            </div>

            <div className="text-center mt-4">
                <span className="text-sm text-gray-600">Chưa có tài khoản? </span>
                <Link to="/register" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                    Đăng ký ngay
                </Link>
            </div>
            <p className="text-sm text-gray-500">
                Quên mật khẩu?{' '}
                <Link to="/forgot-password" className="text-primary hover:underline">
                    Đặt lại
                </Link>
            </p>
        </div>
    );
}
