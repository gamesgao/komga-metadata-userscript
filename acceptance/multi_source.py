#!/usr/bin/env python3
"""Real-manager multi-source merge/write/undo and loaded-catalog routing acceptance."""
import hashlib,json
from playwright.sync_api import sync_playwright,expect
import e2e as h
import real_flows as flows

def run():
 output=h.RUNTIME/'acceptance'/'multi-source';output.mkdir(parents=True,exist_ok=True)
 report={'status':'FAIL','artifact_sha256':hashlib.sha256(h.ARTIFACT.read_bytes()).hexdigest(),'checks':[]}
 sid,_,_=h.fixture_ids(h.read_json(h.STATE));original=None;page=None
 with sync_playwright() as pw:
  ctx=pw.chromium.launch_persistent_context(str(h.PROFILE),channel='chromium',headless=True,viewport={'width':1440,'height':1000},color_scheme='light',args=[f'--disable-extensions-except={h.EXTENSION}',f'--load-extension={h.EXTENSION}'])
  try:
   h.import_userscript(ctx,h.extension_id_from(ctx));page=ctx.new_page();page.goto(h.BASE_URL+'/series/'+sid);h.login_if_needed(page,h.read_json(h.CONFIG));h.open_product_panel(page)
   panel=page.locator('#komga-metadata-panel');original=flows.metadata(page,'series',sid)
   def sources(ids):
    for box in panel.locator('.source-toggles input').all():box.set_checked(box.get_attribute('aria-label') in ids)
   def search(query):
    panel.get_by_role('textbox',name='搜索词').fill(query);panel.get_by_role('button',name='搜索',exact=True).click()
    expect(panel.get_by_role('button',name='搜索',exact=True)).to_be_enabled(timeout=120000)
   def capture(name):
    page.locator('dialog').evaluate('async e=>{await Promise.all(e.getAnimations({subtree:true}).filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))}')
    page.screenshot(path=str(output/name))
   sources({'bangumi','mangabaka'});search('葬送のフリーレン')
   expect(panel.get_by_role('progressbar',name='搜索进度')).to_have_js_property('value',2)
   bg=panel.locator('.result-group[data-provider=bangumi]');baka=panel.locator('.result-group[data-provider=mangabaka]')
   bg.locator('.candidate[data-key="bangumi:305429"]').click()
   expect(panel.locator('.candidate[data-key^="bangumi:"][aria-pressed=true]')).to_have_count(1,timeout=90000)
   bg.locator('summary').click();baka.get_by_role('button',name='葬送のフリーレン',exact=True).click()
   expect(panel.locator('.candidate[aria-pressed=true]')).to_have_count(2,timeout=90000)
   expect(panel.get_by_label('使用哪张封面',exact=True)).to_have_value('')

   flows.select_fields(panel,{'tags','links'})
   panel.locator('.viewport').evaluate('e=>e.scrollTop=0');capture('selected-sources.png')
   flows.preview(panel)
   expected_tags=json.loads(panel.get_by_role('textbox',name='标签写入值',exact=True).input_value())
   expected_links=json.loads(panel.get_by_role('textbox',name='链接写入值',exact=True).input_value())
   assert any('bgm.tv' in x['url'] for x in expected_links) and any('mangabaka.org' in x['url'] for x in expected_links)
   capture('merged-preview.png');flows.wait_action(page,'应用')
   after=flows.metadata(page,'series',sid)
   assert set(after['tags'])==set(expected_tags)
   assert {(x['label'],x['url']) for x in after['links']}=={(x['label'],x['url']) for x in expected_links}
   h.open_product_panel(page);flows.wait_action(page,'撤销最近写入')
   restored=flows.metadata(page,'series',sid);assert set(restored['tags'])==set(original['tags']) and restored['links']==original['links']
   report['checks'].append('Actual Bangumi + MangaBaka selections -> merged tags/links preview with provenance -> one apply -> GET equality -> scoped undo')
   h.open_product_panel(page);panel=page.locator('#komga-metadata-panel')
   catalog=h.RUNTIME/'catalogs'/'bangumi.sqlite';assert catalog.is_file(),'Existing full Bangumi catalog missing'
   panel.get_by_role('tab',name='本地数据库',exact=True).click();panel.get_by_label('本地数据库文件',exact=True).set_input_files(str(catalog))
   expect(panel.locator('section[data-km-catalog] [data-provider=bangumi] [role=status]')).to_contain_text('已加载',timeout=90000)
   panel.get_by_role('tab',name='元数据',exact=True).click();sources({'bangumi'});search('葬送のフリーレン')
   expect(panel.get_by_label('来源模式')).to_have_count(0)
   bg=panel.locator('.result-group[data-provider=bangumi]');expect(bg.locator('.result-count')).to_contain_text('本地 ·')
   bg.locator('.candidate').first.click();expect(panel.locator('.candidate[aria-pressed=true]')).to_have_attribute('data-mode','offline')
   report['checks'].append('Existing full Bangumi SQLite loaded readonly; same normal search uses local results and local detail, without a mode switch')
   search('NONEXISTENT_ACCEPTANCE_988311')
   expect(bg.locator('.result-count')).to_contain_text('在线 ·',timeout=60000)
   expect(bg).to_contain_text('本地无匹配，已查询在线')
   report['checks'].append('Actual local miss falls back to public online Bangumi search with explicit route note')
   page.keyboard.press('Escape');report['status']='PASS'
  finally:
   if page and original:
    flows.patch_metadata(page,'series',sid,{'tags':original['tags'],'links':original['links']})
   ctx.close();(output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':run()
