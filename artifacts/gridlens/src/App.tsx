import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Bolt,
  Check, CheckCircle2, ChevronDown, ChevronLeft, ClipboardList, Clock3, Crosshair,
  FileText, Filter, FolderKanban, Gauge, Layers3, MapPin, Menu, Plus, Radio,
  Search, ShieldCheck, SlidersHorizontal, Sparkles, X, Zap,
} from 'lucide-react';
import {
  getGetSummaryQueryKey, getGetWorkspaceQueryKey, useCreateProject,
  useCreateWorkOrder, useGetSummary, useGetWorkspace, useLoadDemo, useUpdateAsset,
} from '@workspace/api-client-react';
import type { Asset, AssetUpdate, Project, Severity, Summary, WorkOrder, Workspace } from '@workspace/api-client-react';
import { useAuth } from '@workspace/replit-auth-web';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import NotFound from '@/pages/not-found';
import './index.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: 1 } } });
const severityOrder: Severity[] = ['Critical', 'High', 'Medium', 'Low'];
const DEMO_PROJECT_ID = 'demo-project-riverbend';
const cx = (...values: (string | false | undefined)[]) => values.filter(Boolean).join(' ');
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const severityClass = (value?: string) => `severity severity-${(value || 'low').toLowerCase()}`;
const greeting = () => {
  const hour = new Date().getHours();
  return `${hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}, Morgan`;
};
const findingSchema = z.object({
  notes: z.string().max(5000),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']),
  defectType: z.string().trim().min(1, 'Add a defect type.').max(100),
  reviewed: z.boolean(),
});
const projectSchema = z.object({
  name: z.string().trim().min(1, 'Add a project name.').max(150),
  utility: z.string().trim().min(1, 'Add a utility name.').max(100),
  circuit: z.string().trim().min(1, 'Add a circuit identifier.').max(100),
});
const workOrderSchema = z.object({
  issue: z.string().trim().min(1, 'Describe the work for the crew.').max(5000),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']),
  crew: z.string().trim().min(1, 'Assign a crew.').max(200),
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Shell />
      </WouterRouter>
    </QueryClientProvider>
  );
}

function Shell() {
  const [location] = useLocation();
  const [mobileMenu, setMobileMenu] = useState(false);
  const activePath = location.startsWith('/projects/') ? '/projects' : location;
  return (
    <div className="app-frame">
      <aside className={cx('sidebar', mobileMenu && 'sidebar-open')}>
        <Link href="/" className="brand" data-testid="link-home">
          <span className="brand-symbol"><Bolt size={18} strokeWidth={2.6} /></span>
          <span className="brand-name">grid<span>lens</span></span>
          <span className="brand-build">FIELD / 02</span>
        </Link>
        <div className="workspace-switch">
          <div className="workspace-mark">C</div>
          <div className="workspace-copy"><span>Cascadia Electric</span><small>Operations workspace</small></div>
          <ChevronDown size={15} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <Link href="/" onClick={() => setMobileMenu(false)} className={cx('nav-item', activePath === '/' && 'nav-active')} data-testid="link-overview">
            <Layers3 size={17} /><span>Overview</span><span className="nav-key">01</span>
          </Link>
          <Link href={`/projects/${DEMO_PROJECT_ID}`} onClick={() => setMobileMenu(false)} className={cx('nav-item', activePath === '/projects' && 'nav-active')} data-testid="link-projects">
            <FolderKanban size={17} /><span>Projects</span>
          </Link>
            <Link href="/work-orders" onClick={() => setMobileMenu(false)} className={cx('nav-item', activePath === '/work-orders' && 'nav-active')} data-testid="link-work-orders">
            <ClipboardList size={17} /><span>Work orders</span><span className="nav-live">DRAFTS</span>
          </Link>
        </nav>
        <div className="side-divider" />
        <div className="nav-label">FIELD STATUS</div>
        <div className="field-status"><span className="pulse-dot" /><span>Inspection workspace</span><small>Demo environment</small></div>
        <div className="side-bottom">
          <div className="side-quote"><span className="quote-mark">“</span><p>Every structure reviewed is one less surprise for the crew.</p><span className="quote-caption">FIELD NOTE · 08:42</span></div>
          <div className="profile-button">
            <span className="profile-avatar">MC</span><span className="profile-details"><b>Morgan Chen</b><small>Field lead</small></span><ChevronDown size={14} />
          </div>
        </div>
      </aside>
      {mobileMenu && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileMenu(false)} />}
      <main className="main-column">
        <header className="topbar">
          <button className="mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation" data-testid="button-menu"><Menu size={19} /></button>
          <div className="crumb"><span>Cascadia Electric</span><span className="crumb-slash">/</span><b>{location === '/' ? 'Overview' : location.includes('work-orders') ? 'Work orders' : 'Project review'}</b></div>
          <div className="topbar-right">
            <span className="live-indicator"><span className="pulse-dot" /> WORKSPACE DATA</span>
          <span className="icon-button" aria-label="Notifications"><Bell size={17} /><i /></span>
            <span className="topbar-date">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}</span>
          </div>
        </header>
        <div className="route-content">
          <Switch>
            <Route path="/" component={OverviewPage} />
            <Route path="/projects/:id" component={ProjectPage} />
            <Route path="/work-orders" component={WorkOrdersPage} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

