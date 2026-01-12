import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        // You can also log the error to an error reporting service here
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                    <div className="max-w-md w-full text-center space-y-6">
                        {/* Error Illustration */}
                        <div className="relative w-32 h-32 mx-auto">
                            <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-20"></div>
                            <div className="relative bg-white p-6 rounded-full shadow-lg border-2 border-red-50">
                                <i className="fa-solid fa-triangle-exclamation text-4xl text-red-500" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-gray-900">Đã xảy ra lỗi!</h1>
                            <p className="text-gray-500">
                                Rất tiếc, hệ thống gặp sự cố không mong muốn.
                                <br />
                                Vui lòng tải lại trang để tiếp tục.
                            </p>
                        </div>

                        {/* Error Details (Optional, for Dev) */}
                        {import.meta.env.DEV && this.state.error && (
                            <div className="text-left bg-gray-900 rounded-lg p-4 overflow-auto max-h-40 text-xs text-red-200 font-mono">
                                {this.state.error.toString()}
                            </div>
                        )}

                        <button
                            onClick={this.handleReload}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-indigo-200 active:scale-95"
                        >
                            <i className="fa-solid fa-rotate-right mr-2"></i>
                            Tải lại trang
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
