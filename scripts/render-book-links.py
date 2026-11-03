"""Staged build-time book section. Never fetches or changes external state."""
import argparse, json, re
from pathlib import Path
from html import escape
from urllib.parse import urlsplit, parse_qs
START='<!-- OLT BOOK LINKS START -->'
END='<!-- OLT BOOK LINKS END -->'
CSS='''<style id="olt-book-links-style">
.olt-book-links{margin:32px 0;padding:24px;background:#f0eee6;border:1px solid #dedfd5;border-radius:20px;color:#1a3a5c;font-family:Arial,sans-serif}
.olt-book-links h2{font-family:Georgia,serif;font-size:27px;line-height:1.2;margin:0 0 12px}
.olt-book-links p{font-size:15px;line-height:1.6;color:#43566b;margin:8px 0}
.olt-book-links .olt-book-disclosure{font-size:14px;color:#43566b}
.olt-book-buttons{display:flex;flex-wrap:wrap;gap:12px;margin:16px 0}
.olt-book-buttons a{display:inline-flex;flex-direction:column;justify-content:center;align-items:center;min-height:48px;padding:12px 20px;border:1px solid #5b6c68;border-radius:12px;background:#e1e8dc;color:#1a3a5c;text-decoration:none;font-weight:bold;line-height:1.4}
.olt-book-buttons a:hover{text-decoration:underline;background:#d7e0d1}.olt-book-buttons a:focus-visible{outline:3px solid #8b5369;outline-offset:4px}
.olt-book-buttons small{font-size:12px;font-weight:normal}
@media(max-width:520px){.olt-book-links{padding:20px}.olt-book-buttons{flex-direction:column}.olt-book-buttons a{width:100%;box-sizing:border-box}}
</style>'''

def edition_url(e):
    # Each edition is separately reviewed. Never infer Kindle from physical URL.
    if not isinstance(e,dict) or e.get('verified') is not True or not e.get('verifiedAt'):
        return None
    value=e.get('url','')
    if not isinstance(value,str) or len(value)>2048 or any(ord(c)<32 for c in value): return None
    try:
        u=urlsplit(value)
        if u.scheme!='https' or u.username or u.password or u.port not in (None,443) or u.fragment: return None
    except ValueError: return None
    if u.hostname in ('amazon.com','www.amazon.com'):
        if not re.fullmatch(r'(?:/[^/]+)?/(?:dp|gp/product)/[A-Z0-9]{10}/?',u.path): return None
        if not parse_qs(u.query).get('tag',[''])[0]: return None
    elif u.hostname in ('amzn.to','link.amazon'):
        if not re.fullmatch(r'/[A-Za-z0-9]+',u.path): return None
        # Short destination and edition require manual inspection before approval.
        if e.get('destinationVerified') is not True: return None
    else: return None
    return value

def section(data,slug):
    if data.get('publicationApproved') is not True: return ''
    books=[b for b in data.get('books',[]) if slug in b.get('gameSlugs',[])]
    if len(books)>1: raise ValueError('One book mapping per game required')
    if not books: return ''
    b=books[0]; links=[]
    for key,label in [('physical','Physical Book'),('kindle','Kindle Edition')]:
        edition=b.get(key)
        url=edition_url(edition)
        if key=='physical' and isinstance(edition,dict) and edition.get('format') in ('Paperback','Hardcover'):
            label=edition['format']
        if url:
            links.append(f'<a href="{escape(url,quote=True)}" rel="sponsored nofollow noopener"><span>{label} on Amazon</span><small>(paid link)</small></a>')
    if not links: return ''
    title=escape(str(b.get('title','')))
    if not title: raise ValueError('Book title missing')
    return CSS+f'''<section class="olt-book-links" aria-labelledby="olt-book-heading">
<h2 id="olt-book-heading">Get the Book</h2>
<p>Pair this activity with <cite>{title}</cite>. The book is sold separately.</p>
<p class="olt-book-disclosure">As an Amazon Associate I earn from qualifying purchases.</p>
<div class="olt-book-buttons">{''.join(links)}</div>
<p>Choose an edition on Amazon. This independent classroom companion is not affiliated with the author or publisher.</p>
</section>'''

def inject(html,content):
    # Idempotent insertion; preserve all existing links, styles, art and content.
    if html.count(START)!=html.count(END) or html.count(START)>1: raise ValueError('Invalid existing book section markers')
    block=START+'\n'+content+'\n'+END if content else ''
    if START in html: return re.sub(re.escape(START)+r'.*?'+re.escape(END),lambda m:block,html,flags=re.S)
    if not content: return html
    if html.count('</main>')!=1: raise ValueError('Expected one main landmark')
    return html.replace('</main>',block+'\n</main>')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--catalog',type=Path,required=True);p.add_argument('--source',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    data=json.loads(a.catalog.read_text())
    if data.get('schemaVersion')!=1: raise ValueError('Unsupported schema')
    for book in data['books']:
        for slug in book['gameSlugs']:
            if not re.fullmatch('[a-z0-9-]+',slug): raise ValueError('Unsafe slug')
            src=a.source/'products'/f'{slug}.html';dest=a.output/'products'/f'{slug}.html'
            if src.resolve()==dest.resolve(): raise ValueError('Use a separate staging output')
            page=src.read_text();dest.parent.mkdir(parents=True,exist_ok=True)
            dest.write_text(inject(page,section(data,slug)))
