import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  AdminReportSummary, AuditLogEntry, BillingInvoice, Episode, EpisodeParticipant, Guest,
  LibraryAsset, Organization, OrganizationMembership, OrganizationRole, PaymentGatewayEvent,
  PaymentMethodType, Production, SaaSPlanDefinition, SaaSRegistrationPayload, SaaSSubscription,
  ScheduleEvent, ScriptVersion, Show, SubscriptionPlanId, User, UserAccountStatus, UserShowPermission,
} from '../domain/contracts';
import { AppError } from '../domain/validation';
import { resolveProgramKnowledge } from './programKnowledge';
import { incrementMetric, logStructured } from './logger';

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!url || !key) logStructured('WARN', 'supabase_config_missing', {});
const db: SupabaseClient = createClient(url, key, { auth: { persistSession: false } });

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v || '');
const now = () => new Date().toISOString();
const legacyId = (row: any) => row?.legacy_id || row?.id;
async function one(table: string, id: string) {
  const q = db.from(table).select('*').limit(1);
  const r = await (isUuid(id) ? q.eq('id', id) : q.eq('legacy_id', id));
  if (r.error) throw new Error(r.error.message);
  return r.data?.[0];
}
function fail(r: any): never { if (r?.error) throw new Error(r.error.message); return r; }
async function programUuid(id: string) { const p = await one('programs', id); return p?.id; }
async function episodeUuid(id: string) { const e = await one('episodes', id); return e?.id; }

