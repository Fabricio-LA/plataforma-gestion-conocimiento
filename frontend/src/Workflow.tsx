import { DocumentActions, TagSelector } from './Extras';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, categoryService, documentService, proposalService } from './services/api';
import type { Categoria, Documento, PropuestaCambio, Usuario, VersionDocumento } from './types';

type Failure = (error: unknown) => void;
type Props = { fail: Failure };
type Diff = Awaited<ReturnType<typeof documentService.compararDiff>>;

export function CreateDocument({ fail }: Props) {
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [relatedDocuments, setRelatedDocuments] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryError, setCategoryError] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([categoryService.listarCategorias(), documentService.listar()]).then(([r, documents]) => {
      if (active) { setCategories(r.categorias); setRelatedDocuments(documents.documentos); }
    })
      .catch(e => { if (active) { setCategoryError(true); fail(e); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const titulo = String(data.get('titulo')).trim();
    const contenido = String(data.get('contenido'));
    const etiquetas = [...new Set(String(data.get('etiquetas')).split(',').map(x => x.trim().toLowerCase()).filter(Boolean))];
    etiquetas.push(...data.getAll('etiquetaSeleccionada').map(String).filter(x => !etiquetas.includes(x)));
    const documentosRelacionadosIds = data.getAll('relacionados').map(String);
    if (!titulo || !contenido.trim()) { fail(new Error('Completa el título y el contenido.')); return; }
    setBusy(true);
    try {
      const { documento } = await documentService.crear({ titulo, contenido, categoriaId: String(data.get('categoriaId')) || undefined, etiquetas, documentosRelacionadosIds });
      location.hash = `/documentos/${documento.id}`;
    } catch (e) { fail(e); } finally { setBusy(false); }
  }
  return <section className="status-card"><h1>Crear documento</h1>
    <p>Se creará como borrador con su versión 1.</p>
    {loading && <p role="status">Cargando categorías…</p>}
    {categoryError && <p role="alert">No se pudieron cargar las categorías. Vuelve a esta pantalla para reintentar.</p>}
    <form onSubmit={create}>
      <label>Título<input name="titulo" required maxLength={200} /></label>
      <label>Contenido<textarea name="contenido" required rows={8} /></label>
      <label>Categoría<select name="categoriaId" disabled={loading || categoryError}><option value="">Sin categoría</option>{categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
      <TagSelector fail={fail} />
      <label>Documentos relacionados<select name="relacionados" multiple size={Math.min(5, Math.max(2, relatedDocuments.length))} disabled={loading || relatedDocuments.length === 0}>{relatedDocuments.map(d => <option key={d.id} value={d.id}>{d.titulo}</option>)}</select></label>
      {!loading && relatedDocuments.length === 0 && <p>Aún no hay documentos para relacionar.</p>}
      {!loading && !categoryError && categories.length === 0 && <p>No hay categorías disponibles. Puedes crear el documento sin categoría.</p>}
      <button disabled={busy || loading || categoryError}>{busy ? 'Guardando…' : 'Guardar documento'}</button>
    </form></section>;
}

export function DocumentWorkflow({ initial, user, fail }: Props & { initial: Documento; user: Usuario }) {
  const [doc, setDoc] = useState(initial);
  const [versions, setVersions] = useState<VersionDocumento[]>([]);
  const [proposals, setProposals] = useState<PropuestaCambio[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState('');
  const [draft, setDraft] = useState(initial.contenidoActual);
  const [reason, setReason] = useState('');
  const [base, setBase] = useState<number | null>(null);
  const [v1, setV1] = useState<number | null>(null);
  const [v2, setV2] = useState<number | null>(null);
  const [diff, setDiff] = useState<Diff | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([documentService.obtenerVersiones(doc.id), proposalService.listar({ documentoId: doc.id })]).then(([v, p]) => {
      if (!active) return;
      setVersions(v.versiones); setProposals(p.propuestas);
      setBase(v.versiones[0]?.numeroVersion ?? null);
      setV1(v.versiones[1]?.numeroVersion ?? v.versiones[0]?.numeroVersion ?? null);
      setV2(v.versiones[0]?.numeroVersion ?? null); setLoaded(true);
    }).catch(e => { if (active) fail(e); });
    return () => { active = false; };
  }, [doc.id]);
  async function refresh() {
    setBusy(true);
    try {
      const [d, v, p] = await Promise.all([documentService.obtenerPorId(doc.id), documentService.obtenerVersiones(doc.id), proposalService.listar({ documentoId: doc.id })]);
      setDoc(d.documento); setVersions(v.versiones); setProposals(p.propuestas); setLoaded(true); setDiff(null);
      // El borrador conserva su base original; recargarlo requiere una acción explícita.
      setNotice('Documento e historial actualizados. Tu borrador conserva su texto y versión de origen.');
    } catch (e) { fail(e); } finally { setBusy(false); }
  }
  async function propose(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || !reason.trim() || !base) return;
    setBusy(true); setNotice(''); setConflict('');
    try {
      await proposalService.crear({ documentoId: doc.id, contenidoPropuesto: draft, mensaje: reason, versionBase: base });
      setProposals((await proposalService.listar({ documentoId: doc.id })).propuestas);
      setReason(''); setNotice('Propuesta pendiente enviada. El contenido vigente no se ha modificado.');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setConflict(`${e.message} Actualiza el documento y luego elige «Usar contenido vigente».`);
      else fail(e);
    } finally { setBusy(false); }
  }
  async function compare(event: FormEvent) {
    event.preventDefault();
    if (v1 == null || v2 == null) return;
    setDiffLoading(true); setDiff(null);
    try { setDiff(await documentService.compararDiff(doc.id, v1, v2)); }
    catch (e) { fail(e); } finally { setDiffLoading(false); }
  }
  return <>
    <h1>{doc.titulo}</h1><p>{doc.estado} · {doc.autor?.nombre} · {doc.categoria?.nombre || 'Sin categoría'}</p>
    {!!doc.etiquetas?.length && <p>Etiquetas: {doc.etiquetas.map(e => typeof e === 'string' ? e : e.nombre).join(', ')}</p>}
    {!!doc.relaciones?.length && <p>Relacionados: {doc.relaciones.map((r, i) => <span key={r.id}>{i > 0 && ', '}<a href={`#/documentos/${r.id}`}>{r.titulo}</a></span>)}</p>}
    <DocumentActions doc={doc} user={user} fail={fail} refresh={refresh} versions={versions} /><h2>Contenido vigente</h2><div className="document-content">{doc.contenidoActual}</div>
    <button className="secondary" onClick={() => void refresh()} disabled={busy}>Actualizar documento e historial</button>
    {notice && <p role="status">{notice}</p>}
    {conflict && <p role="alert" className="error">{conflict}</p>}
    <section className="workflow-section"><h2>Historial</h2>
      {!loaded && <p role="status">Cargando historial…</p>}
      {loaded && versions.length === 0 && <p>No hay versiones registradas.</p>}
      <ol className="history">{versions.map(v => <li key={v.id}><details><summary>Versión {v.numeroVersion} · {v.mensajeCambio}</summary>
        <p>{v.autor?.nombre} · {new Date(v.creadoEn).toLocaleString('es-PE')}</p><pre>{v.contenido}</pre></details></li>)}</ol>
      {versions.length >= 2 && <form className="compare-form" onSubmit={compare}>
        <h3>Comparar versiones</h3>
        <label>Versión original<select value={v1 ?? ''} onChange={e => setV1(Number(e.target.value))}>{versions.map(v => <option key={v.id} value={v.numeroVersion}>Versión {v.numeroVersion}</option>)}</select></label>
        <label>Versión comparada<select value={v2 ?? ''} onChange={e => setV2(Number(e.target.value))}>{versions.map(v => <option key={v.id} value={v.numeroVersion}>Versión {v.numeroVersion}</option>)}</select></label>
        <button disabled={diffLoading || v1 == null || v2 == null || v1 === v2}>{diffLoading ? 'Comparando…' : 'Ver diferencias'}</button>
      </form>}
      {diff && <div role="status" className="diff-result"><h3>Versión {diff.versionOriginal} → {diff.versionComparada}</h3><pre>{diff.diferencias.map((part, i) => <span key={i} className={part.agregado ? 'diff-added' : part.eliminado ? 'diff-removed' : undefined}>{part.valor}</span>)}</pre></div>}
    </section>
    <section className="workflow-section"><h2>Propuestas de este documento</h2>
      {loaded && proposals.length === 0 && <p>No hay propuestas.</p>}
      <ul>{proposals.map(p => <li key={p.id}>{p.estado} · Base: {p.versionBase ?? 'desconocida'} · {p.mensaje} · {p.autor?.nombre}{p.revisor && <> · Revisó: {p.revisor.nombre}</>}{p.comentarioRevision && <p>Comentario: {p.comentarioRevision}</p>}</li>)}</ul>
    </section>
    <section className="workflow-section"><h2>Proponer cambio</h2>
      <p>Basado en la versión {base ?? '…'}. La revisión debe aprobarlo antes de cambiar el contenido vigente.</p>
      <form onSubmit={propose}>
        <label>Contenido propuesto<textarea value={draft} onChange={e => setDraft(e.target.value)} required rows={8} /></label>
        <label>Motivo del cambio<textarea value={reason} onChange={e => setReason(e.target.value)} required rows={2} /></label>
        <button disabled={busy || !loaded || base == null}>{busy ? 'Enviando…' : 'Enviar propuesta'}</button>
        <button className="secondary" type="button" disabled={busy || !loaded} onClick={() => { setDraft(doc.contenidoActual); setBase(versions[0]?.numeroVersion ?? null); setConflict(''); setNotice('Borrador reemplazado por el contenido vigente mostrado.'); }}>Usar contenido vigente como nuevo borrador</button>
      </form></section>
  </>;
}

