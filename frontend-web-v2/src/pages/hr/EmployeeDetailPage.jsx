import { useParams, useNavigate } from 'react-router-dom';

export default function EmployeeDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <button onClick={() => navigate(-1)} className="btn-ghost">
                <i className="fa-solid fa-arrow-left" />
                Quay lại
            </button>
            <div className="card">
                <div className="empty-state">
                    <i className="fa-solid fa-user" />
                    <div>Chi tiết nhân viên #{id}</div>
                </div>
            </div>
        </div>
    );
}
