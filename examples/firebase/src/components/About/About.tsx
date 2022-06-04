import classes from './About.module.css';

export function About() {
  return (
    <div className={classes.About}>
      <h3>Firebase Example</h3>
      <p>
        This basic messaging app demonstrates how to use{' '}
        <code>useInfiniteSubscription</code> hook together with Firebase and{' '}
        <a
          href="https://github.com/FirebaseExtended/rxfire"
          target="_blank"
          rel="noreferrer"
        >
          <code>rxfire</code> library
        </a>
        .
      </p>
      <h4>How to use the app</h4>
      <p>
        The messaging app uses
        <a
          href="https://github.com/fingerprintjs/fingerprintjs"
          target="_blank"
          rel="noreferrer"
        >
          <code>fingerprintjs</code> library
        </a>{' '}
        to create an unique user. A random alias name is assigned per
        fingerprint.
      </p>
      <p>
        Once your user has been initialized, you can add new message to the
        chat.
      </p>
      <p>
        Different fingerprints are generated for different browsers on the same
        device. This way, you can test the app with multiple users.
      </p>
    </div>
  );
}