function QueryGate({ children }: { children: (workspace: Workspace, summary?: Summary) => ReactNode }) {
  const workspaceQuery = useGetWorkspace();
  const summaryQuery = useGetSummary();
  const demo = useLoadDemo();
  const qc = useQueryClient();
  if (workspaceQuery.isLoading) return <LoadingState />;
  if (workspaceQuery.isError) return <ErrorState retry={() => { void workspaceQuery.refetch(); }} />;
  const workspace = workspaceQuery.data;
  if (!workspace) return <EmptyWorkspace pending={demo.isPending} error={demo.isError} onLoad={() => demo.mutate(undefined, { onSuccess: () => { void qc.invalidateQueries({ queryKey: getGetWorkspaceQueryKey() }); void qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() }); } })} />;
  if (workspace.projects.length === 0 && workspace.assets.length === 0 && workspace.workOrders.length === 0) {
    return <EmptyWorkspace pending={demo.isPending} error={demo.isError} onLoad={() => demo.mutate(undefined, { onSuccess: () => { void qc.invalidateQueries({ queryKey: getGetWorkspaceQueryKey() }); void qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() }); } })} />;
  }
  return <>{children(workspace, summaryQuery.data)}</>;
}

function LoadingState() {
  return <div className="loading-page"><div className="eyebrow"><span className="eyebrow-line" /> CONNECTING TO FIELD DATA</div><div className="skeleton title-skeleton" /><div className="skeleton metric-skeleton" /><div className="skeleton content-skeleton" /><div className="loading-caption"><span className="pulse-dot" /> Syncing inspection records</div></div>;
}
function ErrorState({ retry }: { retry: () => void }) {
  return <div className="state-panel error-panel"><span className="state-icon error-icon"><AlertTriangle size={22} /></span><div><h2>Field data unavailable</h2><p>We couldn’t sync the workspace. Your inspection records haven’t been changed.</p><button className="button button-primary" onClick={retry} data-testid="button-retry"><Activity size={15} /> Retry connection</button></div></div>;
}
function EmptyWorkspace({ pending, error, onLoad }: { pending: boolean; error: boolean; onLoad: () => void }) {
  return <div className="empty-workspace"><div className="empty-orbit"><Crosshair size={32} /><span /></div><span className="eyebrow"><span className="eyebrow-line" /> READY FOR FIELD DATA</span><h1>Start with a clear view.</h1><p>Load the fictional Cascadia demo workspace to explore aerial line findings and crew work orders.</p>{error && <div className="inline-error">Demo workspace could not be loaded. Check the connection and try again.</div>}<button className="button button-primary" disabled={pending} onClick={onLoad} data-testid="button-load-demo">{pending ? <span className="button-spinner" /> : <Sparkles size={16} />}{pending ? 'Loading demo data…' : 'Load fictional demo data'}</button><small>Demo records are labeled throughout the workspace.</small></div>;
}

