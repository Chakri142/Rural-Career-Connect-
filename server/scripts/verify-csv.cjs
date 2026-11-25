// Test the exact CSV expression used in both website editions without a browser.
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
for (const file of [path.join(__dirname,'../src/main/resources/static/app.js'),path.join(__dirname,'../../index.html')]) {
  if(!fs.existsSync(file)){console.log('SKIP (file not present): '+file);continue;}
  const s=fs.readFileSync(file,'utf8'),start=s.indexOf('["Metric,Count\\n" + d.map('),end=s.indexOf('],\n              { type: "text/csv" }',start);
  assert(start>=0 && end>start,'CSV implementation not found in '+file);
  const blobParts=Function('d','return '+s.slice(start,end+1))([['=1+1',2],['  @x',3],['-x',4],['+x',5],['a,"b"\nline',6],['normal',7]]);
  const out=blobParts[0];assert(out.includes('"\'=1+1",'));assert(out.includes('"\'  @x",'));assert(out.includes('"\'-x",'));assert(out.includes('"\'+x",'));assert(out.includes('"a,""b""\nline"'));assert(out.includes('"normal","7"'));
  console.log('PASS: CSV formula prefixes and quote/newline escaping in '+file);
}
