#!/usr/bin/env python3
"""Public MU/Baka/AniList covers with text Other disabled, real GM + isolated Komga."""
import hashlib,json
from playwright.sync_api import sync_playwright,expect
import e2e as h
import real_flows as flows

def run():
 out=h.RUNTIME/'acceptance'/'cover-languages';out.mkdir(parents=True,exist_ok=True)
 report={'status':'FAIL','artifact_sha256':hashlib.sha256(h.ARTIFACT.read_bytes()).hexdigest(),'checks':[]}
 _,sid,_=h.fixture_ids(h.read_json(h.STATE));bid=next(b['id'] for b in h.read_json(h.STATE)['books'] if b['seriesId']==sid)
 sources=[('mangaupdates','66296374554'),('mangabaka','1995'),('anilist','118586')]
 with sync_playwright() as pw:
  ctx=pw.chromium.launch_persistent_context(str(h.PROFILE),channel='chromium',headless=True,viewport={'width':1440,'height':1000},color_scheme='light',args=[f'--disable-extensions-except={h.EXTENSION}',f'--load-extension={h.EXTENSION}'])
  page=None;pending_undo=False;before={};original_languages=None
  try:
   h.import_userscript(ctx,h.extension_id_from(ctx));page=ctx.new_page();page.goto(h.BASE_URL+'/series/'+sid);h.login_if_needed(page,h.read_json(h.CONFIG))
   before={(kind,id):{'hash':flows.displayed_hash(page,kind,id),'metadata':flows.metadata(page,kind,id),'thumbnails':flows.api(page,f'/{kind}/{id}/thumbnails')} for kind,id in [('series',sid),('books',bid)]}
   for target,_ in sources:
    h.open_product_panel(page);panel=page.locator('#komga-metadata-panel');panel.get_by_text('接受的资料语言',exact=True).click()
    if original_languages is None:original_languages={box.get_attribute('data-language'):box.is_checked() for box in panel.locator('.language-options input').all()}
    for box in panel.locator('.language-options input').all():box.set_checked(box.get_attribute('data-language') in ['zh','ja','en'])
    panel.get_by_text('通过链接或 ID 读取',exact=True).click()
    for provider,id in sources:
     panel.get_by_label('来源',exact=True).select_option(provider);panel.get_by_role('textbox',name='来源链接或 ID').fill(id);panel.get_by_role('button',name='读取',exact=True).click()
     expect(panel.locator(f'.candidate[data-key="{provider}:{id}"]')).to_have_attribute('aria-pressed','true',timeout=90000)
    expect(panel.get_by_label('使用哪张封面',exact=True)).to_have_count(0);expect(panel.get_by_label('替换哪个封面',exact=True)).to_have_count(0)
    flows.select_fields(panel,set())
    if target=='mangaupdates':
     panel.locator('.viewport').evaluate('e=>e.scrollTop=0');page.screenshot(path=str(out/'three-sources.png'))
    flows.preview(panel)
    field=panel.locator('.cover-preview');expect(field).to_have_count(1);expect(field.get_by_role('checkbox',name='封面',exact=True)).not_to_be_checked()
    cover=field.get_by_label('封面来源',exact=True)
    options=cover.locator('option').evaluate_all('es=>es.map(e=>({value:e.value,label:e.textContent}))')
    for provider,_ in sources:assert any(x['value'] and x['label'].startswith(provider+' ·') for x in options),options
    field=flows.select_cover(panel,target)
    candidate_count=field.locator('.cover-candidate').count()
    assert candidate_count>0
    slots=field.locator('.cover-thumb').all();first_y=slots[0].bounding_box()['y']
    for slot in slots:
     if abs(slot.bounding_box()['y']-first_y)>2:break
     slot.scroll_into_view_if_needed();expect(slot).not_to_have_attribute('data-state','pending',timeout=90000)
    image=field.get_by_role('img',name='替换为',exact=True);expect(image).to_be_visible(timeout=90000)
    dimensions=image.evaluate('i=>({width:i.naturalWidth,height:i.naturalHeight})');assert dimensions['width']>0
    expected=image.evaluate('''async i=>{const b=await(await fetch(i.src)).arrayBuffer();const h=await crypto.subtle.digest('SHA-256',b);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}''')
    page.screenshot(path=str(out/(target+'-preview.png')))
    outcome=flows.wait_action(page,'应用',True)
    if outcome!='success':
     for (kind,id),old in before.items():assert flows.displayed_hash(page,kind,id)==old['hash']
     raise AssertionError(outcome)
    pending_undo=True
    for (kind,id),old in before.items():
     assert flows.displayed_hash(page,kind,id)==expected
     assert flows.metadata(page,kind,id)==old['metadata']
    h.open_product_panel(page);flows.wait_action(page,'撤销最近写入');pending_undo=False
    for (kind,id),old in before.items():
     assert flows.displayed_hash(page,kind,id)==old['hash']
     assert flows.api(page,f'/{kind}/{id}/thumbnails')==old['thumbnails']
    report['checks'].append({'provider':target,'available_sources':len(options)-1,'source_images':candidate_count,'other_enabled':False,'decoded':dimensions,'one_shot_both_display_hash':expected,'written_read_back_and_undone':True})
   report['status']='PASS'
  finally:
   try:
    if page and pending_undo:
     h.open_product_panel(page);flows.wait_action(page,'撤销最近写入')
    if page and original_languages is not None:
     h.open_product_panel(page);panel=page.locator('#komga-metadata-panel');details=panel.locator('.language-options')
     if not details.evaluate('e=>e.open'):details.locator('summary').click()
     for box in details.locator('input').all():box.set_checked(original_languages.get(box.get_attribute('data-language'),False))
   finally:
    ctx.close();(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':run()