export function ReviewInbox({ fail, user }: Props & { user: Usuario }) {
  const [filter, setFilter] = useState('PENDIENTE');
  const [documentFilter, setDocumentFilter] = useState('');
  const [documents, setDocuments] = useState<Documento[]>([]);
  useEffect(() => { documentService.listar().then(r => setDocuments(r.documentos)).catch(fail); }, []);
  const [items, setItems] = useState<PropuestaCambio[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState('');
  const [selected, setSelected] = useState<PropuestaCambio | null>(null);
  const [current, setCurrent] = useState<Documento | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [reviewedId, setReviewedId] = useState<string | null>(null);
  async function load() { setItems((await proposalService.listar({ estado: filter, documentoId: documentFilter })).propuestas); }
  useEffect(() => {
    let active = true;
    proposalService.listar({ estado: 'PENDIENTE' }).then(p => { if (active) setItems(p.propuestas); })
      .catch(e => { if (active) fail(e); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function reload() {
    setLoading(true); setSelected(null); setCurrent(null); setConflict('');
    try { await load(); } catch (e) { fail(e); } finally { setLoading(false); }
  }
  async function select(p: PropuestaCambio) {
    setBusy(true); setSelected(null); setCurrent(null); setVersion(null); setComment(''); setNotice('');
    try {
      const [d, v] = await Promise.all([documentService.obtenerPorId(p.documentoId), documentService.obtenerVersiones(p.documentoId)]);
      setCurrent(d.documento); setVersion(v.versiones[0]?.numeroVersion ?? null); setSelected(p);
    } catch (e) { fail(e); } finally { setBusy(false); }
  }
  async function decide(action: 'aprobar' | 'rechazar') {
    if (!selected) return;
    setBusy(true); setNotice(''); setConflict('');
    try {
      const result = await proposalService[action](selected.id, comment);
      setReviewedId(selected.documentoId);
      setSelected(null); setCurrent(null); setNotice(result.message);
      await load().catch(fail);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setConflict(`${e.message} Actualiza la bandeja para consultar su estado.`);
        setSelected(null); setCurrent(null); await load().catch(fail);
      } else fail(e);
    } finally { setBusy(false); }
  }
  const stale = selected && (selected.versionBase == null || selected.versionBase !== version);
  return <section className="status-card"><h1>Revisión de propuestas</h1>
    <label>Estado<select value={filter} onChange={e => setFilter(e.target.value)}><option value="">Todos</option>{['PENDIENTE', 'APROBADA', 'RECHAZADA'].map(estado => <option key={estado} value={estado}>{estado}</option>)}</select></label>
    <label>Documento<select value={documentFilter} onChange={e => setDocumentFilter(e.target.value)}><option value="">Todos</option>{documents.map(documento => <option key={documento.id} value={documento.id}>{documento.titulo}</option>)}</select></label>
    <button className="secondary" disabled={busy || loading} onClick={() => void reload()}>Actualizar bandeja</button>
    {loading && <p role="status">Cargando propuestas…</p>}
    {busy && !selected && <p role="status">Cargando comparación o procesando decisión…</p>}
    {!loading && items.length === 0 && <p>No hay propuestas para esta consulta.</p>}
    <ul className="results">{items.map(p => <li key={p.id}><strong>{p.documento?.titulo}</strong><p>{p.autor?.nombre} · {p.mensaje} · Base: {p.versionBase ?? 'desconocida'}</p>
      <button disabled={busy} onClick={() => void select(p)}>Comparar propuesta</button></li>)}</ul>
    {selected && current && <section className="workflow-section"><h2>Comparación: {current.titulo}</h2>
      <p>Motivo: {selected.mensaje}</p><div className="comparison"><div><h3>Vigente · versión {version}</h3><pre>{current.contenidoActual}</pre></div>
        <div><h3>Propuesto · base {selected.versionBase ?? 'desconocida'}</h3><pre>{selected.contenidoPropuesto}</pre></div></div>
      {stale && <p role="alert" className="error">Propuesta desactualizada: no se puede aprobar. Se necesita una nueva sobre la versión vigente.</p>}
      <label>Comentario de revisión<textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} /></label>
      {user.rol !== "ANALISTA" && <div className="actions"><button disabled={busy || !!stale || selected.estado !== "PENDIENTE"} onClick={() => void decide('aprobar')}>{stale ? 'Aprobación bloqueada: base antigua' : busy ? 'Procesando…' : 'Aprobar propuesta'}</button>
        <button className="secondary" disabled={busy || selected.estado !== "PENDIENTE"} onClick={() => void decide('rechazar')}>Rechazar propuesta</button></div>}
      <a href={`#/documentos/${current.id}`}>Abrir documento e historial</a>
    </section>}
    {notice && <p role="status">{notice}</p>}
    {conflict && <p role="alert" className="error">{conflict}</p>}
    {reviewedId && <a href={`#/documentos/${reviewedId}`}>Ver documento e historial tras la revisión</a>}
  </section>;
}
