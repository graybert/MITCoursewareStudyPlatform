import fs from 'node:fs';
import path from 'node:path';
import { importCourse } from '../lib/importer';
const base=process.cwd();const roots=[...fs.readdirSync(base).filter(n=>fs.existsSync(path.join(base,n,'data.json'))),...(fs.existsSync('courses')?fs.readdirSync('courses').filter(n=>fs.existsSync(path.join('courses',n,'data.json'))).map(n=>`courses/${n}`):[])];
fs.mkdirSync('generated/reports',{recursive:true});const courses=roots.map(root=>{const {course,report}=importCourse(path.join(base,root),root);fs.writeFileSync(`generated/reports/${course.id}.json`,JSON.stringify(report,null,2));console.log(`${course.id}: ${course.items.length} items, ${course.resources.length} resources\n${report.warnings.join('\n')}`);return course;});fs.writeFileSync('generated/courses.json',JSON.stringify(courses,null,2));
if(process.argv.includes('--inspect')){const id=process.argv.at(-1);if(id&&id!=='--inspect'){const p=`generated/reports/${id}.json`;if(!fs.existsSync(p))throw Error(`Unknown course ${id}`);console.log(fs.readFileSync(p,'utf8'));}}
