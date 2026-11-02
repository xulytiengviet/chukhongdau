const fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const ctx=vm.createContext({performance});vm.runInContext(fs.readFileSync(__dirname+'/restorer-core.js','utf8')+fs.readFileSync(__dirname+'/app.js','utf8'),ctx);
const {BigramRestorer,validateAI,RevisionGate}=ctx.RestorationCore;
const model=JSON.parse(zlib.gunzipSync(fs.readFileSync(__dirname+'/models/underthesea-bigram-v1.json.gz')));
const started=performance.now(),engine=new BigramRestorer(model),initMs=performance.now()-started;
const clean=s=>ctx.cleanASCII(s),restore=s=>engine.restore(s).restored;
assert.equal(clean('Đặng Thị Ánh — “Việt Nam” 😊\u200b\u0000'),'Dang Thi Anh - "Viet Nam" ');
assert.equal(clean('a\r\nb\tc'),'a\nb\tc');assert.equal(clean('Tiếng Việt'),'Tieng Viet');
for(let i=0;i<65536;i++){const output=clean(String.fromCharCode(i));assert.match(output,/^[\x20-\x7e\n\t]*$/);assert.equal(clean(output),output);}
const cases=[
 ['Hom nay troi dep qua','Hôm nay trời đẹp quá'],
 ['HOM NAY TROI DEP QUA!','HÔM NAY TRỜI ĐẸP QUÁ!'],
 ['Hom   nay troi dep\tqua','Hôm   nay trời đẹp\tquá'],
 ['Hom qua toi di qua truong hoc.','Hôm qua tôi đi qua trường học.'],
 ['Toi mua doi dep moi.','Tôi mua đôi dép mới.'],
 ['chung ta co the lam duoc','chúng ta có thể làm được'],
 ['Ha Noi la thu do cua Viet Nam','Hà Nội là thủ đô của Việt Nam'],
 ['toi co 2 con meo.','tôi có 2 con mèo.'],
 ['Hôm nay troi đẹp qua','Hôm nay trời đẹp quá'],
 ['Hôm nay trời đẹp quá','Hôm nay trời đẹp quá'],
 ['Toi yeu tieng Viet.','Tôi yêu tiếng Việt.'],
 ['email cua toi la test@gmail.com','email của tôi là test@gmail.com'],
 ['search for the test','search for the test'],
 ['format the document','format the document'],
 ['toi can format van ban','tôi cần format văn bản'],
 ['https://viet.vn/ban?co=1 cam.on@example.com ma_01 A123 12.50 01/02/2026','https://viet.vn/ban?co=1 cam.on@example.com ma_01 A123 12.50 01/02/2026'],
 ['xyzzy','xyzzy'],['',''],[' \n\t',' \n\t'],
 ['Tiếng Việt','Tiếng Việt']
];
for(const [input,expected] of cases){assert.equal(restore(input),expected,input);assert.equal(clean(restore(input)),clean(input));}
assert.equal(engine.restore('xyzzy xyzzy').unknown.length,1);
// Viterbi must use future evidence: the most frequent initial candidate is not optimal.
const toy=new BigramRestorer({format:1,words:['a','á','b'],counts:[100,10,100],bigrams:[[1,2,10]]});
assert.equal(toy.restore('a b').restored,'á b');
assert.equal(toy.restore('a\nb').restored,'a\nb');
assert.equal(toy.restore('a,b').restored,'a,b');
assert.equal(validateAI('Hom nay','Hôm nay'),'Hôm nay');
for(const [a,b] of [['toi','tôi!'],['toi','tôi đi'],['Hôm','Hồm'],['search','séarch'],['https://a.vn','https://á.vn']])assert.throws(()=>validateAI(a,b));
const gate=new RevisionGate(),old=gate.begin('old'),fresh=gate.begin('new');assert.equal(gate.current(old),false);assert.equal(gate.current(fresh),true);gate.begin('');assert.equal(gate.current(fresh),false);
const times=[];for(let i=0;i<500;i++){const t=performance.now();restore(cases[i%15][0]);times.push(performance.now()-t);}times.sort((a,b)=>a-b);
const long='Hom nay troi dep qua. '.repeat(900);const t=performance.now();assert.equal(clean(restore(long)),long);const longMs=performance.now()-t;
console.log(JSON.stringify({tests:'PASS',cases:cases.length,model:{unigrams:model.words.length,bigrams:model.bigrams.length},initMs,p50Ms:times[250],p95Ms:times[475],longChars:long.length,longMs,environment:process.version},null,2));
