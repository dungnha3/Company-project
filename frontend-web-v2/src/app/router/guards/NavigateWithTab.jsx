import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function NavigateWithTab({ to, tab }) {
    const navigate = useNavigate();
    const params = useParams();

    useEffect(() => {
        let targetPath;
        if (to === '..') {
            targetPath = `/app/projects/${params.projectId}?tab=${tab}`;
        } else {
            // Replace :param placeholders with actual values from useParams
            targetPath = to.replace(/:(\w+)/g, (_, key) => params[key] ?? `:${key}`);
            targetPath = `${targetPath}?tab=${tab}`;
        }
        navigate(targetPath, { replace: true });
    }, [navigate, params, to, tab]);

    return null;
}
