import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
    // Auth pages (Login, Register) now handle their own full-screen layout
    // This layout just renders the Outlet without any wrapper styling
    // to allow each auth page to have its own unique design
    return <Outlet />;
}
