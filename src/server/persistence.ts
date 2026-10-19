import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
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
function fail<T extends { error?: any; data?: any }>(r: T): T { if (r?.error) throw new Error(r.error.message); return r; }
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
    id: legacyId(r), organizationId:r.organization_id || undefined, executiveUserId:r.executive_user_id || undefined, title:r.title || r.name || '',
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
export async function createShow(org:string,input:any,userId?:string){ const id=input.id||`prog-${Date.now()}`; const payload={legacy_id:id,organization_id:org,catalog_program_id:input.catalogProgramId||null,executive_user_id:userId||null,name:input.title,title:input.title,description:input.description||'',host:input.host||'',format:input.format||'Outro',default_duration_min:input.defaultDurationMin||0,editorial_style:input.editorialStyle||'',scenario:input.scenario||'',standard_structure:input.standardStructure||[],default_opening:input.defaultOpening||'',default_closing:input.defaultClosing||''}; const r=await db.from('programs').insert(payload).select('*').single(); fail(r); if(userId){try{await upsertProgramMembership(org,r.data.legacy_id||r.data.id,userId,{canView:true,canEditEditorial:false,canEditScript:false,canOperateStudio:false,canManageSchedule:false,canManageAssets:false,canExport:false},'executive',userId,'pending');}catch(error){await db.from('programs').delete().eq('id',r.data.id);throw error;}} return mapShow(r.data); }
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
export function getDbConnection(){return db;}
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
export async function resolveCanonicalOrganizationId(){
  const result=await db.from('organizations').select('id,name,slug,status').eq('slug','rs-play-tv').eq('status','active').maybeSingle();
  fail(result);
  if(!result.data) throw new AppError(500,'CONFIGURATION_ERROR','A organização canônica RS Play TV não foi encontrada ou está inativa.');
  return result.data.id as string;
}