function PageHeading({ kicker, title, description, action }: { kicker: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> {kicker}</div><h1>{title}</h1><p>{description}</p></div>{action && <div className="heading-action">{action}</div>}</div>;
}
function DemoNote({ show }: { show: boolean }) {
  if (!show) return null;
  return <div className="demo-note"><span className="demo-dot" /> FICTIONAL DEMO DATA <span className="demo-note-detail">For product demonstration only</span></div>;
}
function Metric({ label, value, detail, icon: Icon, accent, trend }: { label: string; value: string | number; detail: string; icon: typeof Gauge; accent?: string; trend?: string }) {
  return <article className="metric-panel" data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="metric-top"><span>{label}</span><span className={cx('metric-icon', accent)}><Icon size={17} /></span></div><div className="metric-value">{value}</div><div className="metric-bottom"><span>{detail}</span>{trend && <span className="metric-trend"><ArrowUpRight size={13} />{trend}</span>}</div></article>;
}

function OverviewPage() {
  const qc = useQueryClient();
  const [projectModal, setProjectModal] = useState(false);
  const createProject = useCreateProject();
  return <QueryGate>{(workspace, summary) => {
    const openFindings = workspace.assets.filter(a => !a.reviewed);
    const topFindings = [...openFindings].sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)).slice(0, 5);
    const projects = [...workspace.projects].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
    const total = summary?.totalAssets ?? workspace.assets.length;
    const reviewed = summary?.reviewed ?? workspace.assets.filter(a => a.reviewed).length;
    const reviewRate = total ? Math.round(reviewed / total * 100) : 0;
    const doCreate = (data: { name: string; utility: string; circuit: string }) => createProject.mutate({ data }, { onSuccess: () => { void qc.invalidateQueries({ queryKey: getGetWorkspaceQueryKey() }); void qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() }); setProjectModal(false); } });
    return <div className="page animate-in">
      <div className="overview-heading"><PageHeading kicker="OPERATIONS / OVERVIEW" title={greeting()} description="A clear picture of the line, before the crew rolls." action={<button className="button button-primary" onClick={() => setProjectModal(true)} data-testid="button-new-project"><Plus size={16} /> New project</button>} /><DemoNote show={workspace.projects.some(p => p.demo) || workspace.assets.some(a => a.demo)} /></div>
      {createProject.isError && <div className="inline-error mutation-error">Project couldn’t be created. Please check the details and try again.</div>}
      {createProject.isSuccess && <div className="success-banner"><CheckCircle2 size={15} /> Project created and added to your workspace.</div>}
      <section className="metrics-grid">
        <Metric label="ASSETS INSPECTED" value={total.toLocaleString()} detail={`${reviewed.toLocaleString()} reviewed`} icon={Layers3} accent="metric-teal" trend={reviewRate ? `${reviewRate}%` : undefined} />
        <Metric label="PROJECTS IN WORKSPACE" value={summary?.totalProjects ?? workspace.projects.length} detail="Across inspected circuits" icon={FolderKanban} accent="metric-blue" />
        <Metric label="CRITICAL FINDINGS" value={summary?.criticalFindings ?? workspace.assets.filter(a => a.severity === 'Critical').length} detail="Require priority review" icon={AlertTriangle} accent="metric-orange" />
        <Metric label="OPEN WORK ORDERS" value={summary?.openWorkOrders ?? workspace.workOrders.filter(w => w.status !== 'Completed').length} detail="Ready for crew planning" icon={ClipboardList} accent="metric-violet" />
      </section>
      <div className="overview-grid">
        <section className="panel findings-panel">
          <div className="panel-heading"><div><div className="panel-label">REVIEW QUEUE <span className="count-pill">{openFindings.length}</span></div><h2>Findings that need a look</h2></div><Link href={`/projects/${topFindings[0]?.projectId ?? DEMO_PROJECT_ID}`} className="text-link" data-testid="link-all-findings">Open review <ArrowRight size={14} /></Link></div>
          {topFindings.length ? <div className="finding-table">
            <div className="table-head"><span>STRUCTURE / CIRCUIT</span><span>OBSERVED DEFECT</span><span>SEVERITY</span><span>CONF.</span></div>
            {topFindings.map((asset, index) => <FindingRow key={asset.id} asset={asset} index={index} project={workspace.projects.find(p => p.id === asset.projectId)} />)}
          </div> : <div className="inline-empty"><CheckCircle2 size={19} /><span>Review queue clear. Every finding is accounted for.</span></div>}
        </section>
        <section className="panel review-panel">
          <div className="panel-heading"><div><div className="panel-label">INSPECTION COVERAGE</div><h2>Review progress</h2></div><span className="ring-label">FIELD<br />COVERAGE</span></div>
          <div className="progress-wrap"><div className="progress-ring" style={{ '--progress': `${reviewRate * 3.6}deg` } as CSSProperties}><div><strong>{reviewRate}<small>%</small></strong><span>reviewed</span></div></div></div>
          <div className="review-stat-list"><div><span><i className="legend-square reviewed-square" /> Reviewed</span><b>{reviewed}</b></div><div><span><i className="legend-square pending-square" /> In queue</span><b>{Math.max(0, total - reviewed)}</b></div></div>
          <div className="review-foot"><ShieldCheck size={15} /> {reviewRate === 100 ? 'All records verified' : 'Verification keeps crew plans grounded'}</div>
        </section>
      </div>
      <div className="lower-grid">
        <section className="panel project-panel">
          <div className="panel-heading"><div><div className="panel-label">FIELD PROGRAMS</div><h2>Recent projects</h2></div><Link href={`/projects/${projects[0]?.id ?? DEMO_PROJECT_ID}`} className="text-link" data-testid="link-view-projects">View all <ArrowRight size={14} /></Link></div>
          {projects.length ? <div className="project-list">{projects.map((project, i) => <ProjectListItem key={project.id} project={project} assets={workspace.assets.filter(a => a.projectId === project.id)} index={i} />)}</div> : <div className="inline-empty">No projects in this workspace yet.</div>}
        </section>
        <section className="panel signal-panel">
          <div className="panel-heading"><div><div className="panel-label">CIRCUIT SIGNAL</div><h2>Findings by severity</h2></div><span className="signal-icon"><Activity size={17} /></span></div>
          <div className="severity-bars">{(summary?.bySeverity?.length ? summary.bySeverity : severityOrder.map(name => ({ name, count: workspace.assets.filter(a => a.severity === name).length }))).map((row, i) => {
            const max = Math.max(1, ...workspace.assets.map(a => 1), ...(summary?.bySeverity || []).map(x => x.count));
            return <div className="severity-bar-row" key={row.name}><span>{row.name}</span><div className="bar-track"><span className={`bar-fill bar-${row.name.toLowerCase()}`} style={{ width: `${Math.max(2, row.count / max * 100)}%`, transitionDelay: `${i * 70}ms` }} /></div><b>{row.count}</b></div>;
          })}</div>
          <div className="signal-foot"><span><span className="signal-live-dot" /> Live totals</span><span>{workspace.assets.length} total findings</span></div>
        </section>
      </div>
      <div className="activity-strip"><div className="activity-title"><span className="activity-glyph"><Radio size={15} /></span><span>RECENT ACTIVITY</span></div><div className="activity-items">{workspace.audit.slice(0, 3).map(a => <div className="activity-item" key={a.id}><span className="activity-marker" /><span><b>{a.actor}</b> {a.action}</span><time>{dateLabel(a.time)}</time></div>)}</div><div className="activity-end"><span className="pulse-dot" /> SYNCED</div></div>
      {projectModal && <ProjectModal pending={createProject.isPending} onClose={() => setProjectModal(false)} onSubmit={doCreate} />}
    </div>;
  }}</QueryGate>;
}

