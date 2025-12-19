import { Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  return (
    <div style={styles.container}>
      <Outlet />
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    width: '100%',
  },
};
