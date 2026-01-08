export default function EmployeesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Danh sách nhân viên</h2>
                <button className="btn-primary">
                    <i className="fa-solid fa-plus" />
                    Thêm nhân viên
                </button>
            </div>
            <div className="card">
                <div className="empty-state">
                    <i className="fa-solid fa-users" />
                    <div>Chức năng đang được phát triển</div>
                </div>
            </div>
        </div>
    );
}
