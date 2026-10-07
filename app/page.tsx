"use client";

import {useEffect, useRef, useState} from "react";
import {Search, BookOpen, Layers, Scale, ExternalLink, FileDown, Info, LoaderCircle, Check, X, Database, FileText, CircleHelp, Mail} from "lucide-react";
import {Tabs, TabsList, TabsTrigger, TabsContent} from "@/components/ui/tabs";
import {Select, SelectTrigger, SelectValue, SelectContent, SelectItem} from "@/components/ui/select";
import {Dialog, DialogContent, DialogTitle, DialogDescription} from "@/components/ui/dialog";
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from "@/components/ui/table";
import {Progress} from "@/components/ui/progress";
import type {Journal, SearchResult, Article, BatchRow, Metric, Coverage, JournalScope} from "@/lib/journal-types";

const dateLabel = (s?:string) => s ? new Date(s).toLocaleDateString("id-ID", {day:"numeric",month:"short",year:"numeric"}) : "—";
const outsideSinta = (j:Journal) => Boolean(j.country && j.country!=="Indonesia" && !j.sinta);
const sintaLabel = (j?:Journal) => j?.sinta ? `S${j.sinta.rank}` : j && outsideSinta(j) ? "Tidak berlaku" : "Belum tersedia";
const scopeLabel = {all:"Semua negara",indonesia:"Indonesia",international:"Luar Indonesia"};

function SourceLogo({name,src,href,width,height}:{name:string;src:string;href:string;width:number;height:number}) {
  const [failed,setFailed]=useState(false);
  return <a className="source-logo-link" href={href} target="_blank" rel="noopener noreferrer" aria-label={`Buka sumber ${name}`}>
    {failed?<span className="source-logo-fallback">{name}</span>:<img src={src} alt={name} width={width} height={height} decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>}
    <ExternalLink size={13} aria-hidden="true"/>
  </a>;
}

