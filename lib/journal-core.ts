import type { Article, Category, Journal } from "./journal-types";
export function normalizeTitle(s: string) { return s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^\p{L}\p{N}]+/gu, " ").trim(); }
export function normalizeISSN(s: string) { return s.toUpperCase().replace(/[^0-9X]/g, ""); }
export function formatISSN(s: string) { const v = normalizeISSN(s); return v.length === 8 ? `${v.slice(0, 4)}-${v.slice(4)}` : s; }
export function validISSN(s: string) { const v = normalizeISSN(s); if (!/^\d{7}[\dX]$/.test(v))
    return false; const sum = [...v].reduce((a, c, i) => a + (c === "X" ? 10 : Number(c)) * (8 - i), 0); return sum % 11 === 0; }
export function normalizeDOI(input: string) {
    let q = input.trim().replace(/^doi\s*:\s*/i, "").replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
    try {
        q = decodeURIComponent(q);
    }
    catch {
        throw new Error("Tautan DOI tidak valid.");
    }
    if (!/^10\.\d{4,9}\/\S+$/i.test(q) || q.length > 300)
        throw new Error("Format DOI tidak valid. Gunakan DOI seperti 10.1038/nphys1170.");
    return q.toLowerCase();
}
export function csvRows(csv: string) {
    const rows: string[][] = [];
    let row: string[] = [], cell = "", quoted = false;
    for (let i = 0; i < csv.length; i++) {
        const c = csv[i];
        if (c === '"') {
            if (quoted && csv[i + 1] === '"') {
                cell += '"';
                i++;
            }
            else
                quoted = !quoted;
        }
        else if (c === ';' && !quoted) {
            row.push(cell);
            cell = "";
        }
        else if ((c === '\n' || c === '\r') && !quoted) {
            if (c === '\r' && csv[i + 1] === '\n')
                i++;
            row.push(cell);
            cell = "";
            if (row.length > 1)
                rows.push(row);
            row = [];
        }
        else
            cell += c;
    }
    if (cell || row.length) {
        row.push(cell);
        rows.push(row);
    }
    if (quoted)
        throw new Error("Ekspor SCImago tidak lengkap.");
    return rows;
}
export function parseSCImago(csv: string, year: number, checkedAt: string): Journal[] {
    const [headers, ...rows] = csvRows(csv.replace(/^\uFEFF/, ""));
    if (!headers?.includes("SJR Best Quartile") || !headers.includes("Categories"))
        throw new Error("Format data SCImago belum dikenali.");
    const ix = (s: string) => headers.indexOf(s), get = (r: string[], s: string) => r[ix(s)] || "";
    return rows.filter(r => get(r, "Type") === "journal").map(r => { const categories: Category[] = get(r, "Categories").split(";").flatMap(c => { const m = c.trim().match(/^(.*?)\s*\((Q[1-4]|-)\)$/); return m ? [{ name: m[1].trim(), quartile: m[2] }] : []; }); const val = Number(get(r, "SJR").replace(",", ".")); return { id: `sjr-${get(r, "Sourceid")}`, title: get(r, "Title"), publisher: get(r, "Publisher"), country: get(r, "Country"), issns: get(r, "Issn").split(",").map(formatISSN).filter(x => normalizeISSN(x).length === 8), sjr: { year, value: Number.isFinite(val) ? val : undefined, bestQuartile: /^Q[1-4]$/.test(get(r, "SJR Best Quartile")) ? get(r, "SJR Best Quartile") : undefined, categories, url: `https://www.scimagojr.com/journalsearch.php?q=${get(r, "Sourceid")}&tip=sid`, checkedAt }, notes: [] }; });
}
export function matchJournals(journals: Journal[], input: string, issns?: string[]) {
    if (issns?.length) {
        const codes = new Set(issns.map(normalizeISSN));
        return journals.filter(j => j.issns.some(i => codes.has(normalizeISSN(i))));
    }
    if (/^[\dXx\-\s]{8,10}$/.test(input) && normalizeISSN(input).length === 8) {
        const code = normalizeISSN(input);
        return journals.filter(j => j.issns.some(i => normalizeISSN(i) === code));
    }
    const q = normalizeTitle(input), tokens = q.split(" ").filter(Boolean);
    if (!q)
        return [];
    return journals.map(j => { const score = Math.max(...[j.title, ...(j.aliases || [])].map(name => { const t = normalizeTitle(name); return t === q ? 100 : t.startsWith(q) ? 90 : t.includes(q) ? 80 : tokens.length >= 2 && tokens.every(s => t.split(" ").includes(s)) ? 60 : 0; })); return { j, score }; }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.j.title.localeCompare(b.j.title)).map(x => x.j);
}
export function mergeJournals(sjr: Journal[], national: Journal[]) {
    const byISSN = new Map<string, Journal[]>();
    for (const j of national)
        for (const i of j.issns) {
            const code = normalizeISSN(i);
            byISSN.set(code, [...(byISSN.get(code) || []), j]);
        }
    const merged = sjr.map(j => { const matches = [...new Set(j.issns.flatMap(i => byISSN.get(normalizeISSN(i)) || []))]; const s = matches.length === 1 ? matches[0] : undefined; return { ...j, issns: [...new Set([...j.issns, ...(s?.issns || [])])], sinta: s?.sinta, notes: s?.notes || [] }; });
    const sjrCodes = new Set(sjr.flatMap(j => j.issns.map(normalizeISSN)));
    return [...merged, ...national.filter(j => !j.issns.some(i => sjrCodes.has(normalizeISSN(i))))];
}
export function articleFromMetadata(m: Record<string, any>): Article {
    const clean = (s: unknown) => String(s || "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&");
    const date = m["published-print"] || m["published-online"] || m.published || m.issued;
    return { doi: clean(m.DOI).toLowerCase(), title: clean(m.title?.[0]) || "Judul belum tersedia", journal: clean(m["container-title"]?.[0]), publisher: clean(m.publisher), issns: (Array.isArray(m.ISSN) ? m.ISSN : []).filter((i: unknown) => typeof i === "string" && validISSN(i)).map(formatISSN), year: date?.["date-parts"]?.[0]?.[0], volume: clean(m.volume), issue: clean(m.issue), type: clean(m.type) };
}
export function journalFromMetadata(m: Record<string, unknown>, checkedAt: string): Journal | null {
    const title = typeof m.title === "string" ? m.title.replace(/<[^>]*>/g, "").trim() : "";
    const issns = Array.isArray(m.ISSN) ? [...new Set(m.ISSN.filter((i): i is string => typeof i === "string" && validISSN(i)).map(formatISSN))] : [];
    if (!title || !issns.length)
        return null;
    return { id: `crossref-${normalizeISSN(issns[0])}`, title, publisher: typeof m.publisher === "string" ? m.publisher : "Penerbit belum tersedia", issns, identitySource: { name: "Crossref", url: `https://api.crossref.org/journals/${encodeURIComponent(issns[0])}`, checkedAt }, notes: ["Crossref mengonfirmasi identitas metadata, bukan peringkat, akreditasi, atau kualitas jurnal."] };
}
// Enrich only through ISSN. A same-title record cannot donate a ranking.
export function attachIdentity(known: Journal[], identities: Journal[]) {
    const out = [...known];
    for (const identity of identities) {
        const matches = out.flatMap((j, i) => j.issns.some(code => identity.issns.some(x => normalizeISSN(x) === normalizeISSN(code))) ? [i] : []);
        if (matches.length === 1) {
            const i = matches[0], j = out[i];
            out[i] = { ...j, issns: [...new Set([...j.issns, ...identity.issns])], aliases: [...new Set([...(j.aliases || []), identity.title])], identitySource: identity.identitySource };
        }
        else if (!matches.length)
            out.push(identity);
    }
    return out;
}