function mapCamera(r: any) {
  return { id: legacyId(r), name:r.name||'', label:r.label||r.name||'', purpose:r.purpose||'', framing:r.framing||'', active:r.active !== false };
}
async function camerasFor(programId: string) {
  const r = await db.from('cameras').select('*').eq('program_id', programId).order('sort_order');
  return fail(r).data || [];
}
async function mapShow(r:any): Promise<Show> {
  const cams = await camerasFor(r.id);
  return {
    id: legacyId(r), organizationId:r.organization_id || undefined, title:r.title || r.name || '',
    description:r.description||'', host:r.host||'', format:r.format||'Outro',
    defaultDurationMin:r.default_duration_min ?? r.default_episode_duration_minutes ?? 0,
    editorialStyle:r.editorial_style||'', scenario:r.scenario||'', cameras:cams.map(mapCamera),
    standardStructure:r.standard_structure||[], defaultOpening:r.default_opening||'',
    defaultClosing:r.default_closing||'', catalogStatus: undefined, category: undefined,
    targetAudience:r.target_audience||undefined, distributionChannels:[], createdBy:undefined,
    createdAt:r.created_at, updatedAt:r.updated_at,
  };
}
function mapGuest(r:any): Guest {
  return { id:legacyId(r), organizationId:undefined, name:r.name||'', role:r.role||'', company:r.company||r.company_or_group||'',
    bio:r.bio||'', contacts:r.contacts||'', links:r.links||[], notes:r.notes||'', previousEpisodes:r.previous_episodes||[],
    previousResearchSummary:r.previous_research_summary||undefined, createdAt:r.created_at, updatedAt:r.updated_at };
}
async function mapProduction(r:any): Promise<Production> {
  const p = await one('programs', r.program_id);
  return { id:r.id, organizationId:p?.organization_id || '', showId:legacyId(p)||r.program_id, title:r.title||'',
    seasonNumber:r.number||0, status:r.status||'planning', targetEpisodesCount:0, executiveProducer:'',
    startDate:r.start_date||undefined, endDate:r.end_date||undefined, notes:'', createdAt:r.created_at, updatedAt:r.updated_at };
}
async function mapEpisode(r:any): Promise<Episode> {
  const p = await one('programs', r.program_id);
  const [parts, segs, qs, scripts, shorts, assets, markers, versions] = await Promise.all([
    db.from('episode_participants').select('*').eq('episode_id',r.id).order('order_pos'),
    db.from('segments').select('*').eq('episode_id',r.id).order('order_pos'),
    db.from('questions').select('*').eq('episode_id',r.id).order('order_pos'),
    db.from('script_items').select('*').eq('episode_id',r.id).order('order_pos'),
    db.from('planned_shorts').select('*').eq('episode_id',r.id).order('created_at'),
    db.from('production_assets').select('*').eq('episode_id',r.id).order('created_at'),
    db.from('recording_markers').select('*').eq('episode_id',r.id).order('timestamp_sec'),
    db.from('episode_versions').select('*').eq('episode_id',r.id).order('version'),
  ]);
  const participants:any[] = fail(parts).data || [];
  const segments:any[] = fail(segs).data || [];
  const questions:any[] = fail(qs).data || [];
  const script:any[] = fail(scripts).data || [];
  const shorts:any[] = fail(shorts).data || [];
  const prodAssets:any[] = fail(assets).data || [];
  const markers:any[] = fail(markers).data || [];
  const vers:any[] = fail(versions).data || [];
  const participantRows = participants.length ? (await db.from('participants').select('id,legacy_id').in('id',participants.map(x=>x.participant_id).filter(Boolean))).data || [] : [];
  const pmap = new Map(participantRows.map((x:any)=>[x.id,legacyId(x)]));
  const cameras = await camerasFor(r.program_id);
  return {
    id:legacyId(r), organizationId:p?.organization_id, showId:legacyId(p)||r.program_id,
    productionId:r.season_id||undefined, episodeNumber:r.episode_number||0, title:r.title||'', idea:r.idea||'',
    guestName:r.guest_name||'', guestId:r.guest_id ? (pmap.get(r.guest_id)||r.guest_id) : undefined,
    participants:participants.map((x:any):EpisodeParticipant=>({id:legacyId(x),organizationId:p?.organization_id||'',episodeId:legacyId(r),
      participantId:pmap.get(x.participant_id)||x.participant_id,participantName:x.name,participantRole:x.role,
      participantCompany:undefined,roleInEpisode:x.role||'main_guest',confirmationStatus:x.status||'invited',notes:x.notes||'',createdAt:x.created_at})),
    host:r.host||r.presenter_name||'', format:r.format||'Outro', targetDurationMin:r.target_duration_min??r.target_duration_minutes??0,
    objective:r.objective||undefined, additionalInfo:r.additional_info||undefined, status:r.status||'draft',
    diagnosis:r.diagnosis||{centralTheme:'',potentialStory:'',primaryConflict:'',primaryTransformation:'',whyWatch:'',whatToDiscover:'',researchPoints:[],highImpactMoments:[],approved:false},
    research:r.research||{aboutGuest:'',trajectory:'',company:'',keyDatesAndNumbers:'',previousInterviews:'',recurringThemes:'',contradictionsAndClarifications:'',compellingStories:'',sources:[]},
    outline:segments.map((s:any)=>({id:legacyId(s),blockNumber:s.block_number||s.order_pos||0,title:s.title||'',estimatedDurationMin:s.estimated_duration_min??s.estimated_duration_minutes??0,objective:s.description||'',keyThemes:s.key_themes||[],transitionText:s.transition_text||''})),
    questions:questions.map((q:any)=>({id:legacyId(q),blockId:q.block_id||'',order:q.order_pos||0,text:q.text||'',objective:q.objective||'',suggestedCamera:q.suggested_camera||q.recommended_camera||'',eyeDirection:q.eye_direction||'',followUps:[]})),
    script:script.map((s:any)=>({id:legacyId(s),blockId:s.block_id,timestamp:s.timestamp||'',type:s.type||'question',camera:s.camera||'',alternativeCamera:s.alternative_camera,
      speaker:s.speaker||'',targetPerson:s.target_person,eyeDirection:s.eye_direction||'',shotType:s.shot_type||'',content:s.content||'',directionalMarkers:s.directional_markers||[],isTeleprompter:!!s.is_teleprompter,questionRefId:s.question_id?legacyId({id:s.question_id}):undefined})),
    cameras:cameras.map(mapCamera),
    assets:prodAssets.map((a:any)=>({id:legacyId(a),blockId:a.block_id,type:a.type||'documento',title:a.title||'',description:a.description||'',moment:a.moment||'',status:a.status||'pendente',fileUrl:a.file_url,tags:a.tags||[],reusable:a.reusable})),
    shorts:shorts.map((s:any)=>({id:legacyId(s),title:s.title||'',hook:s.hook||s.suggested_hook||'',generatingQuestion:s.generating_question||'',estimatedDuration:s.estimated_duration||'',status:s.status||'Planejado',notes:s.notes})),
    recordingMarkers:markers.map((m:any)=>({id:legacyId(m),timestampSec:m.timestamp_sec||0,formattedTime:m.formatted_time||'',type:m.type||'nota',blockTitle:m.block_title||'',referenceText:m.reference_text||'',comment:m.comment})),
    technicalChecklist:r.technical_checklist||{cam1Recording:false,cam2Recording:false,cam3Recording:false,micHost:false,micGuest:false,audioMonitored:false,lighting:false,memoryCardsStorage:false,batteries:false,syncClap:false,waterReady:false,silentPhones:false,customItems:[]},
    versions:vers.map((v:any):ScriptVersion=>({id:v.id,episodeId:legacyId(r),organizationId:p?.organization_id,versionNumber:v.version||1,name:v.change_summary||'Versão',savedAt:v.created_at,description:v.change_summary||'',snapshot:v.snapshot||{}})),
    editorScriptSynthesis:r.editor_script_synthesis||undefined, recordingTimeElapsed:r.recording_time_elapsed||undefined,
    createdBy:undefined,updatedBy:undefined,createdAt:r.created_at,updatedAt:r.updated_at,
  };
}
async function rows(table:string, organizationId?:string, column='organization_id') {
  let q=db.from(table).select('*').order('created_at',{ascending:true});
  if (organizationId && column) q=q.eq(column,organizationId);
  const r=await q; return fail(r).data||[];
}