function Q({value}:{value?:string|null}) {
  return <span className={`q-badge ${value?.toLowerCase().replace(/\s/g,"") || "unknown"}`}>{value || "—"}</span>;
}
function SourceLink({href,children}:{href:string;children:React.ReactNode}) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="source-link">{children}<ExternalLink size={14}/></a>;
}
function MetricCard({label,metric,j,year}:{label:string;metric?:Metric;j:Journal;year:number}) {
  const isSJR = label==="SCImago SJR";
  if (!isSJR && outsideSinta(j)) return <section className="metric-card not-applicable-card">
    <div className="metric-head"><span>SINTA</span><span className="metric-type">Nasional Indonesia</span></div>
    <div className="not-applicable-value">Di luar cakupan SINTA</div>
    <p className="metric-explain">SINTA digunakan untuk jurnal nasional Indonesia. Negara jurnal yang tercatat di SCImago: {j.country}.</p>
    <SourceLink href="https://sinta.kemdiktisaintek.go.id/journals">Tentang jurnal SINTA</SourceLink>
  </section>;
  return <section className={`metric-card ${isSJR ? "sjr-card" : "sinta-card"}`}>
    <div className="metric-head"><span>{label}</span><span className="metric-type">{isSJR ? "Menurut bidang & tahun" : "Nasional Indonesia"}</span></div>
    <div className="metric-value"><Q value={metric?.bestQuartile || (metric?.rank ? `S${metric.rank}` : null)}/><div>
      {metric ? <><strong>{isSJR ? `SJR ${metric.value!=null ? metric.value.toLocaleString("id-ID") : "belum tersedia"}` : `Peringkat ${metric.rank}`}</strong><p>{isSJR ? `Tahun metrik ${metric.year}` : metric.context==="decree" ? "Catatan SK akreditasi" : "Catatan profil SINTA"}</p></>
        : <><strong>Peringkat belum tersedia</strong><p>Identitas dan peringkat diperiksa terpisah</p></>}
    </div></div>
    {metric ? <>
      <p className="metric-explain">{isSJR ? "Badge adalah kuartil terbaik. Rincian kategori bidang tersedia di bawah." : metric.note || "Cocokkan masa berlaku pada profil atau SK."}</p>
      <div className="metric-foot"><span>Diambil {dateLabel(metric.checkedAt)}</span><SourceLink href={metric.url}>Bukti sumber</SourceLink></div>
    </> : <>
      <p className="metric-explain">{isSJR ? `Belum ditemukan pada data SJR ${year}. Hasil ini tidak menetapkan status pengindeksan jurnal.` : "Cakupan nasional belum lengkap. Hasil kosong tidak menetapkan bahwa jurnal tidak terakreditasi."}</p>
      <SourceLink href={isSJR ? `https://www.scimagojr.com/journalsearch.php?q=${encodeURIComponent(j.issns[0] || j.title)}` : `https://sinta.kemdiktisaintek.go.id/journals?q=${encodeURIComponent(j.issns[0]?.replace("-","") || j.title)}`}>Periksa {isSJR ? "SCImago" : "SINTA"}</SourceLink>
    </>}
  </section>;
}
function JournalDetail({j,article,year,onCompare,onExport}:{j:Journal;article?:Article;year:number;onCompare:(j:Journal)=>void;onExport:(rows:BatchRow[])=>void}) {
  return <article className="detail-card">
    {article && <div className="article-strip"><FileText size={19}/><div><span>ARTIKEL · {article.year || "Tahun belum tersedia"}</span><p>{article.title}</p><SourceLink href={`https://doi.org/${article.doi}`}>{article.doi}</SourceLink></div></div>}
    <div className="journal-heading"><div><span className="eyebrow">IDENTITAS JURNAL</span><h2>{j.title}</h2><p>{j.publisher}{j.country ? ` · ${j.country}` : " · Negara belum tersedia"}</p><div className="issns">{j.issns.map(i=><span key={i}>ISSN {i}</span>)}</div>
      {j.identitySource && <div className="identity-source"><SourceLink href={j.identitySource.url}>Identitas {j.identitySource.name}</SourceLink><span>Diambil {dateLabel(j.identitySource.checkedAt)}</span></div>}
    </div><button className="button outline" onClick={()=>onCompare(j)}><Scale size={16}/>Bandingkan</button></div>
    <div className="metrics"><MetricCard label="SCImago SJR" metric={j.sjr} j={j} year={year}/><MetricCard label="SINTA" metric={j.sinta} j={j} year={year}/></div>
    {j.sjr && <section className="categories"><div className="section-top"><h3>Kuartil menurut bidang</h3><span>SJR · {j.sjr.year}</span></div><Table><TableHeader><TableRow><TableHead>Kategori bidang</TableHead><TableHead>Kuartil</TableHead></TableRow></TableHeader><TableBody>{j.sjr.categories.map(c=><TableRow key={c.name}><TableCell>{c.name}</TableCell><TableCell><Q value={c.quartile}/></TableCell></TableRow>)}</TableBody></Table></section>}
    <div className="verification-note"><Info size={17}/><div>{j.notes.map((n,i)=><p key={i}>{n}</p>)}<p>Peringkat menjelaskan jurnal, bukan kualitas langsung suatu artikel. Kuartil SJR berbeda dari CiteScore/JCR.</p></div></div>
    <div className="result-actions"><button className="button outline" onClick={()=>onExport([{input:article?.doi || j.title,article,journal:j}])}><FileDown size={16}/>Unduh CSV</button><button className="button text" onClick={()=>window.print()}><FileText size={16}/>Cetak / PDF</button></div>
  </article>;
}