export async function listOrganizationsByIds(organizationIds:string[]):Promise<Organization[]>{if(!organizationIds.length)return [];const r=await db.from('organizations').select('*').in('id',organizationIds).order('created_at');fail(r);return (r.data||[]).map((o:any):Organization=>({id:o.id,name:o.name,slug:o.slug,plan:'rsplay_programa_individual',createdAt:o.created_at,updatedAt:o.updated_at}));}
export async function getUserMemberships(userId:string){const r=await db.from('organization_members').select('organization_id,role,organizations(name,slug)').eq('user_id',userId).eq('active',true);fail(r);return (r.data||[]).map((x:any):OrganizationMembership=>({organizationId:x.organization_id,organizationName:x.organizations?.name||'',organizationSlug:x.organizations?.slug||'',role:x.role}));}
export async function getOrganizationById(id:string){const r=await db.from('organizations').select('*').eq('id',id).single();if(r.error)return undefined;return {id:r.data.id,name:r.data.name,slug:r.data.slug,plan:'rsplay_programa_individual',createdAt:r.data.created_at,updatedAt:r.data.updated_at} as Organization;}
export async function verifyUserOrganizationAccess(userId:string,orgId:string){const [o,m]=await Promise.all([getOrganizationById(orgId),db.from('organization_members').select('*').eq('organization_id',orgId).eq('user_id',userId).eq('active',true).single()]);if(!o||m.error)throw new AppError(403,'FORBIDDEN_CONTEXT','Usuário não pertence à organização.');return {organization:o,role:m.data.role as OrganizationRole};}
export async function getUserShowPermissions(orgId:string,userId:string){
  const membershipResult=await db.from('program_memberships').select('program_id,role,status,permissions,created_at,updated_at').eq('organization_id',orgId).eq('user_id',userId).eq('status','active');
  fail(membershipResult);
  const out:UserShowPermission[]=[];
  const seen=new Set<string>();
  for(const x of (membershipResult.data||[]) as any[]){
    const p=await db.from('programs').select('legacy_id,title').eq('id',x.program_id).eq('organization_id',orgId).maybeSingle();
    if(p.error) throw new Error(p.error.message);
    if(!p.data) continue;
    const id=p.data.legacy_id||x.program_id;
    const perms=x.permissions||{};
    seen.add(id);
    out.push({id:`${userId}:${id}`,organizationId:orgId,userId,showId:id,showTitle:p.data.title||'',
      canView:perms.canView!==false,canEditEditorial:perms.canEditEditorial===true,canEditScript:perms.canEditScript===true,
      canOperateStudio:perms.canOperateStudio===true,canManageSchedule:perms.canManageSchedule===true,
      canManageAssets:perms.canManageAssets===true,canExport:perms.canExport===true,
      createdAt:x.created_at,updatedAt:x.updated_at});
  }

  // The responsible executive can see the program shell before payment, but receives
  // read-only permissions until the payment RPC activates the program subscription.
  const ownedPrograms=await db.from('programs').select('id,legacy_id,title,created_at,updated_at')
    .eq('organization_id',orgId).eq('executive_user_id',userId);
  fail(ownedPrograms);
  for(const p of (ownedPrograms.data||[]) as any[]){
    const id=p.legacy_id||p.id;
    if(seen.has(id)) continue;
    seen.add(id);
    out.push({id:`${userId}:${id}`,organizationId:orgId,userId,showId:id,showTitle:p.title||'',
      canView:true,canEditEditorial:false,canEditScript:false,canOperateStudio:false,
      canManageSchedule:false,canManageAssets:false,canExport:false,createdAt:p.created_at,updatedAt:p.updated_at});
  }

  // Preserve access granted by the previous catalog-based model while memberships
  // are migrated to program instances.
  const legacy=await db.from('program_user_access').select('catalog_program_id,role,status,created_at,updated_at').eq('organization_id',orgId).eq('user_id',userId).eq('status','active');
  fail(legacy);
  for(const x of (legacy.data||[]) as any[]){
    const programs=await db.from('programs').select('legacy_id,title').eq('organization_id',orgId).eq('catalog_program_id',x.catalog_program_id);
    fail(programs);
    for(const p of (programs.data||[]) as any[]){
      const id=p.legacy_id||'';
      if(!id||seen.has(id)) continue;
      const full=['admin','producer'].includes(x.role);
      out.push({id:`${userId}:${id}`,organizationId:orgId,userId,showId:id,showTitle:p.title||'',
        canView:true,canEditEditorial:full,canEditScript:full,canOperateStudio:full,canManageSchedule:full,canManageAssets:full,canExport:true,
        createdAt:x.created_at,updatedAt:x.updated_at});
      seen.add(id);
    }
  }
  return out;
}

export async function getEffectiveAllowedShowIds(orgId:string,userId:string,role:OrganizationRole){
  if(['owner','admin'].includes(role)) return {isFullAccessAdmin:true,allowedShowIds:[] as string[],permissions:await getUserShowPermissions(orgId,userId)};
  const permissions=await getUserShowPermissions(orgId,userId);
  const allowedShowIds=permissions.filter(x=>x.canView).map(x=>x.showId);
  return {isFullAccessAdmin:false,allowedShowIds,permissions};
}

export async function assertUserCanAccessShow(orgId:string,userId:string,role:OrganizationRole,showId:string,mode:string='canView'){
  const access=await getEffectiveAllowedShowIds(orgId,userId,role);
  if(access.isFullAccessAdmin) return true;
  const permission=access.permissions.find((item)=>item.showId===showId);
  if(!permission||permission.canView!==true) throw new AppError(403,'FORBIDDEN_CONTEXT','Você não tem acesso a este programa.');
  const modeKey=mode==='view'?'canView':mode;
  if(!['canView','canEditEditorial','canEditScript','canOperateStudio','canManageSchedule','canManageAssets','canExport'].includes(modeKey)) {
    throw new AppError(400,'VALIDATION_ERROR','Permissão solicitada inválida.');
  }
  if((permission as any)[modeKey]!==true) throw new AppError(403,'FORBIDDEN_CONTEXT','Sua função não permite esta operação neste programa.');
  return true;
}