export async function listShows(org:string, allowed?:string[]) {
  const r=await db.from('programs').select('*').eq('organization_id',org).order('created_at');
  const data=fail(r).data||[]; const filtered=allowed?data.filter(x=>allowed.includes(legacyId(x))):data;
  return Promise.all(filtered.map(mapShow));
}
export async function getShowById(org:string,id:string){ const p=await one('programs',id); if(!p||p.organization_id!==org)return undefined; return mapShow(p); }
export async function createShow(org:string,input:any,userId?:string){ const id=input.id||`prog-${Date.now()}`; const payload={legacy_id:id,organization_id:org,name:input.title,title:input.title,description:input.description||'',host:input.host||'',format:input.format||'Outro',default_duration_min:input.defaultDurationMin||0,editorial_style:input.editorialStyle||'',scenario:input.scenario||'',standard_structure:input.standardStructure||[],default_opening:input.defaultOpening||'',default_closing:input.defaultClosing||''}; const r=await db.from('programs').insert(payload).select('*').single(); fail(r); return mapShow(r.data); }
export async function updateShow(org:string,id:string,input:any,userId?:string){ const p=await one('programs',id); if(!p||p.organization_id!==org)throw new AppError(404,'NOT_FOUND','Programa não encontrado.'); const r=await db.from('programs').update({...input,title:input.title,name:input.title,updated_at:now()}).eq('id',p.id).select('*').single(); fail(r); return mapShow(r.data); }
export async function deleteShow(org:string,id:string){ const p=await one('programs',id); if(!p||p.organization_id!==org)return false; const r=await db.from('programs').delete().eq('id',p.id); fail(r); return true; }

export async function listProductions(org:string,showId?:string,allowed?:string[]){ const ps=await listShows(org,allowed); const ids=showId?[showId]:ps.map(x=>x.id); if(!ids.length)return []; const progs=[]; for(const sid of ids){const p=await programUuid(sid);if(p)progs.push(p);} if(!progs.length)return []; const r=await db.from('seasons').select('*').in('program_id',progs).order('number'); return Promise.all((fail(r).data||[]).map(mapProduction)); }
export async function getProductionById(org:string,id:string){ const r=await db.from('seasons').select('*').eq('id',id).single(); if(r.error)return undefined; const p=await one('programs',r.data.program_id); if(p?.organization_id!==org)return undefined; return mapProduction(r.data); }
export async function createProduction(org:string,input:any,userId?:string){ const p=await programUuid(input.showId); if(!p)throw new AppError(404,'NOT_FOUND','Programa não encontrado.'); const r=await db.from('seasons').insert({program_id:p,number:input.seasonNumber||1,title:input.title||'',status:input.status||'planning',start_date:input.startDate||null,end_date:input.endDate||null}).select('*').single(); fail(r); return mapProduction(r.data); }
export async function updateProduction(org:string,id:string,input:any,userId?:string){ const r=await db.from('seasons').select('*').eq('id',id).single(); if(r.error)throw new AppError(404,'NOT_FOUND','Produção não encontrada.'); const p=await one('programs',r.data.program_id);if(p?.organization_id!==org)throw new AppError(403,'FORBIDDEN_CONTEXT','Acesso negado.'); const u=await db.from('seasons').update({number:input.seasonNumber,title:input.title,status:input.status,start_date:input.startDate||null,end_date:input.endDate||null,updated_at:now()}).eq('id',id).select('*').single();fail(u);return mapProduction(u.data);}
export async function deleteProduction(org:string,id:string){const r=await getProductionById(org,id);if(!r)return false;const x=await db.from('seasons').delete().eq('id',id);fail(x);return true;}

