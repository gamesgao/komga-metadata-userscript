#!/usr/bin/env python3
"""Scope composition, not entity matching: two real public records -> synthetic One-shot."""
import hashlib,json
from playwright.sync_api import sync_playwright,expect
import e2e as h
import real_flows as flows

def run():
 out=h.RUNTIME/'acceptance'/'oneshot-mixed';out.mkdir(parents=True,exist_ok=True)
 report={'status':'FAIL','artifact_sha256':hashlib.sha256(h.ARTIFACT.read_bytes()).hexdigest(),'checks':[],'scope':'Mixed-scope mechanics on synthetic books, not same-work matching'}
 normal,sid,other_books=h.fixture_ids(h.read_json(h.STATE));bid=next(b['id'] for b in h.read_json(h.STATE)['books'] if b['seriesId']==sid)
 sources=[('mangaupdates','66296374554'),('ehentai','373840:dd4812711c')]
 with sync_playwright() as pw:
  ctx=pw.chromium.launch_persistent_context(str(h.PROFILE),channel='chromium',headless=True,viewport={'width':1440,'height':1000},color_scheme='light',args=[f'--disable-extensions-except={h.EXTENSION}',f'--load-extension={h.EXTENSION}'])
  page=None;pending_undo=False;originals={};languages=None
  try:
   h.import_userscript(ctx,h.extension_id_from(ctx));page=ctx.new_page();page.goto(h.BASE_URL+'/series/'+sid);h.login_if_needed(page,h.read_json(h.CONFIG))
   originals={(k,i):flows.metadata(page,k,i) for k,i in [('series',sid),('books',bid)]}
   unrelated={i:flows.metadata(page,'books',i) for i in other_books}
   for k,i in originals:flows.patch_metadata(page,k,i,{'tagsLock':False,'titleLock':True,'summaryLock':True})
   baseline={(k,i):{'metadata':flows.metadata(page,k,i),'hash':flows.displayed_hash(page,k,i),'thumbs':flows.api(page,f'/{k}/{i}/thumbnails')} for k,i in originals}
   for reverse in [False,True]:
    h.open_product_panel(page);panel=page.locator('#komga-metadata-panel');panel.get_by_text('接受的资料语言',exact=True).click()
    if languages is None:languages={b.get_attribute('data-language'):b.is_checked() for b in panel.locator('.language-options input').all()}
    for box in panel.locator('.language-options input').all():box.set_checked(box.get_attribute('data-language') in ['en','ja','other'])
    panel.get_by_text('通过链接或 ID 读取',exact=True).click()
    for provider,id in (list(reversed(sources)) if reverse else sources):
     panel.get_by_label('来源',exact=True).select_option(provider);panel.get_by_role('textbox',name='来源链接或 ID').fill(id);panel.get_by_role('button',name='读取',exact=True).click()
     expect(panel.locator(f'.candidate[data-key="{provider}:{id}"]')).to_have_attribute('aria-pressed','true',timeout=90000)
    expect(panel.locator('.candidate[aria-pressed=true]')).to_have_count(2)
    flows.select_fields(panel,{'tags','title','summary'})
    cover=panel.get_by_label('使用哪张封面',exact=True);value=cover.locator('option').filter(has_text='mangaupdates').first.get_attribute('value');cover.select_option(value)
    flows.preview(panel);expect(panel.locator('textarea[data-field=title],textarea[data-field=summary]')).to_have_count(0)
    expected=[]
    for index in range(2):
     row=panel.locator(f'.row:has(textarea[data-field=tags][data-edit="{index}"])');row.get_by_label('标签处理方式',exact=True).select_option('single');row.get_by_label('标签来源',exact=True).select_option('ehentai:373840:dd4812711c')
     assert 'parody:touhou project' in json.loads(row.get_by_role('textbox').input_value())
     row.get_by_label('标签处理方式',exact=True).select_option('merge');expected.append(json.loads(row.get_by_role('textbox').input_value()))
    image=panel.get_by_role('img',name='替换为',exact=True);expect(image).to_be_visible(timeout=90000)
    expected_hash=image.evaluate('''async i=>{const h=await crypto.subtle.digest('SHA-256',await(await fetch(i.src)).arrayBuffer());return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}''')
    page.screenshot(path=str(out/('reverse-preview.png' if reverse else 'mixed-preview.png')))
    pending_undo=True;flows.wait_action(page,'应用')
    for index,((k,i),old) in enumerate(baseline.items()):
     actual=flows.metadata(page,k,i);assert set(actual['tags'])==set(expected[index]);assert actual['title']==old['metadata']['title'] and actual.get('summary')==old['metadata'].get('summary');assert flows.displayed_hash(page,k,i)==expected_hash
    for i,m in unrelated.items():assert flows.metadata(page,'books',i)==m
    h.open_product_panel(page);flows.wait_action(page,'撤销最近写入');pending_undo=False
    for (k,i),old in baseline.items():
     actual=flows.metadata(page,k,i)
     differences={f:{'before':old['metadata'].get(f),'after':actual.get(f)} for f in set(actual)|set(old['metadata']) if f!='lastModified' and actual.get(f)!=old['metadata'].get(f)}
     assert not differences,differences
     assert flows.displayed_hash(page,k,i)==old['hash'];assert flows.api(page,f'/{k}/{i}/thumbnails')==old['thumbs']
    report['checks'].append({'reverse_order':reverse,'both_selected':True,'field_single_and_merge':True,'locked_title_summary_retained':True,'both_targets_written_read_back_undone':True,'unrelated_books_unchanged':True})
   report['status']='PASS'
  finally:
   try:
    if page and pending_undo:h.open_product_panel(page);flows.wait_action(page,'撤销最近写入')
   finally:
    if page:
     for (k,i),old in originals.items():flows.patch_metadata(page,k,i,{f:old.get(f,False if f.endswith('Lock') else []) for f in ['tags','tagsLock','titleLock','summaryLock']})
     if languages is not None:
      h.open_product_panel(page);panel=page.locator('#komga-metadata-panel');details=panel.locator('.language-options')
      if not details.evaluate('e=>e.open'):details.locator('summary').click()
      for box in details.locator('input').all():box.set_checked(languages.get(box.get_attribute('data-language'),False))
    ctx.close();(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':run()