export async function upsertProgramMembership(orgId:string,programId:string,userId:string,permissions:any,role:string='editor',actorUserId?:string,status:'pending'|'active'|'revoked'='active'){
  const program=await one('programs',programId);
  if(!program||program.organization_id!==orgId) throw new AppError(404,'NOT_FOUND','Programa não encontrado nesta organização.');
  const r=await db.from('program_memberships').upsert({
    organization_id:orgId,program_id:program.id,user_id:userId,role,status,
    permissions:permissions||{canView:true},authorized_by:actorUserId||userId,authorized_at:status==='active'?now():null,revoked_at:status==='revoked'?now():null,updated_at:now()
  },{onConflict:'program_id,user_id'}).select('*').single();
  fail(r);
  if(program.catalog_program_id){
    const legacy=await db.from('program_user_access').update({status:'revoked',updated_at:now()})
      .eq('organization_id',orgId).eq('user_id',userId).eq('catalog_program_id',program.catalog_program_id).eq('status','active');
    fail(legacy);
  }
  return r.data;
}

const TEAM_ROLES=['producer','editor','host','viewer'] as const;
type ProgramTeamRole=typeof TEAM_ROLES[number];

function permissionsForTeamRole(role:ProgramTeamRole,overrides?:Record<string,unknown>){
  const base={
    canView:true,
    canEditEditorial:role==='producer'||role==='editor',
    canEditScript:role==='producer'||role==='editor',
    canOperateStudio:role==='producer',
    canManageSchedule:role==='producer',
    canManageAssets:role==='producer',
    canExport:role==='producer'||role==='editor',
  };
  const result:any={...base};
  for(const key of Object.keys(base) as (keyof typeof base)[]){
    if(overrides?.[key]===false) result[key]=false;
  }
  return result;
}

async function assertProgramExecutiveOrAdmin(orgId:string,programId:string,actorUserId:string,actorRole:OrganizationRole){
  const program=await one('programs',programId);
  if(!program||program.organization_id!==orgId) throw new AppError(404,'NOT_FOUND','Programa não encontrado nesta organização.');
  if(!['owner','admin'].includes(actorRole)&&program.executive_user_id!==actorUserId){
    throw new AppError(403,'FORBIDDEN_CONTEXT','Somente o diretor executivo responsável pode administrar a equipe deste programa.');
  }
  if(!['owner','admin'].includes(actorRole)){
    const subscription=await db.from('program_subscriptions').select('id').eq('organization_id',orgId).eq('program_id',program.id).eq('status','active').maybeSingle();
    fail(subscription);
    if(!subscription.data) throw new AppError(402,'SUBSCRIPTION_INACTIVE','Conclua o pagamento do programa antes de administrar a equipe.');
  }
  return program;
}

export async function listProgramTeam(orgId:string,programId:string,actorUserId:string,actorRole:OrganizationRole){
  const program=await assertProgramExecutiveOrAdmin(orgId,programId,actorUserId,actorRole);
  const memberships=await db.from('program_memberships').select('*').eq('organization_id',orgId).eq('program_id',program.id).eq('status','active').order('created_at');
  fail(memberships);
  const users=await authUsers((memberships.data||[]).map((m:any)=>m.user_id));
  const byId=new Map(users.map((u:any)=>[u.id,u]));
  const members=(memberships.data||[]).map((m:any)=>{
    const user=byId.get(m.user_id) as any;
    return {userId:m.user_id,name:user?.name||user?.email||'Usuário',email:user?.email||'',jobTitle:user?.jobTitle||'',role:m.role,permissions:m.permissions||{},createdAt:m.created_at,authorizedBy:m.authorized_by};
  });
  const allUsers=await listOrganizationUsersWithPermissions(orgId);
  const memberIds=new Set(memberships.data?.map((m:any)=>m.user_id)||[]);
  const candidates=allUsers.filter((u:any)=>!memberIds.has(u.id)).map((u:any)=>({userId:u.id,name:u.name,email:u.email,jobTitle:u.jobTitle||'',role:u.role||'editor'}));
  return {program:{id:program.legacy_id||program.id,title:program.title||program.name,executiveUserId:program.executive_user_id||null},members,candidates};
}