function FindingRow({ asset, index, project }: { asset: Asset; index: number; project?: Project }) {
  return <Link href={`/projects/${asset.projectId}`} className="finding-row" data-testid={`row-finding-${asset.id}`}><span className="structure-cell"><span className="row-index">{String(index + 1).padStart(2, '0')}</span><span><b>{asset.structureId}</b><small>{project?.circuit || asset.circuit}</small></span></span><span className="defect-cell">{asset.defectType}</span><span><span className={severityClass(asset.severity)}>{asset.severity}</span></span><span className="confidence">{asset.confidence}%</span></Link>;
}
function ProjectListItem({ project, assets, index }: { project: Project; assets: Asset[]; index: number }) {
  const critical = assets.filter(a => a.severity === 'Critical').length;
  return <Link href={`/projects/${project.id}`} className="project-list-item" data-testid={`project-row-${project.id}`}><span className={`project-index project-index-${index}`}>{String(index + 1).padStart(2, '0')}</span><span className="project-info"><b>{project.name}</b><small>{project.utility} <span>·</span> {project.circuit}</small></span><span className="project-asset-count"><b>{assets.length}</b><small>assets</small></span><span className={cx('project-status', project.status.toLowerCase().replaceAll(' ', '-'))}>{project.status}</span><ArrowRight size={15} className="project-arrow" /></Link>;
}

function ProjectPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const updateAsset = useUpdateAsset();
  const createWorkOrder = useCreateWorkOrder();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All severity');
  const [saved, setSaved] = useState(false);
  const [workOrderOpen, setWorkOrderOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(false);
  return <QueryGate>{workspace => {
    const project = workspace.projects.find(p => p.id === params.id) || workspace.projects[0];
    const assets = workspace.assets.filter(a => !project || a.projectId === project.id);
    const selectedAsset = assets.find(a => a.id === selectedId) || assets[0];
    const filtered = assets.filter(a => (a.structureId + a.defectType + a.circuit).toLowerCase().includes(search.toLowerCase()) && (severityFilter === 'All severity' || a.severity === severityFilter));
    const saveAsset = (values: { notes: string; severity: Severity; defectType: string; reviewed: boolean }) => {
      if (!selectedAsset) return;
      updateAsset.mutate({ id: selectedAsset.id, data: values }, { onSuccess: () => { setSaved(true); window.setTimeout(() => setSaved(false), 3200); void qc.invalidateQueries({ queryKey: getGetWorkspaceQueryKey() }); void qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() }); } });
    };
    const draftOrder = (values: { issue: string; priority: Severity; crew: string }) => {
      if (!selectedAsset) return;
      createWorkOrder.mutate({ data: { assetId: selectedAsset.id, ...values } }, { onSuccess: () => { void qc.invalidateQueries({ queryKey: getGetWorkspaceQueryKey() }); void qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() }); setWorkOrderOpen(false); setLocation('/work-orders'); } });
    };
    if (!project) return <EmptyProject />;
    return <div className="page project-page animate-in">
      <div className="project-page-head"><div><Link href="/" className="back-link" data-testid="link-back-overview"><ChevronLeft size={14} /> Overview</Link><div className="project-titleline"><div className="eyebrow"><span className="eyebrow-line" /> PROJECT / {project.circuit}</div><span className="project-status active">{project.status}</span></div><h1>{project.name}</h1><div className="project-subline"><span>{project.utility}</span><i /> <span>{project.circuit}</span><i /> <span>Started {dateLabel(project.date)}</span>{project.demo && <span className="demo-tag">DEMO</span>}</div></div><DemoNote show={project.demo || assets.some(a => a.demo)} /></div>
      {saved && <div className="success-banner"><CheckCircle2 size={15} /> Finding saved. Workspace data is up to date.</div>}
      {updateAsset.isError && <div className="inline-error mutation-error">Finding wasn’t saved. Your changes are still here; try again.</div>}
      {createWorkOrder.isError && <div className="inline-error mutation-error">Work order couldn’t be drafted. Please try again.</div>}
      <div className={cx('review-layout', mobilePanel && 'review-mobile-list')}>
        <aside className="asset-rail">
          <div className="rail-heading"><div><span className="panel-label">ASSET INVENTORY</span><h2>{assets.length} structures</h2></div><button className="mobile-back-button" onClick={() => setMobilePanel(false)} aria-label="Back to assets"><ChevronLeft size={18} /></button><button className="rail-filter" aria-label="Filter findings" onClick={() => setSeverityFilter(severityFilter === 'All severity' ? 'Critical' : 'All severity')} data-testid="button-severity-filter"><SlidersHorizontal size={15} /></button></div>
          <div className="rail-search"><Search size={15} /><input aria-label="Search structures" placeholder="Find a structure..." value={search} onChange={e => setSearch(e.target.value)} data-testid="input-asset-search" /><kbd>/</kbd></div>
          <div className="filter-pills">{['All severity', 'Critical', 'High', 'Medium', 'Low'].map(label => <button key={label} className={cx('filter-chip', severityFilter === label && 'filter-chip-active')} onClick={() => setSeverityFilter(label)} data-testid={`filter-${label.toLowerCase().replace(' ', '-')}`}>{label}</button>)}</div>
          <div className="asset-list">{filtered.map(asset => <button key={asset.id} className={cx('asset-item', asset.id === selectedAsset?.id && 'asset-item-selected')} onClick={() => { setSelectedId(asset.id); setMobilePanel(true); }} data-testid={`asset-select-${asset.id}`}><span className={cx('asset-severity-indicator', `indicator-${asset.severity.toLowerCase()}`)} /><span className="asset-item-copy"><b>{asset.structureId}</b><span>{asset.defectType}</span><small>{asset.circuit} <i /> {dateLabel(asset.inspectionDate)}</small></span><span className="asset-item-end"><span className={severityClass(asset.severity)}>{asset.severity}</span>{asset.reviewed && <Check size={13} className="review-check" />}</span></button>)}
            {!filtered.length && <div className="rail-empty"><Search size={18} /><b>No matching structures</b><span>Try another search or severity.</span></div>}
          </div>
          <div className="rail-footer"><MapPin size={14} /><span>Inspection area</span><b>{project.circuit}</b></div>
        </aside>
        <section className="asset-review">
          {selectedAsset ? <AssetReview asset={selectedAsset} pending={updateAsset.isPending} onSave={saveAsset} onPhotoAdded={() => { void qc.invalidateQueries({ queryKey: getGetWorkspaceQueryKey() }); }} onWorkOrder={() => setWorkOrderOpen(true)} onBack={() => setMobilePanel(false)} /> : <div className="asset-review-empty"><Crosshair size={26} /><h2>Select an asset to review</h2><p>Choose a structure from the inventory to inspect its finding details.</p></div>}
        </section>
      </div>
      {workOrderOpen && selectedAsset && <WorkOrderModal asset={selectedAsset} pending={createWorkOrder.isPending} onClose={() => setWorkOrderOpen(false)} onSubmit={draftOrder} />}
    </div>;
  }}</QueryGate>;
}

