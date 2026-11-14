# Dataset Registry (living)

Full guide: [`docs/datasets/GUIDE.md`](datasets/GUIDE.md) · Emails: [`docs/datasets/REQUEST_EMAILS.md`](datasets/REQUEST_EMAILS.md)

| Dataset | GT | Commercial OK? | Requested | Approved | Local path | Serves |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **SCAMPS example** | Synthetic PPG + BR | Research only | Auto | Open HTTP | `data/raw/SCAMPS/` | Pipeline / DL smoke |
| UBFC-rPPG (42 / C920) | PPG + HR | Research (check terms) | ☐ | ☐ | `data/raw/UBFC-rPPG/` | P11–P14, P21, P30 |
| PURE | PPG + SpO2 (no RR) | Academic only | ☐ | ☐ | `data/raw/PURE/` | P12, P21, P30 |
| COHFACE | BVP + **respiration** | **No** | ☐ | ☐ | `data/raw/COHFACE/` | **P23 RR** |
| MMPD mini/full | PPG (skin 3–6) | **No** | ☐ | ☐ | `data/raw/MMPD/` | Equity research |
| In-house (P34) | ECG/belt/cuff | **Yes (owned)** | ☐ | ☐ | — | Product weights |

**Alignment rule:** dataset timestamps / fixed offsets only — never cross-correlate GT against the method under test.
