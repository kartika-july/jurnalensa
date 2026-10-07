import snapshotPacked from "./data/sjr-2025.txt?raw";
import nationalSnapshotText from "./data/sinta.json?raw";
import {
  articleFromMetadata, attachIdentity, formatISSN, journalFromMetadata,
  matchJournals, mergeJournals, normalizeDOI, normalizeISSN,
  normalizeTitle, parseSCImago, validISSN,
} from "./journal-core";
import type {Article, Coverage, Journal, JournalScope, SearchResult} from "./journal-types";

const snapshotDate = "2026-10-07T06:14:00Z";
const national = JSON.parse(nationalSnapshotText) as Journal[];
let snapshotPromise: Promise<Journal[]> | undefined;
async function getSnapshot(): Promise<Journal[]> {
  if (!snapshotPromise) snapshotPromise = (async () => {
    const binary = atob(snapshotPacked.trim());
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    const rows = JSON.parse(await new Response(stream).text()) as
      [string,string,string,string,string[],number|null,string|null,[string,string][]][];
    return rows.map(r => ({
      id: `sjr-${r[0]}`, title: r[1], publisher: r[2], country: r[3], issns: r[4],
      sjr: {year: 2025, value: r[5] ?? undefined, bestQuartile: r[6] ?? undefined,
        categories: r[7].map(c => ({name: c[0], quartile: c[1]})),
        url: `https://www.scimagojr.com/journalsearch.php?q=${r[0]}&tip=sid`, checkedAt: snapshotDate},
      notes: [],
    }));
  })();
  return snapshotPromise;
}

