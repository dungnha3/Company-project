export default function MyIssuesPage() {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Công việc của tôi</h2>
            <div className="card">
                <div className="empty-state">
                    <i className="fa-solid fa-list-check" />
                    <div>Chức năng đang được phát triển</div>
                </div>
            </div>
        </div>
    );
}
