import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@shared/stores/authStore';
import { useCompanyStore } from '@shared/stores/companyStore';

export default function LoginPage() {
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuthStore();
    const { setCompanies, companies } = useCompanyStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(form);

            if (result.success) {
                // Set companies from login response
                const memberships = result.user?.companyMemberships || [];
                setCompanies(memberships);

                // Navigate based on company count
                if (memberships.length === 0) {
                    // No companies - show error
                    setError('Bạn chưa được mời vào công ty nào');
                } else if (memberships.length === 1) {
                    // Single company - go directly to dashboard
                    navigate(location.state?.from?.pathname || '/', { replace: true });
                } else {
                    // Multiple companies - go to selection
                    navigate('/select-company', { replace: true });
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
            <p className="text-center text-sm text-gray-500 mt-6">
                Quên mật khẩu?{' '}
                <a href="#" className="text-primary hover:underline">Đặt lại</a>
            </p>
        </div>
    );
}
