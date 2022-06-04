export function About() {
  return (
    <div className="about">
      <h3>Firebase Example</h3>
      <p>
        This basic messaging app demonstrates how to use{' '}
        <code>useSubscription</code> hook together with Firebase and{' '}
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
        chat. The messages will be displayed in the chat for 1 day.
      </p>
      <p>
        Different fingerprints are generated for different browsers on the same
        device. This way, you test the app with multiple users.
      </p>
    </div>
  );
}
