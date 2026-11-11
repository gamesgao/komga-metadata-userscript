#!/usr/bin/env python3
"""Actual public EHT + public Non-H EH metadata + real-manager Komga write/undo."""
import hashlib,json,sqlite3
from playwright.sync_api import sync_playwright,expect
import e2e as h
import real_flows as flows

def run():
 output=h.RUNTIME/'acceptance'/'eh-translation';output.mkdir(parents=True,exist_ok=True)
 report={'status':'FAIL','artifact_sha256':hashlib.sha256(h.ARTIFACT.read_bytes()).hexdigest(),'checks':[]};originals={};page=None
 _,sid,_=h.fixture_ids(h.read_json(h.STATE));bid=next(b['id'] for b in h.read_json(h.STATE)['books'] if b['seriesId']==sid)
 with sync_playwright() as pw:
  ctx=pw.chromium.launch_persistent_context(str(h.PROFILE),channel='chromium',headless=True,viewport={'width':1440,'height':1000},color_scheme='light',args=[f'--disable-extensions-except={h.EXTENSION}',f'--load-extension={h.EXTENSION}'])
  try:
   # Independent references: no fixture routes or mocked metadata.
   res=ctx.request.get('https://github.com/EhTagTranslation/Database/releases/latest/download/db.text.json',timeout=90000);assert res.ok
   dictionary=res.json();names={g['namespace']:g['data'] for g in dictionary['data']};report['dictionary_revision']=dictionary['head'].get('sha')
   res=ctx.request.post('https://api.e-hentai.org/api.php',data={'method':'gdata','gidlist':[[373840,'dd4812711c']],'namespace':1});assert res.ok
   source=res.json()['gmetadata'][0];assert source['category']=='Non-H' and not source['expunged']
   with sqlite3.connect((h.RUNTIME/'catalogs'/'ehentai.sqlite').resolve().as_uri()+'?mode=ro',uri=True) as db:
    offline_source=json.loads(db.execute('SELECT record FROM entries WHERE provider=? AND source_id=?',('ehentai','373840:dd4812711c')).fetchone()[0])
   def translated(raw):
    ns,sep,key=raw.partition(':');name=names.get(ns,{}).get(key,{}).get('name') if sep else None
    # This chosen Non-H gallery uses named-entity/language namespaces only.
    return ((ns+':'+name) if name else raw).strip().lower()
   assert translated('parody:touhou project')!='parody:touhou project'
   h.import_userscript(ctx,h.extension_id_from(ctx));page=ctx.new_page();page.goto(h.BASE_URL+'/series/'+sid);h.login_if_needed(page,h.read_json(h.CONFIG))
   originals={(k,i):flows.metadata(page,k,i) for k,i in [('series',sid),('books',bid)]}
   for route,languages in [('online',['en']),('online',['zh','ja']),('offline',['en']),('offline',['zh','ja'])]:
    for k,i in originals:flows.patch_metadata(page,k,i,{'tags':['parody:touhou project','手动保留'],'tagsLock':False})
    h.open_product_panel(page);panel=page.locator('#komga-metadata-panel')
    if route=='offline':
     panel.get_by_role('tab',name='本地数据库',exact=True).click();panel.get_by_label('本地数据库文件',exact=True).set_input_files(str(h.RUNTIME/'catalogs'/'ehentai.sqlite'))
     expect(panel.locator('section[data-km-catalog] [role=status]')).to_contain_text('ehentai ·',timeout=90000);panel.get_by_role('tab',name='元数据',exact=True).click()
    panel.get_by_text('接受的资料语言',exact=True).click()
    for box in panel.locator('.language-options input').all():box.set_checked(box.get_attribute('data-language') in languages)
    panel.get_by_text('通过链接或 ID 读取',exact=True).click();panel.get_by_label('来源',exact=True).select_option('ehentai');panel.get_by_role('textbox',name='来源链接或 ID').fill('373840:dd4812711c');panel.get_by_role('button',name='读取',exact=True).click()
    expect(panel.locator('.candidate[data-key^="ehentai:"][aria-pressed=true]')).to_have_count(1,timeout=90000)
    if route=='offline':expect(panel.locator('.candidate[aria-pressed=true]')).to_have_attribute('data-mode','offline')
    flows.select_fields(panel,{'tags'});flows.preview(panel)
    values=panel.get_by_role('textbox',name='标签写入值',exact=True);expect(values).to_have_count(2)
    expected=json.loads(values.first.input_value())
    raw_tags=(source if route=='online' else offline_source)['tags']
    assert set(expected)==set(map(translated,raw_tags) if 'zh' in languages else raw_tags)|{'手动保留'}
    for box in values.all():assert json.loads(box.input_value())==expected
    expect(panel.get_by_text('查看标签翻译对照',exact=True)).to_have_count(0)
    expect(panel.get_by_label('将 EH 标签译为中文并写入',exact=True)).to_have_count(0)
    expect(panel.get_by_label('标签前缀',exact=True)).to_have_count(0)
    expect(panel.get_by_text('EH 标签格式',exact=True)).to_have_count(0)
    expect(panel.get_by_role('link',name='EhTagTranslation · CC BY-NC-SA 3.0')).to_have_count(0)
    page.screenshot(path=str(output/(route+('-zh' if 'zh' in languages else '-en')+'-preview.png')))
    flows.wait_action(page,'应用')
    for (k,i),before in originals.items():
     after=flows.metadata(page,k,i);assert set(after['tags'])==set(expected);assert after['title']==before['title']
    h.open_product_panel(page);flows.wait_action(page,'撤销最近写入')
    for k,i in originals:assert set(flows.metadata(page,k,i)['tags'])=={'parody:touhou project','手动保留'}
    report['checks'].append({'source':route,'accepted_languages':languages,'actual_tags':expected,'both_one_shot_targets_written_and_restored':True,'manual_tag_retained':True,'language_controls_translation':True})
   report['status']='PASS'
  finally:
   if page:
    for (k,i),before in originals.items():flows.patch_metadata(page,k,i,{'tags':before.get('tags',[]),'tagsLock':before.get('tagsLock',False)})
   ctx.close();(output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':run()
