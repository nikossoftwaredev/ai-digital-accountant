const formatEuro = (amount: number | null | undefined): string => {
  if (amount == null) return "—";
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

interface CurrencyCellProps {
  amount: number | null | undefined;
}

export const CurrencyCell = ({ amount }: CurrencyCellProps) => (
  <span className="font-mono tabular-nums">{formatEuro(amount)}</span>
);

export { formatEuro };