export async function upsertProgramTeamMember(orgId:string,programId:string,actorUserId:string,actorRole:OrganizationRole,input:{userId:string;role?:string;permissions?:Record<string,unknown>}){
  const program=await assertProgramExecutiveOrAdmin(orgId,programId,actorUserId,actorRole);
  const role=(input.role||'editor') as ProgramTeamRole;
  if(!TEAM_ROLES.includes(role)) throw new AppError(400,'VALIDATION_ERROR','Função de programa inválida.');
  const orgMember=await db.from('organization_members').select('user_id').eq('organization_id',orgId).eq('user_id',input.userId).eq('active',true).maybeSingle();
  fail(orgMember);
  if(!orgMember.data) throw new AppError(404,'NOT_FOUND','O usuário não pertence à organização RS Play TV.');
  if(program.executive_user_id===input.userId) throw new AppError(409,'CONFLICT','O diretor executivo responsável não pode ser rebaixado como membro da própria equipe.');
  const permissions=permissionsForTeamRole(role,input.permissions);
  await upsertProgramMembership(orgId,program.legacy_id||program.id,input.userId,permissions,role,actorUserId);
  const roster=await authUsers([input.userId]);
  const user=roster[0];
  return {userId:input.userId,name:user?.name||user?.email||'Usuário',email:user?.email||'',jobTitle:user?.jobTitle||'',role,permissions};
}

export async function inviteProgramTeamMember(orgId:string,programId:string,actorUserId:string,actorRole:OrganizationRole,input:{email:string;name:string;jobTitle?:string;role?:string}){
  await assertProgramExecutiveOrAdmin(orgId,programId,actorUserId,actorRole);
  const email=(input.email||'').trim().toLowerCase();
  const name=(input.name||'').trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||name.length<2) throw new AppError(400,'VALIDATION_ERROR','Informe nome e e-mail válidos para o convite.');
  const role=(input.role||'editor') as ProgramTeamRole;
  if(!TEAM_ROLES.includes(role)) throw new AppError(400,'VALIDATION_ERROR','Função de programa inválida.');

  const roster=await listOrganizationUsersWithPermissions(orgId);
  const existingMember=roster.find((u:any)=>u.email.toLowerCase()===email);
  if(existingMember){
    return {member:await upsertProgramTeamMember(orgId,programId,actorUserId,actorRole,{userId:existingMember.id,role}),invited:false};
  }

  const authList=await db.auth.admin.listUsers({page:1,perPage:1000});
  if(authList.error) throw new Error(authList.error.message);
  let authUser=(authList.data.users||[]).find((u:any)=>(u.email||'').toLowerCase()===email);
  let wasInvited=false;
  if(!authUser){
    const invited=await db.auth.admin.inviteUserByEmail(email,{data:{name,jobTitle:input.jobTitle||''}});
    if(invited.error) throw new AppError(409,'CONFLICT',invited.error.message||'Não foi possível enviar o convite por e-mail.');
    authUser=invited.data.user;
    wasInvited=true;
  }
  if(!authUser?.id) throw new AppError(500,'PERSISTENCE_ERROR','O provedor de autenticação não retornou o usuário convidado.');

  const existingOrgMembership=await db.from('organization_members').select('active').eq('organization_id',orgId).eq('user_id',authUser.id).maybeSingle();
  fail(existingOrgMembership);
  if(existingOrgMembership.data&&!existingOrgMembership.data.active){
    if(wasInvited) await db.auth.admin.deleteUser(authUser.id);
    throw new AppError(403,'FORBIDDEN_CONTEXT','Esta conta está suspensa na organização e não pode receber novo acesso.');
  }
  const orgInsert=existingOrgMembership.data
    ? {error:null}
    : await db.from('organization_members').insert({organization_id:orgId,user_id:authUser.id,role:'editor',active:true});
  fail(orgInsert as any);
  try{
    const member=await upsertProgramTeamMember(orgId,programId,actorUserId,actorRole,{userId:authUser.id,role});
    return {member,invited:wasInvited};
  }catch(error){
    if(!existingOrgMembership.data) await db.from('organization_members').delete().eq('organization_id',orgId).eq('user_id',authUser.id);
    if(wasInvited) await db.auth.admin.deleteUser(authUser.id);
    throw error;
  }
}