export default function Home() {
  const [tab,setTab]=useState("single"), [query,setQuery]=useState(""), [year,setYear]=useState("2025");
  const [scope,setScope]=useState<JournalScope>("all"), [loading,setLoading]=useState(false), [loadingMore,setLoadingMore]=useState(false);
  const [result,setResult]=useState<SearchResult|null>(null), [error,setError]=useState(""), [selected,setSelected]=useState<Journal|null>(null);
  const [compare,setCompare]=useState<Journal[]>([]), [batchText,setBatchText]=useState(""), [batch,setBatch]=useState<BatchRow[]>([]);
  const [batchRunning,setBatchRunning]=useState(false), [progress,setProgress]=useState(0), [batchTotal,setBatchTotal]=useState(0);
  const [guide,setGuide]=useState(false), [notice,setNotice]=useState(""), [coverage,setCoverage]=useState<Coverage|null>(null);
  const [coverageFailed,setCoverageFailed]=useState(false);
  const requestRef=useRef<AbortController|null>(null), moreRef=useRef<AbortController|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/coverage?v=2",{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(d=>setCoverage(d as Coverage)).catch(()=>{if(!controller.signal.aborted)setCoverageFailed(true);});
    return ()=>{controller.abort();requestRef.current?.abort();moreRef.current?.abort();};
  },[]);
  async function search(q=query,y=year,s=scope) {
    if(q.trim().length<2){setError("Masukkan DOI, ISSN, atau nama jurnal.");return null;}
    requestRef.current?.abort();moreRef.current?.abort();
    const controller=new AbortController();requestRef.current=controller;
    setQuery(q);setLoading(true);setLoadingMore(false);setError("");setResult(null);setSelected(null);
    try {
      const r=await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&year=${y}&scope=${s}&v=2`,{signal:controller.signal});
      const data=await r.json() as SearchResult&{error?:string};
      if(!r.ok)throw new Error(data.error || "Pencarian belum berhasil.");
      if(controller.signal.aborted)return null;
      setResult(data);if(data.totalMatches===1)setSelected(data.journals[0]);
      return data;
    } catch(e) {
      if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Sumber belum dapat diakses.");
      return null;
    } finally {if(requestRef.current===controller)setLoading(false);}
  }
  async function loadMore() {
    if(!result || !result.hasMore || loadingMore)return;
    const previous=result, controller=new AbortController();moreRef.current=controller;
    setLoadingMore(true);setError("");
    try {
      const r=await fetch(`/api/search?q=${encodeURIComponent(previous.query)}&year=${previous.year}&scope=${previous.scope}&offset=${previous.journals.length}&v=2`,{signal:controller.signal});
      const data=await r.json() as SearchResult&{error?:string};
      if(!r.ok)throw new Error(data.error || "Hasil berikutnya belum dapat diambil.");
      if(!controller.signal.aborted)setResult({...data,journals:[...previous.journals,...data.journals],offset:0});
    } catch(e) {if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Hasil berikutnya belum tersedia.");}
    finally {if(moreRef.current===controller)setLoadingMore(false);}
  }
  function addCompare(j:Journal) {
    if(compare.some(x=>x.id===j.id || x.issns.some(i=>j.issns.includes(i)))){setNotice("Jurnal sudah ada di perbandingan.");return;}
    if(compare.length>=3){setNotice("Maksimal tiga jurnal dalam satu perbandingan.");return;}
    setCompare(v=>[...v,j]);setNotice("Jurnal ditambahkan ke perbandingan.");
  }
  async function runBatch() {
    const lines=[...new Set(batchText.split(/\n/).map(s=>s.trim()).filter(Boolean))];
    if(!lines.length){setError("Masukkan satu DOI pada setiap baris.");return;}
    if(lines.length>20){setError("Periksa maksimal 20 DOI dalam satu proses.");return;}
    setError("");setBatch([]);setProgress(0);setBatchTotal(lines.length);setBatchRunning(true);
    const rows:BatchRow[]=[];
    for(const input of lines) {
      try {
        // Batch DOI checks always include all countries.
        const r=await fetch(`/api/search?q=${encodeURIComponent(input)}&year=${year}&kind=doi&v=2`);
        const d=await r.json() as SearchResult&{error?:string};
        const j=d.journals?.length===1?d.journals[0]:undefined;
        rows.push({input,article:d.article,journal:j,error:!r.ok?d.error:d.totalMatches>1?"Identitas ambigu; periksa satu per satu.":!j?"Identitas jurnal belum ditemukan.":!j.sjr&&!j.sinta?"Identitas ditemukan; peringkat belum tersedia.":undefined});
      } catch {rows.push({input,error:"Sumber belum dapat diakses."});}
      setBatch([...rows]);setProgress(rows.length);
    }
    setBatchRunning(false);
  }
  function exportCSV(rows:BatchRow[]) {
    const cells=[[
      "DOI/input","Artikel","Tahun artikel","Jurnal","Penerbit","Negara","ISSN","Tahun SJR","Kuartil terbaik SJR","Kategori SJR","SINTA/status","Konteks SINTA","Tanggal data SINTA","Sumber identitas","Sumber SJR","Sumber SINTA","Keterangan",
    ],...rows.map(r=>[
      r.article?.doi||r.input,r.article?.title||"",r.article?.year||"",r.journal?.title||r.article?.journal||"",r.journal?.publisher||r.article?.publisher||"",r.journal?.country||"",r.journal?.issns.join("; ")||"",r.journal?.sjr?.year||"",r.journal?.sjr?.bestQuartile||"",r.journal?.sjr?.categories.map(c=>`${c.name}: ${c.quartile}`).join("; ")||"",sintaLabel(r.journal),r.journal?.sinta?.context||"",r.journal?.sinta?.checkedAt||"",r.journal?.identitySource?.url||"",r.journal?.sjr?.url||"",r.journal?.sinta?.url||"",[r.error,...(r.journal?.notes||[])].filter(Boolean).join("; "),
    ])];
    const protect=(s:unknown)=>{const v=String(s);return /^[=+@\-\t\r]/.test(v)?"'"+v:v;};
    const csv="\uFEFF"+cells.map(row=>row.map(v=>'"'+protect(v).replaceAll('"','""')+'"').join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
    const a=document.createElement("a");a.href=url;a.download="jurnalensa-hasil.csv";a.click();URL.revokeObjectURL(url);
  }
  useEffect(()=>{
    const context=(document as Document&{modelContext?:{registerTool:(tool:unknown,options:unknown)=>unknown}}).modelContext;
    if(!context?.registerTool)return;
    const lifecycle=new AbortController();
    Promise.resolve(context.registerTool({name:"search_journal",title:"Periksa jurnal",description:"Cari jurnal Indonesia atau internasional melalui DOI, ISSN, atau nama dan tampilkan sumber peringkatnya.",inputSchema:{type:"object",properties:{query:{type:"string",minLength:2,maxLength:300},year:{type:"integer",minimum:1999,maximum:2025}},required:["query"],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:async(input:unknown)=>{
      const i=input as {query?:unknown;year?:unknown};
      if(!i||typeof i.query!=="string"||i.query.length<2||i.query.length>300||i.year!==undefined&&(!Number.isInteger(i.year)||Number(i.year)<1999||Number(i.year)>2025))throw new Error("Input tidak valid.");
      setTab("single");setScope("all");const y=String(i.year||2025);setYear(y);
      const d=await search(i.query,y,"all");if(!d)throw new Error("Pencarian gagal.");return d;
    }},{signal:lifecycle.signal})).catch(()=>{});
    return ()=>lifecycle.abort();
  },[]);

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="/" aria-label="Jurnalensa beranda"><img className="brand-emblem" src="/assets/brand/jurnalensa-emblem.png" width="44" height="44" alt=""/><span>jurnalensa<span className="brand-period">.</span></span></a><div className="top-actions"><span className="edition">Indonesia & internasional</span><button className="button text" onClick={()=>setGuide(true)}><CircleHelp size={17}/>Panduan</button></div></header>
    <main className="workspace">
      <div className="workspace-heading"><div><div className="eyebrow">PENCARIAN JURNAL</div><h1>Kuartil jurnal & akreditasi SINTA</h1><p>Cari melalui DOI, ISSN, atau nama jurnal. Periksa tahun, bidang, dan bukti sumbernya.</p></div><div className="catalogue-count">{coverage && <><strong>{coverage.countryCount}</strong><span>negara dalam<br/>katalog SCImago</span></>}</div></div>
      <div className="workspace-grid"><div className="main-column">
        <Tabs value={tab} onValueChange={v=>{setTab(v);setError("");}} className="search-workspace">
          <TabsList className="workspace-tabs" variant="line"><TabsTrigger value="single"><Search size={17}/>Cek jurnal</TabsTrigger><TabsTrigger value="batch"><Layers size={17}/>Banyak DOI</TabsTrigger><TabsTrigger value="compare"><Scale size={17}/>Bandingkan {compare.length>0&&<span className="counter">{compare.length}</span>}</TabsTrigger></TabsList>
          <TabsContent value="single">
            <form className="search-form" onSubmit={e=>{e.preventDefault();search();}}>
              <label htmlFor="journal-query">Nama jurnal, ISSN, atau DOI artikel</label>
              <div className="search-input-row"><Search size={21}/><input id="journal-query" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Contoh: PLOS ONE atau 1932-6203" maxLength={300} autoComplete="off"/><button className="button primary" disabled={loading}>{loading?<LoaderCircle size={18} className="spin"/>:<Search size={18}/>}<span>{loading?"Memeriksa":"Periksa"}</span></button></div>
              <div className="search-options"><div><span>Tahun SJR</span><Select value={year} onValueChange={setYear}><SelectTrigger aria-label="Tahun kuartil SJR"><SelectValue/></SelectTrigger><SelectContent>{Array.from({length:27},(_,i)=>2025-i).map(y=><SelectItem value={String(y)} key={y}>{y}</SelectItem>)}</SelectContent></Select></div><div><span>Negara</span><Select value={scope} onValueChange={v=>setScope(v as JournalScope)}><SelectTrigger aria-label="Cakupan negara"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Semua negara</SelectItem><SelectItem value="indonesia">Indonesia</SelectItem><SelectItem value="international">Luar Indonesia</SelectItem></SelectContent></Select></div></div>
            </form>
            {!result&&!loading&&<section className="example-directory"><div className="section-top"><h2>Contoh jurnal dalam data</h2><span>Contoh, bukan daftar lengkap</span></div><div className="example-columns">{[true,false].map(isNational=><div className="example-group" key={String(isNational)}><h3>{isNational?"Indonesia · catatan SINTA":"Internasional · SJR 2025"}</h3>{coverage?coverage.examples.filter(j=>(j.country==="Indonesia")===isNational).map(j=><button className="example-row" key={j.issn} onClick={()=>{setScope("all");search(j.issn,year,"all");}}><div><strong>{j.title}</strong><span>{j.publisher}</span><small>{isNational?`ISSN ${j.issn} · ${j.context==="decree"?"Bukti SK":"Catatan profil"}`:j.country}</small></div><Q value={j.quartile||(j.rank?`S${j.rank}`:null)}/></button>):<p className="example-loading">Memuat contoh dari katalog…</p>}</div>)}</div><div className="directory-foot">Tidak dibatasi berdasarkan kampus atau penerbit. Jurnal yang belum memiliki peringkat dapat tetap ditampilkan dengan identitas Crossref.</div></section>}
            {loading&&<div className="loading-state" role="status"><LoaderCircle className="spin" size={27}/><strong>Mencocokkan identitas dan sumber…</strong><p>Data langsung dapat memerlukan beberapa detik.</p></div>}
            {!loading&&result&&<>
              <div className="results-heading"><span>{result.totalMatches} kecocokan · {scopeLabel[result.scope]}</span><span>SJR {result.year}</span></div>
              {result.warnings.length>0&&<div className="warning-box"><Info size={17}/><div>{result.warnings.map((w,i)=><p key={i}>{w}</p>)}</div></div>}
              {selected?<JournalDetail j={selected} article={result.article} year={result.year} onCompare={addCompare} onExport={exportCSV}/>:result.journals.length?<>
                <p className="choose-hint">Pilih jurnal dengan ISSN dan penerbit yang sesuai.</p>
                <div className="journal-list">{result.journals.map(j=><button key={j.id} className="journal-row" onClick={()=>setSelected(j)}><span className="journal-icon"><BookOpen size={22}/></span><div><h2>{j.title}</h2><p>{j.publisher} · {j.country||"Negara belum tersedia"}</p><span>{j.issns.join(" · ")}</span>{!j.sjr&&!j.sinta&&<small className="identity-only-label">Identitas ditemukan · peringkat belum tersedia</small>}</div><div className="row-badges">{j.sjr&&<Q value={j.sjr.bestQuartile}/>} {j.sinta&&<Q value={`S${j.sinta.rank}`}/>}</div></button>)}</div>
                <div className="pagination"><span>{result.journals.length} dari {result.totalMatches} hasil</span>{result.hasMore&&<button className="button outline" onClick={loadMore} disabled={loadingMore}>{loadingMore&&<LoaderCircle className="spin" size={16}/>}Tampilkan hasil berikutnya</button>}</div>
              </>:<div className="start-state"><Search size={30}/><h2>Identitas belum ditemukan pada sumber yang diperiksa.</h2><p>Coba ISSN atau nama lengkap jurnal. Hasil kosong tidak menetapkan status indeks atau akreditasi.</p>{result.article&&<div className="article-fallback"><strong>{result.article.title}</strong><p>{result.article.journal} · {result.article.year}</p><SourceLink href={`https://doi.org/${result.article.doi}`}>Metadata artikel</SourceLink></div>}<div className="empty-links"><SourceLink href={`https://sinta.kemdiktisaintek.go.id/journals?q=${encodeURIComponent(result.query)}`}>Cari di SINTA</SourceLink><SourceLink href={`https://www.scimagojr.com/journalsearch.php?q=${encodeURIComponent(result.query)}`}>Cari di SCImago</SourceLink></div></div>}
              {selected&&result.totalMatches>1&&<button className="button text back-results" onClick={()=>setSelected(null)}>Kembali ke daftar kecocokan</button>}
            </>}
          </TabsContent>
          <TabsContent value="batch">
            <div className="batch-form"><label htmlFor="dois">Periksa daftar DOI</label><p>Satu DOI per baris, maksimal 20. Mencakup semua negara; duplikat diperiksa sekali.</p><textarea id="dois" value={batchText} onChange={e=>setBatchText(e.target.value)} placeholder={"10.1038/nphys1170\nhttps://doi.org/10.22146/ijc.108052"} rows={6} disabled={batchRunning}/><div className="batch-actions"><span>SJR {year} · <button className="inline-button" onClick={()=>setTab("single")}>Ubah tahun</button></span><button className="button primary" onClick={runBatch} disabled={batchRunning}>{batchRunning?<LoaderCircle className="spin" size={17}/>:<Layers size={17}/>}Periksa daftar</button></div></div>
            {batchRunning&&<div className="batch-progress" role="status">{progress} dari {batchTotal} DOI diperiksa<Progress value={batchTotal?progress/batchTotal*100:0} aria-label="Progres pemeriksaan DOI"/></div>}
            {batch.length>0&&<div className="batch-results"><div className="section-top"><h3>Hasil pemeriksaan</h3><button className="button outline" onClick={()=>exportCSV(batch)}><FileDown size={16}/>Unduh CSV</button></div><Table><TableHeader><TableRow><TableHead>Artikel / jurnal</TableHead><TableHead>SJR</TableHead><TableHead>SINTA</TableHead><TableHead>Keterangan</TableHead></TableRow></TableHeader><TableBody>{batch.map((r,i)=><TableRow key={i}><TableCell><strong>{r.article?.title||r.input}</strong><p>{r.journal?.title||r.article?.journal||"Identitas belum ditemukan"}</p><span>{r.article?.year||""}</span></TableCell><TableCell><Q value={r.journal?.sjr?.bestQuartile}/>{r.journal?.sjr&&<span>{r.journal.sjr.year}</span>}</TableCell><TableCell>{r.journal?.sinta?<Q value={`S${r.journal.sinta.rank}`}/>:<span>{sintaLabel(r.journal)}</span>}</TableCell><TableCell>{r.error||"Bukti sumber tersedia pada CSV"}</TableCell></TableRow>)}</TableBody></Table><p className="table-note">CSV menyertakan negara, sumber identitas, kategori SJR, serta asal dan tanggal catatan SINTA.</p></div>}
          </TabsContent>
          <TabsContent value="compare">
            {compare.length===0?<div className="start-state"><Scale size={32}/><h2>Belum ada jurnal untuk dibandingkan.</h2><p>Buka hasil pencarian dan pilih “Bandingkan”. Maksimal tiga jurnal; periksa tahun serta kategori masing-masing.</p><button className="button primary" onClick={()=>setTab("single")}>Cari jurnal</button></div>:<div className="compare-content"><div className="section-top"><h3>Perbandingan jurnal</h3><button className="button outline" onClick={()=>exportCSV(compare.map(j=>({input:j.title,journal:j})))}><FileDown size={16}/>Unduh CSV</button></div><div className="compare-grid">{compare.map(j=><section className="compare-card" key={j.id}><button className="remove-compare" onClick={()=>setCompare(v=>v.filter(x=>x.id!==j.id))} aria-label={`Hapus ${j.title} dari perbandingan`}><X size={17}/></button><BookOpen size={23}/><h3>{j.title}</h3><p>{j.publisher}</p><p>{j.country||"Negara belum tersedia"}</p><div className="compare-metric"><span>SJR {j.sjr?.year||"belum tersedia"}</span><Q value={j.sjr?.bestQuartile}/></div><div className="compare-metric"><span>SINTA</span>{j.sinta?<Q value={`S${j.sinta.rank}`}/>:<small>{sintaLabel(j)}</small>}</div><div className="compare-fields">{j.sjr?.categories.map(c=><span key={c.name}>{c.name} · {c.quartile}</span>)}</div>{j.sjr&&<SourceLink href={j.sjr.url}>Sumber SJR</SourceLink>}{j.sinta&&<SourceLink href={j.sinta.url}>Sumber SINTA</SourceLink>}{j.identitySource&&<SourceLink href={j.identitySource.url}>Identitas Crossref</SourceLink>}</section>)}</div><p className="table-note">Kuartil dari tahun dan kategori yang berbeda tidak langsung setara. SINTA memiliki cakupan nasional.</p><button className="button text" onClick={()=>setTab("single")}>Tambahkan jurnal</button></div>}
          </TabsContent>
        </Tabs>
        {error&&<div className="error-box" role="alert"><Info size={18}/>{error}</div>}
        {notice&&<div className="notice" role="status"><Check size={17}/>{notice}<button aria-label="Tutup pemberitahuan" onClick={()=>setNotice("")}><X size={15}/></button></div>}
      </div><aside className="context-column">
        <section className="source-panel"><div className="panel-title"><Database size={18}/><h2>Cakupan data</h2></div>
          <div className="source-entry"><SourceLogo name="SCImago Journal & Country Rank" src="/assets/sources/scimago.svg" href="https://www.scimagojr.com/" width={180} height={27}/><div><strong>SCImago · global</strong><p>Kuartil menurut tahun & bidang</p><span>{coverage?`${coverage.sjrCount.toLocaleString("id-ID")} jurnal · ${coverage.countryCount} negara`:"Memuat cakupan…"}</span><small>{coverage?`${coverage.sjrIndonesiaCount} jurnal Indonesia · edisi ${coverage.sjrYear}`:""}</small></div></div>
          <div className="source-entry"><SourceLogo name="SINTA" src="/assets/sources/sinta.png" href="https://sinta.kemdiktisaintek.go.id/" width={126} height={45}/><div><strong>SINTA / SK · Indonesia</strong><p>Catatan akreditasi S1–S6</p><span>{coverage?`${coverage.sintaCount.toLocaleString("id-ID")} catatan · ${coverage.nationalPublisherCount.toLocaleString("id-ID")} nama penerbit`:"Memuat cakupan…"}</span><small>Cakupan sebagian, bukan direktori lengkap</small></div></div>
          <div className="source-entry"><SourceLogo name="Metadata from Crossref" src="https://assets.crossref.org/logo/metadata-from-crossref-logo-200.svg" href="https://www.crossref.org/" width={150} height={51}/><div><strong>Crossref · identitas</strong><p>DOI, ISSN, dan nama jurnal</p><span>Metadata tambahan saat pencarian</span></div></div>
          <div className="coverage-foot">Data awal diambil {dateLabel(coverage?.checkedAt)}. Tanggal setiap sumber tersedia pada hasil. Akses sumber langsung dapat dibatasi.</div>
        </section>
        <section className="reading-panel"><span className="eyebrow">METODE PEMERIKSAAN</span><h2>SJR dan SINTA memiliki cakupan berbeda.</h2><p>SJR mengelompokkan jurnal per bidang dan tahun. SINTA mencatat akreditasi jurnal nasional Indonesia.</p><p>Identitas ditemukan tidak selalu berarti peringkat tersedia.</p><button className="button text" onClick={()=>setGuide(true)}>Metode & keterbatasan<CircleHelp size={16}/></button><div className="quartile-key"><span><Q value="Q1"/>Kelompok kuartil pertama</span><span><Q value="Q4"/>Kelompok kuartil keempat</span></div></section>
        <div className="source-directory"><SourceLink href="https://www.scimagojr.com/">SCImago resmi</SourceLink><SourceLink href="https://sinta.kemdiktisaintek.go.id/journals">SINTA resmi</SourceLink></div>
      </aside></div>
    </main>
    <footer className="footer">
      <div className="footer-identity"><a className="footer-brand" href="/"><img src="/assets/brand/jurnalensa-emblem.png" width="54" height="54" alt="Logo Jurnalensa: buku terbuka dengan satu bintang"/><span>jurnalensa<span className="brand-period">.</span></span></a><p>Buku untuk pengetahuan. Bintang untuk Kartika.</p><button onClick={()=>setGuide(true)}>Tentang data & metode<ExternalLink size={13} aria-hidden="true"/></button></div>
      <div className="developer-contact"><span className="eyebrow">PENGEMBANG</span><strong>A.P.A Projek</strong><p>Masukan, koreksi data, atau kendala penggunaan.</p><a href="mailto:kartika.230852044@student.unud.ac.id"><Mail size={16} aria-hidden="true"/><span>kartika.230852044@student.unud.ac.id</span></a></div>
    </footer>
    <Dialog open={guide} onOpenChange={setGuide}><DialogContent className="guide-dialog"><DialogTitle>Metode dan cakupan Jurnalensa</DialogTitle><DialogDescription>Informasi yang diperiksa, sumbernya, dan batas hasil pencarian.</DialogDescription><div className="guide-body">
      <h3>Indonesia dan internasional</h3><p>Data SCImago awal memuat 30.412 jurnal dari 122 negara. Catatan nasional memuat 2.682 jurnal dari 1.439 nama penerbit, dengan peringkat S1–S6. Tidak ada pembatasan berdasarkan nama kampus. Cakupan nasional ini masih sebagian dari SINTA.</p>
      <h3>Kuartil SJR, tahun, dan bidang</h3><p>Q1–Q4 adalah kelompok peringkat pada bidang dan tahun tertentu. Badge adalah kuartil terbaik; tabel menunjukkan kategori. Kuartil SJR berbeda dari CiteScore dan JCR. Tahun terbit artikel tidak otomatis sama dengan tahun metrik.</p>
      <h3>SINTA dan masa berlaku</h3><p>SINTA memiliki cakupan jurnal nasional Indonesia. Catatan yang ditemukan berasal dari profil atau SK yang disebutkan pada hasil. SK membuktikan keputusan pada periode tertentu, bukan status terkini. Untuk artikel lama, cocokkan volume, nomor, dan masa berlaku akreditasi.</p>
      <h3>Identitas dan peringkat</h3><p>DOI diperiksa melalui Crossref lalu dicocokkan dengan ISSN. Jika tidak ada kecocokan pada data awal, pencarian nama/ISSN diperluas ke Crossref, maksimal 20 kandidat. Crossref menyediakan identitas, bukan kuartil atau akreditasi. Peringkat tidak dipasang hanya karena nama jurnal sama.</p>
      <h3>Negara dan daftar hasil</h3><p>Filter negara memakai lokasi yang dicatat pada sumber; lokasi tidak ditebak dari nama penerbit. Pilih “Semua negara” untuk memasukkan metadata dengan negara belum tersedia. Hasil data awal ditampilkan 12 per halaman dan dapat dilanjutkan.</p>
      <h3>Hasil kosong dan akses sumber</h3><p>Hasil kosong tidak membuktikan jurnal tidak terindeks atau tidak terakreditasi. Data SCImago tidak mengonfirmasi status Scopus terkini maupun pengindeksan suatu artikel. Jika data tahun SJR yang dipilih tidak tersedia, kuartil tahun lain tidak digunakan sebagai pengganti.</p>
      <SourceLink href="https://www.scimagojr.com/help.php">Metodologi SCImago</SourceLink><SourceLink href="https://github.com/CrossRef/rest-api-doc">Dokumentasi Crossref</SourceLink>
    </div></DialogContent></Dialog>
  </div>;
}
