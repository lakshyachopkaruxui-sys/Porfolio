// This entry has no static dependencies: a missing helper must reach recovery.
async function boot(){
  const [{MOBILE_ENTRY_QUERIES,useMobileEntry},{normalPortfolioURL,legacyPortfolioHash,bindPortfolioLinks}]=await Promise.all([
    import('./mobile-entry-policy.js'),import('./portfolio-route.js'),
  ]);
  if(document.body.dataset.startupState==='failed')return;
  bindPortfolioLinks(document,location);
  function redirectLegacyPortfolio(){
    const legacyHash=legacyPortfolioHash(location.hash);
    if(legacyHash===null)return false;
    window.__playStartup?.finish('redirecting');
    location.replace(normalPortfolioURL(location.href,legacyHash));
    return true;
  }
  if(redirectLegacyPortfolio())return;
  window.addEventListener('hashchange',redirectLegacyPortfolio);
  const entryQueries=Object.fromEntries(Object.entries(MOBILE_ENTRY_QUERIES).map(([name,query])=>[name,matchMedia(query)]));
  const mobile=()=>useMobileEntry(Object.fromEntries(Object.entries(entryQueries).map(([name,query])=>[name,query.matches])));
  const initialMobile=mobile();
  document.body.dataset.entryMode=initialMobile?'mobile':'desktop';
  let reloading=false;
  function checkEntryMode(){if(!reloading&&mobile()!==initialMobile){reloading=true;location.reload();}}
  for(const query of Object.values(entryQueries))query.addEventListener('change',checkEntryMode);
  if(initialMobile){
    const module=await import('./mobile-entry.js');
    if(document.body.dataset.startupState==='failed')return;
    module.mountMobileEntry();window.__playStartup?.finish('mobile');
  }else await import('./main.js');
}
boot().catch(error=>{
  console.error('Portfolio module could not load',error);
  window.__playStartup?.fail('The interactive world could not load. Retry, or read the projects without the game.');
});
