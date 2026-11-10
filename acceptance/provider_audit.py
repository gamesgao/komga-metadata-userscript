"""Read-only provider searches through actual userscript / GM and isolated Komga."""
import json,time
from playwright.sync_api import sync_playwright,expect
import e2e as h

def run():
 results=[]
 with sync_playwright() as pw:
  ctx=pw.chromium.launch_persistent_context(str(h.PROFILE),channel='chromium',headless=True,viewport={'width':1440,'height':1000},args=[f'--disable-extensions-except={h.EXTENSION}',f'--load-extension={h.EXTENSION}'])
  try:
   h.import_userscript(ctx,h.extension_id_from(ctx));page=ctx.new_page()
   sid,_,_=h.fixture_ids(h.read_json(h.STATE));page.goto(h.BASE_URL+'/series/'+sid);h.login_if_needed(page,h.read_json(h.CONFIG));h.open_product_panel(page)
   panel=page.locator('#komga-metadata-panel')
   for source,q in [('webtoons','Tower of God'),('yenpress','Spice and Wolf'),('mangadex','Frieren')]:
    for box in panel.locator('.source-toggles input').all():box.set_checked(box.get_attribute('aria-label')==source)
    panel.get_by_role('textbox',name='搜索词').fill(q);panel.get_by_role('button',name='搜索',exact=True).click()
    expect(panel.get_by_role('button',name='搜索',exact=True)).to_be_enabled(timeout=120000)
    group=panel.locator('.result-group');results.append({'provider':source,'query':q,'candidates':group.locator('.candidate').count(),'text':group.inner_text()[:1000]})
   panel.get_by_text('通过链接或 ID 读取',exact=True).click()
   panel.get_by_role('combobox',name='来源',exact=True).select_option('yenpress')
   panel.get_by_role('textbox',name='来源链接或 ID').fill('https://yenpress.com/series/spice-and-wolf')
   panel.get_by_role('button',name='读取',exact=True).click()
   expect(panel.get_by_role('button',name='读取',exact=True)).to_be_enabled(timeout=90000)
   results.append({'provider':'yenpress','operation':'direct detail','text':panel.locator('.selected-record').inner_text()[:250],'error':panel.locator('.status').inner_text()})
   page.keyboard.press('Escape')
  finally:ctx.close()
 report={'time':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'transport':'Actual Tampermonkey GM','results':results}
 (h.RUNTIME/'acceptance'/'provider-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':run()
