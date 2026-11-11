#!/usr/bin/env python3
"""Real Tampermonkey: public full BookWalker archive -> browser build -> reload -> search."""
import json,time,hashlib
from playwright.sync_api import sync_playwright,expect
import e2e as h

def run():
 out=h.RUNTIME/'acceptance'/'catalog-workflow';out.mkdir(parents=True,exist_ok=True)
 report={'status':'FAIL','artifact_sha256':hashlib.sha256(h.ARTIFACT.read_bytes()).hexdigest()}
 _,sid,_=h.fixture_ids(h.read_json(h.STATE))
 with sync_playwright() as pw:
  ctx=pw.chromium.launch_persistent_context(str(h.PROFILE),channel='chromium',headless=True,viewport={'width':1400,'height':1000},color_scheme='light',args=[f'--disable-extensions-except={h.EXTENSION}',f'--load-extension={h.EXTENSION}'])
  page=None
  try:
   h.import_userscript(ctx,h.extension_id_from(ctx));page=ctx.new_page();page.goto(h.BASE_URL+'/series/'+sid);h.login_if_needed(page,h.read_json(h.CONFIG));h.open_product_panel(page)
   panel=page.locator('#komga-metadata-panel');panel.get_by_role('tab',name='本地数据库',exact=True).click()
   expect(panel.get_by_placeholder('预制数据库或清单 URL')).to_have_count(0)
   status=panel.locator('section[data-km-catalog] [role=status]')
   # The browser input cancel event must not be interpreted as dialog cancellation.
   for field in panel.locator('input[type=file]').all():field.dispatch_event('cancel',{'bubbles':True})
   expect(panel.locator('dialog')).to_be_visible()
   panel.get_by_role('button',name='BookWalker · 下载并构建',exact=True).click()
   deadline=time.monotonic()+1200;previous='';last=0
   while time.monotonic()<deadline:
    text=status.inner_text()
    if text!=previous and time.monotonic()-last>10:print(text,flush=True);last=time.monotonic();previous=text
    if text.startswith('bookwalker · 已构建并加载'):break
    if '失败' in text or '不支持' in text or '超时' in text:raise AssertionError(text)
    page.wait_for_timeout(500)
   else:raise AssertionError('full browser build timed out: '+status.inner_text())
   report['full_build']=status.inner_text();page.screenshot(path=str(out/'built.png'))
   # Separate existing file can coexist with the browser-built provider.
   panel.get_by_label('本地数据库文件',exact=True).set_input_files(str(h.RUNTIME/'catalogs'/'bangumi.sqlite'))
   expect(status).to_contain_text('bangumi ·',timeout=90000)
   for provider in ['bangumi','bookwalker']:
    expect(panel.locator(f'.catalog-source[data-provider={provider}]')).to_contain_text('已加载')
   for field in panel.locator('input[type=file]').all():field.dispatch_event('cancel',{'bubbles':True})
   expect(panel.locator('dialog')).to_be_visible()
   page.reload();h.open_product_panel(page);panel=page.locator('#komga-metadata-panel');panel.get_by_role('tab',name='本地数据库',exact=True).click()
   expect(panel.locator('.catalog-source[data-provider=bookwalker]')).to_contain_text('已加载',timeout=90000)
   page.screenshot(path=str(out/'restored.png'))
   panel.get_by_role('tab',name='元数据',exact=True).click()
   for box in panel.locator('.source-toggles input').all():box.set_checked(box.get_attribute('aria-label')=='bookwalker')
   # Use the known source checkbox selector if the group class changes.
   panel.get_by_role('checkbox',name='bookwalker',exact=True).check()
   panel.get_by_role('textbox',name='搜索词').fill('葬送');panel.get_by_role('button',name='搜索',exact=True).click()
   group=panel.locator('.result-group[data-provider=bookwalker]');expect(group.locator('.candidate').first).to_be_visible(timeout=90000)
   report['candidates']=group.locator('.candidate').count();report['checks']=['public GM stream downloaded whole archive','actual WASM browser builder','automatic database creation and loading','multiple independent providers coexist','bubbling file cancel leaves dialog and catalogs intact','persisted build restored after page reload','real local title search after restore']
   report['status']='PASS';page.screenshot(path=str(out/'search.png'))
  except Exception:
   if page:
    if page.locator('input[type=password]').count():page.locator('input').evaluate_all("inputs => inputs.forEach(input => {input.value = ''})")
    page.screenshot(path=str(out/'failure.png'))
   raise
  finally:
   ctx.close();(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps(report,ensure_ascii=False),flush=True)
if __name__=='__main__':run()
