import { useEffect, useState } from 'react';

export default function ReleaseInfo() {
  const [release, setRelease] = useState(null);

  useEffect(() => {
    fetch('/release.json')
      .then(res => res.json())
      .then(setRelease)
      .catch(() => setRelease({ error: 'Release info not found' }));
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Release Information</h1>
      <pre>{JSON.stringify(release, null, 2)}</pre>
    </div>
  );
}