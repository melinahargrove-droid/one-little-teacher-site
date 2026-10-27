"""Run from repository root after editing catalog/product-cards.json. No network/build dependencies."""
from pathlib import Path
import json,re,html
esc=lambda s:html.escape(str(s),quote=True)
def render(c):
 attrs={**c['attrs'],'class':'olt-card','data-card-key':c['key'],'data-status':c['status'],'aria-labelledby':c['page']+'-'+c['key']+'-title'}
 at=' '.join(f'{k}="{esc(v)}"' for k,v in attrs.items());actions=[];secondary=[]
 for a in c['links']:
  aa={k:v for k,v in a['attrs'].items() if k not in ['class','style','aria-label']};download='download' in aa
  aa['class']='olt-card__download' if download else 'olt-card__action';aa['aria-label']=a['text']+': '+c['title']
  markup='<a '+' '.join(f'{k}="{esc(v)}"' for k,v in aa.items())+'>'+esc(a['text'])+'</a>'
  (secondary if download else actions).append(markup)
 if not actions:actions=['<button class="olt-card__action" type="button" disabled>'+('Purchases temporarily unavailable' if c['status']=='paid-unavailable' else 'Coming Soon')+'</button>']
 return f'''<article {at}><div class="olt-card__art"><img src="assets/cards/{esc(c['key'])}.webp" alt="{esc(c.get('alt','Watercolor illustration for '+c['title']))}" width="1200" height="900" loading="lazy" decoding="async"></div><div class="olt-card__body"><div class="olt-card__meta"><span class="olt-card__category">{esc(c['category'])}</span><span class="olt-card__badge">{esc(c['priceLabel'])}</span></div><h3 class="olt-card__title" id="{esc(c['page']+'-'+c['key'])}-title">{esc(c['title'])}</h3><p class="olt-card__summary">{esc(c['summary'])}</p><div class="olt-card__footer">{''.join(actions)}<div class="olt-card__secondary">{''.join(secondary)}</div></div></div></article>'''

root=Path(__file__).resolve().parents[1]
cards=json.loads((root/'catalog/product-cards.json').read_text())
for page in sorted({c['page'] for c in cards}):
 p=root/(page+'.html');s=p.read_text()
 for c in [c for c in cards if c['page']==page]:
  pattern=r'<article\b[^>]*data-card-key="'+re.escape(c['key'])+r'"[^>]*>.*?</article>'
  s,count=re.subn(pattern,lambda m:render(c),s,flags=re.S)
  if count!=1:raise ValueError((page,c['key'],count))
 p.write_text(s)
