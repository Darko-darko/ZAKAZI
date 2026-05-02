import "server-only";
import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

Font.register({
  family: "Roboto",
  fonts: [
    {
      src: path.join(process.cwd(), "lib/invoices/fonts/Roboto-Regular.ttf"),
    },
    {
      src: path.join(process.cwd(), "lib/invoices/fonts/Roboto-Bold.ttf"),
      fontWeight: 700,
    },
  ],
});

export type InvoicePartyDetails = {
  legalName: string;
  pib: string;
  mb: string;
  address: string;
  city: string;
  zip: string;
};

export type InvoicePlatformDetails = InvoicePartyDetails & {
  bankName: string | null;
  accountNumber: string | null;
  iban: string | null;
  isVatPayer: boolean;
  vatRate: number;
  contactEmail: string | null;
  contactPhone: string | null;
};

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type InvoiceData = {
  number: string;
  issuedAt: Date;
  serviceDate: Date;
  dueAt: Date;
  platform: InvoicePlatformDetails;
  customer: InvoicePartyDetails;
  items: InvoiceLineItem[];
  paymentReference: string;
  notes?: string | null;
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 10,
    color: "#0f172a",
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: -0.4,
  },
  brandSubtitle: {
    marginTop: 2,
    fontSize: 9,
    color: "#475569",
  },
  invoiceMetaBlock: {
    minWidth: 180,
    border: "1pt solid #e2e8f0",
    borderRadius: 6,
    padding: 10,
  },
  invoiceMetaLabel: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  invoiceMetaValue: {
    fontSize: 14,
    fontWeight: 700,
    marginTop: 2,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    marginBottom: 2,
  },
  metaRowLabel: {
    color: "#64748b",
  },
  metaRowValue: {
    fontWeight: 700,
  },
  partiesRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  partyBox: {
    flex: 1,
    border: "1pt solid #e2e8f0",
    borderRadius: 6,
    padding: 12,
  },
  partyHeader: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  partyName: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 4,
  },
  partyLine: {
    fontSize: 10,
    color: "#1e293b",
    lineHeight: 1.4,
  },
  partyDetailRow: {
    flexDirection: "row",
    fontSize: 9,
    marginTop: 6,
  },
  partyDetailLabel: {
    color: "#64748b",
    width: 35,
  },
  partyDetailValue: {
    fontWeight: 700,
  },
  table: {
    border: "1pt solid #e2e8f0",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 9,
    fontWeight: 700,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTop: "1pt solid #e2e8f0",
  },
  cellDescription: {
    flex: 1,
  },
  cellQty: {
    width: 50,
    textAlign: "right",
  },
  cellPrice: {
    width: 90,
    textAlign: "right",
  },
  cellAmount: {
    width: 100,
    textAlign: "right",
    fontWeight: 700,
  },
  totalsBlock: {
    alignSelf: "flex-end",
    width: 240,
    marginBottom: 24,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    fontSize: 10,
  },
  totalsRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 4,
    borderTop: "1pt solid #cbd5e1",
    fontSize: 13,
    fontWeight: 700,
  },
  paymentBlock: {
    border: "1pt solid #e2e8f0",
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  paymentHeader: {
    fontSize: 9,
    fontWeight: 700,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  paymentLine: {
    flexDirection: "row",
    fontSize: 10,
    marginTop: 2,
  },
  paymentLabel: {
    color: "#64748b",
    width: 110,
  },
  paymentValue: {
    fontWeight: 700,
    flex: 1,
  },
  notes: {
    fontSize: 9,
    color: "#475569",
    lineHeight: 1.5,
    marginBottom: 16,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
  },
});

