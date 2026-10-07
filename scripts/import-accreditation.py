"""Import a public accreditation decision with a five-column journal table.

Usage: python scripts/import-accreditation.py PDF SOURCE_URL OUTPUT_JSON
       --decision-number NUMBER --decision-date YYYY-MM-DD
Extraction is conservative: invalid ISSNs and incomplete decisions are rejected.
The resulting records represent the cited decree, not a live SINTA guarantee.
"""
import argparse, re, json, datetime
from pathlib import Path
import pdfplumber

def clean(s):
    return re.sub(r"\s+", " ", s or "").strip()

def issn_valid(s):
    return bool(re.fullmatch(r"\d{7}[\dX]", s)) and sum((10 if c == "X" else int(c)) * (8-i) for i,c in enumerate(s)) % 11 == 0

def extract(pdf_path, source_url, decision_number, decision_date):
    raw, current = [], None
    with pdfplumber.open(pdf_path) as doc:
        for page_no,page in enumerate(doc.pages, 1):
            for table in page.extract_tables():
                for row in table:
                    if len(row) != 5: continue
                    cells = [clean(x) for x in row]
                    if cells[0] == "NO" or cells[1] == "NAMA JURNAL": continue
                    if re.fullmatch(r"\d+\.?", cells[0]):
                        if current: raw.append(current)
                        current = {"cells":cells, "page":page_no}
                    elif not cells[0] and current and any(cells[1:]):
                        for i in range(1,5): current["cells"][i] = clean(current["cells"][i]+" "+cells[i])
            page.close()
            if page_no % 50 == 0: print(f"Read {page_no} pages", flush=True)
    if current: raw.append(current)
    records, rejected = [], []
    for row in raw:
        _,title,code,publisher,decision = row["cells"]
        code = re.sub(r"[\s-]", "", code).upper()
        ranks = re.findall(r"Peringkat\s+([1-6])\b", decision, re.I)
        period = re.search(r"mulai\s+(Volume\s+\d+\s+Nomor\s+\d+\s+Tahun\s+\d{4}\s+sampai\s+Volume\s+\d+\s+Nomor\s+\d+\s+Tahun\s+\d{4})", decision, re.I)
        if not issn_valid(code) or not ranks or not period or not title:
            rejected.append({"title":title,"code":code,"page":row["page"],"decision":decision});continue
        rank=int(ranks[-1]);issn=code[:4]+"-"+code[4:]
        records.append({"id":"sinta-sk-"+code,"title":title,"publisher":publisher,"country":"Indonesia","issns":[issn],"sinta":{"rank":rank,"categories":[],"url":source_url+"#page="+str(row["page"]),"checkedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"context":"decree","note":"SK "+decision_number+", ditetapkan "+decision_date+". Masa berlaku: "+period[1]+". Status terkini perlu dikonfirmasi pada profil SINTA.","validity":period[1]},"notes":["Catatan akreditasi berasal dari keputusan resmi pada periode tertentu; bukan pemeriksaan langsung status SINTA saat ini."]})
    return records,rejected

if __name__ == "__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf")
    parser.add_argument("source_url")
    parser.add_argument("output")
    parser.add_argument("--decision-number", required=True)
    parser.add_argument("--decision-date", required=True)
    args=parser.parse_args()
    try: datetime.date.fromisoformat(args.decision_date)
    except ValueError: parser.error("decision-date harus berupa YYYY-MM-DD yang valid")
    if not args.decision_number.strip(): parser.error("decision-number tidak boleh kosong")
    output=args.output
    records,rejected=extract(args.pdf,args.source_url,args.decision_number.strip(),args.decision_date)
    unique={r["issns"][0]:r for r in records}
    Path(output).write_text(json.dumps(list(unique.values()),ensure_ascii=False,separators=(",",":")))
    Path(output+".rejected.json").write_text(json.dumps(rejected,ensure_ascii=False,indent=2))
    print(f"Accepted {len(unique)} journals; rejected {len(rejected)} incomplete or invalid rows",flush=True)
