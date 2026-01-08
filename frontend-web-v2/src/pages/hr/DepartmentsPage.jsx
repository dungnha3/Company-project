export default function DepartmentsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Phòng ban</h2>
                <button className="btn-primary">
                    <i className="fa-solid fa-plus" />
                    Thêm phòng ban
                </button>
            </div>
            <div className="card">
                <div className="empty-state">
                    <i className="fa-solid fa-building" />
                    <div>Chức năng đang được phát triển</div>
                </div>
            </div>
        </div>
    );
}
