'use strict';
const menu = document.querySelector('.menu');
const navigation = document.querySelector('#navigation');
menu.addEventListener('click', () => {
 const open = menu.getAttribute('aria-expanded') !== 'true';
 menu.setAttribute('aria-expanded', String(open)); navigation.classList.toggle('open', open);
});
navigation.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
 menu.setAttribute('aria-expanded', 'false'); navigation.classList.remove('open');
}));
const cards = [...document.querySelectorAll('.card')];
const grid = cards[0]?.parentElement;
const query = document.querySelector('#query');
const filters = [...document.querySelectorAll('[data-filter]')];
const facets = [...document.querySelectorAll('[data-facet]')];
const sort = document.querySelector('#sort-games');
const facetAttrs = {theme:'data-theme',season:'data-season',topic:'data-topic',skill:'data-learning-skill'};
const featuredHomepage = document.body.dataset.homeFeatured === 'true';
let filter = 'all';
function normalize(s) { return s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").toLowerCase(); }
function featuredLimit() {
 return window.matchMedia('(min-width:1100px)').matches ? 4 : window.matchMedia('(min-width:760px)').matches ? 3 : window.matchMedia('(min-width:480px)').matches ? 2 : 1;
}
function updateResults() {
 const words = normalize(query.value).trim().split(/\s+/).filter(Boolean);
 const matches = cards.filter(card => (filter === 'all' || card.dataset.price === filter)
  && words.every(word => normalize(card.dataset.search).includes(word))
  && facets.every(select => !select.value || (card.getAttribute(facetAttrs[select.dataset.facet]) || '').split('|').includes(select.value)));
 const ordered = [...cards];
 const byTitle = (a,b) => a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent);
 if (sort?.value === 'title') ordered.sort(byTitle);
 if (sort?.value === 'free') ordered.sort((a,b) => Number(a.dataset.price !== 'free') - Number(b.dataset.price !== 'free') || byTitle(a,b));
 const shown = featuredHomepage ? matches.slice(0,featuredLimit()) : matches;
 ordered.forEach(card => { card.hidden = !shown.includes(card); grid.appendChild(card); });
 document.documentElement.dataset.featuredReady = 'true';
 document.querySelector('#result-count').textContent = featuredHomepage
  ? (words.length ? 'Showing ' + shown.length + ' of ' + matches.length + ' matching games' : 'There’s more to explore! Browse all nine games on our Games page.')
  : matches.length + (matches.length === 1 ? ' game' : ' games');
 document.querySelector('#no-results').hidden = matches.length !== 0;
 filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
}
if (featuredHomepage) window.addEventListener('resize', updateResults);
document.querySelector('.search').addEventListener('submit',event => { event.preventDefault(); updateResults(); document.querySelector('#games').scrollIntoView(); });
query.addEventListener('input',updateResults);
filters.forEach(button => button.addEventListener('click',() => { filter=button.dataset.filter; updateResults(); }));
facets.forEach(select => select.addEventListener('change',updateResults));
sort?.addEventListener('change',updateResults);
document.querySelector('#clear-search')?.addEventListener('click',() => {
 query.value=''; filter='all'; facets.forEach(select=>{select.value='';}); if(sort)sort.value='recommended'; updateResults();
});
query.value = new URLSearchParams(location.search).get('q') || '';
updateResults();
