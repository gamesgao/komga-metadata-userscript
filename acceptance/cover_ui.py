#!/usr/bin/env python3
"""Read-only real-manager acceptance of source galleries and cover comparison.
Public provider data + an isolated loopback Komga. No simulated product images.
"""
import hashlib,json
from playwright.sync_api import sync_playwright,expect
import e2e as h
import real_flows as flows

def run():
 output=h.RUNTIME/'acceptance'/'cover-ui';output.mkdir(parents=True,exist_ok=True)
 report={'status':'FAIL','artifact_sha256':hashlib.sha256(h.ARTIFACT.read_bytes()).hexdigest(),'checks':[],'screenshots':[]}
 series_id,_,books=h.fixture_ids(h.read_json(h.STATE))
 with sync_playwright() as pw:
  ctx=pw.chromium.launch_persistent_context(str(h.PROFILE),channel='chromium',headless=True,viewport={'width':1440,'height':1000},color_scheme='light',args=[f'--disable-extensions-except={h.EXTENSION}',f'--load-extension={h.EXTENSION}'])
  report['browser']=ctx.browser.version
  try:
   eid=h.extension_id_from(ctx);h.import_userscript(ctx,eid)
   page=ctx.new_page();page.goto(h.BASE_URL+'/series/'+series_id);h.login_if_needed(page,h.read_json(h.CONFIG))
   h.open_product_panel(page);panel=page.locator('#komga-metadata-panel')
   expect(page.get_by_role('textbox',name='搜索词')).not_to_have_value('')
   for box in panel.locator('.source-toggles input').all():box.uncheck()
   for source in ['bangumi','mangabaka']:
    page.get_by_role('checkbox',name=source,exact=True).check()
   page.get_by_role('textbox',name='搜索词').fill('葬送のフリーレン')
   page.get_by_role('button',name='搜索',exact=True).click()
   bg=page.locator('.result-group[data-provider=bangumi]');baka=page.locator('.result-group[data-provider=mangabaka]')
   expect(bg.locator('.candidate').first).to_be_visible(timeout=90000)
   expect(baka.locator('.candidate').first).to_be_attached(timeout=90000)
   def ready(group):
    group.locator('summary').scroll_into_view_if_needed()
    expect(group.locator('.cover-thumb[data-state=ready]').first).to_be_visible(timeout=90000)
    # Wait for the visible first row, not just the first completed request.
    for slot in group.locator('.cover-thumb').all()[:4]:
     expect(slot).not_to_have_attribute('data-state','pending',timeout=90000)
    return group.locator('.candidate').count()
   def capture(name):
    page.locator('dialog').evaluate('async e=>{await Promise.all(e.getAnimations({subtree:true}).filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))}')
    page.screenshot(path=str(output/name));report['screenshots'].append(name)
   report['bangumi_candidates']=ready(bg);capture('source-gallery.png')
   bg.locator('summary').click();expect(bg).not_to_have_attribute('open','')
   report['mangabaka_candidates']=ready(baka);capture('source-collapsed.png')
   report['checks'].append('Actual public Bangumi/MangaBaka result cards decoded through GM; folding one reveals the next source')
   baka.locator('summary').click();bg.locator('summary').click()
   bg.locator('.candidate[data-key="bangumi:305429"]').click()
   expect(panel.locator('.candidate[data-key^="bangumi:"][aria-pressed=true]')).to_have_count(1,timeout=90000)
   expect(bg.locator('.candidate[data-key="bangumi:305429"]')).to_have_attribute('aria-pressed','true')
   report['checks'].append('Selecting a record retains both source groups and marks the chosen card')
   flows.select_fields(panel,set())
   page.get_by_label('同时更新哪本书',exact=True).select_option(books[0])
   flows.preview(panel)
   field=flows.select_cover(panel,'bangumi','books:'+books[0])
   expect(field.get_by_role('img',name='当前封面',exact=True)).to_be_visible(timeout=90000)
   expect(field.get_by_role('img',name='替换为',exact=True)).to_be_visible(timeout=90000)
   report['preview_images']=field.locator('.cover-compare img').evaluate_all('(imgs)=>imgs.map(i=>({label:i.alt,width:i.naturalWidth,height:i.naturalHeight,blob:i.src.startsWith("blob:")}))')
   assert len(report['preview_images'])==2 and all(i['width']>0 and i['blob'] for i in report['preview_images'])
   expect(page.get_by_role('button',name='应用',exact=True)).to_be_enabled()
   capture('cover-comparison-light.png')
   page.get_by_role('button',name='切换深浅色',exact=True).click();capture('cover-comparison-dark.png')
   report['checks'].append('Current actual Komga book cover and pre-downloaded Bangumi replacement are decoded side by side before any write')
   page.keyboard.press('Escape');expect(panel).to_have_count(0)
   report['status']='PASS'
  finally:
   ctx.close();(output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':run()