export async function revokeProgramTeamMember(orgId:string,programId:string,actorUserId:string,actorRole:OrganizationRole,targetUserId:string){
  const program=await assertProgramExecutiveOrAdmin(orgId,programId,actorUserId,actorRole);
  if(program.executive_user_id===targetUserId) throw new AppError(409,'CONFLICT','Transfira a responsabilidade executiva antes de remover o diretor responsável.');
  const result=await db.from('program_memberships').update({status:'revoked',revoked_at:now(),updated_at:now()})
    .eq('organization_id',orgId).eq('program_id',program.id).eq('user_id',targetUserId).eq('status','active').select('user_id').maybeSingle();
  fail(result);
  if(!result.data) throw new AppError(404,'NOT_FOUND','Vínculo de equipe não encontrado.');
  if(program.catalog_program_id){
    const legacy=await db.from('program_user_access').update({status:'revoked',updated_at:now()})
      .eq('organization_id',orgId).eq('user_id',targetUserId).eq('catalog_program_id',program.catalog_program_id).eq('status','active');
    fail(legacy);
  }
  return {success:true,userId:targetUserId,programId:program.legacy_id||program.id};
}

export async function listOrganizationUsersWithPermissions(orgId:string){const r=await db.from('organization_members').select('*').eq('organization_id',orgId).eq('active',true);fail(r);const users:any[]=await authUsers((r.data||[]).map((m:any)=>m.user_id).filter(Boolean));const byId=new Map(users.map((u:any)=>[u.id,u]));const members=(r.data||[]).filter((m:any)=>{if(byId.has(m.user_id))return true;logStructured('WARN','auth_user_unresolvable',{organizationId:orgId,userId:m.user_id});return false;});return Promise.all(members.map((m:any)=>mapUser(byId.get(m.user_id),orgId)));}
export async function createOrganizationUserWithShowPermissions(orgId:string,input:any,userId?:string){const r=await db.auth.admin.createUser({email:input.email,password:input.loginCode||cryptoRandom(),email_confirm:true,user_metadata:{name:input.name,jobTitle:input.jobTitle}});if(r.error)throw new Error(r.error.message);await db.from('organization_members').insert({organization_id:orgId,user_id:r.data.user.id,role:input.role||'editor',active:true});return mapUser(r.data.user,orgId);}
function cryptoRandom(){return `tm-${randomBytes(32).toString('base64url')}`;}

