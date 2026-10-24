import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomBytes, randomUUID } from 'node:crypto';
import crypto from 'crypto';
import {
  AdminReportSummary, AuditLogEntry, BillingInvoice, Episode, EpisodeParticipant, Guest,
  LibraryAsset, Organization, OrganizationMembership, OrganizationRole, PaymentGatewayEvent,
  PaymentIntent, PaymentIntentStatus, PaymentMethodType, PlatformRole, Production,
  SaaSPlanDefinition, SaaSRegistrationPayload, SaaSSubscription, ScheduleEvent,
  ScriptVersion, Show, SubscriptionPlanId, SetupState, SetupStatus, User,
  UserAccountStatus, UserShowPermission,
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
function fail<T extends { error?: any; data?: any }>(r: T): T { if (r?.error) throw new Error(r.error.message); return r; }
async function programUuid(id: string) { const p = await one('programs', id); return p?.id; }
async function episodeUuid(id: string) { const e = await one('episodes', id); return e?.id; }

function generateId(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

async function upsertSetupState(orgId: string, programId: string, updates: Partial<SetupState>) {
  const resolvedProgramId = await resolveProgramId(orgId, programId);
  const existing = await db.from('setup_states').select('*').eq('organization_id', orgId).eq('program_id', resolvedProgramId).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  const existingData = existing.data;
  const payload: any = {
    organization_id: orgId,
    program_id: resolvedProgramId,
    status: updates.status || 'setup_pending',
    version: (existingData?.version || 0) + 1,
    steps: updates.steps || existingData?.steps || {},
    updated_at: now(),
  };
  if (updates.status === 'ready') payload.completed_at = now();
  if (updates.status === 'setup_failed') payload.error = updates.error;
  
  if (existingData) {
    const r = await db.from('setup_states').update(payload).eq('id', existingData.id).select('*').single();
    fail(r);
    return r.data;
  } else {
    const r = await db.from('setup_states').insert({ ...payload, id: randomUUID(), created_at: now() }).select('*').single();
    fail(r);
    return r.data;
  }
}

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
    defaultClosing:r.default_closing||'', catalogStatus:r.catalog_status, category:r.category,
    targetAudience:r.target_audience||undefined, distributionChannels:r.distribution_channels||[], createdBy:r.created_by||undefined,
    createdAt:r.created_at, updatedAt:r.updated_at,
  };
}
function mapGuest(r:any): Guest {
  return { id:legacyId(r), organizationId:r.organization_id, name:r.name||'', role:r.role||'', company:r.company||r.company_or_group||'',
    bio:r.bio||'', contacts:r.contacts||'', links:r.links||[], notes:r.notes||'', previousEpisodes:r.previous_episodes||[],
    previousResearchSummary:r.previous_research_summary||undefined, createdAt:r.created_at, updatedAt:r.updated_at };
}
async function mapProduction(r:any): Promise<Production> {
  const p = await one('programs', r.program_id);
  return { id:r.id, organizationId:p?.organization_id || '', showId:legacyId(p)||r.program_id, title:r.title||'',
    seasonNumber:r.number||0, status:r.status||'planning', targetEpisodesCount:r.target_episodes_count||0, executiveProducer:r.executive_producer||'',
    startDate:r.start_date||undefined, endDate:r.end_date||undefined, notes:r.notes||'', createdAt:r.created_at, updatedAt:r.updated_at };
}
async function mapEpisode(r:any): Promise<Episode> {
  const p = await one('programs', r.program_id);
  const [parts, segs, qs, scripts, shortsResult, assets, markersResult, versions] = await Promise.all([
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
  const shorts:any[] = fail(shortsResult).data || [];
  const prodAssets:any[] = fail(assets).data || [];
  const markers:any[] = fail(markersResult).data || [];
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
    createdBy:r.created_by||undefined,updatedBy:r.updated_by||undefined,createdAt:r.created_at,updatedAt:r.updated_at,
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
export async function updateShow(org:string,id:string,input:any,userId?:string){ const p=await one('programs',id); if(!p||p.organization_id!==org)throw new AppError(404,'NOT_FOUND','Programa não encontrado.'); const row:any={updated_at:now()}; const map:any={title:'title',description:'description',host:'host',format:'format',defaultDurationMin:'default_duration_min',editorialStyle:'editorial_style',scenario:'scenario',standardStructure:'standard_structure',defaultOpening:'default_opening',defaultClosing:'default_closing'}; for(const [k,v] of Object.entries(map) as [string,string][]){if(k in input)row[v]=input[k];} if('title' in input)row.name=input.title; const r=await db.from('programs').update(row).eq('id',p.id).select('*').single(); fail(r); return mapShow(r.data); }
export async function deleteShow(org:string,id:string,userId?:string){ const p=await one('programs',id); if(!p||p.organization_id!==org)return false; const r=await db.from('programs').delete().eq('id',p.id); fail(r); return true; }

export async function listProductions(org:string,showId?:string,allowed?:string[]){ const ps=await listShows(org,allowed); const ids=showId?[showId]:ps.map(x=>x.id); if(!ids.length)return []; const progs:any[]=[]; for(const sid of ids){const p=await programUuid(sid);if(p)progs.push(p);} if(!progs.length)return []; const r=await db.from('seasons').select('*').in('program_id',progs).order('number'); return Promise.all((fail(r).data||[]).map(mapProduction)); }
export async function getProductionById(org:string,id:string){ const r=await db.from('seasons').select('*').eq('id',id).single(); if(r.error)return undefined; const p=await one('programs',r.data.program_id); if(p?.organization_id!==org)return undefined; return mapProduction(r.data); }
export async function createProduction(org:string,input:any,userId?:string){ const p=await one('programs',input.showId); if(!p||p.organization_id!==org)throw new AppError(404,'NOT_FOUND','Programa não encontrado.'); const programId=p.id; const r=await db.from('seasons').insert({program_id:programId,number:input.seasonNumber||1,title:input.title||'',status:input.status||'planning',start_date:input.startDate||null,end_date:input.endDate||null,target_episodes_count:input.targetEpisodesCount||0,executive_producer:input.executiveProducer||'',notes:input.notes||''}).select('*').single(); fail(r); return mapProduction(r.data); }
export async function updateProduction(org:string,id:string,input:any,userId?:string){ const r=await db.from('seasons').select('*').eq('id',id).single(); if(r.error)throw new AppError(404,'NOT_FOUND','Produção não encontrada.'); const p=await one('programs',r.data.program_id);if(p?.organization_id!==org)throw new AppError(403,'FORBIDDEN_CONTEXT','Acesso negado.'); const u=await db.from('seasons').update({number:input.seasonNumber,title:input.title,status:input.status,start_date:input.startDate||null,end_date:input.endDate||null,target_episodes_count:input.targetEpisodesCount||0,executive_producer:input.executiveProducer||'',notes:input.notes||'',updated_at:now()}).eq('id',id).select('*').single();fail(u);return mapProduction(u.data);}
export async function deleteProduction(org:string,id:string,userId?:string){const r=await getProductionById(org,id);if(!r)return false;const x=await db.from('seasons').delete().eq('id',id);fail(x);return true;}

export async function listParticipants(org:string){const programs=(await db.from('programs').select('id').eq('organization_id',org));fail(programs);const ids=(programs.data||[]).map(x=>x.id);if(!ids.length)return [];const r=await db.from('participants').select('*').in('program_id',ids).order('created_at');return (fail(r).data||[]).map(mapGuest);}
export async function getParticipantById(org:string,id:string){const r=await one('participants',id);if(!r)return undefined;const p=r.program_id?await one('programs',r.program_id):undefined;if(p?.organization_id!==org)return undefined;return mapGuest(r);}
export async function createParticipant(org:string,input:any,userId?:string){const p=await programUuid(input.programId||input.showId);if(!p)throw new AppError(404,'NOT_FOUND','Programa não encontrado.');const program=await one('programs',p);if(!program||program.organization_id!==org)throw new AppError(403,'FORBIDDEN_CONTEXT','Acesso negado.');const r=await db.from('participants').insert({legacy_id:input.id||`guest-${Date.now()}`,program_id:p,name:input.name||'',type:input.type||null,role:input.role||'',company:input.company||'',company_or_group:input.company||'',bio:input.bio||'',contacts:input.contacts||'',notes:input.notes||'',links:input.links||[],previous_episodes:input.previousEpisodes||[],previous_research_summary:input.previousResearchSummary||null}).select('*').single();fail(r);return mapGuest(r.data);}
export async function updateParticipant(org:string,id:string,input:any,userId?:string){const p=await getParticipantById(org,id);if(!p)throw new AppError(404,'NOT_FOUND','Convidado não encontrado.');const raw=await one('participants',id);const r=await db.from('participants').update({name:input.name,role:input.role,company:input.company,bio:input.bio,contacts:input.contacts,notes:input.notes,links:input.links||[],previous_episodes:input.previousEpisodes||[],previous_research_summary:input.previousResearchSummary||null,updated_at:now()}).eq('id',raw.id).select('*').single();fail(r);return mapGuest(r.data);}
export async function deleteParticipant(org:string,id:string,userId?:string){const p=await getParticipantById(org,id);if(!p)return false;const raw=await one('participants',id);const r=await db.from('participants').delete().eq('id',raw.id);fail(r);return true;}

export async function listEpisodes(org:string,showId?:string,allowed?:string[]){const progs=await listShows(org,allowed);let ids=progs.map(x=>x.id);if(showId)ids=ids.filter(x=>x===showId);const uuids:string[]=[];for(const id of ids){const u=await programUuid(id);if(u)uuids.push(u);}if(!uuids.length)return [];const r=await db.from('episodes').select('*').in('program_id',uuids).order('episode_number');return Promise.all((fail(r).data||[]).map(mapEpisode));}
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
export async function createEpisode(org:string,input:any,userId?:string){const p=await one('programs',input.showId);if(!p||p.organization_id!==org)throw new AppError(404,'NOT_FOUND','Programa não encontrado.');let seasonId:any=null;if(input.productionId){const season=await db.from('seasons').select('id,program_id').eq('id',input.productionId).maybeSingle();if(season.error||!season.data||season.data.program_id!==p.id)throw new AppError(400,'VALIDATION_ERROR','Produção inválida para o programa.');seasonId=season.data.id;}const row={legacy_id:input.id||`ep-${Date.now()}`,program_id:p.id,season_id:seasonId,episode_number:input.episodeNumber||1,title:input.title||'',idea:input.idea||'',guest_name:input.guestName||'',guest_id:input.guestId||null,host:input.host||'',format:input.format||'Outro',target_duration_min:input.targetDurationMin||0,objective:input.objective||null,additional_info:input.additionalInfo||null,status:input.status||'draft',diagnosis:input.diagnosis||{centralTheme:'',potentialStory:'',primaryConflict:'',primaryTransformation:'',whyWatch:'',whatToDiscover:'',researchPoints:[],highImpactMoments:[],approved:false},research:input.research||{aboutGuest:'',trajectory:'',company:'',keyDatesAndNumbers:'',previousInterviews:'',recurringThemes:'',contradictionsAndClarifications:'',compellingStories:'',sources:[]},technical_checklist:input.technicalChecklist||{cam1Recording:false,cam2Recording:false,cam3Recording:false,micHost:false,micGuest:false,audioMonitored:false,lighting:false,memoryCardsStorage:false,batteries:false,syncClap:false,waterReady:false,silentPhones:false,customItems:[]},editor_script_synthesis:input.editorScriptSynthesis||null,recording_time_elapsed:input.recordingTimeElapsed||0,checklist:input.checklist||null,production_status:'draft'};const r=await db.from('episodes').insert(row).select('*').single();fail(r);await saveEpisodeChildren(r.data.id,input);return mapEpisode(r.data);}
export async function updateEpisode(org:string,id:string,input:any,userId?:string){const current=await getEpisodeById(org,id);if(!current)throw new AppError(404,'NOT_FOUND','Episódio não encontrado.');const raw=await one('episodes',id);const row:any={updated_at:now()};const map:any={episodeNumber:'episode_number',title:'title',idea:'idea',guestName:'guest_name',guestId:'guest_id',host:'host',format:'format',targetDurationMin:'target_duration_min',objective:'objective',additionalInfo:'additional_info',status:'status',diagnosis:'diagnosis',research:'research',technicalChecklist:'technical_checklist',editorScriptSynthesis:'editor_script_synthesis',recordingTimeElapsed:'recording_time_elapsed',checklist:'checklist',productionStatus:'production_status'};for(const [k,v] of Object.entries(map) as Array<[string,string]>){if(k in input)row[v]=input[k];}if('guestId' in input&&input.guestId){const guest=await one('participants',input.guestId);if(!guest||guest.program_id!==raw.program_id)throw new AppError(400,'VALIDATION_ERROR','Convidado inválido para o programa.');}const r=await db.from('episodes').update(row).eq('id',raw.id).select('*').single();fail(r);await saveEpisodeChildren(raw.id,input);return mapEpisode(r.data);}
export async function deleteEpisode(org:string,id:string,userId?:string){const e=await getEpisodeById(org,id);if(!e)return false;const raw=await one('episodes',id);const r=await db.from('episodes').delete().eq('id',raw.id);fail(r);return true;}

function mapAgenda(r:any, program?:any):ScheduleEvent{return {id:legacyId(r),organizationId:program?.organization_id||'',showId:legacyId(program)||r.program_id,productionId:r.production_id,episodeId:r.episode_id||undefined,episodeTitle:r.episode_title||undefined,title:r.title||'',type:r.type||'recording',status:r.status||'scheduled',scheduledStart:`${r.scheduled_date}T${String(r.scheduled_time||'00:00:00').slice(0,8)}`,scheduledEnd:`${r.scheduled_date}T${String(r.scheduled_time||'00:00:00').slice(0,8)}`,studioLocation:r.location||'',assignedTeam:r.assigned_team||[],notes:r.notes||'',createdAt:r.created_at,updatedAt:r.updated_at};}
export async function listScheduleEvents(org:string,showId?:string,allowed?:string[]){const r=await db.from('agenda_events').select('*').order('scheduled_date');const out:any[]=[];for(const x of fail(r).data||[]){const p=x.program_id?await one('programs',x.program_id):undefined;if(p?.organization_id!==org)continue;if(showId&&legacyId(p)!==showId)continue;if(allowed&&!allowed.includes(legacyId(p)))continue;out.push(mapAgenda(x,p));}return out;}
export async function getScheduleEventById(org:string,id:string){const r=await one('agenda_events',id);if(!r)return undefined;const p=r.program_id?await one('programs',r.program_id):undefined;if(p?.organization_id!==org)return undefined;return mapAgenda(r,p);}
export async function createScheduleEvent(org:string,input:any,userId?:string){const p=await programUuid(input.showId);if(!p)throw new AppError(404,'NOT_FOUND','Programa não encontrado.');const program=await one('programs',p);if(!program||program.organization_id!==org)throw new AppError(403,'FORBIDDEN_CONTEXT','Acesso negado.');let episodeId:any=null;if(input.episodeId){episodeId=await episodeUuid(input.episodeId);if(!episodeId)throw new AppError(400,'VALIDATION_ERROR','Episódio inválido.');const episode=await one('episodes',episodeId);if(!episode||episode.program_id!==p)throw new AppError(400,'VALIDATION_ERROR','Episódio não pertence ao programa.');}const d=new Date(input.scheduledStart||now());const row={legacy_id:input.id||`agenda-${Date.now()}`,program_id:p,episode_id:episodeId,title:input.title||'',scheduled_date:d.toISOString().slice(0,10),scheduled_time:d.toISOString().slice(11,19),duration_min:Math.max(0,Math.round((new Date(input.scheduledEnd||input.scheduledStart).getTime()-d.getTime())/60000)),location:input.studioLocation||'',type:input.type||'recording',status:input.status||'scheduled',notes:input.notes||''};const r=await db.from('agenda_events').insert(row).select('*').single();fail(r);return mapAgenda(r.data,await one('programs',p));}
export async function updateScheduleEvent(org:string,id:string,input:any,userId?:string){const current=await getScheduleEventById(org,id);if(!current)throw new AppError(404,'NOT_FOUND','Evento não encontrado.');const raw=await one('agenda_events',id);const d=new Date(input.scheduledStart||current.scheduledStart);const r=await db.from('agenda_events').update({title:input.title,scheduled_date:d.toISOString().slice(0,10),scheduled_time:d.toISOString().slice(11,19),location:input.studioLocation,type:input.type,status:input.status,notes:input.notes,updated_at:now()}).eq('id',raw.id).select('*').single();fail(r);return mapAgenda(r.data,await one('programs',raw.program_id));}
export async function deleteScheduleEvent(org:string,id:string,userId?:string){const e=await getScheduleEventById(org,id);if(!e)return false;const raw=await one('agenda_events',id);const r=await db.from('agenda_events').delete().eq('id',raw.id);fail(r);return true;}

export async function listLibraryAssets(org:string,showId?:string,allowed?:string[]){
  const r=await db.from('library_assets').select('*').eq('organization_id',org).order('created_at'); const data=fail(r).data||[];
  const out:LibraryAsset[]=[];
  for(const x of data){
    const p=x.program_id?await one('programs',x.program_id):undefined;
    const sid=p?legacyId(p):undefined;
    if(showId && sid!==showId) continue;
    if(allowed && sid && !allowed.includes(sid)) continue;
    out.push({id:legacyId(x),organizationId:org,showId:sid,episodeId:x.episode_id,title:x.title||'',description:x.description||'',moment:'',status:x.status||'pendente',type:x.type||'documento',fileUrl:x.url||undefined,tags:x.tags||[],createdAt:x.created_at,updatedAt:x.updated_at});
  }
  return out;
}
export async function getLibraryAssetById(org:string,id:string){const r=await one('library_assets',id);if(!r||r.organization_id!==org)return undefined;return {id:legacyId(r),organizationId:org,showId:undefined,episodeId:r.episode_id,title:r.title||'',description:r.description||'',moment:'',status:r.status||'pendente',type:r.type||'documento',fileUrl:r.url||undefined,tags:r.tags||[],createdAt:r.created_at,updatedAt:r.updated_at} as LibraryAsset;}
export async function createLibraryAsset(org:string,input:any,userId?:string){const p=input.showId?await programUuid(input.showId):null;if(p){const program=await one('programs',p);if(!program||program.organization_id!==org)throw new AppError(403,'FORBIDDEN_CONTEXT','Acesso negado.');}const r=await db.from('library_assets').insert({legacy_id:input.id||`asset-${Date.now()}`,organization_id:org,program_id:p,title:input.title||'',category:input.category||'',type:input.type||'documento',description:input.description||'',content:input.content||'',url:input.fileUrl||input.url||null,tags:input.tags||[]}).select('*').single();fail(r);return getLibraryAssetById(org,r.data.id);}
export async function updateLibraryAsset(org:string,id:string,input:any,userId?:string){const current=await getLibraryAssetById(org,id);if(!current)throw new AppError(404,'NOT_FOUND','Ativo não encontrado.');const raw=await one('library_assets',id);const r=await db.from('library_assets').update({title:input.title,category:input.category,type:input.type,description:input.description,content:input.content,url:input.fileUrl||input.url,tags:input.tags||[],updated_at:now()}).eq('id',raw.id).select('*').single();fail(r);return getLibraryAssetById(org,r.data.id);}
export async function deleteLibraryAsset(org:string,id:string,userId?:string){const a=await getLibraryAssetById(org,id);if(!a)return false;const raw=await one('library_assets',id);const r=await db.from('library_assets').delete().eq('id',raw.id);fail(r);return true;}

export async function recordAiGeneration(input: {
  organizationId: string;
  programId?: string;
  episodeId?: string;
  kind: string;
  model?: string;
  prompt?: Record<string, any>;
  result?: Record<string, any>;
  status?: 'pending' | 'completed' | 'failed' | 'applied';
  createdBy?: string;
}) {
  const programId = input.programId ? await programUuid(input.programId) : null;
  if (programId) {
    const program = await one('programs', programId);
    if (!program || program.organization_id !== input.organizationId) {
      throw new AppError(403, 'FORBIDDEN_CONTEXT', 'Programa não pertence à organização.');
    }
  }
  const episodeId = input.episodeId ? await episodeUuid(input.episodeId) : null;
  if (episodeId) {
    const episode = await one('episodes', episodeId);
    if (!episode || episode.program_id === null) {
      throw new AppError(403, 'FORBIDDEN_CONTEXT', 'Episódio não pertence ao contexto informado.');
    }
    const program = await one('programs', episode.program_id);
    if (!program || program.organization_id !== input.organizationId) {
      throw new AppError(403, 'FORBIDDEN_CONTEXT', 'Episódio não pertence à organização.');
    }
    if (programId && episode.program_id !== programId) {
      throw new AppError(403, 'FORBIDDEN_CONTEXT', 'Episódio não pertence ao programa informado.');
    }
  }
  const r = await db.from('ai_generations').insert({
    organization_id: input.organizationId,
    program_id: programId,
    episode_id: episodeId,
    kind: input.kind,
    model: input.model || null,
    prompt: input.prompt || null,
    result: input.result || null,
    status: input.status || 'completed',
    created_by: input.createdBy || null,
  }).select('*').single();
  fail(r);
  return r.data;
}

export async function recordAuditLog(org:string,userId:string,entityType:string,entityId:string,action:string,metadata:any={}){const r=await db.from('audit_log').insert({organization_id:org,actor_user_id:userId||null,action,table_name:entityType,row_id:isUuid(entityId)?entityId:null,metadata});fail(r);return true;}
export async function listAuditLogs(org:string,limit=50){const r=await db.from('audit_log').select('*').eq('organization_id',org).order('created_at',{ascending:false}).limit(limit);return (fail(r).data||[]).map((x:any):AuditLogEntry=>({id:String(x.id),organizationId:org,userId:x.actor_user_id||undefined,entityType:x.table_name||'',entityId:x.row_id||'',action:x.action,metadata:x.metadata||{},createdAt:x.created_at}));}
export async function checkDatabaseHealth(){try{const r=await db.from('organizations').select('id').limit(1);return {connected:!r.error,driver:'supabase',error:r.error?.message};}catch(e){return {connected:false,driver:'supabase',error:String(e)};}}
export const nowFn = now;
export const dbInstance = db;
export function getDbConnection(){return db;}
export function getNow(){return now();}
export async function getAuthUserById(userId:string){
  const r = await db.auth.admin.getUserById(userId);
  if (r.error) return null;
  return r.data.user;
}

// ADR-010: `auth.admin.listUsers()` returns HTTP 500 ("Database error finding users") for every
// `per_page` in this project, so the roster is derived from `organization_members` (distinct,
// active) and hydrated per id with `getUserById`, which works. Users with no membership in any
// organization cannot log in (see buildAuthSession) and are therefore not part of the roster.
async function authUsers(userIds?: string[]): Promise<User[]> {
  let ids = [...new Set((userIds || []).filter(Boolean))];
  if (!userIds) {
    const members = await db.from('organization_members').select('user_id').eq('active', true);
    fail(members);
    ids = [...new Set((members.data || []).map((m: any) => m.user_id as string).filter(Boolean))];
  }
  const hydrated = await Promise.all(ids.map((id) => db.auth.admin.getUserById(id)));
  const users = hydrated.filter((r) => !r.error).map((r) => r.data.user);
  logStructured('INFO', 'auth_roster_resolved', { userCount: users.length, candidateCount: ids.length });
  return users.map((u: any) => ({
    id: u.id,
    email: u.email || '',
    name: u.user_metadata?.name || u.user_metadata?.full_name || u.email || '',
    jobTitle: u.user_metadata?.jobTitle,
    status: (u.banned_until ? 'suspended' : 'active') as UserAccountStatus,
    loginCode: undefined,
    avatarUrl: u.user_metadata?.avatarUrl,
    role: undefined,
    showPermissions: [],
    createdAt: u.created_at,
    updatedAt: u.updated_at || u.created_at,
  }));
}
async function mapUser(u:any,orgId?:string):Promise<User>{const m=orgId?await db.from('organization_members').select('*').eq('user_id',u.id).eq('organization_id',orgId).eq('active',true).limit(1):await db.from('organization_members').select('*').eq('user_id',u.id).eq('active',true).limit(1);const member=m.data?.[0];return {id:u.id,email:u.email||'',name:u.user_metadata?.name||u.user_metadata?.full_name||u.email||'',jobTitle:u.user_metadata?.jobTitle,status:u.banned_until?'suspended':'active',loginCode:undefined,avatarUrl:u.user_metadata?.avatarUrl,role:member?.role,showPermissions:orgId ? await getUserShowPermissions(orgId,u.id) : [],createdAt:u.created_at,updatedAt:u.updated_at||u.created_at};}
export async function listUsersAndOrganizations(){const [users,orgs]=await Promise.all([authUsers(),db.from('organizations').select('*').order('created_at')]);fail(orgs);return {users:await Promise.all(users.map(u=>mapUser(u))),organizations:(orgs.data||[]).map((o:any):Organization=>({id:o.id,name:o.name,slug:o.slug,plan:'rsplay_programa_individual',createdAt:o.created_at,updatedAt:o.updated_at}))};}
export async function listOrganizationsByIds(organizationIds:string[]):Promise<Organization[]>{if(!organizationIds.length)return [];const r=await db.from('organizations').select('*').in('id',organizationIds).order('created_at');fail(r);return (r.data||[]).map((o:any):Organization=>({id:o.id,name:o.name,slug:o.slug,plan:'rsplay_programa_individual',createdAt:o.created_at,updatedAt:o.updated_at}));}
export async function getUserMemberships(userId:string){const r=await db.from('organization_members').select('organization_id,role,organizations(name,slug)').eq('user_id',userId).eq('active',true);fail(r);return (r.data||[]).map((x:any):OrganizationMembership=>({organizationId:x.organization_id,organizationName:x.organizations?.name||'',organizationSlug:x.organizations?.slug||'',role:x.role}));}
export async function getOrganizationById(id:string){const r=await db.from('organizations').select('*').eq('id',id).single();if(r.error)return undefined;return {id:r.data.id,name:r.data.name,slug:r.data.slug,plan:'rsplay_programa_individual',createdAt:r.data.created_at,updatedAt:r.data.updated_at} as Organization;}
export async function verifyUserOrganizationAccess(userId:string,orgId:string){const [o,m]=await Promise.all([getOrganizationById(orgId),db.from('organization_members').select('*').eq('organization_id',orgId).eq('user_id',userId).eq('active',true).single()]);if(!o||m.error)throw new AppError(403,'FORBIDDEN_CONTEXT','Usuário não pertence à organização.');return {organization:o,role:m.data.role as OrganizationRole};}
export async function getUserShowPermissions(orgId:string,userId:string){
  const r=await db.from('program_user_access').select('catalog_program_id,role,status,created_at,updated_at').eq('organization_id',orgId).eq('user_id',userId).eq('status','active');
  fail(r);
  const rows:any[] = r.data || [];
  const out:UserShowPermission[]=[];
  for(const x of rows){
    const p=await db.from('programs').select('legacy_id,title').eq('organization_id',orgId).eq('catalog_program_id',x.catalog_program_id).limit(1);
    const program=p.data?.[0];
    if(!program) continue;
    const full=['admin','producer'].includes(x.role);
    out.push({id:`${userId}:${program.legacy_id}`,organizationId:orgId,userId,showId:program.legacy_id,showTitle:program.title,
      canView:true,canEditEditorial:full,canEditScript:full,canOperateStudio:full,canManageSchedule:full,canManageAssets:full,canExport:true,
      createdAt:x.created_at,updatedAt:x.updated_at});
  }
  return out;
}
export async function getEffectiveAllowedShowIds(orgId:string,userId:string,role:OrganizationRole){if(['owner','admin','producer'].includes(role))return {isFullAccessAdmin:true,allowedShowIds:[] as string[],permissions:await getUserShowPermissions(orgId,userId)};const permissions=await getUserShowPermissions(orgId,userId); const catalogIds=permissions.map(x=>x.showId); if(!catalogIds.length)return {isFullAccessAdmin:false,allowedShowIds:[] as string[],permissions};return {isFullAccessAdmin:false,allowedShowIds:catalogIds,permissions};}
export async function assertUserCanAccessShow(orgId:string,userId:string,role:OrganizationRole,showId:string,mode:string='view'){const u=await getEffectiveAllowedShowIds(orgId,userId,role);if(u.isFullAccessAdmin)return true;if(u.allowedShowIds.includes(showId))return true;throw new AppError(403,'FORBIDDEN_CONTEXT','Você não tem acesso a este programa.');}
export async function listOrganizationUsersWithPermissions(orgId:string){const r=await db.from('organization_members').select('*').eq('organization_id',orgId).eq('active',true);fail(r);const users:any[]=await authUsers((r.data||[]).map((m:any)=>m.user_id).filter(Boolean));const byId=new Map(users.map((u:any)=>[u.id,u]));const members=(r.data||[]).filter((m:any)=>{if(byId.has(m.user_id))return true;logStructured('WARN','auth_user_unresolvable',{organizationId:orgId,userId:m.user_id});return false;});return Promise.all(members.map((m:any)=>mapUser(byId.get(m.user_id),orgId)));}
export async function createOrganizationUserWithShowPermissions(orgId:string,input:any,userId?:string){const r=await db.auth.admin.createUser({email:input.email,password:input.loginCode||cryptoRandom(),email_confirm:true,user_metadata:{name:input.name,jobTitle:input.jobTitle}});if(r.error)throw new Error(r.error.message);await db.from('organization_members').insert({organization_id:orgId,user_id:r.data.user.id,role:input.role||'editor',active:true});return mapUser(r.data.user,orgId);}
function cryptoRandom(){return `tm-${randomBytes(32).toString('base64url')}`;}

export async function updateUserShowPermissions(orgId:string,userId:string,permissions:any[],actorUserId?:string){
  for(const permission of permissions || []) {
    if (!permission?.showId) continue;
    const program = await one('programs', permission.showId);
    if (!program || program.organization_id !== orgId) continue;
    const catalogId = program.catalog_program_id;
    if (!catalogId) continue;
    await db.from('program_user_access').upsert({organization_id:orgId,user_id:userId,catalog_program_id:catalogId,role:permission.canEditEditorial?'producer':'editor',status:'active',updated_at:now()},{onConflict:'organization_id,user_id,catalog_program_id'});
  }
  const users:any[]=await authUsers(); return mapUser(users.find((u:any)=>u.id===userId)||{},orgId);
}
export async function updateOrganizationUserStatusOrRole(orgId:string,userId:string,input:any,actorUserId?:string){const r=await db.from('organization_members').update({role:input.role,active:input.status!=='suspended',updated_at:now()}).eq('organization_id',orgId).eq('user_id',userId).select('*').single();fail(r);return r.data;}
export async function listSaaSPlans() {
  const r = await db.from('commercial_plans').select('*').eq('active', true).order('price_cents');
  fail(r);
  return (r.data || []).map((x: any): SaaSPlanDefinition => ({
    id: x.code,
    name: x.name,
    tagline: x.description,
    maxShows: 999,
    maxUsers: 999,
    monthlyPriceCents: x.price_cents || 0,
    features: [],
  }));
}

export async function listOrganizationSubscriptions(orgId: string) {
  const r = await db.from('organization_subscriptions').select('*,commercial_plans(*)').eq('organization_id', orgId).order('created_at', { ascending: false });
  fail(r);
  return (r.data || []).map((x: any): SaaSSubscription => ({
    id: x.id,
    organizationId: orgId,
    planId: x.commercial_plans?.code || 'rsplay_programa_individual',
    planName: x.commercial_plans?.name || '',
    billingCycle: x.commercial_plans?.billing_period === 'annual' ? 'annual' : 'monthly',
    amountCents: x.commercial_plans?.price_cents || 0,
    currency: x.commercial_plans?.currency || 'BRL',
    status: x.status === 'active' ? 'active' : x.status === 'trial' ? 'trialing' : x.status === 'pending_payment' ? 'pending_payment' : 'suspended',
    autoRenew: x.auto_renew ?? true,
    paymentGateway: x.payment_gateway || '',
    paymentMethodType: x.payment_method_type || 'credit_card',
    paymentMethodLast4: x.payment_method_last4 || '',
    paymentMethodBrand: x.payment_method_brand || '',
    gatewayCustomerId: x.gateway_customer_id || '',
    gatewaySubscriptionId: x.gateway_subscription_id || '',
    currentPeriodStart: x.starts_at,
    currentPeriodEnd: x.ends_at || x.starts_at,
    lastRenewalAt: x.last_renewal_at,
    canceledAt: x.canceled_at,
    createdAt: x.created_at,
    updatedAt: x.updated_at,
  }));
}

export async function listBillingInvoices(orgId?: string): Promise<BillingInvoice[]> {
  if (!orgId) return [];
  const r = await db.from('billing_invoices').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
  if (r.error) return [];
  return (r.data || []).map((x: any): BillingInvoice => ({
    id: x.id,
    organizationId: orgId,
    subscriptionId: x.subscription_id,
    invoiceNumber: x.invoice_number,
    description: x.description,
    amountCents: x.amount_cents,
    currency: x.currency,
    status: x.status,
    paymentMethod: x.payment_method,
    gatewayTransactionId: x.gateway_transaction_id,
    autoRenewalCycle: x.auto_renewal_cycle || false,
    dueDate: x.due_date,
    paidAt: x.paid_at,
    createdAt: x.created_at,
  }));
}

export async function listPaymentGatewayEvents(orgId?: string): Promise<PaymentGatewayEvent[]> {
  if (!orgId) return [];
  const r = await db.from('payment_gateway_events').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
  if (r.error) return [];
  return (r.data || []).map((x: any): PaymentGatewayEvent => ({
    id: x.id,
    organizationId: orgId,
    subscriptionId: x.subscription_id,
    provider: x.provider,
    eventType: x.event_type,
    status: x.status,
    payload: x.payload,
    createdAt: x.created_at,
  }));
}

export async function createPaymentIntent(
  orgId: string,
  programId: string | undefined,
  planId: SubscriptionPlanId,
  amountCents: number,
  currency: string,
  gatewayProvider: string,
  metadata?: Record<string, any>
): Promise<PaymentIntent> {
  const id = generateId('pi');
  const payload = {
    id,
    organization_id: orgId,
    program_id: programId,
    plan_id: planId,
    amount_cents: amountCents,
    currency,
    status: 'created' as PaymentIntentStatus,
    gateway_provider: gatewayProvider,
    gateway_transaction_id: null,
    gateway_payload: null,
    webhook_received_at: null,
    reconciled_at: null,
    metadata: metadata || {},
    created_at: now(),
    updated_at: now(),
  };
  const r = await db.from('payment_intents').insert(payload).select('*').single();
  fail(r);
  return mapPaymentIntent(r.data);
}

export async function updatePaymentIntentStatus(
  intentId: string,
  status: PaymentIntentStatus,
  updates?: Partial<{ gatewayTransactionId: string; gatewayPayload: Record<string, any>; webhookReceivedAt: string; reconciledAt: string }>
) {
  const payload: any = { status, updated_at: now() };
  if (updates?.gatewayTransactionId) payload.gateway_transaction_id = updates.gatewayTransactionId;
  if (updates?.gatewayPayload) payload.gateway_payload = updates.gatewayPayload;
  if (updates?.webhookReceivedAt) payload.webhook_received_at = updates.webhookReceivedAt;
  if (updates?.reconciledAt) payload.reconciled_at = updates.reconciledAt;
  
  const r = await db.from('payment_intents').update(payload).eq('id', intentId).select('*').single();
  fail(r);
  return mapPaymentIntent(r.data);
}

function mapPaymentIntent(x: any): PaymentIntent {
  return {
    id: x.id,
    organizationId: x.organization_id,
    programId: x.program_id,
    subscriptionId: x.subscription_id,
    planId: x.plan_id,
    amountCents: x.amount_cents,
    currency: x.currency,
    status: x.status,
    gatewayProvider: x.gateway_provider,
    gatewayTransactionId: x.gateway_transaction_id,
    gatewayPayload: x.gateway_payload,
    webhookReceivedAt: x.webhook_received_at,
    reconciledAt: x.reconciled_at,
    metadata: x.metadata,
    createdAt: x.created_at,
    updatedAt: x.updated_at,
  };
}

export async function subscribeOrUpdatePlan(
  orgId: string,
  input: { planId: SubscriptionPlanId; showId?: string; paymentMethodType?: PaymentMethodType; paymentMethodLast4?: string; paymentMethodBrand?: string; autoRenew?: boolean; paymentIntentId?: string },
  userId: string
) {
  const plan = await db.from('commercial_plans').select('*').eq('code', input.planId).single();
  fail(plan);
  
  // Check for existing active subscription
  const old = await db.from('organization_subscriptions').select('id').eq('organization_id', orgId).eq('status', 'active').limit(1);
  if (old.data?.[0]) {
    await db.from('organization_subscriptions').update({ status: 'cancelled', ends_at: now(), updated_at: now() }).eq('id', old.data[0].id);
  }
  
  // Determine subscription status based on payment intent
  let subscriptionStatus: 'active' | 'pending_payment' = 'pending_payment';
  if (input.paymentIntentId) {
    const intent = await db.from('payment_intents').select('status').eq('id', input.paymentIntentId).single();
    if (!intent.error && intent.data?.status === 'payment_confirmed') {
      subscriptionStatus = 'active';
    }
  }
  
  const r = await db.from('organization_subscriptions').insert({
    organization_id: orgId,
    plan_id: plan.data.id,
    status: subscriptionStatus,
    show_id: input.showId,
    auto_renew: input.autoRenew ?? true,
    payment_method_type: input.paymentMethodType,
    payment_method_last4: input.paymentMethodLast4,
    payment_method_brand: input.paymentMethodBrand,
    starts_at: now(),
    ends_at: subscriptionStatus === 'active' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
  }).select('*').single();
  fail(r);
  
  // If payment intent was provided, link it
  if (input.paymentIntentId) {
    await db.from('payment_intents').update({ 
      reconciled_at: now(),
      subscription_id: r.data.id,
    }).eq('id', input.paymentIntentId);
  }
  
  return (await listOrganizationSubscriptions(orgId))[0];
}

export async function confirmPaymentAndActivateSubscription(
  orgId: string,
  paymentIntentId: string,
  gatewayTransactionId: string,
  gatewayPayload: Record<string, any>
) {
  // Chama a função transacional PostgreSQL via RPC (service_role bypassa RLS).
  // Valida e atualiza payment_intents + organization_subscriptions em UMA
  // transação atômica, evitando estados inconsistentes.
  const { data, error } = await db
    .rpc('confirm_payment_and_activate_subscription', {
      p_payment_intent_id: paymentIntentId,
      p_organization_id: orgId,
      p_gateway_transaction_id: gatewayTransactionId,
      p_gateway_payload: gatewayPayload,
    })
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new AppError(500, 'PERSISTENCE_ERROR', 'Função de confirmação não retornou resultado.');
  }

  const result = data as { status: string };

  // Se já estava processado (idempotente), retorna as subscriptions atuais
  if (result.status === 'already_processed') {
    return listOrganizationSubscriptions(orgId);
  }

  if (result.status !== 'confirmed') {
    throw new AppError(500, 'PERSISTENCE_ERROR', `Confirmação inesperada: ${result.status}`);
  }

  return listOrganizationSubscriptions(orgId);
}

export async function handlePaymentFailure(
  orgId: string,
  paymentIntentId: string,
  reason: string
) {
  // Chama a função transacional PostgreSQL via RPC.
  // Marca pagamento como falho e cancela subscription vinculada em UMA
  // transação atômica.
  const { data, error } = await db
    .rpc('handle_payment_failure', {
      p_payment_intent_id: paymentIntentId,
      p_organization_id: orgId,
      p_failure_reason: reason,
    })
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new AppError(500, 'PERSISTENCE_ERROR', 'Função de falha não retornou resultado.');
  }

  const result = data as { status: string };

  if (result.status === 'already_processed') {
    return;
  }

  if (result.status !== 'failed') {
    throw new AppError(500, 'PERSISTENCE_ERROR', `Falha inesperada: ${result.status}`);
  }
}

export async function toggleSubscriptionAutoRenew(
  orgId: string,
  id: string,
  autoRenew: boolean,
  userId?: string
) {
  const r = await db.from('organization_subscriptions').update({ auto_renew: autoRenew, updated_at: now() }).eq('id', id).eq('organization_id', orgId).select('*').single();
  fail(r);
  return (await listOrganizationSubscriptions(orgId)).find(s => s.id === id);
}

export async function processAutomaticRenewalCycle(
  orgId: string,
  id: string,
  simulateFailure?: boolean,
  userId?: string
) {
  const subs = await listOrganizationSubscriptions(orgId);
  const s = subs.find(x => x.id === id);
  if (!s) throw new AppError(404, 'NOT_FOUND', 'Assinatura não encontrada.');
  
  if (simulateFailure) {
    // Teste simulado: apenas lança erro de pagamento sem tentar atualizar
    // um payment intent inexistente.
    throw new AppError(402, 'PAYMENT_FAILED', 'Pagamento simulado falhou.');
  }
  
  // In real implementation, this would call the gateway
  await db.from('organization_subscriptions').update({
    last_renewal_at: now(),
    ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: now(),
  }).eq('id', id);
  
  return (await listOrganizationSubscriptions(orgId)).find(x => x.id === id)!;
}

async function createDefaultProgramStructure(orgId: string, programId: string, userId: string) {
  // Create default season
  const seasonId = generateId('season');
  await db.from('seasons').insert({
    id: seasonId,
    program_id: programId,
    number: 1,
    title: 'Temporada 1',
    status: 'planning',
    target_episodes_count: 10,
    executive_producer: '',
    notes: 'Temporada inicial criada automaticamente no pré-setup',
    created_at: now(),
    updated_at: now(),
  });
  
  // Create default cameras
  const cameras = [
    { id: generateId('cam'), program_id: programId, name: 'CAM 1', label: 'Câmera Principal', purpose: 'Principal', framing: 'close_up', active: true, sort_order: 1 },
    { id: generateId('cam'), program_id: programId, name: 'CAM 2', label: 'Câmera Convidado', purpose: 'Guest', framing: 'medium', active: true, sort_order: 2 },
    { id: generateId('cam'), program_id: programId, name: 'CAM 3', label: 'Câmera Wide', purpose: 'Wide', framing: 'wide', active: true, sort_order: 3 },
  ];
  await db.from('cameras').insert(cameras);
  
  // Create default editorial structure
  await db.from('programs').update({
    standard_structure: ['Abertura', 'Bloco 1', 'Bloco 2', 'Encerramento'],
    default_opening: 'Bem-vindos ao {program_title}. Hoje recebemos {guest_name} para falar sobre {topic}.',
    default_closing: 'Obrigado por assistir. Não esqueça de se inscrever e ativar as notificações.',
    updated_at: now(),
  }).eq('id', programId);
  
  // Grant producer access to creator
  const program = await one('programs', programId);
  if (program?.catalog_program_id) {
    await db.from('program_user_access').upsert({
      organization_id: orgId,
      user_id: userId,
      catalog_program_id: program.catalog_program_id,
      role: 'producer',
      status: 'active',
      updated_at: now(),
    }, { onConflict: 'organization_id,user_id,catalog_program_id' });
  }
}

export async function populateOrganizationWorkspace(
  orgId: string,
  programId: string,
  userId: string
): Promise<SetupState> {
  // Check existing setup state
  const existing = await getSetupState(orgId, programId);
  if (existing && existing.status === 'ready') {
    return existing;
  }
  if (existing && existing.status === 'setup_running') {
    throw new AppError(409, 'SETUP_IN_PROGRESS', 'Pré-setup já em andamento.');
  }
  
  // Resolve o UUID do programa (aceita legacy_id ou UUID)
  const resolvedProgramId = await resolveProgramId(orgId, programId);

  // Start or resume setup
  const setup = await upsertSetupState(orgId, resolvedProgramId, {
    status: 'setup_running',
    steps: {
      program_structure: { status: 'pending' },
      default_season: { status: 'pending' },
      cameras: { status: 'pending' },
      editorial_defaults: { status: 'pending' },
      user_permissions: { status: 'pending' },
    },
  });
  
  try {
    // Step 1: Program structure validation
    await upsertSetupState(orgId, resolvedProgramId, {
      status: 'setup_running',
      steps: { ...setup.steps, program_structure: { status: 'completed', completedAt: now() } },
    });
    
    // Step 2: Create default season
    await createDefaultProgramStructure(orgId, resolvedProgramId, userId);
    await upsertSetupState(orgId, resolvedProgramId, {
      status: 'setup_running',
      steps: { ...setup.steps, default_season: { status: 'completed', completedAt: now() }, cameras: { status: 'completed', completedAt: now() }, editorial_defaults: { status: 'completed', completedAt: now() } },
    });
    
    // Step 3: User permissions already handled in createDefaultProgramStructure
    await upsertSetupState(orgId, resolvedProgramId, {
      status: 'setup_running',
      steps: { ...setup.steps, user_permissions: { status: 'completed', completedAt: now() } },
    });
    
    // Mark as ready
    const completed = await upsertSetupState(orgId, resolvedProgramId, {
      status: 'ready',
      steps: { ...setup.steps, program_structure: { status: 'completed', completedAt: now() }, default_season: { status: 'completed', completedAt: now() }, cameras: { status: 'completed', completedAt: now() }, editorial_defaults: { status: 'completed', completedAt: now() }, user_permissions: { status: 'completed', completedAt: now() } },
    });
    
    await recordAuditLog(orgId, userId, 'setup_state', resolvedProgramId, 'completed', {
      programId: resolvedProgramId,
      setupVersion: completed.version,
    });
    
    return completed;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Erro desconhecido no pré-setup';
    await upsertSetupState(orgId, resolvedProgramId, {
      status: 'setup_failed',
      error: errMsg,
      steps: setup.steps,
    });
    throw error;
  }
}

export async function getSetupState(orgId: string, programId: string): Promise<SetupState | null> {
  const resolvedProgramId = await resolveProgramId(orgId, programId);
  const r = await db.from('setup_states').select('*').eq('organization_id', orgId).eq('program_id', resolvedProgramId).maybeSingle();
  if (r.error) throw new Error(r.error.message);
  if (!r.data) return null;
  return {
    id: r.data.id,
    organizationId: r.data.organization_id,
    programId: r.data.program_id,
    status: r.data.status,
    version: r.data.version,
    steps: r.data.steps || {},
    createdAt: r.data.created_at,
    updatedAt: r.data.updated_at,
    completedAt: r.data.completed_at,
    error: r.data.error,
  };
}

/**
 * Resolve um identificador de programa (UUID ou legacy_id) para o UUID interno.
 * Se já for UUID, retorna diretamente. Se for legacy_id, busca na tabela programs.
 */
async function resolveProgramId(orgId: string, programId: string): Promise<string> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(programId || '');
  if (isUuid) return programId;
  
  const p = await db.from('programs').select('id').eq('organization_id', orgId).eq('legacy_id', programId).maybeSingle();
  if (p.error) throw new Error(p.error.message);
  if (!p.data) throw new AppError(404, 'NOT_FOUND', 'Programa não encontrado.');
  return p.data.id;
}

