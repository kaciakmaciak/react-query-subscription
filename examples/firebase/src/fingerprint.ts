import FingerprintJS from '@fingerprintjs/fingerprintjs';

const fpPromise = FingerprintJS.load({
  monitoring: false,
});

export async function fingerprint(): Promise<string> {
  const fp = await fpPromise;
  return (await fp.get()).visitorId;
}
