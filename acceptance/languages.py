#!/usr/bin/env python3
"""Real AniList title languages -> real One-shot series/book write/readback/undo."""
import hashlib,json
from playwright.sync_api import sync_playwright,expect
import e2e as h
import real_flows as flows

def run():
 output=h.RUNTIME/'acceptance'/'languages';output.mkdir(parents=True,exist_ok=True)
 report={'status':'FAIL','artifact_sha256':hashlib.sha256(h.ARTIFACT.read_bytes()).hexdigest(),'checks':[]}
 _,sid,_=h.fixture_ids(h.read_json(h.STATE));bid=next(b['id'] for b in h.read_json(h.STATE)['books'] if b['seriesId']==sid)
 originals={};page=None;reset_languages=None
 with sync_playwright() as pw:
  ctx=pw.chromium.launch_persistent_context(str(h.PROFILE),channel='chromium',headless=True,viewport={'width':1440,'height':1000},args=[f'--disable-extensions-except={h.EXTENSION}',f'--load-extension={h.EXTENSION}'])
  try:
   # Independent public reference, not a fixture or mocked provider response.
   response=ctx.request.post('https://graphql.anilist.co',data={'query':'query { Media(id:118586,type:MANGA) { title { native english romaji } } }'})
   assert response.ok;reference=response.json()['data']['Media']['title']
   h.import_userscript(ctx,h.extension_id_from(ctx));page=ctx.new_page();page.goto(h.BASE_URL+'/series/'+sid);h.login_if_needed(page,h.read_json(h.CONFIG))
   originals={(k,i):flows.metadata(page,k,i) for k,i in [('series',sid),('books',bid)]}
   for k,i in originals:flows.patch_metadata(page,k,i,{'titleLock':False})
   h.open_product_panel(page)
   panel=page.locator('#komga-metadata-panel')
   def languages(codes):
    details=panel.locator('.language-options')
    if not details.evaluate('e=>e.open'):details.locator('summary').click()
    for box in details.locator('input').all():box.set_checked(box.get_attribute('data-language') in codes)
   reset_languages=languages
   languages({'en','ja','zh','romaji','unknown','other'})
   panel.get_by_text('通过链接或 ID 读取',exact=True).click();panel.get_by_label('来源',exact=True).select_option('anilist')
   panel.get_by_role('textbox',name='来源链接或 ID').fill('118586');panel.get_by_role('button',name='读取',exact=True).click()
   expect(panel.locator('.selected-source')).to_contain_text('anilist',timeout=90000)
   flows.select_fields(panel,{'title'})
   for language,key in [('ja','native'),('romaji','romaji'),('en','english')]:
    languages({language});flows.preview(panel)
    values=panel.get_by_role('textbox',name='标题（默认不改）写入值',exact=True)
    expect(values).to_have_count(2)
    for box in values.all():expect(box).to_have_value(reference[key])
    report['checks'].append({'accepted':language,'actual_existing_title':reference[key],'both_metadata_targets':True})
    if language!='en':panel.get_by_role('button',name='返回选项',exact=True).click()
   page.screenshot(path=str(output/'title-language-preview.png'))
   flows.wait_action(page,'应用')
   for k,i in originals:assert flows.metadata(page,k,i)['title']==reference['english']
   h.open_product_panel(page);flows.wait_action(page,'撤销最近写入')
   for (k,i),original in originals.items():assert flows.metadata(page,k,i)['title']==original['title']
   report['checks'].append('Actual English variant written to both One-shot metadata targets, independently read back, then both original titles restored')
   report['status']='PASS'
  finally:
   if page and originals:
    for (k,i),original in originals.items():flows.patch_metadata(page,k,i,{'title':original['title'],'titleLock':original.get('titleLock',False)})
    if reset_languages:
     h.open_product_panel(page);reset_languages({'en','ja','zh','romaji','unknown','other'});page.keyboard.press('Escape')
   ctx.close();(output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':run()
