import { useState } from 'react';
import { socialService } from '../../services';
import {
  RiMegaphoneLine, RiRobot2Line, RiLoader4Line, RiHashtag,
  RiFileCopyLine, RiCheckLine, RiCalendarLine, RiLightbulbLine,
  RiTwitterXLine, RiLinkedinLine, RiInstagramLine, RiFacebookLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Socials.css';

const TABS = [
  { id:'caption', label:'Caption Generator', icon: RiFileCopyLine },
  { id:'plan', label:'Content Plan', icon: RiCalendarLine },
  { id:'hashtags', label:'Hashtag Generator', icon: RiHashtag },
  { id:'campaign', label:'Campaign Ideas', icon: RiLightbulbLine },
];

const PLATFORMS = [
  { id:'linkedin', label:'LinkedIn', icon: RiLinkedinLine, color:'#0077b5' },
  { id:'twitter', label:'Twitter/X', icon: RiTwitterXLine, color:'#000' },
  { id:'instagram', label:'Instagram', icon: RiInstagramLine, color:'#e1306c' },
  { id:'facebook', label:'Facebook', icon: RiFacebookLine, color:'#1877f2' },
];

export default function Social() {
  const [tab, setTab] = useState('caption');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(null);

  // Caption form
  const [captionForm, setCaptionForm] = useState({ topic:'', platform:'linkedin', tone:'professional', includeEmoji:true, includeHashtags:true });
  // Plan form
  const [planForm, setPlanForm] = useState({ topic:'', platforms:['linkedin','twitter'], weeks:2, industry:'', tone:'professional' });
  // Hashtag form
  const [hashtagForm, setHashtagForm] = useState({ topic:'', platform:'instagram', count:15 });
  // Campaign form
  const [campaignForm, setCampaignForm] = useState({ goal:'', budget:'moderate', duration:'1 month', targetAudience:'', industry:'' });

  async function handleCaption(e) {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const { data } = await socialService.generateCaption(captionForm);
      setResult({ type:'caption', data: data.data });
    } catch { toast.error('Failed to generate caption'); }
    finally { setLoading(false); }
  }

  async function handlePlan(e) {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const { data } = await socialService.generateContentPlan(planForm);
      setResult({ type:'plan', data: data.data });
    } catch { toast.error('Failed to generate plan'); }
    finally { setLoading(false); }
  }

  async function handleHashtags(e) {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const { data } = await socialService.generateHashtags(hashtagForm);
      setResult({ type:'hashtags', data: data.data });
    } catch { toast.error('Failed to generate hashtags'); }
    finally { setLoading(false); }
  }

  async function handleCampaign(e) {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const { data } = await socialService.generateCampaign(campaignForm);
      setResult({ type:'campaign', data: data.data });
    } catch { toast.error('Failed to generate ideas'); }
    finally { setLoading(false); }
  }

  function copyText(text, key) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  }

  function togglePlatform(pid) {
    setPlanForm(p => ({
      ...p,
      platforms: p.platforms.includes(pid)
        ? p.platforms.filter(x => x !== pid)
        : [...p.platforms, pid]
    }));
  }

  return (
    <div className="social-page fade-in">
      <div className="page-header">
        <h1>Social Media</h1>
        <p>AI-powered content generation for all your social platforms</p>
      </div>

      {/* Tabs */}
      <div className="social-tabs">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`social-tab ${tab===t.id?'active':''}`} onClick={()=>{ setTab(t.id); setResult(null); }}>
              <Icon /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="social-layout">
        {/* Left: Form */}
        <div className="social-form-panel card card-pad">

          {/* Caption Generator */}
          {tab==='caption' && (
            <form onSubmit={handleCaption}>
              <h3 style={{marginBottom:16}}>Generate Caption</h3>
              <div className="form-group">
                <label className="form-label">Topic or post idea *</label>
                <textarea className="form-input form-textarea" rows={3}
                  placeholder="E.g. Announcing our new product launch, team milestone, industry tips..."
                  value={captionForm.topic} onChange={e=>setCaptionForm(p=>({...p,topic:e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Platform</label>
                <div className="platform-pills">
                  {PLATFORMS.map(pl => {
                    const Icon = pl.icon;
                    return (
                      <button key={pl.id} type="button"
                        className={`platform-pill ${captionForm.platform===pl.id?'active':''}`}
                        style={captionForm.platform===pl.id?{borderColor:pl.color,color:pl.color}:{}}
                        onClick={()=>setCaptionForm(p=>({...p,platform:pl.id}))}>
                        <Icon /> {pl.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tone</label>
                <select className="form-input form-select" value={captionForm.tone}
                  onChange={e=>setCaptionForm(p=>({...p,tone:e.target.value}))}>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual & Friendly</option>
                  <option value="inspirational">Inspirational</option>
                  <option value="humorous">Humorous</option>
                  <option value="educational">Educational</option>
                </select>
              </div>
              <div className="form-toggles">
                <label className="toggle-label">
                  <input type="checkbox" checked={captionForm.includeEmoji}
                    onChange={e=>setCaptionForm(p=>({...p,includeEmoji:e.target.checked}))} />
                  Include emoji
                </label>
                <label className="toggle-label">
                  <input type="checkbox" checked={captionForm.includeHashtags}
                    onChange={e=>setCaptionForm(p=>({...p,includeHashtags:e.target.checked}))} />
                  Include hashtags
                </label>
              </div>
              <button type="submit" className={`btn btn-primary ${loading?'btn-loading':''}`} disabled={loading} style={{marginTop:16,width:'100%'}}>
                {!loading && <><RiRobot2Line /> Generate 3 Variations</>}
              </button>
            </form>
          )}

          {/* Content Plan */}
          {tab==='plan' && (
            <form onSubmit={handlePlan}>
              <h3 style={{marginBottom:16}}>Generate Content Plan</h3>
              <div className="form-group">
                <label className="form-label">Content topic / theme *</label>
                <input className="form-input" placeholder="E.g. Product launch, brand awareness, holiday campaign..."
                  value={planForm.topic} onChange={e=>setPlanForm(p=>({...p,topic:e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Platforms</label>
                <div className="platform-pills">
                  {PLATFORMS.map(pl => {
                    const Icon = pl.icon;
                    const active = planForm.platforms.includes(pl.id);
                    return (
                      <button key={pl.id} type="button"
                        className={`platform-pill ${active?'active':''}`}
                        style={active?{borderColor:pl.color,color:pl.color}:{}}
                        onClick={()=>togglePlatform(pl.id)}>
                        <Icon /> {pl.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Weeks</label>
                  <select className="form-input form-select" value={planForm.weeks}
                    onChange={e=>setPlanForm(p=>({...p,weeks:Number(e.target.value)}))}>
                    <option value={1}>1 week</option><option value={2}>2 weeks</option>
                    <option value={4}>4 weeks</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tone</label>
                  <select className="form-input form-select" value={planForm.tone}
                    onChange={e=>setPlanForm(p=>({...p,tone:e.target.value}))}>
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="educational">Educational</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Industry (optional)</label>
                <input className="form-input" placeholder="E.g. Technology, Healthcare, Retail..."
                  value={planForm.industry} onChange={e=>setPlanForm(p=>({...p,industry:e.target.value}))} />
              </div>
              <button type="submit" className={`btn btn-primary ${loading?'btn-loading':''}`} disabled={loading} style={{marginTop:16,width:'100%'}}>
                {!loading && <><RiRobot2Line /> Generate Content Plan</>}
              </button>
            </form>
          )}

          {/* Hashtag Generator */}
          {tab==='hashtags' && (
            <form onSubmit={handleHashtags}>
              <h3 style={{marginBottom:16}}>Generate Hashtags</h3>
              <div className="form-group">
                <label className="form-label">Topic *</label>
                <input className="form-input" placeholder="E.g. Digital marketing, startup growth..."
                  value={hashtagForm.topic} onChange={e=>setHashtagForm(p=>({...p,topic:e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Platform</label>
                <div className="platform-pills">
                  {PLATFORMS.map(pl => {
                    const Icon = pl.icon;
                    return (
                      <button key={pl.id} type="button"
                        className={`platform-pill ${hashtagForm.platform===pl.id?'active':''}`}
                        style={hashtagForm.platform===pl.id?{borderColor:pl.color,color:pl.color}:{}}
                        onClick={()=>setHashtagForm(p=>({...p,platform:pl.id}))}>
                        <Icon /> {pl.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Number of hashtags: {hashtagForm.count}</label>
                <input type="range" min={5} max={30} value={hashtagForm.count}
                  onChange={e=>setHashtagForm(p=>({...p,count:Number(e.target.value)}))}
                  style={{width:'100%'}} />
              </div>
              <button type="submit" className={`btn btn-primary ${loading?'btn-loading':''}`} disabled={loading} style={{marginTop:16,width:'100%'}}>
                {!loading && <><RiHashtag /> Generate Hashtags</>}
              </button>
            </form>
          )}

          {/* Campaign Ideas */}
          {tab==='campaign' && (
            <form onSubmit={handleCampaign}>
              <h3 style={{marginBottom:16}}>Campaign Ideas</h3>
              <div className="form-group">
                <label className="form-label">Campaign Goal *</label>
                <input className="form-input" placeholder="E.g. Increase brand awareness, drive sales, grow followers..."
                  value={campaignForm.goal} onChange={e=>setCampaignForm(p=>({...p,goal:e.target.value}))} required />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Budget</label>
                  <select className="form-input form-select" value={campaignForm.budget}
                    onChange={e=>setCampaignForm(p=>({...p,budget:e.target.value}))}>
                    <option value="minimal">Minimal / Organic</option>
                    <option value="moderate">Moderate</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Duration</label>
                  <select className="form-input form-select" value={campaignForm.duration}
                    onChange={e=>setCampaignForm(p=>({...p,duration:e.target.value}))}>
                    <option value="1 week">1 week</option>
                    <option value="2 weeks">2 weeks</option>
                    <option value="1 month">1 month</option>
                    <option value="3 months">3 months</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Target Audience</label>
                <input className="form-input" placeholder="E.g. Small business owners, Gen Z, HR professionals..."
                  value={campaignForm.targetAudience} onChange={e=>setCampaignForm(p=>({...p,targetAudience:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Industry</label>
                <input className="form-input" placeholder="E.g. SaaS, E-commerce, Education..."
                  value={campaignForm.industry} onChange={e=>setCampaignForm(p=>({...p,industry:e.target.value}))} />
              </div>
              <button type="submit" className={`btn btn-primary ${loading?'btn-loading':''}`} disabled={loading} style={{marginTop:16,width:'100%'}}>
                {!loading && <><RiLightbulbLine /> Generate Campaign Ideas</>}
              </button>
            </form>
          )}
        </div>

        {/* Right: Results */}
        <div className="social-result-panel">
          {loading && (
            <div className="result-loading">
              <RiLoader4Line className="spin" />
              <p>AI is generating your content...</p>
            </div>
          )}

          {!loading && !result && (
            <div className="result-empty">
              <RiRobot2Line />
              <p>Your AI-generated content will appear here</p>
            </div>
          )}

          {/* Caption Result */}
          {result?.type==='caption' && (
            <div className="result-content">
              <div className="result-header">
                <h3>Generated Captions</h3>
                <span className="platform-tag">{captionForm.platform}</span>
              </div>
              <div className="caption-block">
                <div className="caption-copy-btn">
                  <button className="btn btn-secondary btn-sm" onClick={()=>copyText(result.data.content,'caption')}>
                    {copied==='caption'?<RiCheckLine />:<RiFileCopyLine />} Copy All
                  </button>
                </div>
                <pre className="caption-text">{result.data.content}</pre>
              </div>
            </div>
          )}

          {/* Plan Result */}
          {result?.type==='plan' && (
            <div className="result-content">
              <div className="result-header"><h3>Content Plan</h3></div>
              {result.data.strategy && (
                <div className="plan-strategy">
                  <h4>Strategy</h4>
                  <p>{result.data.strategy}</p>
                </div>
              )}
              {result.data.posts?.length > 0 && (
                <div className="plan-posts">
                  <h4>{result.data.posts.length} Posts Planned</h4>
                  <div className="posts-grid">
                    {result.data.posts.map((post, i) => (
                      <div key={i} className="post-card">
                        <div className="post-card-header">
                          <span className="post-day">{post.day}</span>
                          <span className="post-platform">{post.platform}</span>
                          {post.postingTime && <span className="post-time">{post.postingTime}</span>}
                        </div>
                        <p className="post-caption">{post.caption}</p>
                        {post.hashtags?.length > 0 && (
                          <div className="post-hashtags">
                            {post.hashtags.slice(0,3).map((h,j)=><span key={j} className="hashtag">#{h}</span>)}
                          </div>
                        )}
                        <button className="btn btn-ghost btn-sm post-copy"
                          onClick={()=>copyText(post.caption, `post-${i}`)}>
                          {copied===`post-${i}`?<RiCheckLine />:<RiFileCopyLine />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {result.data.tips?.length > 0 && (
                <div className="plan-tips">
                  <h4>Platform Tips</h4>
                  <ul>{result.data.tips.map((tip,i)=><li key={i}>{tip}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {/* Hashtags Result */}
          {result?.type==='hashtags' && (
            <div className="result-content">
              <div className="result-header">
                <h3>Generated Hashtags</h3>
                <button className="btn btn-secondary btn-sm"
                  onClick={()=>copyText(result.data.hashtags?.map(h=>`#${h}`).join(' '),'hashtags')}>
                  {copied==='hashtags'?<RiCheckLine />:<RiFileCopyLine />} Copy All
                </button>
              </div>
              <div className="hashtags-cloud">
                {result.data.hashtags?.map((tag, i) => (
                  <button key={i} className="hashtag-btn" onClick={()=>copyText(`#${tag}`,`tag-${i}`)}>
                    #{tag} {copied===`tag-${i}`&&<RiCheckLine />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Campaign Result */}
          {result?.type==='campaign' && (
            <div className="result-content">
              <div className="result-header"><h3>Campaign Ideas</h3></div>
              <div className="campaign-copy-btn">
                <button className="btn btn-secondary btn-sm"
                  onClick={()=>copyText(result.data.campaign,'campaign')}>
                  {copied==='campaign'?<RiCheckLine />:<RiFileCopyLine />} Copy Ideas
                </button>
              </div>
              <pre className="campaign-text">{result.data.campaign}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
