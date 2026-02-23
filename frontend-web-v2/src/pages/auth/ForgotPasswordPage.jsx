import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể gửi email khôi phục. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Hero */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white blur-3xl" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white blur-3xl" />
                </div>
                <div className="relative z-10 flex flex-col justify-center p-12 text-white">
                    <div className="mb-8">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                            <i className="fa-solid fa-lock-open text-3xl" />
                        </div>
                        <h1 className="text-4xl font-bold mb-4">Khôi phục mật khẩu</h1>
                        <p className="text-lg text-white/80">
                            Nhập email đã đăng ký để nhận link đặt lại mật khẩu
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-md">
                    <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-gray-100">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <i className="fa-solid fa-key text-2xl text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">Quên mật khẩu?</h2>
                            <p className="text-gray-500 mt-2">
                                {success ? 'Kiểm tra email của bạn' : 'Nhập email để khôi phục tài khoản'}
                            </p>
                        </div>

                        {success ? (
                            <div className="text-center">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <i className="fa-solid fa-envelope-circle-check text-4xl text-green-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Email đã được gửi!</h3>
                                <p className="text-gray-600 mb-6">
                                    Vui lòng kiểm tra hộp thư của bạn và nhấp vào link để đặt lại mật khẩu.
                                </p>
                                <Link to="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
                                    <i className="fa-solid fa-arrow-left mr-2" />
                                    Quay lại đăng nhập
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                                        <i className="fa-solid fa-circle-exclamation" />
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email đăng ký
                                    </label>
                                    <div className="relative">
                                        <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                                            placeholder="email@example.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <i className="fa-solid fa-spinner fa-spin" />
                                            Đang gửi...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-paper-plane" />
                                            Gửi link khôi phục
                                        </>
                                    )}
                                </button>

                                <div className="text-center">
                                    <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-500">
                                        <i className="fa-solid fa-arrow-left mr-1" />
                                        Quay lại đăng nhập
                                    </Link>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