export async function listParticipants(org:string){const programs=(await db.from('programs').select('id').eq('organization_id',org));fail(programs);const ids=(programs.data||[]).map(x=>x.id);if(!ids.length)return [];const r=await db.from('participants').select('*').in('program_id',ids).order('created_at');return (fail(r).data||[]).map(mapGuest);}
export async function getParticipantById(org:string,id:string){const r=await one('participants',id);if(!r)return undefined;const p=r.program_id?await one('programs',r.program_id):undefined;if(p?.organization_id!==org)return undefined;return mapGuest(r);}
export async function createParticipant(org:string,input:any){const p=await programUuid(input.programId||input.showId);if(!p)throw new AppError(404,'NOT_FOUND','Programa não encontrado.');const r=await db.from('participants').insert({legacy_id:input.id||`guest-${Date.now()}`,program_id:p,name:input.name||'',type:input.type||null,role:input.role||'',company:input.company||'',company_or_group:input.company||'',bio:input.bio||'',contacts:input.contacts||'',notes:input.notes||'',links:input.links||[],previous_episodes:input.previousEpisodes||[],previous_research_summary:input.previousResearchSummary||null}).select('*').single();fail(r);return mapGuest(r.data);}
export async function updateParticipant(org:string,id:string,input:any){const p=await getParticipantById(org,id);if(!p)throw new AppError(404,'NOT_FOUND','Convidado não encontrado.');const raw=await one('participants',id);const r=await db.from('participants').update({name:input.name,role:input.role,company:input.company,bio:input.bio,contacts:input.contacts,notes:input.notes,links:input.links||[],previous_episodes:input.previousEpisodes||[],previous_research_summary:input.previousResearchSummary||null,updated_at:now()}).eq('id',raw.id).select('*').single();fail(r);return mapGuest(r.data);}
export async function deleteParticipant(org:string,id:string){const p=await getParticipantById(org,id);if(!p)return false;const raw=await one('participants',id);const r=await db.from('participants').delete().eq('id',raw.id);fail(r);return true;}

export async function listEpisodes(org:string,showId?:string,allowed?:string[]){const progs=await listShows(org,allowed);let ids=progs.map(x=>x.id);if(showId)ids=ids.filter(x=>x===showId);const uuids=[];for(const id of ids){const u=await programUuid(id);if(u)uuids.push(u);}if(!uuids.length)return [];const r=await db.from('episodes').select('*').in('program_id',uuids).order('episode_number');return Promise.all((fail(r).data||[]).map(mapEpisode));}
export async function getEpisodeById(org:string,id:string){const r=await one('episodes',id);if(!r)return undefined;const p=await one('programs',r.program_id);if(p?.organization_id!==org)return undefined;return mapEpisode(r);}
async function saveEpisodeChildren(episodeId:string,input:any){
  const programId=(await one('episodes',episodeId))?.program_id;
  if(input.participants){await db.from('episode_participants').delete().eq('episode_id',episodeId);for(let i=0;i<input.participants.length;i++){const x=input.participants[i];const pu=await one('participants',x.participantId||x.id);if(pu)await db.from('episode_participants').insert({episode_id:episodeId,participant_id:pu.id,name:x.participantName||x.name||'',role:x.participantRole||x.role||'',order_pos:i,notes:x.notes||''});}}
  if(input.outline){await db.from('segments').delete().eq('episode_id',episodeId);for(let i=0;i<input.outline.length;i++){const x=input.outline[i];await db.from('segments').insert({legacy_id:x.id,episode_id:episodeId,order_pos:i,block_number:x.blockNumber||i+1,title:x.title||'',estimated_duration_min:x.estimatedDurationMin||0,description:x.objective||'',key_themes:x.keyThemes||[],transition_text:x.transitionText||''});}}
  if(input.questions){await db.from('questions').delete().eq('episode_id',episodeId);const segs=(await db.from('segments').select('id,legacy_id').eq('episode_id',episodeId)).data||[];const sm=new Map(segs.map((x:any)=>[x.legacy_id,x.id]));for(let i=0;i<input.questions.length;i++){const x=input.questions[i];await db.from('questions').insert({legacy_id:x.id,episode_id:episodeId,segment_id:sm.get(x.blockId)||null,order_pos:i,text:x.text||'',objective:x.objective||'',suggested_camera:x.suggestedCamera||'',eye_direction:x.eyeDirection||''});}}
  if(input.script){await db.from('script_items').delete().eq('episode_id',episodeId);for(let i=0;i<input.script.length;i++){const x=input.script[i];await db.from('script_items').insert({legacy_id:x.id,episode_id:episodeId,order_pos:i,timestamp:x.timestamp||'',type:x.type||'question',camera:x.camera||'',alternative_camera:x.alternativeCamera||'',speaker:x.speaker||'',target_person:x.targetPerson||'',eye_direction:x.eyeDirection||'',shot_type:x.shotType||'',content:x.content||'',directional_markers:x.directionalMarkers||[],is_teleprompter:!!x.isTeleprompter,block_id:x.blockId||null});}}
  if(input.recordingMarkers){await db.from('recording_markers').delete().eq('episode_id',episodeId);for(const x of input.recordingMarkers)await db.from('recording_markers').insert({legacy_id:x.id,episode_id:episodeId,timestamp_sec:x.timestampSec||0,formatted_time:x.formattedTime||'',type:x.type||'nota',block_title:x.blockTitle||'',reference_text:x.referenceText||'',comment:x.comment||''});}
  if(input.versions){/* versions are append-only; current contract can be reconstructed from episode_versions */ }
  void programId;
}
export async function createEpisode(org:string,input:any,userId?:string){const p=await programUuid(input.showId);if(!p)throw new AppError(404,'NOT_FOUND','Programa não encontrado.');const row={legacy_id:input.id||`ep-${Date.now()}`,program_id:p,season_id:input.productionId||null,episode_number:input.episodeNumber||1,title:input.title||'',idea:input.idea||'',guest_name:input.guestName||'',guest_id:input.guestId||null,host:input.host||'',format:input.format||'Outro',target_duration_min:input.targetDurationMin||0,objective:input.objective||null,additional_info:input.additionalInfo||null,status:input.status||'draft',diagnosis:input.diagnosis||null,research:input.research||null,technical_checklist:input.technicalChecklist||null,editor_script_synthesis:input.editorScriptSynthesis||null,recording_time_elapsed:input.recordingTimeElapsed||0,checklist:input.checklist||null,production_status:'draft'};const r=await db.from('episodes').insert(row).select('*').single();fail(r);await saveEpisodeChildren(r.data.id,input);return mapEpisode(r.data);}
export async function updateEpisode(org:string,id:string,input:any,userId?:string){const current=await getEpisodeById(org,id);if(!current)throw new AppError(404,'NOT_FOUND','Episódio não encontrado.');const raw=await one('episodes',id);const row:any={...input,updated_at:now()};delete row.id;delete row.showId;delete row.productionId;delete row.participants;delete row.outline;delete row.questions;delete row.script;delete row.cameras;delete row.assets;delete row.shorts;delete row.recordingMarkers;delete row.versions;delete row.createdAt;delete row.updatedAt;const map:any={episodeNumber:'episode_number',guestName:'guest_name',guestId:'guest_id',targetDurationMin:'target_duration_min',additionalInfo:'additional_info',technicalChecklist:'technical_checklist',editorScriptSynthesis:'editor_script_synthesis',recordingTimeElapsed:'recording_time_elapsed'};for(const [k,v] of Object.entries(map)){if(k in row){row[v]=row[k];delete row[k];}}const r=await db.from('episodes').update(row).eq('id',raw.id).select('*').single();fail(r);await saveEpisodeChildren(raw.id,input);return mapEpisode(r.data);}
export async function deleteEpisode(org:string,id:string){const e=await getEpisodeById(org,id);if(!e)return false;const raw=await one('episodes',id);const r=await db.from('episodes').delete().eq('id',raw.id);fail(r);return true;}

