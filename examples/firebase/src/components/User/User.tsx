import clsx from 'clsx';

import { useUserQuery } from '../../hooks/api';

import { Avatar } from '../Avatar';

import classes from './User.module.css';

export function User() {
  const { data: user } = useUserQuery();
  if (!user) return null;
  return (
    <div className={clsx(classes.User, classes.Bar)}>
      <Avatar fingerprint={user.fingerprint} className={classes.Picture} />
      <div className={classes.Name}>{user.username}</div>
      <div className={classes.NameDetail}>
        {user.isRandomName && 'Random Alias'}
      </div>
    </div>
  );
}
