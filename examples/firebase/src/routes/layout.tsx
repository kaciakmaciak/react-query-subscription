import { Outlet } from 'react-router-dom';

import classes from './layout.module.css';

function Layout() {
  return (
    <div className={classes.Layout}>
      <Outlet />
    </div>
  );
}

export default Layout;