function EmptyProject() { return <div className="state-panel"><span className="state-icon"><FolderKanban size={22} /></span><div><h2>No projects found</h2><p>This workspace has no project records to review yet.</p><Link href="/" className="text-link">Return to overview <ArrowRight size={14} /></Link></div></div>; }

function AssetReview({ asset, pending, onSave, onPhotoAdded, onWorkOrder, onBack }: { asset: Asset; pending: boolean; onSave: (values: AssetUpdate) => void; onPhotoAdded: () => void; onWorkOrder: () => void; onBack: () => void }) {
  const auth = useAuth();
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'processing' | 'error'>('idle');
  const [uploadError, setUploadError] = useState('');
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [imageBroken, setImageBroken] = useState(false);
  const form = useForm<z.infer<typeof findingSchema>>({
    resolver: zodResolver(findingSchema),
    defaultValues: {
      notes: asset.notes,
      severity: asset.severity,
      defectType: asset.defectType,
      reviewed: asset.reviewed,
    },
  });
  const { reset } = form;
  useEffect(() => {
    reset({
      notes: asset.notes,
      severity: asset.severity,
      defectType: asset.defectType,
      reviewed: asset.reviewed,
    });
  }, [asset.id, asset.notes, asset.severity, asset.defectType, asset.reviewed, reset]);
  const values = form.watch();
  const changed = form.formState.isDirty;
  const photo = asset.photos.find((item) => item.id === selectedPhotoId) || asset.photos[0];
  const onPhotoSelected = async (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 25 * 1024 * 1024) {
      setUploadState('error');
      setUploadError('Choose a JPEG, PNG, or WebP image no larger than 25 MB.');
      return;
    }
    if (!auth.isAuthenticated) {
      auth.login();
      return;
    }
    setUploadState('uploading');
    setUploadError('');
    try {
      const request = await fetch('/api/storage/uploads/request-url', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      const uploadData = await request.json() as { uploadURL?: string; objectPath?: string; error?: string };
      if (!request.ok || !uploadData.uploadURL || !uploadData.objectPath) {
        throw new Error(uploadData.error || 'Could not start this upload.');
      }
      const uploaded = await fetch(uploadData.uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploaded.ok) throw new Error('The image transfer failed. Please try again.');
      setUploadState('processing');
      const saved = await fetch(`/api/assets/${encodeURIComponent(asset.id)}/photos`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectPath: uploadData.objectPath,
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });
      const result = await saved.json() as { id?: string; error?: string };
      if (!saved.ok) throw new Error(result.error || 'The image could not be linked to this structure.');
      setSelectedPhotoId(result.id || null);
      setImageBroken(false);
      setUploadState('idle');
      onPhotoAdded();
    } catch (error) {
      setUploadState('error');
      setUploadError(error instanceof Error ? error.message : 'The image could not be uploaded.');
    }
  };
  return <div className="asset-review-inner">
    <div className="asset-toolbar"><button className="asset-back-mobile" onClick={onBack}><ChevronLeft size={15} /> All assets</button><div className="asset-crumb"><span>ASSET</span><span>/</span><b>{asset.structureId}</b></div><span className={cx('review-status', asset.reviewed ? 'is-reviewed' : 'is-pending')}>{asset.reviewed ? <><CheckCircle2 size={13} /> VERIFIED</> : <><Clock3 size={13} /> NEEDS REVIEW</>}</span></div>
    <div className="asset-detail-head"><div><div className="asset-detail-kicker">{asset.circuit} <span>·</span> {asset.utility}</div><h2>{asset.structureId}</h2><p>Inspected {dateLabel(asset.inspectionDate)} <span>·</span> {asset.latitude != null && asset.longitude != null ? `${asset.latitude.toFixed(4)}°, ${asset.longitude.toFixed(4)}°` : 'Location not recorded'}</p></div><span className={severityClass(values.severity)}>{values.severity}</span></div>
    <div className="evidence-card">
      <div className="evidence-photo">
        {photo?.url ? (!imageBroken ? <img src={photo.url} alt={`${asset.structureId} inspection evidence`} onError={() => setImageBroken(true)} /> : <div className="photo-image-failure"><span>UPLOADED PHOTO UNAVAILABLE</span></div>) : <EvidenceGraphic asset={{ ...asset, severity: values.severity }} />}
        <div className="photo-hud"><span><Crosshair size={13} /> {photo ? (imageBroken ? 'PHOTO LOAD FAILED' : 'UPLOADED AERIAL IMAGE') : 'VISUAL RECONSTRUCTION'}</span><span>{photo?.name || 'NO IMAGE ATTACHED'}</span></div>
        {photo && !imageBroken && <><div className="photo-reticle"><i /><b /><span /></div><div className="photo-coordinates">{asset.latitude?.toFixed(4) || '—'} N<br />{asset.longitude?.toFixed(4) || '—'} W</div></>}
        {imageBroken && <div className="photo-load-error">The uploaded evidence image could not be loaded.</div>}
      </div>
      <div className="evidence-meta"><div><span className="panel-label">DETECTED CONDITION</span><b>{values.defectType}</b></div><div><span className="panel-label">MODEL CONFIDENCE</span><b className="confidence-big">{asset.confidence}<small>%</small></b></div><div className="confidence-meter"><span style={{ width: `${asset.confidence}%` }} /></div></div>
    </div>
    <div className="evidence-tools">
      {auth.isAuthenticated ? <label className={cx('button', 'button-photo', (uploadState === 'uploading' || uploadState === 'processing' || auth.isLoading) && 'button-disabled')}>
        {uploadState === 'uploading' ? <><span className="button-spinner" /> Uploading image…</> : uploadState === 'processing' ? <><span className="button-spinner" /> Processing evidence…</> : 'Upload drone photo'}
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadState === 'uploading' || uploadState === 'processing' || auth.isLoading} onChange={(event) => { void onPhotoSelected(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} aria-label="Upload drone photo" />
      </label> : <button type="button" className="button button-photo" disabled={auth.isLoading} onClick={auth.login}>{auth.isLoading ? 'Checking sign-in…' : 'Sign in to upload a photo'}</button>}
      <span className="photo-format-hint">JPEG, PNG, or WebP · up to 25 MB</span>
      {uploadState === 'error' && <div className="photo-upload-error" role="alert">{uploadError}</div>}
    </div>
    {asset.photos.length > 1 && <div className="photo-strip" aria-label="Attached image evidence">
      {asset.photos.map((item) => <button key={item.id || item.url} type="button" className={cx('photo-thumb', item.id === photo?.id && 'photo-thumb-active')} onClick={() => { setSelectedPhotoId(item.id || null); setImageBroken(false); }} aria-label={`View ${item.name}`}>
        <img src={item.url} alt="" /><span>{item.name}</span>
      </button>)}
    </div>}
    <div className="asset-info-grid">
      <Form {...form}>
        <form className="finding-edit" onSubmit={form.handleSubmit(onSave)}>
          <div className="section-heading"><div><div className="panel-label">FIELD ASSESSMENT</div><h3>Verify the finding</h3></div><span className="edit-hint">Edits sync to workspace</span></div>
          <FormField control={form.control} name="defectType" render={({ field }) => <FormItem><FormLabel className="field-label">Defect type</FormLabel><FormControl><input className="field-input" maxLength={100} {...field} data-testid="input-defect-type" /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="severity" render={({ field }) => <FormItem><FormLabel className="field-label">Severity</FormLabel><FormControl><select className="field-input field-select" {...field} data-testid="select-severity">{severityOrder.map(s => <option value={s} key={s}>{s}</option>)}</select></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="notes" render={({ field }) => <FormItem><FormLabel className="field-label">Reviewer notes</FormLabel><FormControl><textarea className="field-input field-textarea" maxLength={5000} placeholder="Add field observations for the crew…" {...field} data-testid="input-review-notes" /></FormControl><FormMessage /></FormItem>} />
          <button type="button" className={cx('verify-toggle', values.reviewed && 'verify-toggle-on')} onClick={() => form.setValue('reviewed', !values.reviewed, { shouldDirty: true, shouldValidate: true })} aria-pressed={values.reviewed} data-testid="button-toggle-reviewed"><span className="verify-box">{values.reviewed && <Check size={13} />}</span><span><b>{values.reviewed ? 'Finding verified' : 'Mark as verified'}</b><small>Confirm this finding has been reviewed by a field lead</small></span></button>
          <div className="edit-actions"><button type="submit" className="button button-primary" disabled={!changed || pending} data-testid="button-save-finding">{pending ? <span className="button-spinner" /> : <Check size={15} />}{pending ? 'Saving…' : 'Save review'}</button><button type="button" className="button button-quiet" onClick={onWorkOrder} data-testid="button-create-work-order"><ClipboardList size={15} /> Draft work order</button></div>
        </form>
      </Form>
      <aside className="asset-context">
        <div className="context-label"><MapPin size={14} /> STRUCTURE CONTEXT</div>
        <div className="context-structure">{asset.structureId}</div>
        <div className="context-line">Circuit <b>{asset.circuit}</b></div>
        <div className="context-line">Inspected <b>{dateLabel(asset.inspectionDate)}</b></div>
        <div className="context-line">Coordinates <b>{asset.latitude != null ? `${asset.latitude.toFixed(3)}, ${asset.longitude?.toFixed(3)}` : 'Not recorded'}</b></div>
        <div className="context-divider" />
        <div className="context-safety"><ShieldCheck size={16} /><span>Finding changes are recorded against this structure and shared with operations.</span></div>
      </aside>
    </div>
    <div className="review-footer"><span><span className="pulse-dot" /> RECORD ID <b>{asset.id}</b></span><span>PHOTO EVIDENCE {asset.photos.length ? `· ${asset.photos.length} FILE${asset.photos.length === 1 ? '' : 'S'}` : '· NONE ATTACHED'}</span></div>
  </div>;
}

function EvidenceGraphic({ asset }: { asset: Asset }) {
  return <div className="evidence-illustration"><div className="terrain-lines" /><div className="terrain-glow" /><div className="power-line line-one" /><div className="power-line line-two" /><div className="tower"><i className="tower-arm arm-a" /><i className="tower-arm arm-b" /><i className="tower-arm arm-c" /><i className="tower-leg leg-a" /><i className="tower-leg leg-b" /><i className="tower-leg leg-c" /><i className="tower-cross cross-a" /><i className="tower-cross cross-b" /></div><div className="finding-pin"><span /><b>{asset.severity.toUpperCase()}</b></div><div className="photo-scale"><span>0</span><i /><span>10 m</span></div><div className="photo-notice">{asset.demo ? 'DEMO VISUAL RECONSTRUCTION' : 'VISUAL RECONSTRUCTION'} · NOT AN AERIAL PHOTO</div></div>;
}

function WorkOrdersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [dialogAsset, setDialogAsset] = useState<Asset | null>(null);
  const qc = useQueryClient();
  const createOrder = useCreateWorkOrder();
  return <QueryGate>{workspace => {
    const filtered = workspace.workOrders.filter(order => {
      const asset = workspace.assets.find(a => a.id === order.assetId);
      return `${order.issue} ${order.crew} ${asset?.structureId || ''}`.toLowerCase().includes(search.toLowerCase()) && (status === 'All statuses' || order.status === status);
    });
    const open = workspace.workOrders.filter(w => w.status !== 'Completed').length;
    const reviewed = workspace.workOrders.filter(w => w.status === 'Needs Review').length;
    const draftFromAsset = (values: { issue: string; priority: Severity; crew: string }) => {
      if (!dialogAsset) return;
      createOrder.mutate({ data: { assetId: dialogAsset.id, ...values } }, { onSuccess: () => { setDialogAsset(null); void qc.invalidateQueries({ queryKey: getGetWorkspaceQueryKey() }); void qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() }); } });
    };
    const draftable = workspace.assets.find(a => a.reviewed) || workspace.assets[0];
    return <div className="page workorders-page animate-in">
      <div className="overview-heading"><PageHeading kicker="OPERATIONS / CREW PLANNING" title="Work orders" description="Verified findings, shaped into clear work for the field." action={<button className="button button-primary" onClick={() => draftable && setDialogAsset(draftable)} disabled={!draftable} data-testid="button-draft-order"><Plus size={16} /> Draft work order</button>} /><DemoNote show={workspace.projects.some(p => p.demo) || workspace.assets.some(a => a.demo)} /></div>
      {createOrder.isError && <div className="inline-error mutation-error">Work order could not be drafted. Please retry.</div>}
      {createOrder.isSuccess && <div className="success-banner"><CheckCircle2 size={15} /> Work order drafted and added to crew planning.</div>}
      <div className="workorder-summary"><div className="wo-summary-item"><span className="summary-symbol summary-open"><ClipboardList size={17} /></span><span><small>OPEN ORDERS</small><b>{open}</b></span></div><div className="wo-summary-divider" /><div className="wo-summary-item"><span className="summary-symbol summary-review"><Clock3 size={17} /></span><span><small>AWAITING REVIEW</small><b>{reviewed}</b></span></div><div className="wo-summary-divider" /><div className="wo-summary-context"><span className="pulse-dot" /> CREW PLANNING <b>·</b> {workspace.projects.length} active projects</div></div>
      <section className="panel workorder-panel">
        <div className="wo-table-toolbar"><div><div className="panel-label">CREW DISPATCH QUEUE</div><h2>Work orders <span className="count-pill">{workspace.workOrders.length}</span></h2></div><div className="wo-controls"><label className="wo-search"><Search size={15} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders…" aria-label="Search work orders" data-testid="input-work-order-search" /></label><label className="status-select-wrap"><Filter size={14} /><select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter work order status" data-testid="select-order-status"><option>All statuses</option><option>Draft</option><option>Needs Review</option><option>Approved</option><option>Assigned</option><option>Completed</option></select><ChevronDown size={13} /></label></div></div>
        {filtered.length ? <div className="workorder-table-wrap"><table className="workorder-table"><thead><tr><th>ORDER / ASSET</th><th>ISSUE</th><th>PRIORITY</th><th>CREW</th><th>STATUS</th><th>CREATED</th></tr></thead><tbody>{filtered.map(order => <WorkOrderRow key={order.id} order={order} asset={workspace.assets.find(a => a.id === order.assetId)} />)}</tbody></table></div> : <div className="table-empty"><div className="empty-grid-icon"><ClipboardList size={22} /></div><h3>{workspace.workOrders.length ? 'No matching work orders' : 'No work orders drafted'}</h3><p>{workspace.workOrders.length ? 'Try adjusting your search or status filter.' : 'Create an order from a verified finding to give the crew a clear starting point.'}</p>{!workspace.workOrders.length && draftable && <button className="button button-primary" onClick={() => setDialogAsset(draftable)} data-testid="button-create-first-order"><Plus size={15} /> Draft a work order</button>}</div>}
        <div className="table-footer"><span>Showing {filtered.length} of {workspace.workOrders.length} orders</span><span><i className="demo-dot" /> {workspace.assets.some(asset => asset.demo) ? 'DEMO DATA INCLUDED' : 'WORKSPACE RECORDS'}</span></div>
      </section>
      <div className="workorder-guidance"><span className="guidance-icon"><Zap size={16} /></span><span><b>From finding to field work</b><small>Orders begin as drafts. Make the issue, priority, and crew assignment clear before dispatch.</small></span><ArrowDownRight size={17} /></div>
      {dialogAsset && <WorkOrderModal asset={dialogAsset} pending={createOrder.isPending} onClose={() => setDialogAsset(null)} onSubmit={draftFromAsset} />}
    </div>;
  }}</QueryGate>;
}

