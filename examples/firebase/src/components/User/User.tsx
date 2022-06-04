import { useUserQuery } from '../../hooks/api';

export function User() {
  const { data: user } = useUserQuery();
  if (!user) return null;
  return (
    <div className="contact bar">
      <img
        className="pic"
        src={`https://robohash.org/${user.fingerprint}.png`}
        alt=""
        aria-hidden="true"
      />
      <div className="name">{user.username}</div>
      <div className="name-detail">{user.isRandomName && 'Random Alias'}</div>
    </div>
  );
}