function mapAgenda(r:any, program?:any):ScheduleEvent{return {id:legacyId(r),organizationId:program?.organization_id||'',showId:legacyId(program)||r.program_id,productionId:undefined,episodeId:r.episode_id||undefined,episodeTitle:r.episode_title||undefined,title:r.title||'',type:r.type||'recording',status:r.status||'scheduled',scheduledStart:`${r.scheduled_date}T${String(r.scheduled_time||'00:00:00').slice(0,8)}`,scheduledEnd:`${r.scheduled_date}T${String(r.scheduled_time||'00:00:00').slice(0,8)}`,studioLocation:r.location||'',assignedTeam:[],notes:r.notes||'',createdAt:r.created_at,updatedAt:r.updated_at};}
export async function listScheduleEvents(org:string,showId?:string,allowed?:string[]){const r=await db.from('agenda_events').select('*').order('scheduled_date');const out=[];for(const x of fail(r).data||[]){const p=x.program_id?await one('programs',x.program_id):undefined;if(p?.organization_id!==org)continue;if(showId&&legacyId(p)!==showId)continue;if(allowed&&!allowed.includes(legacyId(p)))continue;out.push(mapAgenda(x,p));}return out;}
export async function getScheduleEventById(org:string,id:string){const r=await one('agenda_events',id);if(!r)return undefined;const p=r.program_id?await one('programs',r.program_id):undefined;if(p?.organization_id!==org)return undefined;return mapAgenda(r,p);}
export async function createScheduleEvent(org:string,input:any){const p=await programUuid(input.showId);if(!p)throw new AppError(404,'NOT_FOUND','Programa não encontrado.');const d=new Date(input.scheduledStart||now());const row={legacy_id:input.id||`agenda-${Date.now()}`,program_id:p,episode_id:input.episodeId?await episodeUuid(input.episodeId):null,title:input.title||'',scheduled_date:d.toISOString().slice(0,10),scheduled_time:d.toISOString().slice(11,19),duration_min:Math.max(0,Math.round((new Date(input.scheduledEnd||input.scheduledStart).getTime()-d.getTime())/60000)),location:input.studioLocation||'',type:input.type||'recording',status:input.status||'scheduled',notes:input.notes||''};const r=await db.from('agenda_events').insert(row).select('*').single();fail(r);return mapAgenda(r.data,await one('programs',p));}
export async function updateScheduleEvent(org:string,id:string,input:any){const current=await getScheduleEventById(org,id);if(!current)throw new AppError(404,'NOT_FOUND','Evento não encontrado.');const raw=await one('agenda_events',id);const d=new Date(input.scheduledStart||current.scheduledStart);const r=await db.from('agenda_events').update({title:input.title,scheduled_date:d.toISOString().slice(0,10),scheduled_time:d.toISOString().slice(11,19),location:input.studioLocation,type:input.type,status:input.status,notes:input.notes,updated_at:now()}).eq('id',raw.id).select('*').single();fail(r);return mapAgenda(r.data,await one('programs',raw.program_id));}
export async function deleteScheduleEvent(org:string,id:string){const e=await getScheduleEventById(org,id);if(!e)return false;const raw=await one('agenda_events',id);const r=await db.from('agenda_events').delete().eq('id',raw.id);fail(r);return true;}

