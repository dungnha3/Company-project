export default function IntegrationsSettings({ workspace }) {
    return (
        <div className="space-y-6 max-w-2xl">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 rounded-full flex items-center justify-center">
                    <i className="fa-solid fa-puzzle-piece text-2xl text-indigo-500" />
                </div>
                <h3 className="text-lg font-semibold text-indigo-900 mb-2">Integrations đang được phát triển</h3>
                <p className="text-sm text-indigo-700">
                    Các tính năng Webhook và SSO sẽ sớm được cập nhật.
                    Vui lòng quay lại sau!
                </p>
            </div>
        </div>
    );
}

