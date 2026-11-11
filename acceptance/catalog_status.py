#!/usr/bin/env python3
"""Real manager, public concurrent downloads: only provider-local task status."""
import hashlib,json
from playwright.sync_api import sync_playwright,expect
import e2e as h

def run():
 out=h.RUNTIME/'acceptance'/'catalog-status';out.mkdir(parents=True,exist_ok=True)
 report: dict[str,object]={'status':'FAIL','artifact_sha256':hashlib.sha256(h.ARTIFACT.read_bytes()).hexdigest()}
 base=h.BASE_URL.replace('127.0.0.1','catalog-http.test')
 with sync_playwright() as pw:
  ctx=pw.chromium.launch_persistent_context(str(h.PROFILE),channel='chromium',headless=True,viewport={'width':1400,'height':1000},color_scheme='light',args=[f'--disable-extensions-except={h.EXTENSION}',f'--load-extension={h.EXTENSION}','--host-resolver-rules=MAP catalog-http.test 127.0.0.1','--proxy-bypass-list=catalog-http.test'])
  def forward(route):
   if 'text/event-stream' in route.request.headers.get('accept',''):route.abort();return
   route.fulfill(response=route.fetch(url=route.request.url.replace('catalog-http.test','127.0.0.1')))
  ctx.route(base+'/**',forward)
  page=None
  try:
   h.import_userscript(ctx,h.extension_id_from(ctx));_,sid,_=h.fixture_ids(h.read_json(h.STATE))
   page=ctx.new_page();page.goto(base+'/series/'+sid);h.login_if_needed(page,h.read_json(h.CONFIG));h.open_product_panel(page)
   assert page.evaluate('isSecureContext') is False
   panel=page.locator('#komga-metadata-panel');panel.get_by_role('tab',name='本地数据库',exact=True).click()
   root=panel.locator('section[data-km-catalog]')
   for source in ['bangumi','bookwalker']:
    card=root.locator(f'[data-provider={source}]');expect(card.locator('button').first).to_be_enabled(timeout=90000)
    clear=card.get_by_role('button',name='清除原始档案',exact=True)
    if clear.is_visible():
     page.once('dialog',lambda dialog:dialog.accept());clear.click();expect(clear).to_be_hidden(timeout=30000)
   root.evaluate('''root=>{window.catalogStatusEvents=[];window.catalogStatusRoot=root;window.catalogStatusObserver=new MutationObserver(records=>{for(const r of records){const label=r.target.nodeType===3?r.target.parentElement:r.target;const card=label.closest('.catalog-source');if(card)window.catalogStatusEvents.push({provider:card.dataset.provider,text:card.querySelector('[role=status]').textContent});}});for(const label of root.querySelectorAll('.catalog-source [role=status]'))window.catalogStatusObserver.observe(label,{childList:true,subtree:true,characterData:true});}''')
   for name in ['Bangumi','BookWalker']:root.get_by_role('button',name=name+' · 下载并构建',exact=True).click()
   page.wait_for_function("['bangumi','bookwalker'].every(p=>window.catalogStatusEvents.filter(e=>e.provider===p&&e.text.startsWith('已下载')).length>=2)",timeout=120000)
   expect(root.locator(':scope > [role=status]')).to_have_count(0)
   expect(root.locator('[role=status]')).to_have_count(4)
   assert root.locator('[role=status]').evaluate_all("es=>es.every(e=>e.parentElement.matches('.catalog-source'))")
   report['concurrent_status']=root.locator('.catalog-source').evaluate_all("es=>es.map(e=>({provider:e.dataset.provider,status:e.querySelector('[role=status]').textContent}))")
   page.screenshot(path=str(out/'concurrent.png'))
   # Detaching/reopening must not recreate a summary line or lose task identity.
   panel.get_by_role('button',name='关闭',exact=True).click();h.open_product_panel(page);panel=page.locator('#komga-metadata-panel');panel.get_by_role('tab',name='本地数据库',exact=True).click()
   expect(root.locator(':scope > [role=status]')).to_have_count(0)
   for source in ['bangumi','bookwalker']:
    card=root.locator(f'[data-provider={source}]');cancel=card.get_by_role('button',name='取消任务',exact=True)
    if cancel.is_visible():cancel.click();expect(card.get_by_role('status')).to_contain_text('已取消',timeout=90000)
   # Invalid import remains visible at its input, and a valid retry clears it.
   root.get_by_text('已有文件',exact=True).click();file=root.get_by_label('本地数据库文件',exact=True)
   expect(file).to_be_enabled(timeout=90000)
   file.set_input_files({'name':'invalid.sqlite','mimeType':'application/octet-stream','buffer':b'not a SQLite database'})
   error=root.get_by_role('alert');expect(error).to_contain_text('加载失败',timeout=90000)
   assert error.evaluate("e=>!!e.closest('details')")
   file.set_input_files(str(h.RUNTIME/'catalogs'/'ehentai.sqlite'))
   expect(root.locator('[data-provider=ehentai] [role=status]')).to_contain_text('已加载',timeout=90000)
   expect(error).to_be_hidden();expect(root.locator(':scope > [role=status]')).to_have_count(0)
   report['checks']=['two real public downloads update independent cards','no shared status node, including hidden nodes','reopen retains only per-source status','cancel feedback stays on source card','invalid import error is local and clears on successful retry']
   report['status']='PASS'
  finally:
   if page:
    page.evaluate('window.catalogStatusObserver?.disconnect()')
   ctx.close();(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':run()