export async function listLibraryAssets(org:string,showId?:string,allowed?:string[]){const r=await db.from('library_assets').select('*').eq('organization_id',org).order('created_at');const out=(fail(r).data||[]).filter((x:any)=>!showId||legacyId(x.program_id)===showId).filter((x:any)=>{if(!allowed)return true;return allowed.includes(x.program_id)||allowed.includes(String(x.program_id));});return out.map((x:any):LibraryAsset=>({id:legacyId(x),organizationId:org,showId:x.program_id||undefined,episodeId:undefined,title:x.title||'',description:x.description||'',moment:'',status:'pendente',type:x.type||'documento',fileUrl:x.url||undefined,tags:x.tags||[],createdAt:x.created_at,updatedAt:x.updated_at}));}
export async function getLibraryAssetById(org:string,id:string){const r=await one('library_assets',id);if(!r||r.organization_id!==org)return undefined;return {id:legacyId(r),organizationId:org,showId:r.program_id||undefined,title:r.title||'',description:r.description||'',moment:'',status:'pendente',type:r.type||'documento',fileUrl:r.url||undefined,tags:r.tags||[],createdAt:r.created_at,updatedAt:r.updated_at} as LibraryAsset;}
export async function createLibraryAsset(org:string,input:any){const p=input.showId?await programUuid(input.showId):null;const r=await db.from('library_assets').insert({legacy_id:input.id||`asset-${Date.now()}`,organization_id:org,program_id:p,title:input.title||'',category:input.category||'',type:input.type||'documento',description:input.description||'',content:input.content||'',url:input.fileUrl||input.url||null,tags:input.tags||[]}).select('*').single();fail(r);return getLibraryAssetById(org,r.data.id);}
export async function updateLibraryAsset(org:string,id:string,input:any){const current=await getLibraryAssetById(org,id);if(!current)throw new AppError(404,'NOT_FOUND','Ativo não encontrado.');const raw=await one('library_assets',id);const r=await db.from('library_assets').update({title:input.title,category:input.category,type:input.type,description:input.description,content:input.content,url:input.fileUrl||input.url,tags:input.tags||[],updated_at:now()}).eq('id',raw.id).select('*').single();fail(r);return getLibraryAssetById(org,r.data.id);}
export async function deleteLibraryAsset(org:string,id:string){const a=await getLibraryAssetById(org,id);if(!a)return false;const raw=await one('library_assets',id);const r=await db.from('library_assets').delete().eq('id',raw.id);fail(r);return true;}

export async function recordAuditLog(org:string,userId:string,entityType:string,entityId:string,action:string,metadata:any={}){const r=await db.from('audit_log').insert({organization_id:org,actor_user_id:userId||null,action,table_name:entityType,row_id:isUuid(entityId)?entityId:null,metadata});fail(r);return true;}
export async function listAuditLogs(org:string,limit=50){const r=await db.from('audit_log').select('*').eq('organization_id',org).order('created_at',{ascending:false}).limit(limit);return (fail(r).data||[]).map((x:any):AuditLogEntry=>({id:String(x.id),organizationId:org,userId:x.actor_user_id||undefined,entityType:x.table_name||'',entityId:x.row_id||'',action:x.action,metadata:x.metadata||{},createdAt:x.created_at}));}
export async function checkDatabaseHealth(){try{const r=await db.from('organizations').select('id').limit(1);return {connected:!r.error,driver:'supabase',error:r.error?.message};}catch(e){return {connected:false,driver:'supabase',error:String(e)};}}
export function getDbConnection(){return db;}