function WorkOrderRow({ order, asset }: { order: WorkOrder; asset?: Asset }) {
  return <tr data-testid={`row-work-order-${order.id}`}><td><span className="order-id">{order.id}</span><small className="order-asset"><MapPin size={11} /> {asset?.structureId || order.assetId}</small></td><td className="order-issue">{order.issue}</td><td><span className={severityClass(order.priority)}>{order.priority}</span></td><td><span className="crew-avatar">{order.crew.slice(0, 2).toUpperCase()}</span><span className="crew-name">{order.crew}</span></td><td><span className={`order-status status-${order.status.toLowerCase().replaceAll(' ', '-')}`}><i />{order.status}</span></td><td className="order-date">{dateLabel(order.createdAt)}</td></tr>;
}

function ProjectModal({ pending, onClose, onSubmit }: { pending: boolean; onClose: () => void; onSubmit: (data: { name: string; utility: string; circuit: string }) => void }) {
  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: '', utility: '', circuit: '' },
    mode: 'onBlur',
  });
  return <Modal onClose={onClose} label="Create a field program"><Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="modal-content"><div className="modal-kicker">NEW FIELD PROGRAM</div><h2>Open a project</h2><p>Set the utility and circuit your inspection team is working.</p>
    <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel className="field-label">Project name</FormLabel><FormControl><input className="field-input" maxLength={150} placeholder="e.g. East Ridge patrol" {...field} data-testid="input-project-name" /></FormControl><FormMessage /></FormItem>} />
    <FormField control={form.control} name="utility" render={({ field }) => <FormItem><FormLabel className="field-label">Utility</FormLabel><FormControl><input className="field-input" maxLength={100} placeholder="Utility name" {...field} data-testid="input-project-utility" /></FormControl><FormMessage /></FormItem>} />
    <FormField control={form.control} name="circuit" render={({ field }) => <FormItem><FormLabel className="field-label">Circuit</FormLabel><FormControl><input className="field-input" maxLength={100} placeholder="Circuit identifier" {...field} data-testid="input-project-circuit" /></FormControl><FormMessage /></FormItem>} />
    <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose} data-testid="button-cancel-project">Cancel</button><button className="button button-primary" disabled={pending} data-testid="button-create-project-submit">{pending ? <span className="button-spinner" /> : <Plus size={15} />}{pending ? 'Creating…' : 'Create project'}</button></div></form></Form></Modal>;
}

