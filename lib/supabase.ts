import { createClient } from '@supabase/supabase-js';
import { emptyState, StudyState, StudyStorage } from './study';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase=url&&key?createClient(url,key):null;
export const cloudStorage:StudyStorage={async load(){const {data:{user}}=await supabase!.auth.getUser();if(!user)throw Error('Sign in to sync.');const {data,error}=await supabase!.from('study_state').select('state').eq('user_id',user.id).maybeSingle();if(error)throw error;return data?{...emptyState(),...data.state}:emptyState();},async save(state:StudyState){const {data:{user}}=await supabase!.auth.getUser();if(!user)throw Error('Sign in to sync.');const {error}=await supabase!.from('study_state').upsert({user_id:user.id,state,updated_at:new Date().toISOString()});if(error)throw error;}};