async function authUsers(){const r=await db.auth.admin.listUsers({page:1,perPage:1000});if(r.error)throw new Error(r.error.message);return r.data.users;}
async function mapUser(u:any,orgId?:string):Promise<User>{const m=orgId?await db.from('organization_members').select('*').eq('user_id',u.id).eq('organization_id',orgId).eq('active',true).limit(1):await db.from('organization_members').select('*').eq('user_id',u.id).eq('active',true).limit(1);const member=m.data?.[0];return {id:u.id,email:u.email||'',name:u.user_metadata?.name||u.user_metadata?.full_name||u.email||'',jobTitle:u.user_metadata?.jobTitle,status:u.banned_until?'suspended':'active',loginCode:undefined,avatarUrl:u.user_metadata?.avatarUrl,role:member?.role,showPermissions:[],createdAt:u.created_at,updatedAt:u.updated_at||u.created_at};}
export async function listUsersAndOrganizations(){const [users,orgs]=await Promise.all([authUsers(),db.from('organizations').select('*').order('created_at')]);fail(orgs);return {users:await Promise.all(users.map(u=>mapUser(u))),organizations:(orgs.data||[]).map((o:any):Organization=>({id:o.id,name:o.name,slug:o.slug,plan:'rsplay_programa_individual',createdAt:o.created_at,updatedAt:o.updated_at}))};}
export async function getUserMemberships(userId:string){const r=await db.from('organization_members').select('organization_id,role,organizations(name,slug)').eq('user_id',userId).eq('active',true);fail(r);return (r.data||[]).map((x:any):OrganizationMembership=>({organizationId:x.organization_id,organizationName:x.organizations?.name||'',organizationSlug:x.organizations?.slug||'',role:x.role}));}
export async function getOrganizationById(id:string){const r=await db.from('organizations').select('*').eq('id',id).single();if(r.error)return undefined;return {id:r.data.id,name:r.data.name,slug:r.data.slug,plan:'rsplay_programa_individual',createdAt:r.data.created_at,updatedAt:r.data.updated_at} as Organization;}
export async function verifyUserOrganizationAccess(userId:string,orgId:string){const [o,m]=await Promise.all([getOrganizationById(orgId),db.from('organization_members').select('*').eq('organization_id',orgId).eq('user_id',userId).eq('active',true).single()]);if(!o||m.error)throw new AppError(403,'FORBIDDEN_CONTEXT','Usuário não pertence à organização.');return {organization:o,role:m.data.role as OrganizationRole};}
export async function getUserShowPermissions(orgId:string,userId:string){return [] as UserShowPermission[];}
export async function getEffectiveAllowedShowIds(orgId:string,userId:string,role:OrganizationRole){if(['owner','admin','producer'].includes(role))return {isFullAccessAdmin:true,allowedShowIds:[] as string[],permissions:[] as UserShowPermission[]};const r=await db.from('program_user_access').select('catalog_program_id').eq('organization_id',orgId).eq('user_id',userId).eq('status','active');const catalogIds=(r.data||[]).map((x:any)=>x.catalog_program_id);if(!catalogIds.length)return {isFullAccessAdmin:false,allowedShowIds:[] as string[],permissions:[] as UserShowPermission[]};const p=await db.from('programs').select('legacy_id,catalog_program_id').eq('organization_id',orgId).in('catalog_program_id',catalogIds);return {isFullAccessAdmin:false,allowedShowIds:(p.data||[]).map((x:any)=>x.legacy_id),permissions:[] as UserShowPermission[]};}
export async function assertUserCanAccessShow(orgId:string,userId:string,role:OrganizationRole,showId:string,mode:string='view'){const u=await getEffectiveAllowedShowIds(orgId,userId,role);if(u.isFullAccessAdmin)return true;if(u.allowedShowIds.includes(showId))return true;throw new AppError(403,'FORBIDDEN_CONTEXT','Você não tem acesso a este programa.');}
export async function listOrganizationUsersWithPermissions(orgId:string){const r=await db.from('organization_members').select('*').eq('organization_id',orgId).eq('active',true);fail(r);const users=await authUsers();return Promise.all((r.data||[]).map((m:any)=>mapUser(users.find(u=>u.id===m.user_id)||{},orgId)));}
export async function createOrganizationUserWithShowPermissions(orgId:string,input:any){const r=await db.auth.admin.createUser({email:input.email,password:input.loginCode||cryptoRandom(),email_confirm:true,user_metadata:{name:input.name,jobTitle:input.jobTitle}});if(r.error)throw new Error(r.error.message);await db.from('organization_members').insert({organization_id:orgId,user_id:r.data.user.id,role:input.role||'editor',active:true});return mapUser(r.data.user,orgId);}
function cryptoRandom(){return `tm-${Date.now()}-${Math.random().toString(36).slice(2)}`;}

