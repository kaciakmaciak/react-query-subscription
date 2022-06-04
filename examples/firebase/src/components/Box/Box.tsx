import clsx from 'clsx';

import classes from './Box.module.css';

export interface BoxProps {
  children: React.ReactNode;
  className?: string;
}

export function Box(props: BoxProps) {
  return (
    <div className={clsx(classes.Box, props.className)}>{props.children}</div>
  );
}
