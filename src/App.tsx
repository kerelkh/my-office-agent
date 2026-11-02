import { useEffect, useRef } from 'react';
import { Scene } from './scene/Scene';
import { labelRoot } from './labelRoot';
import { useStore } from './store';
import { EmployeesPanel } from './ui/Employees';
import { JobsPanel } from './ui/JobsPanel';
import { TAB_IDS, useRoute, type TabId } from './ui/kit';
import { RoomsPanel } from './ui/Rooms';
import { SettingsPanel } from './ui/Settings';
import { SessionView } from './ui/Session';
import { ChatBox, Toast, TopBar, Tools } from './ui/Shell';

const TABS: { id: TabId; label: string; view: () => JSX.Element }[] = [
  { id: 'pekerjaan', label: 'Pekerjaan', view: JobsPanel },
  { id: 'karyawan', label: 'Karyawan', view: EmployeesPanel },
  { id: 'ruangan', label: 'Ruangan', view: RoomsPanel },
  { id: 'jejak', label: 'Jejak', view: SessionView },
  { id: 'pengaturan', label: 'Pengaturan', view: SettingsPanel },
];

export default function App() {
  const init = useStore(s => s.init);
  const loaded = useStore(s => s.loaded);
  const roleCount = useStore(s => s.ws.roles.length);
  const drawerOpen = useStore(s => s.drawerOpen);
  const setDrawer = useStore(s => s.setDrawer);
  const { tab } = useRoute();
  const drawer = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => { init(); }, [init]);
  // alamat berubah (mis. dari toast atau tautan): buka panel dan kembali ke atas
  useEffect(() => {
    const on = () => { useStore.getState().setDrawer(true); body.current?.scrollTo({ top: 0 }); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  // panel yang tertutup tidak boleh bisa difokus
  useEffect(() => { if (drawer.current) drawer.current.toggleAttribute('inert', !drawerOpen); }, [drawerOpen]);

  const View = (TABS.find(t => t.id === tab) ?? TABS[0]).view;
  void TAB_IDS;

  return (
    <div className="app">
      <div className="viewport">
        {loaded ? <Scene /> : <div className="skeleton skeleton--fill" aria-label="Memuat scene" />}
      </div>

      <div className="hud">
        <TopBar />
        <Tools />
        <Toast />
        <ChatBox />
        {loaded && roleCount === 0 && (
          <div className="empty-state pill">
            <h2>Perusahaannya masih kosong</h2>
            <p>Tambahkan karyawan di tab Karyawan, atau mulai dari contoh di Pengaturan.</p>
            <a className="btn btn--primary" href="#karyawan">Buka tab Karyawan</a>
          </div>
        )}

        <aside ref={drawer} className="drawer pill" data-open={drawerOpen} aria-label="Panel kerja">
          <div className="tabs" role="tablist" aria-label="Bagian panel">
            {TABS.map(t => (
              <a key={t.id} role="tab" aria-selected={tab === t.id} className={`tab ${tab === t.id ? 'tab--on' : ''}`} href={`#${t.id}`}>{t.label}</a>
            ))}
            <button type="button" className="btn" aria-label="Tutup panel" onClick={() => setDrawer(false)}>×</button>
          </div>
          <div ref={body} className="side__body" role="tabpanel"><View /></div>
        </aside>
      </div>

      {/* nama dan dialog karakter selalu di depan semua panel */}
      <div ref={el => { labelRoot.current = el; }} className="labels" aria-hidden="true" />
    </div>
  );
}
