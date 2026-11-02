import type { ClaudeStatus, Job, JobMode, LogEntry, ServerEvent, Workspace } from './types';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch('/api' + path, init);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((body as { error?: string }).error || `Permintaan gagal (${r.status})`);
  return body as T;
}
const post = <T,>(path: string, body?: unknown) =>
  req<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  getWorkspace: () => req<Workspace | null>('/workspace'),
  saveWorkspace: (w: Workspace) => req<{ ok: boolean }>('/workspace', { method: 'PUT', body: JSON.stringify(w) }),
  skills: () => req<{ skills: string[]; error?: string }>('/skills'),
  config: () => req<{ defaultWorkdir: string }>('/config'),
  jobs: () => req<{ jobs: Job[] }>('/jobs'),
  submitJob: (workspace: Workspace, task: string, mode: JobMode, target: string, projectId: string) =>
    post<{ job: Job }>('/jobs', { workspace, task, mode, target, projectId }),
  job: (id: string) => req<{ job: Job; log: LogEntry[] }>(`/jobs/${id}`),
  sendMessage: (id: string, workspace: Workspace, text: string, mode: JobMode, target: string, opts?: { model?: string; maxCalls?: number }) =>
    post<{ job: Job }>(`/jobs/${id}/message`, { workspace, text, mode, target, opts }),
  deleteJob: (id: string) => post<{ ok: boolean }>('/jobs/delete', { id }),
  /** alamat berkas hasil, dibuka langsung di tab browser */
  fileUrl: (id: string, rel: string) => `/api/jobs/${id}/file/${rel.split('/').map(encodeURIComponent).join('/')}`,
  folder: (path: string) => req<{ path: string; files: { name: string; dir: boolean; size: number }[]; error?: string }>(`/folder?path=${encodeURIComponent(path)}`),
  openFolder: (path: string) => post<{ ok: boolean }>('/folder/open', { path }),
  cancelJob: (id: string) => post<{ ok: boolean }>('/jobs/cancel', { id }),
  claudeStatus: () => req<ClaudeStatus>('/claude/status'),
  claudeLogin: () => post<{ started: boolean; output: string }>('/claude/login'),
  claudeTest: () => post<{ ok: boolean; ms?: number; error?: string }>('/claude/test'),
  events(onEvent: (e: ServerEvent) => void, onState: (open: boolean) => void) {
    const es = new EventSource('/api/events');
    es.onopen = () => onState(true);
    es.onerror = () => onState(false);
    es.onmessage = m => onEvent(JSON.parse(m.data));
    return () => es.close();
  },
};
