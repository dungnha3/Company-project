import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
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
