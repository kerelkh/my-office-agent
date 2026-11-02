import { Fragment, useState, type ReactNode } from 'react';

/** Renderer Markdown kecil tanpa dependensi. Hanya membuat elemen React (tidak ada HTML mentah), jadi aman untuk keluaran agen. */
export type FileResolver = (text: string) => string | null;

const SAFE = /^(https?:|mailto:)/i;
const PATHISH = /([\w:.\\/-]+\.[A-Za-z0-9]{1,5})(?![\w/])/g;

function Link({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>;
}

function inline(src: string, resolve: FileResolver | undefined, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*|__[^_\n]+__)|(~~[^~\n]+~~)|(\*[^*\s][^*\n]*\*)|(\[[^\]\n]+\]\([^)\s]+\))|(https?:\/\/[^\s<>)\]]+)/g;
  let last = 0, i = 0, m: RegExpExecArray | null;
  const plain = (t: string) => {
    if (!t) return;
    if (!resolve) { out.push(t); return; }
    // nama berkas di teks biasa ikut menjadi tautan bila memang ada di folder proyek
    let at = 0, pm: RegExpExecArray | null;
    PATHISH.lastIndex = 0;
    while ((pm = PATHISH.exec(t))) {
      const href = resolve(pm[1]);
      if (!href) continue;
      if (pm.index > at) out.push(t.slice(at, pm.index));
      out.push(<Link key={`${key}p${i++}`} href={href}>{pm[1]}</Link>);
      at = pm.index + pm[1].length;
    }
    out.push(at ? t.slice(at) : t);
  };
  while ((m = re.exec(src))) {
    plain(src.slice(last, m.index));
    const tok = m[0], k = `${key}i${i++}`;
    if (m[1]) {
      const code = tok.slice(1, -1), href = resolve?.(code);
      out.push(href ? <Link key={k} href={href}><code>{code}</code></Link> : <code key={k}>{code}</code>);
    } else if (m[2]) out.push(<strong key={k}>{inline(tok.slice(2, -2), resolve, k)}</strong>);
    else if (m[3]) out.push(<del key={k}>{inline(tok.slice(2, -2), resolve, k)}</del>);
    else if (m[4]) out.push(<em key={k}>{inline(tok.slice(1, -1), resolve, k)}</em>);
    else if (m[5]) {
      const mm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok)!;
      const href = SAFE.test(mm[2]) ? mm[2] : resolve?.(decodeURI(mm[2]));
      out.push(href ? <Link key={k} href={href}>{inline(mm[1], undefined, k)}</Link> : <Fragment key={k}>{mm[1]}</Fragment>);
    } else out.push(<Link key={k} href={tok}>{tok}</Link>);
    last = m.index + tok.length;
  }
  plain(src.slice(last));
  return out;
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* ditolak */ } };
  return (
    <div className="md__codewrap">
      <div className="md__codebar"><span>{lang || 'teks'}</span><button type="button" className="btn btn--small" onClick={copy}>{copied ? 'Tersalin' : 'Salin'}</button></div>
      <pre className="md__code"><code>{code}</code></pre>
    </div>
  );
}

const cells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
const isTableSep = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l) && l.includes('-');

export function Markdown({ text, resolve }: { text: string; resolve?: FileResolver }) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0, n = 0;
  const key = () => `b${n++}`;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const fence = /^\s*(```|~~~)\s*([\w+-]*)/.exec(line);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) body.push(lines[i++]);
      i++;
      blocks.push(<CodeBlock key={key()} code={body.join('\n')} lang={fence[2]} />);
      continue;
    }

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const L = Math.min(6, h[1].length + 1), k = key(), c = inline(h[2], resolve, k);
      blocks.push(L === 2 ? <h2 key={k}>{c}</h2> : L === 3 ? <h3 key={k}>{c}</h3> : L === 4 ? <h4 key={k}>{c}</h4> : L === 5 ? <h5 key={k}>{c}</h5> : <h6 key={k}>{c}</h6>);
      i++; continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { blocks.push(<hr key={key()} />); i++; continue; }

    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = cells(line), rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++]));
      const k = key();
      blocks.push(
        <div className="md__tablewrap" key={k}>
          <table>
            <thead><tr>{head.map((c, x) => <th key={x}>{inline(c, resolve, `${k}h${x}`)}</th>)}</tr></thead>
            <tbody>{rows.map((r, y) => <tr key={y}>{head.map((_, x) => <td key={x}>{inline(r[x] ?? '', resolve, `${k}r${y}${x}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^\s*>/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) body.push(lines[i++].replace(/^\s*>\s?/, ''));
      blocks.push(<blockquote key={key()}><Markdown text={body.join('\n')} resolve={resolve} /></blockquote>);
      continue;
    }

    const li = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (li) {
      const ordered = /\d/.test(li[2]), base = li[1].length;
      const items: { text: string; sub: string[]; task: boolean | null }[] = [];
      while (i < lines.length) {
        const m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(lines[i]);
        if (m && m[1].length <= base) {
          if (m[1].length < base || /\d/.test(m[2]) !== ordered) break;
          const t = /^\[( |x|X)\]\s+(.*)$/.exec(m[3]);
          items.push({ text: t ? t[2] : m[3], sub: [], task: t ? t[1] !== ' ' : null });
          i++;
        } else if (items.length && lines[i].trim() && (m || /^\s{2,}\S/.test(lines[i]))) {
          items[items.length - 1].sub.push(lines[i].slice(Math.min(base + 2, lines[i].length - lines[i].trimStart().length))); i++;
        } else break;
      }
      const k = key();
      const kids = items.map((it, x) => (
        <li key={x}>
          {it.task !== null && <input type="checkbox" checked={it.task} readOnly aria-label={it.task ? 'selesai' : 'belum'} />}
          {inline(it.text, resolve, `${k}${x}`)}
          {it.sub.length > 0 && <Markdown text={it.sub.join('\n')} resolve={resolve} />}
        </li>
      ));
      blocks.push(ordered ? <ol key={k} start={parseInt(li[2], 10) || 1}>{kids}</ol> : <ul key={k}>{kids}</ul>);
      continue;
    }

    // paragraf: kumpulkan baris sampai ketemu pemisah blok
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^\s*(```|~~~|#{1,6}\s|>|([-*+]|\d+[.)])\s)/.test(lines[i]) && !(lines[i].includes('|') && isTableSep(lines[i + 1] ?? ''))) para.push(lines[i++]);
    if (!para.length) { para.push(lines[i++]); }
    const k = key();
    blocks.push(<p key={k}>{para.map((p, x) => <Fragment key={x}>{x > 0 && <br />}{inline(p, resolve, `${k}${x}`)}</Fragment>)}</p>);
  }
  return <div className="md">{blocks}</div>;
}
