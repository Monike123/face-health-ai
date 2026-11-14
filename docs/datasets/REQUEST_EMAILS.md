# Dataset access — email templates

Copy/paste, fill `[brackets]`. Prefer an **institutional / university** email. Personal Gmail is rejected by PURE / COHFACE / MMPD.

---

## 1) UBFC-rPPG

**To:** yannick.benezeth@u-bourgogne.fr  
**Cc:** (optional) richard.macwan@u-bourgogne.fr  
**Subject:** UBFC-rPPG dataset access request — [Your Name / Org]

```
Dear Prof. Benezeth,

I am [Name], [Student/Engineer/Researcher] at [Organization].
I would like to request access to the UBFC-rPPG dataset for non-commercial
research / algorithm development on remote photoplethysmography (heart rate
from face video).

Intended use: benchmark classical POS/CHROM and deep rPPG models; publish
results with proper citation of Bobbia et al., Pattern Recognition Letters, 2017.

Affiliation URL: [https://...]
Contact email: [you@institution.edu]

Thank you for making the dataset available.

Best regards,
[Name]
[Title]
[Organization]
```

Homepage: https://sites.google.com/view/ybenezeth/ubfcrppg

---

## 2) PURE (academic only)

**To:** nikr-datasets-request@tu-ilmenau.de  
**Subject:** PURE dataset access request — [Institution]

```
Dear PURE dataset maintainers,

I request access to the PURE (Pulse Rate Detection) dataset for academic
research on camera-based pulse estimation under head motion.

Name: [Name]
Affiliation: [University / Lab]
Academic email: [you@university.edu]
Supervisor (if student): [Name, email]
Intended use: evaluate rPPG robustness (talking / translation / rotation).
We will cite Stricker et al., IEEE RO-MAN 2014.

Note: request is sent from an institutional account.

Best regards,
[Name]
```

**Important:** Companies and Gmail/QQ/163 addresses are rejected.

---

## 3) COHFACE (non-commercial)

Use Zenodo request form: https://zenodo.org/records/4081054  

Need authorized signatory with permanent position + org email. Strictly **non-commercial research**.

---

## 4) MMPD (academic, commercial banned)

1. Download agreement: https://github.com/McJackTang/MMPD_rPPG_dataset (MMPD_Release_Agreement.pdf)  
2. Sign / scan  
3. Email from **faculty** institutional address:

**To:** tjk24@mails.tsinghua.edu.cn  
**Cc:** yuntaowang@tsinghua.edu.cn  
**Subject:** MMPD Access Request - [your institution]

```
Dear MMPD team,

Please find attached the signed MMPD data release agreement.

Institution: [University]
Faculty applicant: [Name, title]
Website: [https://...]
Relevant publications: [links or N/A]
Project: research on rPPG equity across Fitzpatrick skin types 3–6 and
motion/lighting robustness. We request the mini dataset (48GB) first.

We understand commercial use is banned.

Best regards,
[Faculty Name]
```

Prefer **mini (48 GB)** before full (370 GB).

---

## After approval

1. Save the download URL/password **only in a local `.env`** (never commit).  
2. Place archives under `data/raw/_incoming/`.  
3. Run:

```powershell
python scripts/datasets/verify_dataset.py --name ubfc
```
