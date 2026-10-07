import json
from pathlib import Path

import pandas as pd

SOURCE = Path(r"D:\Downloads\00.Produtos_Hipper Freios unificado..xls")
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "catalog.json"


def clean(value):
    if pd.isna(value):
        return ""
    text = str(value).strip()
    replacements = {
        "APLICA��ES": "APLICAÇÕES",
        "S�LIDO": "SÓLIDO",
        "C�DIGO": "CÓDIGO",
        "DI�METRO": "DIÂMETRO",
        "PE�AS": "PEÇAS",
        "M�X.": "MÁX.",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


sheet = pd.read_excel(SOURCE, sheet_name=0, header=9)
sheet = sheet[sheet.iloc[:, 0].notna()]
records = []
for _, row in sheet.iterrows():
    code = clean(row.iloc[0])
    application = clean(row.iloc[2])
    product = clean(row.iloc[4])
    if not code or not application or code.upper() == "CÓDIGO HF" or product.upper() == "PRODUTO":
        continue
    records.append({
        "code": code,
        "application": application,
        "axle": clean(row.iloc[3]),
        "product": product,
        "type": clean(row.iloc[5]),
        "hub": clean(row.iloc[6]),
        "original": clean(row.iloc[1]),
    })

OUTPUT.write_text(json.dumps(records, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(json.dumps({"output": str(OUTPUT), "records": len(records)}, ensure_ascii=False))
