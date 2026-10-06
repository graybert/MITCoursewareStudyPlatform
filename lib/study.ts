import { Course } from './schema';
export interface Note { id:string; courseId:string; itemId?:string; resourceId?:string; text:string; updatedAt:string }
export interface Bookmark { id:string; courseId:string; itemId?:string; resourceId?:string; label:string; createdAt:string }
export interface Progress { completed:boolean; openedAt:string; completedAt?:string }
export interface StudyState { progress:Record<string,Progress>; positions:Record<string,string>; notes:Note[]; bookmarks:Bookmark[]; theme:string }
export const emptyState=():StudyState=>({progress:{},positions:{},notes:[],bookmarks:[],theme:'dark'});
export const progressKey=(course:string,item:string)=>`${course}/${item}`;
export function percentage(course:Course,state:StudyState){return course.items.length?Math.round(course.items.filter(i=>state.progress[progressKey(course.id,i.id)]?.completed).length/course.items.length*100):0;}
export function resumeItem(course:Course,state:StudyState){const current=course.items.find(i=>i.id===state.positions[course.id]);return current&&!state.progress[progressKey(course.id,current.id)]?.completed?current:course.items.find(i=>!state.progress[progressKey(course.id,i.id)]?.completed)||course.items.at(-1)!;}
export interface StudyStorage { load():Promise<StudyState>; save(state:StudyState):Promise<void> }
export const localStorageAdapter:StudyStorage={async load(){const raw=localStorage.getItem('ocw-study-v1');if(!raw)return emptyState();try{return {...emptyState(),...JSON.parse(raw)};}catch{throw Error('Saved study data could not be read. Export or repair browser storage before saving.');}},async save(state){localStorage.setItem('ocw-study-v1',JSON.stringify(state));}};
