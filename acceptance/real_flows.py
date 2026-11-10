#!/usr/bin/env python3
"""Real packaged userscript + Tampermonkey + isolated Komga acceptance.
Only local synthetic books are modified. Provider data is genuinely fetched.
"""
import hashlib,json,time,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
import e2e as h

FIELDS={'title':'标题（默认不改）','summary':'简介','publisher':'出版社','language':'语言','status':'状态','ageRating':'年龄','tags':'标签','genres':'类型','links':'链接','alternateTitles':'别名','releaseDate':'发行日','isbn':'ISBN','authors':'作者'}


def api(page,path,method='GET',body=None):
 return page.evaluate('''async x=>{const r=await fetch('/api/v1'+x.path,{method:x.method,credentials:'include',headers:x.body===null?{}:{'Content-Type':'application/json'},body:x.body===null?undefined:JSON.stringify(x.body)});const t=await r.text();if(!r.ok)throw Error(x.method+' '+x.path+' HTTP '+r.status);return t?JSON.parse(t):null}''',{'path':path,'method':method,'body':body})


def metadata(page,kind,id):return api(page,f'/{kind}/{id}')['metadata']

def patch_metadata(page,kind,id,body):return api(page,f'/{kind}/{id}/metadata','PATCH',body)


def source_record(page,series_id):
 page.goto(h.BASE_URL+'/series/'+series_id)
 h.open_product_panel(page)
 panel=page.locator('#komga-metadata-panel')
 panel.get_by_text('通过链接或 ID 读取',exact=True).click()
 panel.get_by_role('textbox',name='来源链接或 ID').fill('https://bgm.tv/subject/305429')
 panel.get_by_role('combobox',name='来源',exact=True).select_option('bangumi')
 panel.get_by_role('button',name='读取',exact=True).click()
 panel.get_by_role('heading',name='bangumi · 葬送のフリーレン',exact=True).wait_for(timeout=45000)
 return panel


def select_fields(panel,fields):
 for key,label in FIELDS.items():panel.get_by_role('checkbox',name=label,exact=True).set_checked(key in fields)
 panel.get_by_role('checkbox',name='将作者同步到系列内所有书籍',exact=True).set_checked('authors' in fields)


def preview(panel):
 panel.get_by_role('button',name='生成预览',exact=True).click()
 panel.get_by_role('heading',name='确认更改',exact=True).wait_for(timeout=20000)


def wait_action(page,button,allow_partial=False):
 panel=page.locator('#komga-metadata-panel');panel.get_by_role('button',name=button,exact=True).click()
 deadline=time.monotonic()+35
 while time.monotonic()<deadline:
  if panel.count()==0:return 'success'
  state=panel.locator('p[data-state]').evaluate_all('(es)=>es.map(e=>({state:e.dataset.state,text:e.textContent}))')
  terminal=[x for x in state if x['state'] in ('success','error','partial')]
  if terminal:
   x=terminal[-1]
   if x['state']=='success':
    panel.wait_for(state='detached',timeout=8000);return 'success'
   if allow_partial:return x['text']
   raise AssertionError('UI action failed: '+x['text'])
  page.wait_for_timeout(100)
 raise AssertionError('UI action did not finish: '+button)


def displayed_hash(page,kind,id):
 return page.evaluate('''async p => {const r=await fetch('/api/v1'+p+'?_verify='+Date.now(),{cache:'no-store'});if(r.status===404)return null;if(!r.ok)throw Error('Thumbnail '+r.status);const hash=await crypto.subtle.digest('SHA-256',await r.arrayBuffer());return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');}''',f'/{kind}/{id}/thumbnail')

