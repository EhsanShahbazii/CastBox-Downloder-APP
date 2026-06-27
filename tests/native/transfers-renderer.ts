import type { DesktopBridge } from '../../shared/desktop';
declare global { interface Window { castboxDesktop?: DesktopBridge } }
async function run() {
  const bridge=window.castboxDesktop; if(!bridge || 'require' in window || 'process' in window)throw new Error('Bridge isolation failed');
  const api=bridge.transfers;
  if(location.search){
    const results=[await api.snapshot(),await api.pauseAll(),await api.start({planId:'bad',grantId:'bad'}),await api.action({jobId:'bad',action:'cancel'}),await api.setConcurrency({concurrency:1}),await api.discardPlan({planId:'bad'}),await api.reveal({jobId:'bad'})];
    if(results.some(result=>result.ok || result.error!=='Request denied.'))throw new Error('Untrusted transfer allowed');
    return {checks:['all-seven-untrusted-operations-denied']};
  }
  const first=await api.snapshot();if(!first.ok)throw new Error(first.error);
  if((await api.setConcurrency({concurrency:9})).ok)throw new Error('Invalid concurrency accepted');
  if(!first.value.jobs.length){
    const grant=await bridge.downloads.chooseDirectory();if(!grant.ok || !grant.value)throw new Error('Grant missing');
    const preview=await bridge.downloads.prepare({channelId:'123',episodeIds:['456'],grantId:grant.value.id,filenamePattern:'{title}',groupByChannel:false,duplicatePolicy:'rename',concurrency:1});if(!preview.ok)throw new Error(preview.error);
    const plan=await bridge.downloads.commit({planId:preview.value.id});if(!plan.ok)throw new Error(plan.error);
    const started=await api.start({planId:plan.value.id,grantId:grant.value.id});if(!started.ok)throw new Error(started.error);
    const id=started.value.jobs[0].id;
    for(let i=0;i<500;i++){const snapshot=await api.snapshot();if(!snapshot.ok)throw new Error(snapshot.error);if(snapshot.value.jobs[0].bytes>32000)break;await new Promise(resolve=>setTimeout(resolve,10));}
    const paused=await api.action({jobId:id,action:'pause'});if(!paused.ok || paused.value.jobs[0].status!=='paused')throw new Error('Native pause failed');
  } else {
    const job=first.value.jobs[0]; if(job.status!=='paused' || !job.needsGrant)throw new Error('Interrupted transfer was not paused after reopen');
    const denied=await api.action({jobId:job.id,action:'resume'}); if(denied.ok)throw new Error('Resume without a fresh grant was allowed');
    const grant=await bridge.downloads.chooseDirectory(); if(!grant.ok || !grant.value)throw new Error('Recovery grant missing');
    const resumed=await api.action({jobId:job.id,action:'resume',grantId:grant.value.id});if(!resumed.ok)throw new Error(resumed.error);
    for(let i=0;i<500;i++){const snapshot=await api.snapshot();if(!snapshot.ok)throw new Error(snapshot.error);if(snapshot.value.jobs[0].status==='completed')break;if(snapshot.value.jobs[0].status==='failed')throw new Error(snapshot.value.jobs[0].error!);await new Promise(resolve=>setTimeout(resolve,10));}
  }
  const final=await api.snapshot();if(!final.ok || final.value.jobs.length!==1 || final.value.jobs[0].status!==(first.value.jobs.length ? 'completed' : 'paused'))throw new Error('Native completion missing');
  if(JSON.stringify(final.value).includes('http://'))throw new Error('Media URL leaked');
  return {initialCount:first.value.jobs.length,checks:first.value.jobs.length ? ['paused-reopen','fresh-grant-required','native-resume-completion','no-media-url-or-node-access'] : ['validation','native-stream-pause','checkpoint-persistence','no-media-url-or-node-access']};
}
run().then(result=>console.log('TRANSFER_TEST:'+JSON.stringify({ok:true,...result}))).catch(error=>console.log('TRANSFER_TEST:'+JSON.stringify({ok:false,error:error instanceof Error?error.message:'Native failure'})));
