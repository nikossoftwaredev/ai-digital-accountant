import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// ── Types ────────────────────────────────────────────────────────

interface DebtRow {
  category: string;
  description: string | null;
  amount: string;
  platform: string;
}

interface DebtNotificationProps {
  clientName: string;
  debts: DebtRow[];
  totalAmount: string;
  scanDate: string;
  officeName: string;
  officePhone?: string;
}

// ── Category Labels ──────────────────────────────────────────────

const categoryLabels: Record<string, string> = {
  VAT: "ΦΠΑ",
  EFKA: "ΕΦΚΑ",
  INCOME_TAX: "Φόρος Εισοδήματος",
  ENFIA: "ΕΝΦΙΑ",
  CERTIFIED_DEBTS: "Βεβαιωμένες Οφειλές",
  VEHICLE_TAX: "Τέλη Κυκλοφορίας",
  GEMI: "ΓΕΜΗ",
  PROFESSIONAL_TAX: "Τέλος Επιτηδεύματος",
  TAX_PREPAYMENT: "Προκαταβολή Φόρου",
  MUNICIPAL_TAX: "Δημοτικά Τέλη",
};

// ── Styles ───────────────────────────────────────────────────────

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const heading = {
  fontSize: "24px",
  letterSpacing: "-0.5px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#484848",
  padding: "17px 0 0",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
  marginTop: "16px",
};

const thStyle = {
  textAlign: "left" as const,
  padding: "8px 12px",
  borderBottom: "2px solid #e5e7eb",
  fontSize: "13px",
  fontWeight: "600",
  color: "#6b7280",
};

const tdStyle = {
  padding: "8px 12px",
  borderBottom: "1px solid #f3f4f6",
  fontSize: "14px",
  color: "#374151",
};

const totalRow = {
  padding: "12px",
  borderTop: "2px solid #e5e7eb",
  fontSize: "16px",
  fontWeight: "700",
  color: "#111827",
};

const footer = {
  fontSize: "12px",
  lineHeight: "1.5",
  color: "#9ca3af",
};

// ── Component ────────────────────────────────────────────────────

export const DebtNotificationEmail = ({
  clientName,
  debts,
  totalAmount,
  scanDate,
  officeName,
  officePhone,
}: DebtNotificationProps) => (
  <Html>
    <Head />
    <Preview>
      Ενημέρωση οφειλών — {totalAmount}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={{ padding: "0 40px" }}>
          <Heading style={heading}>Ενημέρωση Οφειλών</Heading>

          <Text style={{ fontSize: "14px", color: "#484848" }}>
            Αγαπητέ/ή {clientName},
          </Text>

          <Text style={{ fontSize: "14px", color: "#484848" }}>
            Σας ενημερώνουμε ότι κατά τον τελευταίο έλεγχο ({scanDate})
            εντοπίστηκαν οι παρακάτω οφειλές:
          </Text>

          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Κατηγορία</th>
                <th style={thStyle}>Περιγραφή</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Ποσό</th>
              </tr>
            </thead>
            <tbody>
              {debts.map((debt, i) => (
                <tr key={i}>
                  <td style={tdStyle}>
                    {categoryLabels[debt.category] ?? debt.category}
                  </td>
                  <td style={tdStyle}>{debt.description ?? "—"}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace" }}>
                    {debt.amount}
                  </td>
                </tr>
              ))}
              <tr>
                <td style={totalRow} colSpan={2}>
                  Σύνολο
                </td>
                <td style={{ ...totalRow, textAlign: "right", fontFamily: "monospace" }}>
                  {totalAmount}
                </td>
              </tr>
            </tbody>
          </table>

          <Text style={{ fontSize: "14px", color: "#484848", marginTop: "24px" }}>
            Παρακαλούμε επικοινωνήστε μαζί μας για τη ρύθμιση ή εξόφληση
            των ανωτέρω οφειλών.
          </Text>

          <Hr style={{ borderColor: "#e5e7eb", margin: "24px 0" }} />

          <Text style={footer}>
            Με εκτίμηση,
            <br />
            {officeName}
            {officePhone && (
              <>
                <br />
                Τηλ: {officePhone}
              </>
            )}
          </Text>

          <Text style={{ ...footer, marginTop: "16px" }}>
            Αυτό το email δημιουργήθηκε αυτόματα από το σύστημα ελέγχου
            οφειλών hexAIgon.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default DebtNotificationEmail;