export async function registerSaaSAccountWithSubscription(
  payload: SaaSRegistrationPayload,
  organizationId: string
) {
  // Validate email uniqueness
  const existingUser = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const usersList: any[] = (existingUser as any)?.data?.users || [];
  const emailExists = usersList.some((u: any) => u.email?.toLowerCase() === payload.email.toLowerCase());
  if (emailExists) {
    throw new AppError(409, 'EMAIL_EXISTS', 'Este e-mail já está cadastrado na plataforma.');
  }
  
  // Create user with default 'editor' role (never allow client to set privileged role)
  const user = await createOrganizationUserWithShowPermissions(organizationId, {
    email: payload.email,
    name: payload.name,
    loginCode: payload.loginCode,
    jobTitle: payload.jobTitle,
    role: 'editor', // Always default to editor, never trust client input
  });
  
  let show: Show | undefined;
  let paymentIntentId: string | undefined;
  
  // Create program if new
  if (payload.newShowTitle) {
    show = await createShow(organizationId, {
      title: payload.newShowTitle,
      host: payload.newShowHost || '',
      format: payload.newShowFormat || 'Outro',
    });
    
    // Create payment intent for the new program
    const plan = await db.from('commercial_plans').select('*').eq('code', payload.planId).single();
    if (!plan.error && plan.data) {
      const intent = await createPaymentIntent(
        organizationId,
        show.id,
        payload.planId,
        plan.data.price_cents || 0,
        plan.data.currency || 'BRL',
        'venopag',
        {
          registrationType: 'new_program',
          showTitle: payload.newShowTitle,
          paymentMethodType: payload.paymentMethodType,
          paymentMethodLast4: payload.paymentMethodLast4,
          autoRenew: payload.autoRenew,
        }
      );
      paymentIntentId = intent.id;
    }
  } else if (payload.existingShowId) {
    // Link to existing program
    const program = await getShowById(organizationId, payload.existingShowId);
    if (!program) {
      throw new AppError(404, 'NOT_FOUND', 'Programa selecionado não encontrado.');
    }
    show = program;
    
    // Create payment intent for existing program subscription
    const plan = await db.from('commercial_plans').select('*').eq('code', payload.planId).single();
    if (!plan.error && plan.data) {
      const intent = await createPaymentIntent(
        organizationId,
        show.id,
        payload.planId,
        plan.data.price_cents || 0,
        plan.data.currency || 'BRL',
        'venopag',
        {
          registrationType: 'existing_program',
          showTitle: show.title,
          paymentMethodType: payload.paymentMethodType,
          paymentMethodLast4: payload.paymentMethodLast4,
          autoRenew: payload.autoRenew,
        }
      );
      paymentIntentId = intent.id;
    }
  } else if (payload.knowledgeBaseSlug) {
    // Knowledge base program - find by slug
    const programs = await db.from('programs').select('*').eq('organization_id', organizationId).eq('legacy_id', payload.knowledgeBaseSlug);
    if (programs.data?.length) {
      show = await mapShow(programs.data[0]);
    }
  }
  
  // Create subscription (pending payment)
  const subscription = await subscribeOrUpdatePlan(organizationId, {
    planId: payload.planId,
    showId: show?.id,
    paymentMethodType: payload.paymentMethodType,
    paymentMethodLast4: payload.paymentMethodLast4,
    paymentMethodBrand: payload.paymentMethodBrand,
    autoRenew: payload.autoRenew,
    paymentIntentId,
  }, user.id);
  
  // If show was created, run pre-setup
  let setupState: SetupState | undefined;
  if (show) {
    try {
      setupState = await populateOrganizationWorkspace(organizationId, show.id, user.id);
    } catch (error) {
      // Log but don't fail registration - setup can be retried
      logStructured('WARN', 'setup_failed_during_registration', {
        organizationId,
        programId: show.id,
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  return { user, show, subscription, invoice: undefined, gatewayEvent: undefined, paymentIntentId, setupState };
}

export async function buildAdminReportSummary(orgId: string): Promise<AdminReportSummary> {
  const [subs, users, shows] = await Promise.all([
    listOrganizationSubscriptions(orgId),
    listOrganizationUsersWithPermissions(orgId),
    listShows(orgId),
  ]);
  return {
    mrrCents: subs.reduce((a, x) => a + x.amountCents, 0),
    activeSubscriptionsCount: subs.filter(x => x.status === 'active').length,
    autoRenewEnabledCount: subs.filter(x => x.autoRenew).length,
    paidInvoicesTotalCents: 0,
    pendingInvoicesTotalCents: 0,
    usersCount: users.length,
    showsReport: await Promise.all(shows.map(async s => ({
      showId: s.id,
      showTitle: s.title,
      format: s.format,
      host: s.host,
      episodesCount: (await listEpisodes(orgId, s.id)).length,
      publishedOrReadyCount: (await listEpisodes(orgId, s.id)).filter(e => e.status === 'published' || e.status === 'ready').length,
      totalPlannedMinutes: 0,
      scheduledSessionsCount: (await listScheduleEvents(orgId, s.id)).length,
      authorizedUsersCount: users.length,
    }))),
  };
}

export { mapPaymentIntent, upsertSetupState };

// ============================================================================
// Password Reset Tokens
// ============================================================================

export async function createPasswordResetToken(
  userId: string,
  email: string,
  tokenHash: string,
  expiresAt: string
): Promise<void> {
  const r = await db.from('password_reset_tokens').insert({
    user_id: userId,
    token_hash: tokenHash,
    email,
    expires_at: expiresAt,
  });
  if (r.error) throw new Error(`Failed to create password reset token: ${r.error.message}`);
}

export async function validatePasswordResetToken(tokenHash: string): Promise<{ user_id: string; email: string; expires_at: string; used_at: string | null } | null> {
  const r = await db.from('password_reset_tokens').select('*').eq('token_hash', tokenHash).single();
  if (r.error || !r.data) return null;
  return {
    user_id: r.data.user_id,
    email: r.data.email,
    expires_at: r.data.expires_at,
    used_at: r.data.used_at,
  };
}

export async function claimPasswordResetToken(tokenHash: string, claimId: string): Promise<{ user_id: string; email: string } | null> {
  const r = await db.rpc('claim_password_reset_token', { p_token_hash: tokenHash, p_claim_id: claimId });
  if (r.error) throw new Error(`Failed to claim password reset token: ${r.error.message}`);
  const row = Array.isArray(r.data) ? r.data[0] : r.data;
  return row?.user_id ? { user_id: row.user_id, email: row.email } : null;
}

export async function completePasswordResetTokenClaim(tokenHash: string, claimId: string): Promise<boolean> {
  const r = await db.rpc('complete_password_reset_token_claim', { p_token_hash: tokenHash, p_claim_id: claimId });
  if (r.error) throw new Error(`Failed to complete password reset token: ${r.error.message}`);
  return r.data === true;
}

export async function releasePasswordResetTokenClaim(tokenHash: string, claimId: string): Promise<void> {
  const r = await db.rpc('release_password_reset_token_claim', { p_token_hash: tokenHash, p_claim_id: claimId });
  if (r.error) throw new Error(`Failed to release password reset token claim: ${r.error.message}`);
}

// ============================================================================
// Token Revocation (Server-side Logout)
// ============================================================================

export async function revokeToken(
  tokenHash: string,
  userId: string,
  organizationId: string,
  expiresAt: string
): Promise<void> {
  const r = await db.from('revoked_tokens').insert({
    token_hash: tokenHash,
    user_id: userId,
    organization_id: organizationId,
    expires_at: expiresAt,
    reason: 'logout',
  });
  if (r.error) throw new Error(`Failed to revoke token: ${r.error.message}`);
}

export async function isTokenRevoked(token: string): Promise<boolean> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const r = await db.from('revoked_tokens').select('id').eq('token_hash', tokenHash).maybeSingle();
  if (r.error) {
    logStructured('ERROR', 'token_revocation_lookup_failed', { error: r.error.message });
    throw new Error('Não foi possível verificar o estado da sessão.');
  }
  return !!r.data;
}

export async function isUserTokenRevoked(userId: string, tokenIssuedAt: number): Promise<boolean> {
  const r = await db.rpc('is_user_token_revoked', { p_user_id: userId, p_token_issued_at: new Date(tokenIssuedAt * 1000).toISOString() });
  if (r.error) {
    logStructured('ERROR', 'is_user_token_revoked_failed', { userId, error: r.error.message });
    throw new Error('Não foi possível verificar a revogação das sessões.');
  }
  return !!r.data;
}

export async function revokeAllUserTokens(userId: string, reason: string = 'password_reset'): Promise<void> {
  const r = await db.rpc('revoke_all_user_tokens', { p_user_id: userId, p_reason: reason });
  if (r.error) throw new Error(`Failed to revoke all user tokens: ${r.error.message}`);
}

export async function getAuthUserByEmail(email: string) {
  // Administrative API: use the server-only service-role client.
  const { data, error } = await db.auth.admin.listUsers();
  if (error || !data?.users) {
    if (error) logStructured('ERROR', 'auth_user_lookup_failed', { error: error.message });
    return null;
  }
  const user = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  return user || null;
}

async function sendPasswordResetEmail(email: string, rawToken: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    logStructured('ERROR', 'password_reset_email_not_configured', {
      hasResendApiKey: Boolean(apiKey),
      hasEmailFrom: Boolean(from),
    });
    throw new Error('Envio de e-mail não configurado.');
  }

  const frontendUrl = (process.env.FRONTEND_URL || 'https://takemaster-v2.olfnetto.workers.dev').replace(/\/$/, '');
  const resetUrl = new URL('/', frontendUrl);
  resetUrl.searchParams.set('resetToken', rawToken);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Redefinição de senha do TakeMaster',
      html: `<p>Recebemos uma solicitação para redefinir sua senha do TakeMaster.</p><p><a href="${resetUrl.toString()}">Redefinir minha senha</a></p><p>O link expira em uma hora e só pode ser usado uma vez. Se você não solicitou esta alteração, ignore esta mensagem.</p>`,
      text: `Redefina sua senha do TakeMaster: ${resetUrl.toString()}\nO link expira em uma hora e só pode ser usado uma vez.`,
    }),
  });
  if (!response.ok) {
    logStructured('ERROR', 'password_reset_email_failed', { status: response.status });
    throw new Error('O provedor de e-mail recusou a mensagem.');
  }
  logStructured('INFO', 'password_reset_email_sent', { provider: 'resend' });
}

export { sendPasswordResetEmail };
