import { Link, useMatch } from 'react-router-dom';
import {
  ViewListIcon,
  QuestionMarkCircleIcon,
  ArrowNarrowLeftIcon,
} from '@heroicons/react/outline';

import classes from './NavBar.module.css';

function BackToChatLink() {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link to={-1 as any} className={classes.NavBarItem}>
      <ArrowNarrowLeftIcon />
    </Link>
  );
}

export function NavBar() {
  const chatMatch = useMatch('chat/:chatId');
  const aboutMatch = useMatch('about');
  return (
    <nav className={classes.NavBar}>
      {Boolean(chatMatch) && (
        <Link to="/" className={classes.NavBarItem}>
          <ViewListIcon />
        </Link>
      )}
      <Link to="about" className={classes.NavBarItem}>
        <QuestionMarkCircleIcon />
      </Link>
      {Boolean(aboutMatch) && <BackToChatLink />}
    </nav>
  );
}
