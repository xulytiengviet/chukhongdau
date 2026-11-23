// Run from the repository root. Optional argument: a baseline restorer-core.js.
const fs = require('node:fs');
const vm = require('node:vm');
const zlib = require('node:zlib');
const assert = require('node:assert/strict');
function load(path) {
  const context = vm.createContext({performance});
  vm.runInContext(fs.readFileSync(path, 'utf8'), context);
  return context.RestorationCore;
}
const core = load('site/restorer-core.js');
const baseline = process.argv[2] ? load(process.argv[2]) : core;
const model = JSON.parse(zlib.gunzipSync(fs.readFileSync('site/models/underthesea-bigram-v1.json.gz')));
const old = new baseline.BigramRestorer(model);
const current = new core.BigramRestorer(model);
const gold = fs.readFileSync('benchmarks/data/diacritic_eval_v0.txt','utf8').split(/\r?\n/)
  .map(line=>line.trim()).filter(line=>line && !line.startsWith('#'));
const abbreviations = {'không':'ko','được':'dc','gì':'j','bác sĩ':'bs','bệnh viện':'bv','như thế nào':'ntn',
  'mọi người':'mn','mình':'mik','cũng':'cx','trước':'trc','cảm ơn':'tks'};
const pattern = new RegExp('(?<![\\p{L}\\d_])('+Object.keys(abbreviations).join('|')+')(?![\\p{L}\\d_])','giu');
function distance(a,b) {
  let row = Array.from({length:b.length+1},(_,i)=>i);
  for (const word of a) {
    const next=[row[0]+1];
    for(let i=0;i<b.length;i++) next.push(Math.min(row[i+1]+1,next[i]+1,row[i]+Number(word!==b[i])));
    row=next;
  }
  return row[b.length];
}
const results={};
for(const variant of ['plain','chat']){
  let sentences=0, words=0, before=0, after=0, exactBefore=0, exactAfter=0;
  for(const reference of gold){
    const noisy=reference.replace(pattern,word=>{
      const short=abbreviations[word.toLowerCase()];
      return word[0]===word[0].toUpperCase()?short[0].toUpperCase()+short.slice(1):short;
    });
    if(variant==='chat' && noisy===reference)continue;
    const input=core.strip(variant==='chat'?noisy:reference);
    const outputs=[old.restore(input).restored,current.restore(core.expandChat(input).normalized).restored];
    const tokens=reference.split(/\s+/);
    const errors=outputs.map(output=>distance(tokens,output.split(/\s+/)));
    words+=tokens.length;sentences++;before+=errors[0];after+=errors[1];
    exactBefore+=Number(outputs[0]===reference);exactAfter+=Number(outputs[1]===reference);
  }
  results[variant]={sentences,words,before,after,exactBefore,exactAfter};
}
console.log(results);
assert.equal(results.plain.after,results.plain.before);
assert.ok(results.chat.after<results.chat.before);
