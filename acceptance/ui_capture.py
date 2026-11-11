#!/usr/bin/env python3
"""Read-only UI acceptance/screenshots: real Tampermonkey and isolated Komga.
Uses a genuine public Bangumi record; never fabricates UI/data or applies changes.
"""
import hashlib,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import e2e as h
import real_flows as flows

def run():
 output=h.RUNTIME/'acceptance'/'modern-ui';output.mkdir(parents=True,exist_ok=True)
 report={'status':'FAIL','artifact_sha256':hashlib.sha256(h.ARTIFACT.read_bytes()).hexdigest(),'checks':[],'screenshots':[]}
 series_id,_,_=h.fixture_ids(h.read_json(h.STATE))
 with sync_playwright() as pw:
  ctx=pw.chromium.launch_persistent_context(str(h.PROFILE),channel='chromium',headless=True,viewport={'width':1440,'height':1000},color_scheme='light',args=[f'--disable-extensions-except={h.EXTENSION}',f'--load-extension={h.EXTENSION}'])
  report['browser']=ctx.browser.version
  try:
   eid=h.extension_id_from(ctx);h.import_userscript(ctx,eid)
   page=ctx.new_page();page.goto(h.BASE_URL+'/login');h.login_if_needed(page,h.read_json(h.CONFIG))
   panel=flows.source_record(page,series_id)
   expect(page.get_by_role('dialog',name='元数据',exact=True)).to_be_visible()
   assert page.locator('dialog').evaluate('(e)=>e.matches(":modal")')
   def capture(name):
    page.locator('dialog').evaluate('async e=>{await Promise.all(e.getAnimations({subtree:true}).filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))}')
    page.screenshot(path=str(output/name),full_page=False);report['screenshots'].append(name)
   capture('light-details.png')
   page.get_by_role('button',name='切换深浅色',exact=True).click()
   expect(panel).to_have_attribute('data-theme','dark');capture('dark-details.png')
   flows.select_fields(panel,{'summary','tags','authors'});flows.preview(panel)
   page.get_by_role('button',name='切换深浅色',exact=True).click()
   expect(page.get_by_role('button',name='应用',exact=True)).to_be_enabled();capture('light-preview.png')
   report['checks'].append('Actual installed bundle, public source detail, light/dark themes and real Komga read-only preview')
   page.get_by_role('button',name='返回选项',exact=True).click()
   page.get_by_role('tab',name='本地数据库',exact=True).click()
   catalog=h.RUNTIME/'catalogs'/'bookwalker.sqlite'
   if catalog.is_file():
    page.get_by_label('本地数据库文件',exact=True).set_input_files(str(catalog))
    expect(page.locator('section[data-km-catalog] [data-provider=bookwalker] [role=status]')).to_contain_text('已加载',timeout=90000)
    report['checks'].append('Existing full local BookWalker catalog opened through actual GM-loaded reader; no database built')
   page.get_by_text('下载与高级操作',exact=True).click();capture('light-database.png')
   page.get_by_role('tab',name='元数据',exact=True).click()
   page.set_viewport_size({'width':768,'height':900});capture('narrow-details.png')
   assert page.locator('.viewport').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
   page.keyboard.press('Escape');expect(panel).to_have_count(0)
   report['checks'].append('Narrow layout without horizontal overflow; Escape dismisses dialog')
   report['status']='PASS'
  finally:
   ctx.close();(output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':run()
