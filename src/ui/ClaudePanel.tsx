import { useStore } from '../store';

export function ClaudePanel() {
  const { claude, claudeLoading, claudeNote, refreshClaude, loginClaude, testClaude, serverUp, loadError, skills, skillsLoading, skillsError, loadSkills } = useStore();

  return (
    <div className="stack">
      <p className="lead-s">Agen bekerja lewat Claude Code di komputer ini, memakai login subscription Anda. Tidak perlu API key.</p>

      {loadError && <p className="banner banner--bad" role="alert">{loadError}</p>}

      <section className="result" aria-label="Status koneksi">
        <div className="result__head">
          <h3>Status</h3>
          <button type="button" className="btn btn--small" onClick={refreshClaude} disabled={claudeLoading}>Periksa status</button>
        </div>

        {claudeLoading && !claude ? (
          <div className="skeleton"><i /><i /></div>
        ) : !claude ? (
          <p className="empty">Belum diperiksa.</p>
        ) : !claude.installed ? (
          <>
            <p><b>Claude Code belum terpasang.</b></p>
            <p className="hint">Pasang dulu, lalu tekan "Periksa status". Panduan resmi ada di dokumentasi Claude Code.</p>
            {claude.error && <p className="measured hint">{claude.error}</p>}
          </>
        ) : !claude.loggedIn ? (
          <>
            <p><b>Belum login.</b> Login dengan akun Claude Pro atau Max Anda.</p>
            <div className="row"><button type="button" className="btn btn--primary" onClick={loginClaude}>Login dengan Claude</button></div>
          </>
        ) : (
          <dl className="facts">
            <div><dt>Akun</dt><dd className="measured">{claude.email ?? 'tidak diketahui'}</dd></div>
            <div><dt>Paket</dt><dd className="measured">{claude.plan ?? 'tidak diketahui'}</dd></div>
            <div><dt>Metode</dt><dd className="measured">{claude.method ?? 'tidak diketahui'}</dd></div>
            <div><dt>Versi</dt><dd className="measured">{claude.version}</dd></div>
          </dl>
        )}
      </section>

      {claude?.installed && claude.loggedIn && (
        <div className="row"><button type="button" className="btn" onClick={testClaude}>Tes koneksi</button></div>
      )}
      {claudeNote && <p className="note" role="status">{claudeNote}</p>}

      <section className="result" aria-label="Skill terdaftar">
        <div className="result__head">
          <h3>Skill terdaftar</h3>
          <button type="button" className="btn btn--small" onClick={loadSkills} disabled={skillsLoading}>Muat ulang</button>
        </div>
        {skillsLoading ? <div className="skeleton"><i /><i /></div>
          : !skills.length ? <p className="empty">{skillsError ?? 'Belum ada skill terbaca.'}</p>
          : (
            <details>
              <summary><span className="measured">{skills.length}</span> skill bisa dipakai agen. Atur per role di tab Role.</summary>
              <ul className="skillpick__list skillpick__list--plain">
                {skills.map(s => <li key={s} className="measured">{s}</li>)}
              </ul>
            </details>
          )}
      </section>

      <p className="hint">Server {serverUp ? 'terhubung' : 'tidak terhubung'}. Halaman ini hanya menerima koneksi dari komputer Anda sendiri. Jangan dibuka ke jaringan atau dibagikan, karena setiap tugas memakai kuota akun Anda.</p>
    </div>
  );
}