const dateFormatter = new Intl.DateTimeFormat("sr-Latn-RS", {
  timeZone: "Europe/Belgrade",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const moneyFormatter = new Intl.NumberFormat("sr-Latn-RS", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatDate(value: Date) {
  return dateFormatter.format(value);
}

function formatMoney(value: number) {
  return `${moneyFormatter.format(value)} RSD`;
}

function InvoiceDocument({ invoice }: { invoice: InvoiceData }) {
  const subtotal = invoice.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const vatAmount = invoice.platform.isVatPayer
    ? Math.round(subtotal * (invoice.platform.vatRate / 100) * 100) / 100
    : 0;
  const total = subtotal + vatAmount;

  return (
    <Document
      title={`Faktura ${invoice.number}`}
      author={invoice.platform.legalName}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brandTitle}>{invoice.platform.legalName}</Text>
            <Text style={styles.brandSubtitle}>
              Platforma za onlajn zakazivanje termina
            </Text>
          </View>
          <View style={styles.invoiceMetaBlock}>
            <Text style={styles.invoiceMetaLabel}>Faktura broj</Text>
            <Text style={styles.invoiceMetaValue}>{invoice.number}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaRowLabel}>Datum izdavanja</Text>
              <Text style={styles.metaRowValue}>
                {formatDate(invoice.issuedAt)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaRowLabel}>Datum prometa</Text>
              <Text style={styles.metaRowValue}>
                {formatDate(invoice.serviceDate)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaRowLabel}>Rok placanja</Text>
              <Text style={styles.metaRowValue}>{formatDate(invoice.dueAt)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyHeader}>Izdavalac</Text>
            <Text style={styles.partyName}>{invoice.platform.legalName}</Text>
            <Text style={styles.partyLine}>{invoice.platform.address}</Text>
            <Text style={styles.partyLine}>
              {invoice.platform.zip} {invoice.platform.city}
            </Text>
            <View style={styles.partyDetailRow}>
              <Text style={styles.partyDetailLabel}>PIB</Text>
              <Text style={styles.partyDetailValue}>
                {invoice.platform.pib}
              </Text>
            </View>
            <View style={styles.partyDetailRow}>
              <Text style={styles.partyDetailLabel}>MB</Text>
              <Text style={styles.partyDetailValue}>
                {invoice.platform.mb}
              </Text>
            </View>
          </View>

          <View style={styles.partyBox}>
            <Text style={styles.partyHeader}>Kupac</Text>
            <Text style={styles.partyName}>{invoice.customer.legalName}</Text>
            <Text style={styles.partyLine}>{invoice.customer.address}</Text>
            <Text style={styles.partyLine}>
              {invoice.customer.zip} {invoice.customer.city}
            </Text>
            <View style={styles.partyDetailRow}>
              <Text style={styles.partyDetailLabel}>PIB</Text>
              <Text style={styles.partyDetailValue}>
                {invoice.customer.pib}
              </Text>
            </View>
            <View style={styles.partyDetailRow}>
              <Text style={styles.partyDetailLabel}>MB</Text>
              <Text style={styles.partyDetailValue}>{invoice.customer.mb}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.cellDescription}>Opis</Text>
            <Text style={styles.cellQty}>Kol.</Text>
            <Text style={styles.cellPrice}>Cena</Text>
            <Text style={styles.cellAmount}>Iznos</Text>
          </View>
          {invoice.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.cellDescription}>{item.description}</Text>
              <Text style={styles.cellQty}>{item.quantity}</Text>
              <Text style={styles.cellPrice}>{formatMoney(item.unitPrice)}</Text>
              <Text style={styles.cellAmount}>
                {formatMoney(item.quantity * item.unitPrice)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          {invoice.platform.isVatPayer ? (
            <>
              <View style={styles.totalsRow}>
                <Text>Osnovica</Text>
                <Text>{formatMoney(subtotal)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text>PDV ({invoice.platform.vatRate}%)</Text>
                <Text>{formatMoney(vatAmount)}</Text>
              </View>
            </>
          ) : null}
          <View style={styles.totalsRowFinal}>
            <Text>Za uplatu</Text>
            <Text>{formatMoney(total)}</Text>
          </View>
        </View>

        <View style={styles.paymentBlock}>
          <Text style={styles.paymentHeader}>Podaci za uplatu</Text>
          {invoice.platform.bankName ? (
            <View style={styles.paymentLine}>
              <Text style={styles.paymentLabel}>Banka</Text>
              <Text style={styles.paymentValue}>
                {invoice.platform.bankName}
              </Text>
            </View>
          ) : null}
          {invoice.platform.accountNumber ? (
            <View style={styles.paymentLine}>
              <Text style={styles.paymentLabel}>Ziro racun</Text>
              <Text style={styles.paymentValue}>
                {invoice.platform.accountNumber}
              </Text>
            </View>
          ) : null}
          {invoice.platform.iban ? (
            <View style={styles.paymentLine}>
              <Text style={styles.paymentLabel}>IBAN</Text>
              <Text style={styles.paymentValue}>{invoice.platform.iban}</Text>
            </View>
          ) : null}
          <View style={styles.paymentLine}>
            <Text style={styles.paymentLabel}>Poziv na broj</Text>
            <Text style={styles.paymentValue}>{invoice.paymentReference}</Text>
          </View>
        </View>

        {!invoice.platform.isVatPayer ? (
          <Text style={styles.notes}>
            Napomena: PDV nije obracunat na osnovu clana 33. Zakona o porezu na
            dodatu vrednost.
          </Text>
        ) : null}

        {invoice.notes ? (
          <Text style={styles.notes}>{invoice.notes}</Text>
        ) : null}

        <Text style={styles.footer} fixed>
          {invoice.platform.legalName}
          {invoice.platform.contactEmail
            ? `  ·  ${invoice.platform.contactEmail}`
            : ""}
          {invoice.platform.contactPhone
            ? `  ·  ${invoice.platform.contactPhone}`
            : ""}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(invoice: InvoiceData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} />);
}
