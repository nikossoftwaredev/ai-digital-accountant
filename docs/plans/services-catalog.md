# Services Catalog — Οφειλές & Βεβαιώσεις

Comprehensive list of all government services the app will support.

**Status legend:** Built | Planned | Future

---

## Οφειλές (Debts)

| # | Service | Platform | Description | Status |
|---|---------|----------|-------------|--------|
| 1 | **Βεβαιωμένες Οφειλές ΑΑΔΕ** | AADE / TaxisNet | All certified tax debts (ΦΠΑ, Φόρος Εισοδήματος, ΕΝΦΙΑ, Φόρος Επαγγέλματος, Προκαταβολή κλπ.) + ταυτότητες οφειλής | Built |
| 2 | **Τέλη Κυκλοφορίας** | gov.gr (AADE) | Vehicle road tax notices (PDF download) | Built |
| 4 | **Ειδοποιητήρια Εισφορών ΕΦΚΑ** | e-EFKA | Social security contribution notices | Built |
| 5 | **Οφειλές ΚΕΑΟ** | KEAO | Overdue social security debts in collection | Future |
| 6 | **Ρυθμισμένες Οφειλές ΚΕΑΟ** | KEAO | Arranged / scheduled KEAO debt installments | Future |
| 7 | **Ετήσια Συνδρομή ΓΕΜΗ** | businessportal.gr | Annual GEMI registration fees | Future |
| 8 | **Δημοτικά Τέλη / ΤΑΠ** | Municipality portals | Municipal fees, real estate levies | Future |

---

## Βεβαιώσεις (Certificates)

| # | Certificate | Platform | Description | Status |
|---|------------|----------|-------------|--------|
| 1 | **Φορολογική Ενημερότητα** | AADE / TaxisNet | Tax clearance certificate | Planned |
| 2 | **Ασφαλιστική Ενημερότητα** | e-EFKA | Social security clearance certificate | Planned |
| 3 | **Πιστοποιητικό ΕΝΦΙΑ** | AADE / TaxisNet | ENFIA certificate (for real estate transactions) | Future |
| 4 | **Εκκαθαριστικό Σημείωμα** | AADE / TaxisNet | Annual tax assessment printout | Future |
| 5 | **Εκτύπωση Μητρώου** | AADE / TaxisNet | Registry printout (ΚΑΔ, σχέσεις φυσικού προσώπου, γενικό μητρώο) | Future |
| 6 | **Βεβαίωση Εργοδότη (Τράπεζα)** | Εργάνη | Employer certificate for bank use | Future |
| 7 | **Βεβαίωση Εργοδότη (ΔΥΠΑ)** | Εργάνη | Employer certificate for DYPA use | Future |
| 8 | **Βεβαίωση Εργοδότη (ΕΝΣΥΠΑ)** | Εργάνη | Employer certificate with ENSYPA forms | Future |
| 9 | **Πιστοποιητικά ΓΕΜΗ** | businessportal.gr | Company registration / status certificates | Future |
| 10 | **Υπεύθυνη Δήλωση** | gov.gr | Solemn declaration | Future |
| 11 | **Εξουσιοδότηση** | gov.gr | Authorization document | Future |
| 12 | **Ποινικό Μητρώο** | gov.gr | Criminal record certificate | Future |
| 13 | **Γνήσιο Υπογραφής** | gov.gr | Signature authentication | Future |

---

## Current Admin Cards

Cards currently rendered in the admin UI.

### `/admin/debts` — Οφειλές

| Card | Platform enum | Translation key | Scraper |
|------|---------------|-----------------|---------|
| ΑΑΔΕ Οφειλές | `AADE` | `debts.aadeTitle` | `aade.ts` |
| ΕΦΚΑ Οφειλές | `EFKA` | `debts.efkaTitle` | `efka.ts` |
| ΓΕΜΗ Οφειλές | `GEMI` | `debts.gemiTitle` | — (no scraper) |
| Τέλη Κυκλοφορίας | `MUNICIPALITY` | `debts.municipalityTitle` | `vehicle-tax.ts` |

Component: `debts-page-client.tsx` → `DebtServiceCard`

### `/admin/certificates` — Βεβαιώσεις

Page not yet created. Translation keys exist with "coming soon" placeholder:

| Card | Translation key | Scraper |
|------|-----------------|---------|
| Φορολογική Ενημερότητα | `certificates.taxClearance` | — (Phase D) |
| Ασφαλιστική Ενημερότητα | `certificates.socialSecurityClearance` | — (Phase D) |
