export default function ProjectsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Dự án</h2>
                <button className="btn-primary">
                    <i className="fa-solid fa-plus" />
                    Tạo dự án
                </button>
            </div>
            <div className="card">
                <div className="empty-state">
                    <i className="fa-solid fa-folder-open" />
                    <div>Chức năng đang được phát triển</div>
                </div>
            </div>
        </div>
    );
}
