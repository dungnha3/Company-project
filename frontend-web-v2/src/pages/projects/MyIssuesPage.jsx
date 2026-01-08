import { useNavigate } from 'react-router-dom';

export default function MyIssuesPage() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-3xl mb-4">
                <i className="fa-solid fa-list-check" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Công việc của tôi</h2>
            <p className="text-gray-500 max-w-md mb-6">Tính năng đang được phát triển. Bạn có thể xem công việc trong từng dự án cụ thể.</p>
            <button onClick={() => navigate('/projects')} className="btn-primary">
                Đến danh sách dự án
            </button>
        </div>
    );
}
