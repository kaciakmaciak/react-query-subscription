import clsx from 'clsx';

import classes from './Avatar.module.css';

export interface AvatarProps {
  fingerprint: string;
  className?: string;
}

export function Avatar(props: AvatarProps) {
  return (
    <img
      className={clsx(classes.Picture, props.className)}
      src={`https://robohash.org/${props.fingerprint}.png`}
      alt=""
    />
  );
}
