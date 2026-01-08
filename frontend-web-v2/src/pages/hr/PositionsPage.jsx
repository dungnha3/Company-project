export default function PositionsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Chức vụ</h2>
                <button className="btn-primary">
                    <i className="fa-solid fa-plus" />
                    Thêm chức vụ
                </button>
            </div>
            <div className="card">
                <div className="empty-state">
                    <i className="fa-solid fa-briefcase" />
                    <div>Chức năng đang được phát triển</div>
                </div>
            </div>
        </div>
    );
}