export async function updateUserShowPermissions(){return true;}
export async function updateOrganizationUserStatusOrRole(orgId:string,userId:string,input:any){const r=await db.from('organization_members').update({role:input.role,active:input.status!=='suspended',updated_at:now()}).eq('organization_id',orgId).eq('user_id',userId).select('*').single();fail(r);return r.data;}
export async function listSaaSPlans(){const r=await db.from('commercial_plans').select('*').eq('active',true).order('price_cents');fail(r);return (r.data||[]).map((x:any):SaaSPlanDefinition=>({id:x.code,name:x.name,tagline:x.description,maxShows:999,maxUsers:999,monthlyPriceCents:x.price_cents||0,features:[]}));}
export async function listOrganizationSubscriptions(orgId:string){const r=await db.from('organization_subscriptions').select('*,commercial_plans(*)').eq('organization_id',orgId).order('created_at',{ascending:false});fail(r);return (r.data||[]).map((x:any):SaaSSubscription=>({id:x.id,organizationId:orgId,planId:x.commercial_plans?.code||'rsplay_programa_individual',planName:x.commercial_plans?.name||'',billingCycle:x.commercial_plans?.billing_period==='annual'?'annual':'monthly',amountCents:x.commercial_plans?.price_cents||0,currency:x.commercial_plans?.currency||'BRL',status:x.status==='active'?'active':x.status==='trial'?'trialing':'suspended',autoRenew:true,paymentGateway:'',paymentMethodType:'credit_card',paymentMethodLast4:'',paymentMethodBrand:'',gatewayCustomerId:'',gatewaySubscriptionId:'',currentPeriodStart:x.starts_at,currentPeriodEnd:x.ends_at||x.starts_at,lastRenewalAt:undefined,canceledAt:undefined,createdAt:x.created_at,updatedAt:x.updated_at}));}
export async function listBillingInvoices(){return [] as BillingInvoice[];}
export async function listPaymentGatewayEvents(){return [] as PaymentGatewayEvent[];}
export async function subscribeOrUpdatePlan(orgId:string,input:any,userId:string){const plan=await db.from('commercial_plans').select('*').eq('code',input.planId).single();fail(plan);const old=await db.from('organization_subscriptions').select('id').eq('organization_id',orgId).eq('status','active').limit(1);if(old.data?.[0])await db.from('organization_subscriptions').update({status:'cancelled',ends_at:now(),updated_at:now()}).eq('id',old.data[0].id);const r=await db.from('organization_subscriptions').insert({organization_id:orgId,plan_id:plan.data.id,status:'active'}).select('*').single();fail(r);return (await listOrganizationSubscriptions(orgId))[0];}
export async function toggleSubscriptionAutoRenew(){return true;}
export async function processAutomaticRenewalCycle(orgId:string,id:string){const subs=await listOrganizationSubscriptions(orgId);const s=subs.find(x=>x.id===id);if(!s)throw new AppError(404,'NOT_FOUND','Assinatura não encontrada.');return s;}
export async function buildAdminReportSummary(orgId:string):Promise<AdminReportSummary>{const [subs,users,shows]=await Promise.all([listOrganizationSubscriptions(orgId),listOrganizationUsersWithPermissions(orgId),listShows(orgId)]);return {mrrCents:subs.reduce((a,x)=>a+x.amountCents,0),activeSubscriptionsCount:subs.filter(x=>x.status==='active').length,autoRenewEnabledCount:subs.filter(x=>x.autoRenew).length,paidInvoicesTotalCents:0,pendingInvoicesTotalCents:0,usersCount:users.length,showsReport:await Promise.all(shows.map(async s=>({showId:s.id,showTitle:s.title,format:s.format,host:s.host,episodesCount:(await listEpisodes(orgId,s.id)).length,publishedOrReadyCount:(await listEpisodes(orgId,s.id)).filter(e=>e.status==='published'||e.status==='ready').length,totalPlannedMinutes:0,scheduledSessionsCount:(await listScheduleEvents(orgId,s.id)).length,authorizedUsersCount:users.length})))};}
export async function populateOrganizationWorkspace(){return true;}
export async function registerSaaSAccountWithSubscription(payload:SaaSRegistrationPayload,organizationId:string){const user=await createOrganizationUserWithShowPermissions(organizationId,{email:payload.email,name:payload.name,loginCode:payload.loginCode,jobTitle:payload.jobTitle,role:payload.role||'editor'});let show:Show|undefined;if(payload.newShowTitle){show=await createShow(organizationId,{title:payload.newShowTitle,host:payload.newShowHost||'',format:payload.newShowFormat||'Outro'});}const subscription=await subscribeOrUpdatePlan(organizationId,{planId:payload.planId},user.id);return {user,show,subscription,invoice:undefined,gatewayEvent:undefined};}
