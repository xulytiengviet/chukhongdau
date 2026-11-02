const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(__dirname+'/dictionary.js','utf8')+fs.readFileSync(__dirname+'/app.js','utf8'),ctx);
const clean=s=>ctx.cleanASCII(s),restore=s=>ctx.restoreLocal(s);
assert.equal(clean('Đặng Thị Ánh — “Việt Nam” 😊\u200b\u0000'),'Dang Thi Anh - "Viet Nam" ');
assert.equal(clean('a\r\nb\tc'),'a\nb\tc');assert.equal(clean('Tiếng Việt'),'Tieng Viet');
assert.equal(restore('Xin chao, cam on ban!'),'Xin chào, cảm ơn bạn!');
assert.equal(restore('Toi yeu tieng Viet.'),'Tôi yêu tiếng Việt.');
assert.equal(restore('HOP DONG'),'HỢP ĐỒNG');
for(let i=0;i<65536;i++){const output=clean(String.fromCharCode(i));assert.match(output,/^[\x20-\x7e\n\t]*$/);assert.equal(clean(output),output);}
assert.equal(clean(restore('Hop dong nay duoc lap ngay 02 thang 11.')),'Hop dong nay duoc lap ngay 02 thang 11.');
console.log('PASS: all BMP code points sanitized, idempotence, Vietnamese, case, whitespace and restoration.');

const cases=[
 ['Hom nay troi dep qua','Hôm nay trời đẹp quá'],
 ['HOM NAY TROI DEP QUA!','HÔM NAY TRỜI ĐẸP QUÁ!'],
 ['Hom   nay troi dep\tqua','Hôm   nay trời đẹp\tquá'],
 ['Hom qua toi di qua truong hoc.','Hôm qua tôi đi qua trường học.'],
 ['Co giao noi ban co the di hoc.','Cô giáo nói bạn có thể đi học.'],
 ['Toi hoc cong nghe thong tin.','Tôi học công nghệ thông tin.'],
 ['https://viet.vn/ban?co=1 cam.on@example.com ma_01 A123','https://viet.vn/ban?co=1 cam.on@example.com ma_01 A123'],
 ['xyzzy','xyzzy']
];
for(const [input,expected] of cases){assert.equal(restore(input),expected);assert.equal(clean(restore(input)),input);}
assert.equal(ctx.restoreDetailed('xyzzy xyzzy').unknown.length,1);
console.log('PASS: reported sentence, ambiguity, whitespace, casing, identifiers, unknown reporting.');