def run():
 report={'status':'FAIL','artifact_sha256':hashlib.sha256(h.ARTIFACT.read_bytes()).hexdigest(),'checks':[],'environment':{'manager':'Tampermonkey 5.5','server':'isolated Komga 1.30.0','transport':'real GM + browser session'}}
 state=h.read_json(h.STATE);series_id,oneshot_id,books=h.fixture_ids(state);one_book=next(b['id'] for b in state['books'] if b['seriesId']==oneshot_id)
 report_dir=h.RUNTIME/'acceptance';report_dir.mkdir(exist_ok=True)
 originals=[]
 with sync_playwright() as pw:
  ctx=pw.chromium.launch_persistent_context(str(h.PROFILE),channel='chromium',headless=True,args=[f'--disable-extensions-except={h.EXTENSION}',f'--load-extension={h.EXTENSION}'])
  report['environment']['browser']=ctx.browser.version
  page=None
  try:
   eid=h.extension_id_from(ctx);h.import_userscript(ctx,eid)
   page=ctx.new_page();page.goto(h.BASE_URL+'/login');h.login_if_needed(page,h.read_json(h.CONFIG))
   report['checks'].append('Actual production bundle installed and logged into isolated Komga')
   for kind,id in [('series',series_id),('series',oneshot_id),*[('books',x) for x in books+[one_book]]]:
    originals.append((kind,id,metadata(page,kind,id)))
   patch_metadata(page,'series',series_id,{'summary':'Acceptance locked summary','summaryLock':True,'titleLock':True,'tags':['Existing:Tag'],'tagsLock':False})
   patch_metadata(page,'books',books[0],{'authors':[{'name':'Locked author','role':'writer'}],'authorsLock':True})
   patch_metadata(page,'books',books[1],{'authors':[{'name':'Existing author','role':'writer'}],'authorsLock':False})
   before=metadata(page,'series',series_id);old0=metadata(page,'books',books[0]);old1=metadata(page,'books',books[1])
   panel=source_record(page,series_id);select_fields(panel,{'summary','tags','authors'});preview(panel)
   page.screenshot(path=str(report_dir/'real-locked-preview.png'),full_page=True)
   wait_action(page,'应用')
   after=metadata(page,'series',series_id);a0=metadata(page,'books',books[0]);a1=metadata(page,'books',books[1])
   assert after['title']==before['title'] and after['summary']==before['summary']
   assert set(before['tags']).issubset(after['tags']) and len(after['tags'])>len(before['tags'])
   assert a0['authors']==old0['authors'] and len(a1['authors'])>len(old1['authors'])
   report['checks'].append('Live Bangumi detail -> preview -> real PATCH -> GET: locked title/summary/authors preserved; original tags retained; native authors propagated to unlocked book')
   h.open_product_panel(page);wait_action(page,'撤销最近写入')
   assert metadata(page,'series',series_id)['tags']==before['tags']
   assert metadata(page,'books',books[1])['authors']==old1['authors']
   report['checks'].append('Undo via actual UI restores only fields written by this run')
   for sid,target,kind,tid in [(series_id,'series','series',series_id),(series_id,'book','books',books[1]),(oneshot_id,'book','books',one_book)]:
    panel=source_record(page,sid);select_fields(panel,{'tags'} if sid==oneshot_id else set())
    if kind=='books' and sid!=oneshot_id:panel.get_by_role('combobox',name='同时更新哪本书',exact=True).select_option(tid)
    cover=panel.get_by_role('combobox',name='使用哪张封面',exact=True)
    cover.select_option(index=1)
    targets=panel.get_by_role('combobox',name='替换哪个封面',exact=True)
    options=targets.locator('option').evaluate_all('(es)=>es.map(e=>({v:e.value,t:e.textContent}))')
    value='both' if sid==oneshot_id else f'{kind}:{tid}'
    assert value in [x['v'] for x in options],options
    targets.select_option(value)
    pairs=[('series',sid),('books',tid)] if sid==oneshot_id else [(kind,tid)]
    before_covers={(k,i):api(page,f'/{k}/{i}/thumbnails') for k,i in pairs}
    before_display={(k,i):displayed_hash(page,k,i) for k,i in pairs}
    before_tags={(k,i):metadata(page,k,i).get('tags',[]) for k,i in pairs}
    preview(panel);wait_action(page,'应用')
    for k,i in pairs:
     thumbnails=before_covers[k,i];selected=next((x['id'] for x in thumbnails if x['selected']),None)
     now=api(page,f'/{k}/{i}/thumbnails')
     if sid==oneshot_id and k=='series':assert now==thumbnails and displayed_hash(page,k,i)==displayed_hash(page,'books',tid)
     else:
      new=next(x['id'] for x in now if x['selected']);assert new!=selected and len(now)==len(thumbnails)+1
     if sid==oneshot_id:assert len(metadata(page,k,i)['tags'])>len(before_tags[k,i])
    h.open_product_panel(page);wait_action(page,'撤销最近写入')
    for k,i in pairs:
     thumbnails=before_covers[k,i];selected=next((x['id'] for x in thumbnails if x['selected']),None)
     restored=api(page,f'/{k}/{i}/thumbnails')
     assert {x['id'] for x in restored}=={x['id'] for x in thumbnails}
     assert next((x['id'] for x in restored if x['selected']),None)==selected
     assert displayed_hash(page,k,i)==before_display[k,i]
     if sid==oneshot_id:assert metadata(page,k,i)['tags']==before_tags[k,i]
    report['checks'].append('Live cover download/upload/readback/select/undo: '+('One-Shot book upload -> BOTH displayed-cover SHA256 match; BOTH metadata targets updated and restored' if sid==oneshot_id else kind))
   # Real concurrent edit after preview must block overwriting newer data.
   panel=source_record(page,series_id);select_fields(panel,{'tags'});preview(panel)
   manual=['Concurrent:Owner'];patch_metadata(page,'series',series_id,{'tags':manual})
   manual=metadata(page,'series',series_id)['tags']
   error=wait_action(page,'应用',True)
   assert '变化' in error and metadata(page,'series',series_id)['tags']==manual
   report['checks'].append('Stale preview conflict preserves newer manually-written values')
   # Fail one actual target request. Other successes must be reported as partial.
   panel=source_record(page,series_id);select_fields(panel,{'tags','authors'});preview(panel)
   path=f'**/api/v1/books/{books[1]}/metadata'
   page.route(path,lambda route:route.fulfill(status=503,content_type='application/json',body='{"error":"injected acceptance failure"}') if route.request.method=='PATCH' else route.continue_())
   outcome=wait_action(page,'应用',True);page.unroute(path)
   assert '部分' in outcome or '失败' in outcome
   assert metadata(page,'books',books[1])['authors']==old1['authors']
   assert page.locator('#komga-metadata-panel').count()==1
   report['checks'].append('Injected HTTP 503 produces persistent partial/error state, not a false green success')
   report['status']='PASS'
  except Exception as e:
   report['failure']=str(e);report['traceback']=traceback.format_exc(limit=3)
   if page:
    page.screenshot(path=str(report_dir/'real-flow-failed.png'),full_page=True)
    report['ui_state']=page.evaluate("document.querySelector('#komga-metadata-panel')?.shadowRoot?.querySelector('section')?.innerText || ''")[:5000]
  finally:
   if page:
    restore_errors=[]
    for kind,id,m in reversed(originals):
     fields=['title','titleLock','summary','summaryLock','tags','tagsLock','authors','authorsLock'] if kind=='books' else ['title','titleLock','summary','summaryLock','tags','tagsLock']
     try:patch_metadata(page,kind,id,{k:m.get(k,False if k.endswith('Lock') else None) for k in fields})
     except Exception as e:restore_errors.append(str(e))
    report['fixture_restore_errors']=restore_errors
    if restore_errors:report['status']='FAIL'
   ctx.close()
 report['completed_at']=time.strftime('%Y-%m-%dT%H:%M:%S%z')
 (report_dir/'real-flows.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps(report,ensure_ascii=False,indent=2));return 0 if report['status']=='PASS' else 1

if __name__=='__main__':raise SystemExit(run())
