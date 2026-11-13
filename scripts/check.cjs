const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');let count=0;
function check(directory){
 for(const entry of fs.readdirSync(path.join(root,directory),{withFileTypes:true})){
  const file=path.join(directory,entry.name);
  if(entry.isDirectory())check(file);
  else if(/\.(?:js|cjs)$/.test(file)){execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'inherit'});count++}
 }
}
for(const directory of ['public','server','tests','scripts'])check(directory);
console.log(`PASS: syntax checked ${count} JavaScript files`);