const historical = new Map<number,{expires:number;promise:Promise<Journal[]>}>();
const articleCache = new Map<string,{expires:number;article:Article}>();
const identityCache = new Map<string,{expires:number;data:Journal[]}>();
const nationalCache = new Map<string,{expires:number;data:Journal[];warning?:string}>();
let sintaUnavailableUntil = 0;
const sintaUnavailableMessage = "SINTA langsung belum dapat diakses. Catatan nasional yang ditampilkan berasal dari profil/SK dengan tanggal sumber, bukan konfirmasi status terkini.";
async function fetchPublic(url:string, timeout=12000) {
  const r = await fetch(url, {headers: {
    "User-Agent": "Jurnalensa/1.1 (academic journal metadata explorer)",
    "Accept": "application/json,text/csv,text/html;q=0.9",
  }, signal: AbortSignal.timeout(timeout)});
  if (!r.ok) throw new Error(`Sumber membalas HTTP ${r.status}`);
  return r;
}
async function journalsForYear(year:number): Promise<Journal[]> {
  if (year === 2025) return getSnapshot();
  const old = historical.get(year);
  if (old && old.expires > Date.now()) return old.promise;
  historical.clear();
  const promise = (async () => {
    const r = await fetchPublic(`https://www.scimagojr.com/journalrank.php?year=${year}&out=xls`, 15000);
    if (Number(r.headers.get("content-length") || 0) > 18000000) throw new Error("Ekspor terlalu besar.");
    const text = await r.text();
    if (text.length > 18000000) throw new Error("Ekspor terlalu besar.");
    const records = parseSCImago(text, year, new Date().toISOString());
    if (records.length < 100) throw new Error("Ekspor tidak lengkap.");
    return records;
  })();
  historical.set(year, {expires: Date.now()+3600000, promise});
  promise.catch(() => historical.delete(year));
  return promise;
}
async function getArticle(doi:string): Promise<Article> {
  const old = articleCache.get(doi);
  if (old && old.expires > Date.now()) return old.article;
  try {
    const r = await fetchPublic(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
    const d = await r.json() as {message:Record<string,unknown>};
    const article = articleFromMetadata(d.message);
    if (articleCache.size >= 100) articleCache.clear();
    articleCache.set(doi, {expires: Date.now()+3600000, article});
    return article;
  } catch (e) {
    if (String(e).includes("404")) throw new Error("DOI tidak ditemukan di Crossref. DOI mungkin terdaftar pada layanan lain; coba ISSN atau nama jurnal.");
    throw new Error("Metadata DOI belum dapat diambil dari Crossref. Coba lagi atau gunakan ISSN/nama jurnal.");
  }
}
async function getJournalIdentities(query:string): Promise<Journal[]> {
  const key = normalizeTitle(query);
  const old = identityCache.get(key);
  if (old && old.expires > Date.now()) return old.data;
  const url = validISSN(query)
    ? `https://api.crossref.org/journals/${encodeURIComponent(formatISSN(query))}`
    : `https://api.crossref.org/journals?query=${encodeURIComponent(query)}&rows=20`;
  try {
    const r = await fetchPublic(url, 10000);
    const d = await r.json() as {message:Record<string,unknown>};
    const rows = Array.isArray(d.message.items) ? d.message.items : [d.message];
    const data = rows.map(m => journalFromMetadata(m as Record<string,unknown>, new Date().toISOString()))
      .filter((j):j is Journal => j !== null);
    if (identityCache.size >= 100) identityCache.clear();
    identityCache.set(key, {expires: Date.now()+3600000, data});
    return data;
  } catch (e) {
    if (String(e).includes("404")) return [];
    throw new Error("Pencarian identitas tambahan di Crossref belum tersedia. Coba ISSN atau ulangi nanti.");
  }
}
function stripTags(s:string) {
  return s.replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim();
}
function parseSintaList(html:string): Journal[] {
  const out: Journal[] = [];
  const anchors = [...html.matchAll(/<a\b[^>]*href=["']([^"']*\/journals\/profile\/(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  for (let i=0; i<anchors.length; i++) {
    const m = anchors[i], next = anchors[i+1]?.index || html.length;
    const section = stripTags(html.slice(m.index,next)), title = stripTags(m[3]);
    const issns = [...section.matchAll(/(?:P|E)-ISSN\s*:\s*([0-9Xx\-]{8,9})/g)]
      .map(m => m[1]).filter(validISSN).map(formatISSN);
    const rank = section.match(/\bS([1-6])\s+Accredited\b/i);
    if (!title || !issns.length || !rank) continue;
    out.push({id:`sinta-${m[2]}`, title, publisher:"Penerbit tercantum pada profil SINTA", country:"Indonesia", issns,
      sinta:{rank:Number(rank[1]), categories:[], url:`https://sinta.kemdiktisaintek.go.id/journals/profile/${m[2]}`,
        checkedAt:new Date().toISOString(), context:"profile", note:"Peringkat dibaca dari direktori SINTA saat pencarian. Masa berlaku perlu diperiksa pada profil/SK."}, notes:[]});
  }
  return out;
}
async function liveNational(query:string) {
  const key = query.toLowerCase(), cached = nationalCache.get(key);
  if (cached && cached.expires > Date.now()) return cached;
  if (sintaUnavailableUntil > Date.now()) return {expires:sintaUnavailableUntil, data:[] as Journal[], warning:sintaUnavailableMessage};
  try {
    const r = await fetchPublic(`https://sinta.kemdiktisaintek.go.id/journals?q=${encodeURIComponent(query)}`,6500);
    const data = parseSintaList(await r.text());
    const result = {expires:Date.now()+300000, data, warning:data.length ? undefined : "Direktori SINTA belum memberikan data yang dapat diverifikasi. Hasil menggunakan catatan yang tersedia."};
    if (nationalCache.size >= 50) nationalCache.clear();
    nationalCache.set(key,result);
    return result;
  } catch {
    sintaUnavailableUntil = Date.now()+300000;
    return {expires:sintaUnavailableUntil, data:[] as Journal[], warning:sintaUnavailableMessage};
  }
}

export async function coverage(): Promise<Coverage> {
  const rows = await getSnapshot();
  const codes = ["2303-288X","2721-6179","2987-2421","1932-6203","2045-2322","1745-2473"];
  const all = mergeJournals(rows,national);
  const examples = codes.flatMap(code => {
    const j = matchJournals(all,code)[0];
    return j ? [{title:j.title, publisher:j.publisher, country:j.country, issn:code,
      quartile:j.sjr?.bestQuartile, rank:j.sinta?.rank, context:j.sinta?.context}] : [];
  });
  return {sjrCount:rows.length, countryCount:new Set(rows.map(j=>j.country).filter(Boolean)).size,
    sjrIndonesiaCount:rows.filter(j=>j.country==="Indonesia").length, sintaCount:national.length,
    nationalPublisherCount:new Set(national.map(j=>j.publisher)).size, checkedAt:snapshotDate, sjrYear:2025, examples};
}
export async function searchJournals(query:string,year:number,kind?:string,scope:JournalScope="all",offset=0):Promise<SearchResult> {
  if (query.length<2 || query.length>300) throw new Error("Masukkan 2–300 karakter untuk pencarian.");
  if (!Number.isInteger(year) || year<1999 || year>2025) throw new Error("Tahun SJR harus antara 1999 dan 2025.");
  if (!["all","indonesia","international"].includes(scope)) throw new Error("Cakupan pencarian tidak valid.");
  if (!Number.isInteger(offset) || offset<0 || offset>50000) throw new Error("Halaman pencarian tidak valid.");
  const warnings:string[] = [];
  let article:Article|undefined, input=query;
  const isDOI = kind==="doi" || /^10\./i.test(query) || /^doi\s*:/i.test(query) || /^https?:\/\/(?:dx\.)?doi\.org\//i.test(query);
  if (isDOI) {
    article = await getArticle(normalizeDOI(query));
    input = article.journal;
    if (article.type!=="journal-article") warnings.push("DOI ini tidak berjenis artikel jurnal dalam metadata Crossref. Periksa jenis publikasinya.");
    if (!article.issns.length) warnings.push("Metadata artikel tidak memuat ISSN valid. Identitas berdasarkan nama perlu diperiksa manual.");
  } else if (/^[\dXx\-\s]{8,10}$/.test(query) && normalizeISSN(query).length===8 && !validISSN(query)) {
    throw new Error("ISSN tidak lolos pemeriksaan digit kontrol. Periksa kembali delapan karakternya.");
  }
  if (article && article.type!=="journal-article") return {query,year,scope,article,journals:[],totalMatches:0,offset,hasMore:false,warnings,checkedAt:new Date().toISOString()};
  const reference = await getSnapshot();
  const sjr = await journalsForYear(year).catch(() => {
    warnings.push(`Data SJR ${year} belum dapat diambil. Kuartil tahun lain tidak digunakan sebagai pengganti.`);
    return [] as Journal[];
  });
  // Keep identity visible when an annual metric is missing. Never retain a
  // 2025 ranking in results for another selected year.
  const annualIds = new Set(sjr.map(j=>j.id)), annualISSNs = new Set(sjr.flatMap(j=>j.issns.map(normalizeISSN)));
  const identityOnly = year===2025 ? [] : reference.filter(j=>!annualIds.has(j.id)&&!j.issns.some(i=>annualISSNs.has(normalizeISSN(i))))
    .map(({sjr:_metric,...j}) => ({...j, notes:[`Identitas berasal dari katalog SCImago 2025; kuartil ${year} belum tersedia dalam data yang diperiksa.`]}));
  const ranked = [...sjr,...identityOnly];
  let all = mergeJournals(ranked,national);
  const preMatches = matchJournals(all,input,article?.issns.length ? article.issns : undefined);
  const knownInternational = preMatches.length>0 && preMatches.every(j=>j.country&&j.country!=="Indonesia"&&!j.sinta);
  if (!knownInternational && scope!=="international") {
    const live = await liveNational(article?.issns[0]?.replace("-","") || input);
    if (live.warning) warnings.push(live.warning);
    const records = [...live.data,...national.filter(n=>!live.data.some(l=>l.issns.some(i=>n.issns.some(ni=>normalizeISSN(ni)===normalizeISSN(i)))))];
    all = mergeJournals(ranked,records);
  }
  let matches = matchJournals(all,input,article?.issns.length ? article.issns : undefined);
  if (!matches.length && article?.type==="journal-article" && article.journal) {
    const sameName = matchJournals(all,article.journal).some(j=>normalizeTitle(j.title)===normalizeTitle(article!.journal));
    if (sameName && article.issns.length) warnings.push("Nama jurnal menyerupai catatan peringkat, tetapi ISSN berbeda. Peringkat catatan tersebut tidak dipasang pada artikel ini.");
    matches = [{id:`article-${article.doi}`, title:article.journal, publisher:article.publisher,
      issns:article.issns, identitySource:{name:"Crossref",url:`https://doi.org/${article.doi}`,checkedAt:new Date().toISOString()},
      notes:["Identitas jurnal berasal dari metadata artikel Crossref. Peringkat belum tersedia dalam cakupan yang diperiksa."]}];
  } else if (!matches.length && !article) {
    try {
      const identities = await getJournalIdentities(input);
      all = attachIdentity(all,identities);
      const exact = matchJournals(all,input);
      matches = validISSN(input) ? matchJournals(all,input) : exact.length ? exact
        : identities.flatMap(j=>matchJournals(all,j.title,j.issns));
      matches = [...new Map(matches.map(j=>[j.id,j])).values()];
      if (identities.length) warnings.push("Pencarian diperluas melalui identitas Crossref (maksimal 20 kandidat). Cocokkan judul dan ISSN; metadata tidak menetapkan peringkat.");
    } catch(e) {warnings.push(e instanceof Error?e.message:"Crossref belum tersedia.");}
  }
  if (scope!=="all") {
    const before = matches.length;
    matches = matches.filter(j=>scope==="indonesia" ? j.country==="Indonesia"||Boolean(j.sinta)
      : Boolean(j.country&&j.country!=="Indonesia"&&!j.sinta));
    if (before>matches.length) warnings.push("Filter negara hanya memakai negara yang tercatat pada sumber. Pilih semua negara untuk melihat identitas yang negaranya belum tersedia.");
  }
  const journals = matches.slice(offset,offset+12).map(j => ({...j, notes:[...new Set([
    ...j.notes,
    ...(j.sjr?["Data SCImago tidak mengonfirmasi status Scopus terkini atau pengindeksan artikel tertentu."]:[]),
    ...(article?.year&&j.sjr&&article.year!==j.sjr.year?[`Artikel terbit ${article.year}; kuartil yang dipilih adalah tahun ${j.sjr.year}.`]:[]),
  ])]}));
  return {query,year,scope,article,journals,totalMatches:matches.length,offset,hasMore:offset+journals.length<matches.length,warnings,checkedAt:new Date().toISOString()};
}
