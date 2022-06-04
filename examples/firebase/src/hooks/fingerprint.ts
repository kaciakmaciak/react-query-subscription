import { useQuery } from 'react-query';

import { fingerprint } from '../fingerprint';

export function useFingerprint() {
  return useQuery('fingerprint', () => fingerprint(), {
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}
