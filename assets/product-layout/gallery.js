(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const thumbs = Array.from(document.querySelectorAll('.thumbnail'));
  const images = thumbs.map(button => ({src:button.querySelector('img').getAttribute('src'),alt:button.querySelector('img').alt,name:button.querySelector('span').textContent}));
  const dialog=byId('gallery-dialog');
  const title=byId('product-title').textContent;
  let selected=0;
  function selectImage(index) {
    selected=(index+images.length)%images.length;
    const item=images[selected];
    ['main-img','large-img'].forEach(id=>{byId(id).src=item.src;byId(id).alt=item.alt;});
    byId('image-name').textContent=item.name;
    byId('gallery-heading').textContent=title+' · '+item.name;
    ['image-counter','large-counter'].forEach(id=>byId(id).textContent=(selected+1)+' of '+images.length);
    byId('enlarge').setAttribute('aria-label','Enlarge: '+item.name);
    thumbs.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===selected)));
  }
  thumbs.forEach((button,i)=>{
    button.addEventListener('click',()=>selectImage(i));
    button.addEventListener('keydown',event=>{
      let next=i;
      if(event.key==='ArrowRight')next=(i+1)%thumbs.length;
      else if(event.key==='ArrowLeft')next=(i+thumbs.length-1)%thumbs.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=thumbs.length-1;
      else return;
      event.preventDefault();selectImage(next);thumbs[next].focus();
    });
  });
  byId('enlarge').addEventListener('click',()=>{if(!dialog.open)dialog.showModal();});
  byId('close-gallery').addEventListener('click',()=>dialog.close());
  byId('previous-image').addEventListener('click',()=>selectImage(selected-1));
  byId('next-image').addEventListener('click',()=>selectImage(selected+1));
  dialog.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'){event.preventDefault();selectImage(selected-1);}
    if(event.key==='ArrowRight'){event.preventDefault();selectImage(selected+1);}
  });
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
  });
  const tabs=Array.from(document.querySelectorAll('[role="tab"]'));
  function selectTab(index,focus) {
    tabs.forEach((tab,i)=>{
      tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;
      byId(tab.getAttribute('aria-controls')).hidden=i!==index;
    });
    if(focus)tabs[index].focus();
  }
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>selectTab(i,false));
    tab.addEventListener('keydown',event=>{
      let next=i;
      if(event.key==='ArrowRight')next=(i+1)%tabs.length;
      else if(event.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=tabs.length-1;
      else return;
      event.preventDefault();selectTab(next,true);
    });
  });
  selectImage(0);selectTab(0,false);
})();
