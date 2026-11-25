/* Integration regression against a DISPOSABLE seeded installation only.
   Requires Playwright's API client and RCC_ADMIN_PASSWORD in the environment.
   Creates accounts, jobs, applications and alters a test account's status. */
const {request} = require('playwright');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const base = process.env.TEST_URL || 'http://localhost:8080';
const suffix = crypto.randomBytes(6).toString('hex');
const pw = crypto.randomBytes(16).toString('hex');
(async()=>{
  if(!process.env.RCC_ADMIN_PASSWORD) throw Error('Set RCC_ADMIN_PASSWORD for the disposable seed account.');
  const contexts = [];
  async function client(){ const c=await request.newContext({baseURL:base});contexts.push(c);return c; }
  async function call(c,path,method='GET',body,withCsrf=true){
    const opts={method}; if(body!==undefined) opts.data=body;
    if(withCsrf && method!=='GET') {const x=await (await c.get('/api/session')).json();opts.headers={[x.csrfHeader]:x.csrf};}
    return c.fetch('/api'+path,opts);
  }
  let sequence=0;
  async function reg(c,role){
    const b={name:'Security fixture',email:`security-${role.toLowerCase()}-${++sequence}-${suffix}@example.test`,mobile:'9000000011',password:pw,confirm:pw,role,
      location:'Kanchipuram',qualification:'B.Com.',company:'Fixture Employer',industry:'Services',address:'Kanchipuram'};
    const r=await call(c,'/register','POST',b);assert.equal(r.status(),200,await r.text());return (await r.json()).id;
  }
  const s=await client(), e=await client(), other=await client(), a=await client(), anon=await client();
  const sid=await reg(s,'SEEKER'), eid=await reg(e,'EMPLOYER'); await reg(other,'EMPLOYER');
  let r=await call(anon,'/register','POST',{role:'ADMIN'});assert.equal(r.status(),400);
  assert.equal((await call(anon,'/workspace')).status(),401);
  assert.equal((await call(s,'/vacancy','POST',{})).status(),403);
  assert.equal((await call(s,'/user/'+eid+'/toggle','POST')).status(),403);
  assert.equal((await call(e,'/resume/'+sid)).status(),403);
  assert.equal((await call(other,'/resume/'+sid)).status(),403);
  assert.equal((await call(s,'/vacancy','POST',{},false)).status(),403);
  console.log('PASS: anonymous, cross-role, unrelated résumé and CSRF denials; public admin registration blocked');
  let vacancy={title:'Security fixture '+suffix,description:'Sample test role',responsibilities:'Test only',qualification:'B.Com.',experience:'Entry level',location:'Kanchipuram',category:'Office Jobs',type:'Full-time',salary:'',deadline:new Date(Date.now()+30*864e5).toISOString().slice(0,10),publication:'Published',skills:['Excel','Typing']};
  r=await call(e,'/vacancy','POST',vacancy);assert.equal(r.status(),200,await r.text()); const jid=(await r.json()).id;
  assert.equal((await call(other,'/vacancy/'+jid,'PUT',vacancy)).status(),403);
  assert.equal((await call(other,'/vacancy/'+jid+'/close','POST',{})).status(),403);
  const csrf=await (await s.get('/api/session')).json();
  const opts={headers:{[csrf.csrfHeader]:csrf.csrf},data:{}};
  const parallel=await Promise.all([s.post('/api/apply/'+jid,opts),s.post('/api/apply/'+jid,opts)]);
  assert.deepEqual(parallel.map(x=>x.status()).sort(),[200,409]);
  let ws=await (await s.get('/api/workspace')).json(); const apps=ws.apps.filter(x=>x.job_id===jid);assert.equal(apps.length,1);const aid=apps[0].id;
  assert.equal((await call(other,'/application/'+aid,'PUT',{status:'Rejected'})).status(),403);
  assert.equal((await call(s,'/application/'+aid,'PUT',{status:'Selected'})).status(),403);
  assert.equal((await call(e,'/application/'+aid,'PUT',{status:'Nope'})).status(),400);
  assert.equal((await call(e,'/application/'+aid,'PUT',{status:'Shortlisted'})).status(),200);
  ws=await (await s.get('/api/workspace')).json();assert.equal(ws.apps.find(x=>x.id===aid).status,'Shortlisted');
  console.log('PASS: ownership, simultaneous duplicate apply (200/409), status validation and isolated decision');
  let token=await (await s.get('/api/session')).json();
  r=await s.post('/api/resume',{headers:{[token.csrfHeader]:token.csrf},multipart:{file:{name:'fake.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-not-a-valid-pdf')}}});assert.equal(r.status(),400);
  let ls=await call(a,'/login','POST',{role:'ADMIN',email:process.env.RCC_ADMIN_EMAIL||'admin@example.test',password:process.env.RCC_ADMIN_PASSWORD});assert.equal(ls.status(),200,await ls.text());
  assert.equal((await call(a,'/user/'+sid+'/toggle','POST',{})).status(),200);
  assert([401,403].includes((await call(s,'/workspace')).status()));
  assert.equal((await call(a,'/user/'+sid+'/toggle','POST',{})).status(),200);
  console.log('PASS: malformed PDF rejected; disabled-account session blocked');
  // This destroys the session; actual 30-minute inactivity expiration requires a separate time-based test.
  assert.equal((await call(e,'/logout','POST',{})).status(),200);
  assert.equal((await call(e,'/workspace')).status(),401);
  console.log('PASS: logout invalidates session');
  // Last test intentionally exhausts local peer bucket; run this script last or restart the test server afterward.
  let statuses=[];for(let i=0;i<11;i++) statuses.push((await call(anon,'/login','POST',{role:'SEEKER',email:`missing-${suffix}@example.test`,password:'incorrect'})).status());
  assert(statuses.includes(429),JSON.stringify(statuses));
  console.log('PASS: repeated login attempts receive HTTP 429');
  for (const c of contexts) await c.dispose();
})().catch(e=>{console.error(e);process.exit(1)});
