export default function Loading() {
  return (
    <div className="container-rb py-6 sm:py-10">
      <div className="skeleton" style={{ height: 32, width: 200 }} />
      <div className="skeleton mt-2" style={{ height: 44, width: 320 }} />
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i} className="card" style={{ padding: 'var(--s-4)' }}>
            <div className="skeleton" style={{ height: 22, width: '70%' }} />
            <div className="skeleton mt-2" style={{ height: 14, width: '40%' }} />
            <div className="skeleton mt-3" style={{ height: 14, width: '90%' }} />
          </li>
        ))}
      </ul>
    </div>
  );
}