export async function updateUserShowPermissions(orgId:string,userId:string,permissions:any[],actorUserId?:string){
  const desired=new Set<string>();
  for(const permission of permissions||[]){
    if(!permission?.showId) continue;
    const program=await one('programs',permission.showId);
    if(program&&program.organization_id===orgId) desired.add(program.id);
  }

  const current=await db.from('program_memberships').select('program_id,role').eq('organization_id',orgId).eq('user_id',userId).eq('status','active');
  fail(current);
  for(const membership of (current.data||[]) as any[]){
    // The executive owner cannot lose their foundational membership through a generic RBAC edit.
    if(membership.role==='executive'||desired.has(membership.program_id)) continue;
    const revoked=await db.from('program_memberships').update({status:'revoked',revoked_at:now(),updated_at:now()})
      .eq('organization_id',orgId).eq('program_id',membership.program_id).eq('user_id',userId).eq('status','active');
    fail(revoked);
  }

  const legacy=await db.from('program_user_access').select('catalog_program_id').eq('organization_id',orgId).eq('user_id',userId).eq('status','active');
  fail(legacy);
  for(const grant of (legacy.data||[]) as any[]){
    const linked=await db.from('programs').select('id').eq('organization_id',orgId).eq('catalog_program_id',grant.catalog_program_id);
    fail(linked);
    const ids=(linked.data||[]).map((p:any)=>p.id);
    if(ids.some((id:string)=>desired.has(id))) continue;
    const revoked=await db.from('program_user_access').update({status:'revoked',updated_at:now()})
      .eq('organization_id',orgId).eq('user_id',userId).eq('catalog_program_id',grant.catalog_program_id).eq('status','active');
    fail(revoked);
  }

  for(const permission of permissions || []) {
    if (!permission?.showId) continue;
    const role=permission.role==='executive'?'executive':permission.canEditEditorial?'producer':'editor';
    await upsertProgramMembership(orgId,permission.showId,userId,{
      canView:permission.canView!==false,canEditEditorial:permission.canEditEditorial===true,
      canEditScript:permission.canEditScript===true,canOperateStudio:permission.canOperateStudio===true,
      canManageSchedule:permission.canManageSchedule===true,canManageAssets:permission.canManageAssets===true,
      canExport:permission.canExport===true
    },role,actorUserId);
  }
  const users:any[]=await authUsers(); return mapUser(users.find((u:any)=>u.id===userId)||{},orgId);
}
export async function updateOrganizationUserStatusOrRole(orgId:string,userId:string,input:any,actorUserId?:string){const r=await db.from('organization_members').update({role:input.role,active:input.status!=='suspended',updated_at:now()}).eq('organization_id',orgId).eq('user_id',userId).select('*').single();fail(r);return r.data;}
export async function listSaaSPlans(){const r=await db.from('commercial_plans').select('*').eq('active',true).order('price_cents');fail(r);return (r.data||[]).map((x:any):SaaSPlanDefinition=>({id:x.code,name:x.name,tagline:x.description,maxShows:999,maxUsers:999,monthlyPriceCents:x.price_cents||0,features:[]}));}
export async function listOrganizationSubscriptions(orgId:string){const r=await db.from('organization_subscriptions').select('*,commercial_plans(*)').eq('organization_id',orgId).order('created_at',{ascending:false});fail(r);return (r.data||[]).map((x:any):SaaSSubscription=>({id:x.id,organizationId:orgId,planId:x.commercial_plans?.code||'rsplay_programa_individual',planName:x.commercial_plans?.name||'',billingCycle:x.commercial_plans?.billing_period==='annual'?'annual':'monthly',amountCents:x.commercial_plans?.price_cents||0,currency:x.commercial_plans?.currency||'BRL',status:x.status==='active'?'active':x.status==='trial'?'trialing':'suspended',autoRenew:true,paymentGateway:'',paymentMethodType:'credit_card',paymentMethodLast4:'',paymentMethodBrand:'',gatewayCustomerId:'',gatewaySubscriptionId:'',currentPeriodStart:x.starts_at,currentPeriodEnd:x.ends_at||x.starts_at,lastRenewalAt:undefined,canceledAt:undefined,createdAt:x.created_at,updatedAt:x.updated_at}));}
export async function listBillingInvoices(_orgId?:string){return [] as BillingInvoice[];}
export async function listPaymentGatewayEvents(_orgId?:string){return [] as PaymentGatewayEvent[];}
export async function subscribeOrUpdatePlan(_orgId:string,_input:any,_userId:string){throw new AppError(410,'CONFLICT','A contratação simulada foi desativada. Use o checkout PIX do VenoPag; a assinatura só é criada após confirmação do pagamento.');}
export async function toggleSubscriptionAutoRenew(_orgId?:string,_id?:string,_autoRenew?:boolean,_userId?:string){throw new AppError(410,'CONFLICT','Renovação automática não está disponível na integração inicial VenoPag PIX.');}
export async function processAutomaticRenewalCycle(_orgId:string,_id:string,_simulateFailure?:boolean,_userId?:string){throw new AppError(410,'CONFLICT','Renovação simulada foi desativada. A integração inicial VenoPag cobre cobranças PIX avulsas.');}
export async function buildAdminReportSummary(orgId:string):Promise<AdminReportSummary>{const [subs,users,shows]=await Promise.all([listOrganizationSubscriptions(orgId),listOrganizationUsersWithPermissions(orgId),listShows(orgId)]);return {mrrCents:subs.reduce((a,x)=>a+x.amountCents,0),activeSubscriptionsCount:subs.filter(x=>x.status==='active').length,autoRenewEnabledCount:subs.filter(x=>x.autoRenew).length,paidInvoicesTotalCents:0,pendingInvoicesTotalCents:0,usersCount:users.length,showsReport:await Promise.all(shows.map(async s=>({showId:s.id,showTitle:s.title,format:s.format,host:s.host,episodesCount:(await listEpisodes(orgId,s.id)).length,publishedOrReadyCount:(await listEpisodes(orgId,s.id)).filter(e=>e.status==='published'||e.status==='ready').length,totalPlannedMinutes:0,scheduledSessionsCount:(await listScheduleEvents(orgId,s.id)).length,authorizedUsersCount:users.length})))};}
export async function populateOrganizationWorkspace(){return true;}
export async function registerSaaSAccountWithSubscription(payload:SaaSRegistrationPayload,organizationId:string){
  let programSpec:any;
  let existingProgram:any;

  if(payload.showMode==='knowledge_base'&&payload.knowledgeBaseSlug){
    const catalog=await db.from('program_catalog')
      .select('id,slug,name,description,host,format,active,contractable')
      .eq('slug',payload.knowledgeBaseSlug).eq('active',true).single();
    fail(catalog);
    if(!catalog.data.contractable) throw new AppError(409,'CONFLICT','Este programa do catálogo não está disponível para contratação.');
    programSpec={title:catalog.data.name,description:catalog.data.description||'',host:catalog.data.host||'',format:catalog.data.format||'Outro',catalogProgramId:catalog.data.id};
  }else if(payload.showMode==='new'&&payload.newShowTitle?.trim()){
    programSpec={title:payload.newShowTitle.trim(),host:payload.newShowHost||'',format:payload.newShowFormat||'Outro'};
  }else if(payload.showMode==='existing'&&payload.existingShowId){
    existingProgram=await one('programs',payload.existingShowId);
    if(!existingProgram||existingProgram.organization_id!==organizationId) throw new AppError(404,'NOT_FOUND','Programa existente não encontrado nesta organização.');
    if(existingProgram.executive_user_id) throw new AppError(403,'CONFLICT','Este programa já possui um diretor executivo responsável. Solicite autorização para integrar a equipe.');
  }else{
    throw new AppError(400,'VALIDATION_ERROR','Selecione um programa do catálogo, um programa autoral ou um programa existente autorizado.');
  }

  const user=await createOrganizationUserWithShowPermissions(organizationId,{
    email:payload.email,name:payload.name,loginCode:payload.loginCode,jobTitle:payload.jobTitle,role:payload.role||'producer'
  });

  try{
    let show:Show|undefined;
    if(existingProgram){
      const updated=await db.from('programs').update({executive_user_id:user.id,updated_at:now()})
        .eq('id',existingProgram.id).is('executive_user_id',null).select('*').single();
      fail(updated);
      await upsertProgramMembership(organizationId,updated.data.legacy_id||updated.data.id,user.id,{
        canView:true,canEditEditorial:false,canEditScript:false,canOperateStudio:false,
        canManageSchedule:false,canManageAssets:false,canExport:false
      },'executive',user.id,'pending');
      show=await mapShow(updated.data);
    }else{
      show=await createShow(organizationId,programSpec,user.id);
    }
    return {user,show,subscription:undefined,invoice:undefined,gatewayEvent:undefined};
  }catch(error){
    await db.from('organization_members').delete().eq('organization_id',organizationId).eq('user_id',user.id);
    await db.auth.admin.deleteUser(user.id);
    throw error;
  }
}
