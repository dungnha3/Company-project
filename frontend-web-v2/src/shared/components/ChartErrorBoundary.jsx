import { Component } from 'react';

/**
 * Error Boundary for Chart Components
 * 
 * Catches errors in Recharts and displays a fallback UI
 * instead of crashing the entire page.
 * 
 * Usage:
 * <ChartErrorBoundary>
 *   <BarChart data={data}>...</BarChart>
 * </ChartErrorBoundary>
 */
class ChartErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Chart Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl border border-gray-200">
                    <i className="fa-solid fa-chart-simple text-4xl text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">Không thể hiển thị biểu đồ</p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="mt-3 text-indigo-500 hover:text-indigo-600 text-sm font-medium"
                    >
                        Thử lại
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ChartErrorBoundary;
