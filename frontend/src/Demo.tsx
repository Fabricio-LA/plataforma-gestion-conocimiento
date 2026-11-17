import { Health, Catalogs, Registration } from './Extras';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, authService, categoryService, documentService } from './services/api';
import type { Categoria, Documento, EstadoDocumento, Usuario } from './types';
import { CreateDocument, DocumentWorkflow, ReviewInbox } from './Workflow';

export default function Demo() {
  const [user, setUser] = useState<Usuario | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<EstadoDocumento | ''>('');
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [docs, setDocs] = useState<Documento[] | null>(null);
  const [doc, setDoc] = useState<Documento | null>(null);
  const [route, setRoute] = useState(location.hash);
  const generation = useRef(0);
  function logout() {
    generation.current++;
    localStorage.removeItem('token');
    setUser(null); setDoc(null); setDocs(null); setQuery(''); setCategoryId(''); setStatus(''); setError(''); setBusy(false);
    location.hash = '/login';
  }
  function failure(e: unknown) {
    if (e instanceof ApiError && e.status === 401) {
      logout(); setError('Tu sesión ha caducado. Inicia sesión de nuevo.');
    } else setError(e instanceof Error ? e.message : 'No se pudo contactar con el servidor');
  }
  useEffect(() => {
    const changed = () => setRoute(location.hash);
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    setCategoriesLoading(true);
    categoryService.listarCategorias().then(r => { if (active) setCategories(r.categorias); })
      .catch(e => { if (active) failure(e); }).finally(() => { if (active) setCategoriesLoading(false); });
    return () => { active = false; };
  }, [user?.id, route]);
  useEffect(() => {
    let active = true;
    if (!localStorage.getItem('token')) { setReady(true); return; }
    authService.getMe().then(({ usuario }) => { if (active) setUser(usuario); })
      .catch(e => { if (active) failure(e); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    setDoc(null); setError('');
    const id = route.startsWith('#/documentos/') ? route.slice(13) : '';
    if (!user || !id) return;
    let active = true;
    setBusy(true);
    documentService.obtenerPorId(encodeURIComponent(id)).then(({ documento }) => {
      if (active) setDoc(documento);
    }).catch(e => { if (active) failure(e); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [route, user]);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    try {
      const result = await authService.login({ email: String(data.get('email')), password: String(data.get('password')) });
      localStorage.setItem('token', result.token); setUser(result.usuario);
      if (!location.hash.startsWith('#/documentos/')) location.hash = '/buscar';
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo contactar con el servidor'); }
    finally { setBusy(false); }
  }
  async function search(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setDocs(null);
    const current = generation.current;
    try {
      const result = await documentService.listar({ busqueda: query.trim(), categoriaId: categoryId, estado: status });
      if (current === generation.current) setDocs(result.documentos);
    } catch (e) { if (current === generation.current) failure(e); }
    finally { if (current === generation.current) setBusy(false); }
  }
  const detail = route.startsWith('#/documentos/');
  return <div className="app demo">
    <header className="header"><a className="brand" href="#/buscar"><span className="brand-icon">c.</span> conocimiento/</a>
      {user && <div className="session"><span>{user.nombre} · {user.rol}</span><button onClick={logout}>Cerrar sesión</button></div>}</header>
    <main className="demo-main"><Health />
      {user && <nav className="workflow-nav"><a href="#/buscar">Buscar</a><a href="#/crear">Crear documento</a><a href="#/catalogos">Categor?as y etiquetas</a><a href="#/revision">Propuestas</a></nav>}
      {!ready ? <p role="status">Recuperando sesión…</p> : !user ? <section className="status-card login-card">
        <span className="eyebrow">ESPACIO DE CONOCIMIENTO</span><h1>Inicio de sesión</h1>
        {detail && <p>Inicia sesión para abrir este documento.</p>}
        <Registration fail={failure} /><form onSubmit={login}><label>Correo electrónico<input name="email" type="email" autoComplete="username" required /></label>
          <label>Contraseña<input name="password" type="password" autoComplete="current-password" required /></label>
          <button disabled={busy}>{busy ? 'Entrando…' : 'Iniciar sesión'}</button></form>
      </section> : route === '#/catalogos' ? <Catalogs fail={failure} /> : route === '#/crear' ? <CreateDocument key={user.id} fail={failure} /> : route === '#/revision' ?
        <ReviewInbox key={user.id} user={user} fail={failure} /> : detail ? <section className="status-card document">
        <a href="#/buscar">← Volver a la búsqueda</a>
        {busy && <p role="status">Cargando documento…</p>}
        {doc && <DocumentWorkflow key={`${doc.id}:${user.id}`} initial={doc} user={user} fail={failure} />}
      </section> : <section className="status-card">
        <span className="eyebrow">BIBLIOTECA DEL EQUIPO</span><h1>Buscar documentos</h1>
        <form onSubmit={search}><label>Buscar por título o contenido<input value={query} onChange={e => setQuery(e.target.value)} type="search" /></label>
          <label>Categoría<select value={categoryId} onChange={e => setCategoryId(e.target.value)} disabled={categoriesLoading}><option value="">Todas</option>{categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
          <label>Estado<select value={status} onChange={e => setStatus(e.target.value as EstadoDocumento | '')}><option value="">Todos</option><option value="BORRADOR">Borrador</option><option value="EN_REVISION">En revisión</option><option value="PUBLICADO">Publicado</option><option value="OBSOLETO">Obsoleto</option></select></label>
          <button disabled={busy}>{busy ? 'Buscando…' : 'Buscar'}</button></form>
        {categoriesLoading && <p role="status">Cargando categorías…</p>}
        {busy && <p role="status">Buscando documentos…</p>}
        <div role="status">{docs?.length === 0 ? <p>No se encontraron documentos.</p> : docs && <p>{docs.length} documento(s) encontrado(s).</p>}</div>
        {docs && <ul className="results">{docs.map(item => <li key={item.id}><a href={`#/documentos/${item.id}`}>{item.titulo}</a><p>{item.estado}</p></li>)}</ul>}
      </section>}
      {error && <p role="alert" className="error">{error}</p>}
    </main><footer>Plataforma colaborativa de gestión del conocimiento · Prueba de concepto local</footer>
  </div>;
}