function WorkOrderModal({ asset, pending, onClose, onSubmit }: { asset: Asset; pending: boolean; onClose: () => void; onSubmit: (data: { issue: string; priority: Severity; crew: string }) => void }) {
  const form = useForm<z.infer<typeof workOrderSchema>>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      issue: asset.notes || `${asset.defectType} at ${asset.structureId}`,
      priority: asset.severity,
      crew: '',
    },
    mode: 'onBlur',
  });
  const values = form.watch();
  return <Modal onClose={onClose} label="Draft a work order"><Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="modal-content"><div className="modal-kicker">CREW PLANNING / NEW DRAFT</div><h2>Turn finding into work</h2><p>Give the crew a clear issue and priority. This order starts as a draft.</p><div className="modal-asset-ref"><span className="asset-ref-icon"><MapPin size={14} /></span><span><b>{asset.structureId}</b><small>{asset.circuit} · {asset.defectType}</small></span><span className={severityClass(values.priority)}>{values.priority}</span></div>
    <FormField control={form.control} name="issue" render={({ field }) => <FormItem><FormLabel className="field-label">Issue description</FormLabel><FormControl><textarea className="field-input field-textarea modal-issue" maxLength={5000} {...field} data-testid="input-order-issue" /></FormControl><FormMessage /></FormItem>} />
    <FormField control={form.control} name="priority" render={({ field }) => <FormItem><FormLabel className="field-label">Priority</FormLabel><FormControl><select className="field-input field-select" {...field} data-testid="select-order-priority">{severityOrder.map(s => <option key={s} value={s}>{s}</option>)}</select></FormControl><FormMessage /></FormItem>} />
    <FormField control={form.control} name="crew" render={({ field }) => <FormItem><FormLabel className="field-label">Crew assignment</FormLabel><FormControl><input className="field-input" maxLength={200} placeholder="e.g. Line Crew 4" {...field} data-testid="input-order-crew" /></FormControl><FormMessage /></FormItem>} />
    <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose} data-testid="button-cancel-order">Cancel</button><button className="button button-primary" disabled={pending} data-testid="button-submit-order">{pending ? <span className="button-spinner" /> : <FileText size={15} />}{pending ? 'Drafting…' : 'Create draft'}</button></div></form></Form></Modal>;
}

function Modal({ children, onClose, label }: { children: ReactNode; onClose: () => void; label: string }) {
  return <div className="modal-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={label}><button className="modal-close" onClick={onClose} aria-label="Close dialog" data-testid="button-close-modal"><X size={17} /></button>{children}</section></div>;
}

export default App;
